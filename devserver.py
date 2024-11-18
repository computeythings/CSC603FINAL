from flask import Flask, jsonify, request

app = Flask(__name__)

response_data = {
    'id': '123456789012',
    'conditions': [False] * 14,
    'email': 'dev@devserver.com',
    'first_name': 'devFirst',
    'last_name': 'devLast',
    'pending_documents': '0'
}

@app.route('/api/v1/users', methods=['GET'])
def get_customers():
    return jsonify(response_data)

@app.route('/api/v1/users', methods=['POST'])
def post_customers():
    request_data = request.get_json()
    if not request_data:
        return jsonify({'message': 'Invalid or missing JSON payload'}), 400
    
    method = request_data.get('method')
    match method:
        case 'get':
            return jsonify(response_data)
        case 'add':
            return jsonify(response_data)
        case 'update':
            return jsonify({'message': 'Success'})
        case 'delete':
            return jsonify({'message': 'Success'})
        case _:
            return jsonify({'message': 'Invalid method'}), 400


if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000)
