"""
Test script to demonstrate currency conversion to INR
Processes the sample invoice and converts USD to INR
"""

import json
from currency_converter import convert_invoice_to_inr

# Sample invoice data (like your current output)
sample_invoice = {
    "invoice_number": {
        "value": "F1000876/23",
        "confidence": 0.966
    },
    "vendor_name": {
        "value": "COMPANY",
        "confidence": 0.391
    },
    "invoice_date": {
        "value": "2023-08-14",
        "confidence": 0.966
    },
    "total_amount": {
        "value": 702.0,
        "confidence": 0.95
    },
    "currency": {
        "value": "USD",
        "confidence": 0.8
    },
    "purchase_order": {
        "value": "X001525",
        "confidence": 0.535
    },
    "due_date": {
        "value": "nil",
        "confidence": 0.0
    },
    "gst_number": {
        "value": "nil",
        "confidence": 0.0
    },
    "tax_amount": {
        "value": 117.0,
        "confidence": 0.957
    }
}

print("="*70)
print("INVOICE CURRENCY CONVERSION TEST")
print("="*70)

print("\n📄 ORIGINAL INVOICE (USD):")
print("-"*70)
print(json.dumps(sample_invoice, indent=4))

print("\n" + "="*70)
print("CONVERTING TO INR...")
print("="*70)

# Convert to INR
converted_invoice = convert_invoice_to_inr(sample_invoice.copy())

print("\n" + "="*70)
print("📄 CONVERTED INVOICE (INR):")
print("-"*70)
print(json.dumps(converted_invoice, indent=4))

print("\n" + "="*70)
print("SUMMARY:")
print("="*70)
print(f"✅ Original Total: $702.00 USD")
print(f"✅ Converted Total: ₹{converted_invoice['total_amount']['value']} INR")
print(f"✅ Original Tax: $117.00 USD")
print(f"✅ Converted Tax: ₹{converted_invoice['tax_amount']['value']} INR")
print(f"✅ Currency field removed: {'currency' not in converted_invoice}")
print("="*70)
