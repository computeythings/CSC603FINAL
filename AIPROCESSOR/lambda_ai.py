import os
import re
import json
import boto3
import psycopg2
import numpy as np
import pytesseract
from pdf2image import convert_from_bytes
from tensorflow.keras.models import load_model
from tensorflow.keras.applications.vgg16 import preprocess_input

# Load the trained Siamese model
siamese_model = load_model('/opt/siamese_model.h5')
siamese_known = preprocess_input('/opt/siamese_known')

# Predefined array of items (medications or prescription items)
prescription_items = [
    "CPAP machines",
    "Insulin pumps",
    "Nebulizers",
    "Glucose monitors",
    "TENS units",
    "Oxygen concentrators",
    "BiPAP machines",
    "Hearing aids",
    "Home dialysis machines",
    "Implantable cardiac monitors",
    "Infusion pumps",
    "Blood pressure monitors",
    "Prosthetic devices (custom-fitted)",
    "Automatic external defibrillators (AEDs)"
]

# Preprocess the image to match the input shape of the Siamese network
def preprocess_image(image):
    image = image.resize((128, 128)).convert('L')  # Resize and convert to grayscale
    image_array = np.array(image) / 255.0  # Normalize the pixel values
    image_array = np.expand_dims(image_array, axis=0)  # Add batch dimension
    image_array = np.expand_dims(image_array, axis=-1)  # Add channel dimension
    image_array = preprocess_input(image_array) # VGG16 pre-processing for data recognition
    return image_array

# Extract text using OCR
def extract_text_from_image(image):
    return pytesseract.image_to_string(image)

# Check if the extracted text matches any predefined prescription items
def find_prescription_item(extracted_text):
    for i in range(prescription_items):
        if re.search(r'\b' + re.escape(prescription_items[i]) + r'\b', extracted_text):
            return i
    return None

import boto3

def generate_rds_iam_token(hostname, port, username):
    # Create an RDS client
    rds_client = boto3.client('rds', region_name='us-west-1')
    # Generate the token
    token = rds_client.generate_db_auth_token(
        DBHostname=hostname,
        Port=port,
        DBUsername=username
    )
    return token

def db_connect(db, port, hostname, username, db_token):
    conn_str = f"dbname='{db}' user='{username}' host='{hostname}' port={port} password='{db_token}' sslmode='require'"
    try:
        # Establish the connection
        conn = psycopg2.connect(conn_str)
        # Create a cursor and execute a query
        cursor = conn.cursor()
        return (conn, cursor)
    except Exception as e:
        print("Error connecting to the database:", e)
    return (None, None)

def customer_update(db_cursor, customer_id, condition_index):
    # Get current customer conditions
    db_cursor.execute("SELECT conditions FROM Customers WHERE id = %s;", (customer_id,))
    result = db_cursor.fetchone()
    if result:
        conditions = result[0]
        # Update the 4th element (index 3) to True
        conditions[condition_index] = True

        # Update the conditions column in the database
        db_cursor.execute("""
            UPDATE Customers 
            SET conditions = %s 
            WHERE id = %s;
        """, (json.dumps(conditions), customer_id)) # serialize data and insert into query
        print(f"Customer {customer_id} conditions updated successfully.")
    else:
        print(f"Customer with id {customer_id} not found.")

# Lambda handler function
def lambda_handler(event, context):
    # Parse the incoming file from API Gateway
    if event['httpMethod'] == 'POST' and 'body' in event:
        file_content = event['body']
        file_bytes = bytes(file_content, encoding='utf-8')
        customer_id = event['metadata']['customer_id']
        
        # Convert PDF to images and process
        image = convert_from_bytes(file_bytes)
        preprocessed_image = preprocess_image(image)
        
        # Siamese Model Prediction
        siamese_prediction = siamese_model.predict([preprocessed_image, siamese_known])
        
        # If prescription is classified as valid, check for the medication
        # 
        if siamese_prediction > 0.5:
            extracted_text = extract_text_from_image(image)
            condition_index = find_prescription_item(extracted_text)
            if condition_index:
                hostname = os.getenv('DB_HOSTNAME')
                port = int(os.getenv('DB_PORT', 5432))  # Default to 5432 if DB_PORT is not set
                username = os.getenv('DB_USERNAME')
                db = os.getenv('DB_NAME')

                if not all([hostname, port, username]):
                    raise EnvironmentError("One or more required environment variables are missing: DB_HOSTNAME, DB_PORT, DB_USERNAME.")

                db_token = generate_rds_iam_token(hostname, port, username)
                try:
                    (db_conn, db_cursor) = db_connect(db, port, hostname, username, db_token)
                    customer_update(db_cursor, customer_id, condition_index)
                    db_conn.commit()
                except Exception as e:
                    print(f"Error updating customer {customer_id}:", e)
                finally:
                    db_cursor.close()
                    db_conn.close()