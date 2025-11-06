"""
Test script for Invoice Email Verification API endpoint
"""

import requests
import json

API_URL = "http://localhost:8000"
VERIFY_ENDPOINT = f"{API_URL}/verify-invoice-email"


def test_verify_invoice_email():
    """Test invoice email verification"""
    print("\n" + "="*70)
    print("🧪 Testing Invoice Email Verification")
    print("="*70)
    
    # Test cases
    test_cases = [
        {
            "name": "Clear Invoice Email",
            "subject": "Your Invoice for October Services",
            "body": "Please find attached the invoice for $500. Payment due in 30 days.",
            "attachment_filename": "invoice_123.pdf",
            "expected": True
        },
        {
            "name": "Bill Email",
            "subject": "Monthly Bill - November 2025",
            "body": "Your bill for this month is $250. Please pay by end of month.",
            "attachment_filename": "bill_nov.pdf",
            "expected": True
        },
        {
            "name": "Regular Email",
            "subject": "Meeting Tomorrow",
            "body": "Don't forget our meeting tomorrow at 3 PM. See you there!",
            "attachment_filename": None,
            "expected": False
        },
        {
            "name": "Receipt Email",
            "subject": "Receipt for your purchase",
            "body": "Thank you for your purchase of $100. Here is your receipt.",
            "attachment_filename": "receipt_001.pdf",
            "expected": True
        },
        {
            "name": "Newsletter",
            "subject": "Weekly Newsletter",
            "body": "Here are the top stories this week...",
            "attachment_filename": None,
            "expected": False
        }
    ]
    
    results = []
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n{'='*70}")
        print(f"Test {i}: {test_case['name']}")
        print("="*70)
        print(f"Subject: {test_case['subject']}")
        print(f"Body: {test_case['body'][:50]}...")
        print(f"Attachment: {test_case['attachment_filename']}")
        
        # Prepare parameters
        params = {
            "subject": test_case['subject'],
            "body": test_case['body']
        }
        if test_case['attachment_filename']:
            params["attachment_filename"] = test_case['attachment_filename']
        
        try:
            # Make request
            response = requests.post(VERIFY_ENDPOINT, params=params)
            
            if response.status_code == 200:
                result = response.json()
                is_invoice = result['is_invoice']
                
                # Check if result matches expected
                match = "✅" if is_invoice == test_case['expected'] else "❌"
                
                print(f"\n{match} Result: {'IS INVOICE' if is_invoice else 'NOT INVOICE'}")
                print(f"Expected: {'IS INVOICE' if test_case['expected'] else 'NOT INVOICE'}")
                print(f"Confidence: {result.get('confidence', 'n/a')}")
                print(f"Message: {result['message']}")
                
                results.append({
                    "test": test_case['name'],
                    "passed": is_invoice == test_case['expected'],
                    "result": result
                })
            else:
                print(f"❌ Error: Status {response.status_code}")
                print(response.text)
                results.append({
                    "test": test_case['name'],
                    "passed": False,
                    "error": response.text
                })
                
        except Exception as e:
            print(f"❌ Exception: {e}")
            results.append({
                "test": test_case['name'],
                "passed": False,
                "error": str(e)
            })
    
    # Summary
    print("\n" + "="*70)
    print("📊 TEST SUMMARY")
    print("="*70)
    
    passed = sum(1 for r in results if r.get('passed', False))
    total = len(results)
    
    for result in results:
        status = "✅ PASS" if result.get('passed', False) else "❌ FAIL"
        print(f"{status} - {result['test']}")
    
    print(f"\n{'='*70}")
    print(f"Total: {passed}/{total} tests passed ({passed/total*100:.0f}%)")
    print("="*70 + "\n")
    
    return results


def test_with_different_formats():
    """Test with different email formats"""
    print("\n" + "="*70)
    print("🧪 Testing Different Email Formats")
    print("="*70)
    
    formats = [
        {
            "name": "Subject only",
            "subject": "Invoice #12345 attached",
            "body": ""
        },
        {
            "name": "Body only",
            "subject": "",
            "body": "Here is the invoice for your recent purchase of $200."
        },
        {
            "name": "With attachment keyword",
            "subject": "Payment request",
            "body": "Please review the attached document.",
            "attachment_filename": "INVOICE_2025.pdf"
        }
    ]
    
    for fmt in formats:
        print(f"\n{'-'*70}")
        print(f"Format: {fmt['name']}")
        print(f"{'-'*70}")
        
        params = {
            "subject": fmt.get('subject', ''),
            "body": fmt.get('body', '')
        }
        if 'attachment_filename' in fmt:
            params['attachment_filename'] = fmt['attachment_filename']
        
        try:
            response = requests.post(VERIFY_ENDPOINT, params=params)
            
            if response.status_code == 200:
                result = response.json()
                print(f"✅ Result: {'IS INVOICE' if result['is_invoice'] else 'NOT INVOICE'}")
                print(f"   Confidence: {result.get('confidence', 'n/a')}")
            else:
                print(f"❌ Error: {response.status_code}")
                
        except Exception as e:
            print(f"❌ Exception: {e}")


if __name__ == "__main__":
    print("\n" + "="*70)
    print("🚀 INVOICE EMAIL VERIFICATION - TEST SUITE")
    print("="*70)
    
    # Check if API is running
    try:
        response = requests.get(f"{API_URL}/health")
        if response.status_code == 200:
            print("✅ API is running\n")
        else:
            print("❌ API returned unexpected status")
            exit(1)
    except:
        print("❌ Cannot connect to API. Please start the server:")
        print("   python api.py")
        exit(1)
    
    # Run tests
    results = test_verify_invoice_email()
    
    # Additional format tests
    test_with_different_formats()
    
    print("\n" + "="*70)
    print("✅ TESTING COMPLETE")
    print("="*70)
    print(f"\n📚 View API docs: {API_URL}/docs")
    print("="*70 + "\n")
