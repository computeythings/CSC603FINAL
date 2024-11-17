import pytest
import boto3
import os
import requests
from dotenv import load_dotenv
import hashlib
import hmac
import base64
import json

# Load environment variables from .env file
load_dotenv('.env')

# Access the variables from the environment

USER_POOL_ID = os.getenv("USER_POOL_ID")
CLIENT_ID = os.getenv("CLIENT_ID")
CLIENT_SECRET = os.getenv("CLIENT_SECRET")
USERNAME = os.getenv("USERNAME")
PASSWORD = os.getenv("PASSWORD")
BASE_URL = os.getenv("APP_URL_BASE")
CUSTOMERS_URL = f'{BASE_URL}/api/v1/users'
CUSTOMER_DATA_ORIGINAL = {
    "ssn": "837492838",
    "first_name": "PytestUpload",
    "last_name": "TestLastname",
    "email": "test@testmail.com"
}
CUSTOMER_DATA_MODIFIED = {
    "first_name": "NewFirst",
    "last_name": "NewLast",
    "email": "updated@testmail.com"
}

# Store the access token
access_token = None
customer_id = None
def get_secret_hash():
    # Calculate the secret hash using the client ID and secret
    message = USERNAME + CLIENT_ID
    digest = hmac.new(
        key=CLIENT_SECRET.encode('utf-8'),
        msg=message.encode('utf-8'),
        digestmod=hashlib.sha256
    ).digest()
    return base64.b64encode(digest).decode()

def login():
    global access_token
    cognito_idp_client = boto3.client('cognito-idp', region_name="us-west-1")
    secret_hash = get_secret_hash()
    client_id = CLIENT_ID

    kwargs = {
        "ClientId": client_id,
        "AuthFlow": "USER_PASSWORD_AUTH",
        "AuthParameters": {"USERNAME": USERNAME, "PASSWORD": PASSWORD, 'SECRET_HASH': secret_hash },
    }
    response = cognito_idp_client.initiate_auth(**kwargs)\

    if response.get('ResponseMetadata').get('HTTPStatusCode') == 200:
        access_token = response['AuthenticationResult']['AccessToken']
        assert access_token, 'No access token received'
    else:
        pytest.fail(f'Login failed with response {json.dumps(response, indent=4)}')

def logout(access_token):
    cognito_idp_client = boto3.client('cognito-idp', region_name="us-west-1")
    cognito_idp_client.global_sign_out(
        AccessToken=access_token
    )

# Login before each test
@pytest.fixture(scope='session', autouse=True)
def setup():
    login()

def test_add_customer():
    global customer_id
    headers = {
        "Authorization": access_token,
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    body = {
        "method": "add",
        **CUSTOMER_DATA_ORIGINAL
    }
    response = requests.post(
        CUSTOMERS_URL,
        headers=headers,
        json=body
    )
    print(json.dumps(response.json(), indent=4))
    assert response.status_code == 200, f'Add customer failed with status code {response.status_code}'
    customer = response.json()
    assert customer.get('conditions') == [False] * 14, 'Incorrect conditions.'
    assert customer.get('email') == CUSTOMER_DATA_ORIGINAL['email'], 'Incorrect email.'
    assert customer.get('first_name') == CUSTOMER_DATA_ORIGINAL['first_name'], 'Incorrect first name.'
    assert customer.get('last_name') == CUSTOMER_DATA_ORIGINAL['last_name'], 'Incorrect last name.'
    assert customer.get('pending_documents') == 0, 'Incorrect pending documents.'
    customer_id = customer.get('id')

def test_modify_customer():
    global customer_id
    headers = {
        "Authorization": access_token,
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    body = {
        "method": "update",
        "id": customer_id,
        **CUSTOMER_DATA_MODIFIED
    }
    response = requests.post(
        CUSTOMERS_URL,
        headers=headers,
        json=body
    )
    
    assert response.status_code == 200, f'Modify customer failed with status code {response.status_code}'
    customer = response.json()
    print(json.dumps(customer, indent=4))
    result = response.json()
    assert result.get('message') == 'Success'
    # assert customer.get('conditions') == [False] * 14, 'Incorrect conditions.'
    # assert customer.get('email') == 'updated@testmail.com', 'Incorrect email.'
    # assert customer.get('first_name') == 'NewFirst', 'Incorrect first name.'
    # assert customer.get('last_name') == 'NewLast', 'Incorrect last name.'
    # assert customer.get('pending_documents') == 0, 'Incorrect pending documents.'

def test_get_customer_by_id():
    headers = {
        "Authorization": access_token,
        "Content-Type": "application/json"
    }
    params = {
        "id": customer_id
    }
    response = requests.get(
        CUSTOMERS_URL,
        headers=headers,
        params=params
    )
    assert response.status_code == 200, f'GET customer failed with status code {response.status_code}'
    customer = response.json()
    print(json.dumps(customer, indent=4))
    assert customer.get('conditions') == [False] * 14, 'Incorrect conditions.'
    assert customer.get('email') == CUSTOMER_DATA_MODIFIED['email'], 'Incorrect email.'
    assert customer.get('first_name') == CUSTOMER_DATA_MODIFIED['first_name'], 'Incorrect first name.'
    assert customer.get('last_name') == CUSTOMER_DATA_MODIFIED['last_name'], 'Incorrect last name.'
    assert customer.get('pending_documents') == 0, 'Incorrect pending documents.'

def test_get_customer_by_ssn():
    headers = {
        "Authorization": access_token,
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    body = {
        "method": "get",
        "ssn": "837492838",
        "first_name": "NewFirst",
        "last_name": "NewLast"
    }
    response = requests.post(
        CUSTOMERS_URL,
        headers=headers,
        json=body
    )
    
    assert response.status_code == 200, f'Modify customer failed with status code {response.status_code}'
    customer = response.json()
    print(json.dumps(customer, indent=4))
    assert customer.get('conditions') == [False] * 14, 'Incorrect conditions.'
    assert customer.get('email') == CUSTOMER_DATA_MODIFIED['email'], 'Incorrect email.'
    assert customer.get('first_name') == CUSTOMER_DATA_MODIFIED['first_name'], 'Incorrect first name.'
    assert customer.get('last_name') == CUSTOMER_DATA_MODIFIED['last_name'], 'Incorrect last name.'
    assert customer.get('pending_documents') == 0, 'Incorrect pending documents.'
    assert customer.get('id') == customer_id, 'Incorrect ID.'

def test_delete_customer():
    global customer_id
    headers = {
        "Authorization": access_token,
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    body = {
        "method": "delete",
        "id": customer_id
    }
    response = requests.post(
        CUSTOMERS_URL,
        headers=headers,
        json=body
    )
    print(json.dumps(response.json(), indent=4))
    assert response.status_code == 200, f'Delete customer failed with status code {response.status_code}'
    result = response.json()
    assert result.get('message') == 'Success'