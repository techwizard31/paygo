"""
Test script for Invoice Processing API
Demonstrates how to make requests to the FastAPI endpoints
"""

import requests
import json
from pathlib import Path

# API Configuration
API_URL = "http://localhost:8000"
PROCESS_ENDPOINT = f"{API_URL}/process-invoice"

def test_api_health():
    """Test if API is running"""
    print("\n" + "="*60)
    print("🏥 Testing API Health")
    print("="*60)
    
    try:
        response = requests.get(f"{API_URL}/health")
        if response.status_code == 200:
            print("✅ API is healthy")
            print(json.dumps(response.json(), indent=2))
            return True
        else:
            print(f"❌ API returned status code: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to API. Is the server running?")
        print("   Start server with: python api.py")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def test_process_invoice(file_path):
    """Test invoice processing endpoint"""
    print("\n" + "="*60)
    print("📄 Testing Invoice Processing")
    print("="*60)
    print(f"File: {file_path}")
    
    if not Path(file_path).exists():
        print(f"❌ File not found: {file_path}")
        return
    
    try:
        # Prepare file for upload
        with open(file_path, 'rb') as f:
            files = {'file': (Path(file_path).name, f, 'image/jpeg')}
            
            print("\n🚀 Sending request to API...")
            response = requests.post(PROCESS_ENDPOINT, files=files)
        
        print(f"📊 Response Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("\n✅ Invoice processed successfully!")
            print("\n" + "-"*60)
            print("📋 INVOICE DATA (INR):")
            print("-"*60)
            print(json.dumps(result['data'], indent=2))
            
            if 'metadata' in result:
                print("\n" + "-"*60)
                print("📊 METADATA:")
                print("-"*60)
                print(json.dumps(result['metadata'], indent=2))
            
            # Save response to file
            output_file = "api_response.json"
            with open(output_file, 'w') as f:
                json.dump(result, f, indent=4)
            print(f"\n💾 Response saved to: {output_file}")
            
        else:
            print(f"\n❌ Error processing invoice")
            print(f"Status: {response.status_code}")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"\n❌ Error: {e}")


def test_with_curl_example():
    """Print curl example for testing"""
    print("\n" + "="*60)
    print("📝 CURL Example")
    print("="*60)
    
    curl_command = f"""
# Test with curl:
curl -X POST "{PROCESS_ENDPOINT}" \\
  -H "accept: application/json" \\
  -H "Content-Type: multipart/form-data" \\
  -F "file=@temp.jpg"

# Or using PowerShell:
$file = Get-Item "temp.jpg"
$form = @{{
    file = $file
}}
Invoke-RestMethod -Uri "{PROCESS_ENDPOINT}" -Method Post -Form $form
    """
    print(curl_command)


if __name__ == "__main__":
    print("\n" + "="*60)
    print("🧪 INVOICE PROCESSING API - TEST SUITE")
    print("="*60)
    
    # Test 1: Health check
    if not test_api_health():
        print("\n⚠️  Please start the API server first:")
        print("   python api.py")
        exit(1)
    
    # Test 2: Process invoice (if temp.jpg exists)
    test_file = "temp.jpg"
    if Path(test_file).exists():
        test_process_invoice(test_file)
    else:
        print(f"\n⚠️  Test file '{test_file}' not found")
        print("   Place an invoice image/PDF in the backend directory to test")
    
    # Test 3: Show examples
    test_with_curl_example()
    
    print("\n" + "="*60)
    print("✅ TESTING COMPLETE")
    print("="*60)
    print(f"\n📚 View interactive API docs at: {API_URL}/docs")
    print("="*60 + "\n")
