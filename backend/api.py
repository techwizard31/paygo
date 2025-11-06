"""
FastAPI application for invoice processing
Accepts PDF or image files and returns enhanced invoice JSON with amounts in INR
"""

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import tempfile
import os
from pathlib import Path
import json
from typing import Optional

# Import our invoice processing modules
from ocr import process_invoice_ocr, extract_invoice_data
from extract_json import extract_invoice_fields_from_ocr
from invoice_verify import classify_email_as_invoice

app = FastAPI(
    title="Invoice Processing API",
    description="Upload invoice PDF/images and get structured JSON data with amounts in INR",
    version="1.0.0"
)

# CORS middleware to allow frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supported file extensions
ALLOWED_EXTENSIONS = {'.pdf', '.jpg', '.jpeg', '.png', '.tiff', '.tif', '.bmp'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


@app.get("/")
async def root():
    """API health check endpoint"""
    return {
        "status": "running",
        "message": "Invoice Processing API",
        "version": "2.0.0",
        "endpoints": {
            "POST /process-invoice": "Upload invoice file for processing (returns INR amounts)",
            "POST /process-invoice-raw": "Upload invoice and get both OCR and enhanced data",
            "POST /verify-invoice-email": "Verify if email contains invoice data",
            "GET /health": "Health check",
            "GET /": "API information"
        }
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "invoice-processing-api"
    }


@app.post("/process-invoice")
async def process_invoice(file: UploadFile = File(...)):
    """
    Process an invoice file (PDF or image) and return enhanced JSON data.
    
    Args:
        file: Upload file (PDF, JPG, PNG, TIFF, BMP)
    
    Returns:
        JSON: Enhanced invoice data with amounts converted to INR
    
    Example Response:
        {
            "success": true,
            "data": {
                "invoice_number": {"value": "INV-001", "confidence": 0.95},
                "vendor_name": {"value": "ACME Corp", "confidence": 0.9},
                "total_amount": {"value": 58349.04, "confidence": 0.95},
                ...
            },
            "message": "Invoice processed successfully"
        }
    """
    
    # Validate file
    if not file:
        raise HTTPException(status_code=400, detail="No file provided")
    
    if not file.filename:
        raise HTTPException(status_code=400, detail="Invalid file")
    
    # Check file extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # Read file content
    try:
        contents = await file.read()
        file_size = len(contents)
        
        # Check file size
        if file_size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size: {MAX_FILE_SIZE / (1024*1024)}MB"
            )
        
        if file_size == 0:
            raise HTTPException(status_code=400, detail="Empty file")
            
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading file: {str(e)}")
    
    # Create temporary file
    temp_file = None
    try:
        # Create temp file with original extension
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as temp:
            temp.write(contents)
            temp_file = temp.name
        
        # Step 1: Azure OCR Processing
        print(f"📄 Processing file: {file.filename} ({file_size / 1024:.2f} KB)")
        invoices = process_invoice_ocr(document_path=temp_file)
        
        # Step 2: Extract structured data
        print("📊 Extracting structured data...")
        ocr_data = extract_invoice_data(invoices)
        
        # Step 3: OpenAI Enhancement + Currency Conversion to INR
        print("🤖 Enhancing with AI and converting to INR...")
        enhanced_data = extract_invoice_fields_from_ocr(ocr_data)
        
        print("✅ Invoice processed successfully")
        
        # Return success response
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "data": enhanced_data,
                "metadata": {
                    "filename": file.filename,
                    "file_size_kb": round(file_size / 1024, 2),
                    "file_type": file_ext[1:].upper()
                },
                "message": "Invoice processed successfully. All amounts in INR."
            }
        )
        
    except Exception as e:
        print(f"❌ Error processing invoice: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Invoice processing failed",
                "message": str(e),
                "filename": file.filename
            }
        )
    
    finally:
        # Clean up temporary file
        if temp_file and os.path.exists(temp_file):
            try:
                os.unlink(temp_file)
            except Exception as e:
                print(f"⚠️  Warning: Could not delete temp file: {e}")


@app.post("/process-invoice-raw")
async def process_invoice_raw(file: UploadFile = File(...)):
    """
    Process invoice and return both OCR and enhanced data.
    
    Returns both raw OCR data and AI-enhanced data for comparison.
    """
    
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No valid file provided")
    
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    temp_file = None
    try:
        contents = await file.read()
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as temp:
            temp.write(contents)
            temp_file = temp.name
        
        # Process invoice
        invoices = process_invoice_ocr(document_path=temp_file)
        ocr_data = extract_invoice_data(invoices)
        enhanced_data = extract_invoice_fields_from_ocr(ocr_data)
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "ocr_data": ocr_data,
                "enhanced_data": enhanced_data,
                "metadata": {
                    "filename": file.filename,
                    "file_size_kb": round(len(contents) / 1024, 2)
                },
                "message": "Invoice processed successfully"
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    finally:
        if temp_file and os.path.exists(temp_file):
            try:
                os.unlink(temp_file)
            except:
                pass


@app.post("/verify-invoice-email")
async def verify_invoice_email(
    subject: str,
    body: str,
    attachment_filename: Optional[str] = None
):
    """
    Verify if an email contains invoice-based data using AI classification.
    
    Args:
        subject: Email subject line
        body: Email body text
        attachment_filename: Optional filename of attachment
    
    Returns:
        JSON response indicating if the email contains invoice data
    
    Example Request:
        POST /verify-invoice-email
        {
            "subject": "Your Invoice for October Services",
            "body": "Please find attached the invoice for $500.",
            "attachment_filename": "invoice_123.pdf"
        }
    
    Example Response:
        {
            "success": true,
            "is_invoice": true,
            "confidence": "high",
            "message": "Email contains invoice-based data",
            "details": {
                "subject": "Your Invoice for October Services",
                "has_attachment": true,
                "attachment_name": "invoice_123.pdf"
            }
        }
    """
    
    try:
        # Validate inputs
        if not subject and not body:
            raise HTTPException(
                status_code=400,
                detail="Either subject or body must be provided"
            )
        
        # Classify email
        print(f"📧 Verifying email: Subject='{subject[:50]}...'")
        is_invoice = classify_email_as_invoice(subject, body, attachment_filename)
        
        # Determine confidence based on multiple factors
        confidence = "high"
        if attachment_filename:
            # Check if attachment name suggests invoice
            invoice_keywords = ['invoice', 'bill', 'receipt', 'payment', 'statement']
            if any(keyword in attachment_filename.lower() for keyword in invoice_keywords):
                confidence = "very_high"
        
        response_data = {
            "success": True,
            "is_invoice": is_invoice,
            "confidence": confidence if is_invoice else "n/a",
            "message": "Email contains invoice-based data" if is_invoice else "Email does not contain invoice data",
            "details": {
                "subject": subject,
                "body_length": len(body),
                "has_attachment": attachment_filename is not None,
                "attachment_name": attachment_filename
            }
        }
        
        print(f"✅ Verification result: {is_invoice}")
        
        return JSONResponse(
            status_code=200,
            content=response_data
        )
        
    except Exception as e:
        print(f"❌ Error verifying email: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Email verification failed",
                "message": str(e)
            }
        )


if __name__ == "__main__":
    import uvicorn
    
    print("\n" + "="*60)
    print("🚀 Starting Invoice Processing API Server")
    print("="*60)
    print("📍 API URL: http://localhost:8000")
    print("📚 Docs: http://localhost:8000/docs")
    print("🔧 ReDoc: http://localhost:8000/redoc")
    print("="*60 + "\n")
    
    uvicorn.run(
        "api:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
