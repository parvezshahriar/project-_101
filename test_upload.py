#!/usr/bin/env python
import requests
import json

API_URL = "http://localhost:8000/csv-upload"
CSV_FILE = "sample_products.csv"

print(f"Testing CSV upload to {API_URL}")
print(f"Using file: {CSV_FILE}\n")

try:
    with open(CSV_FILE, 'rb') as f:
        files = {'file': (CSV_FILE, f, 'text/csv')}
        print(f"File size: {len(f.read())} bytes")
    
    with open(CSV_FILE, 'rb') as f:
        files = {'file': (CSV_FILE, f, 'text/csv')}
        response = requests.post(API_URL, files=files)
    
    print(f"Status Code: {response.status_code}")
    print(f"Response Headers: {dict(response.headers)}")
    print(f"Response Body:\n{json.dumps(response.json(), indent=2)}")
    
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
