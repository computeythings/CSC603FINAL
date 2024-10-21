from flask import Flask, jsonify
from flasgger import Swagger
import yaml

app = Flask(__name__)

# Load OpenAPI specifications from the YAML file
with open('api.yaml', 'r') as file:
    swagger_spec = yaml.safe_load(file)

swagger = Swagger(app, template=swagger_spec)

if __name__ == '__main__':
    app.run(debug=True)
