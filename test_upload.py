import requests
import json
import time

def upload_invoice(filepath):
    print(f"\n--- Uploading {filepath} ---")
    url = "http://localhost:8000/api/upload"
    with open(filepath, "rb") as f:
        files = {"file": (filepath.split("/")[-1], f, "application/pdf")}
        response = requests.post(url, files=files)
        
    print(f"Status Code: {response.status_code}")
    try:
        data = response.json()
        print(json.dumps(data, indent=2))
        return data.get("data", {}).get("status")
    except Exception as e:
        print(f"Error parsing response: {e}")
        print(response.text)

if __name__ == "__main__":
    time.sleep(1) # wait for server
    print("Testing regular upload...")
    upload_invoice("test_invoices/invoice_01.pdf")
    
    print("\nTesting duplicate upload...")
    upload_invoice("test_invoices/invoice_01.pdf")
    
    print("\nTesting another upload...")
    upload_invoice("test_invoices/invoice_02.pdf")
    
    print("\nTesting GET invoices...")
    response = requests.get("http://localhost:8000/api/invoices")
    try:
        print(json.dumps(response.json(), indent=2))
    except:
        print(response.text)
