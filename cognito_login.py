import boto3
import os
import requests
from dotenv import load_dotenv
from botocore.exceptions import ClientError

import json
import hashlib
import hmac
import base64

load_dotenv()
USER_POOL_ID = os.getenv("USER_POOL_ID")
CLIENT_ID = os.getenv("CLIENT_ID")
CLIENT_SECRET = os.getenv("CLIENT_SECRET")
USERNAME = os.getenv("USERNAME")
PASSWORD = os.getenv("PASSWORD")
APP_URL_BASE = os.getenv("APP_URL_BASE")


def get_secret_hash():
    # Calculate the secret hash using the client ID and secret
    message = USERNAME + CLIENT_ID
    digest = hmac.new(
        key=CLIENT_SECRET.encode('utf-8'),
        msg=message.encode('utf-8'),
        digestmod=hashlib.sha256
    ).digest()
    return base64.b64encode(digest).decode()

def sign_in(cognito_idp_client):
    secret_hash = get_secret_hash()
    client_id = CLIENT_ID
    kwargs = {
        "ClientId": client_id,
        "AuthFlow": "USER_PASSWORD_AUTH",
        "AuthParameters": {"USERNAME": USERNAME, "PASSWORD": PASSWORD, 'SECRET_HASH': secret_hash },
    }
    response = cognito_idp_client.initiate_auth(**kwargs)
    
    if response.get("ChallengeName") != None:
        response = handle_new_password_challenge(cognito_idp_client, USERNAME, "P@55w0rd", response["Session"])

    access_token = response['AuthenticationResult']['AccessToken']
    #print(access_token)
    return access_token

def sign_out(cognito_idp_client, access_token):
    cognito_idp_client.global_sign_out(
        AccessToken=access_token
    )
    
def handle_new_password_challenge(client, email, new_password, session):
    try:
        # Respond to the NEW_PASSWORD_REQUIRED challenge
        response = client.respond_to_auth_challenge(
            ClientId=CLIENT_ID,
            ChallengeName='NEW_PASSWORD_REQUIRED',
            ChallengeResponses={
                'USERNAME': email,
                'NEW_PASSWORD': new_password,
                'SECRET_HASH': get_secret_hash(email)  # Include the secret hash again
            },
            Session=session  # Include the session from the previous response
        )
        
        # Extract and return the new access token
        return response

    except ClientError as e:
        print(f"An error occurred while responding to the challenge: {e.response['Error']['Message']}")
        return None

def refresh(client, refresh_token):
    response = client.initiate_auth(
            ClientId=CLIENT_ID,
            AuthFlow='REFRESH_TOKEN_AUTH',
            AuthParameters={
                'REFRESH_TOKEN': refresh_token
            }
        )
    return response

def user_get(token, uid):
    headers = {
        "Authorization": token,
        "Content-Type": "application/json"
    }
    params = {
        #"id": "ac6f7e1dafd35f549e916bc54fc88ee7894c6826c98f6a0a34fedee693493ce8"
        "id": uid
    }
    response = requests.get(
        APP_URL_BASE + "/users",
        #APP_URL_BASE + "/test",
        headers=headers,
        params=params
    )
    if response.status_code == 200:
        print("Response data:", json.dumps(response.json(), indent=4))  # or response.text for raw response
    else:
        print(f"Failed to make the request: {response.status_code} - {response.text}")

"""
    struct UserRequest {
        id: String,
        method: String, // Add, modify, delete
        first_name: Option<String>,
        last_name: Option<String>,
        email: Option<String>,
        documents: Option<Vec<String>> // Vector of filenames
    }
"""
def user_add(token, uid):
    headers = {
        "Authorization": token,
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    body = {
        "id": uid,
        "method": "add",
        "first_name": "PythonUpload",
        "last_name": "McPoloaderson",
        "email": "useremail@hotmail.com"
    }
    response = requests.post(
        APP_URL_BASE + "/users",
        headers=headers,
        json=body
    )
    print(response.text)


def main(): 
    cognito_idp_client = boto3.client('cognito-idp', region_name="us-west-1")
    token = None
    user_id_b64 = "545019999".encode() # Will use a hash of SSN which will be salted and re-hashed server-side
    c = hashlib.sha256()
    c.update(user_id_b64)
    user_id_hash = c.hexdigest()
    try:
        token = sign_in(cognito_idp_client)
        user_add(token, user_id_hash)
        user_get(token, user_id_hash)
    finally:
        if token:
            sign_out(cognito_idp_client, token)
            print("Signed out")


if __name__=="__main__":
    main()
