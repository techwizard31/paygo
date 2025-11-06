import os
from openai import OpenAI

# Initialize OpenAI client (replace with your actual API key)
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))  # Or hardcode: api_key="your-api-key-here"

def classify_email_as_invoice(subject: str, body: str, attachment_filename: str = None) -> bool:
    """
    Classifies if the email contains invoice-based data using OpenAI's LLM.
    
    Args:
    - subject: Email subject.
    - body: Email body.
    - attachment_filename: Optional attachment filename.
    
    Returns:
    - True if it's an invoice, False otherwise.
    """
    # Construct the prompt
    prompt = f"""
    You are an email classifier. Determine if the following email contains invoice-based data (e.g., bills, payments, receipts).
    Respond only with 'Yes' or 'No'.

    Subject: {subject}
    Body: {body}
    """
    if attachment_filename:
        prompt += f"\nAttachment Filename: {attachment_filename}"
    
    # Call OpenAI API with a low-cost model
    response = client.chat.completions.create(
        model="gpt-4o-mini",  # Low-cost model; you can switch to "gpt-3.5-turbo" if needed
        messages=[
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": prompt}
        ],
        max_tokens=1,  # Limit to minimize cost
        temperature=0.0  # Deterministic output
    )
    
    # Extract the response
    classification = response.choices[0].message.content.strip().lower()
    
    return classification == 'yes'

# Example usage
if __name__ == "__main__":
    subject = "Your Invoice for October Services"
    body = "Please find attached the invoice for $500. Payment due in 30 days."
    attachment = "invoice_123.pdf"
    
    is_invoice = classify_email_as_invoice(subject, body, attachment)
    print(f"Is this an invoice? {is_invoice}")