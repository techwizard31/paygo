import json
import os
from dotenv import load_dotenv
from openai import OpenAI
from currency_converter import convert_invoice_to_inr

# Load environment variables
load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def extract_invoice_fields_from_ocr(ocr_data):
    """
    Uses OpenAI GPT model to extract structured invoice data from OCR data.
    Can accept either raw text or structured dictionary from Azure OCR.
    """
    # Convert OCR data to text format for GPT
    if isinstance(ocr_data, dict):
        ocr_text = json.dumps(ocr_data, indent=2)
    else:
        ocr_text = str(ocr_data)

    prompt = f"""
You are an expert AI system for financial document analysis.

You will be given OCR output text from an invoice. The text may contain 
fields such as "Vendor Name", "Invoice Id", "Invoice Total", etc., with confidence values.

Your task is to:
1. Identify and extract the following fields:
   - invoice_number
   - vendor_name
   - invoice_date
   - total_amount
   - currency
   - purchase_order
   - due_date
   - gst_number
   - tax_amount
2. For each field:
   - "value": Extract it from the OCR text if available. Otherwise "nil".
   - "confidence": Use OCR’s confidence if provided, or estimate based on clarity (0.0–1.0).
3. Always return **pure JSON** in this format:
{{
  "invoice_number": {{"value": "...", "confidence": ...}},
  "vendor_name": {{"value": "...", "confidence": ...}},
  "invoice_date": {{"value": "...", "confidence": ...}},
  "total_amount": {{"value": "...", "confidence": ...}},
  "currency": {{"value": "...", "confidence": ...}},
  "purchase_order": {{"value": "...", "confidence": ...}},
  "due_date": {{"value": "...", "confidence": ...}},
  "gst_number": {{"value": "...", "confidence": ...}},
  "tax_amount": {{"value": "...", "confidence": ...}}
}}

OCR OUTPUT:
\"\"\"{ocr_text}\"\"\"
    """

    response = client.chat.completions.create(
        model="gpt-4o-mini",  # or use "gpt-4o" or "gpt-3.5-turbo"
        temperature=0.1,
        messages=[
            {"role": "system", "content": "You extract structured invoice data from OCR text with confidence estimation."},
            {"role": "user", "content": prompt}
        ]
    )

    content = response.choices[0].message.content.strip()

    # Try to extract JSON safely
    try:
        json_data = json.loads(content)
    except json.JSONDecodeError:
        # Attempt to auto-correct if LLM added text
        fixed = content[content.find("{"): content.rfind("}") + 1]
        json_data = json.loads(fixed)

    # Convert all amounts to INR and remove currency field
    json_data = convert_invoice_to_inr(json_data)

    return json_data


if __name__ == "__main__":
    # Read OCR text file
    with open("ocr_output.txt", "r", encoding="utf-8") as f:
        ocr_text = f.read()

    result = extract_invoice_fields_from_ocr(ocr_text)

    print("\n✅ Extracted Invoice Data:\n")
    print(json.dumps(result, indent=4))

    with open("invoice_extracted.json", "w") as f:
        json.dump(result, f, indent=4)

    print("\n💾 Saved to invoice_extracted.json\n")
