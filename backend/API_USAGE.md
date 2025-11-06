# Invoice Processing API - Usage Guide

## 🚀 Quick Start

### 1. Install Dependencies
```powershell
cd c:\Users\kunal\OneDrive\Desktop\paygo\backend
pip install -r requirements.txt
```

### 2. Start the API Server
```powershell
python api.py
```

The server will start on: **http://localhost:8000**

- 📚 **Interactive API Docs**: http://localhost:8000/docs
- 🔧 **ReDoc Documentation**: http://localhost:8000/redoc

---

## 📡 API Endpoints

### 1. Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "service": "invoice-processing-api"
}
```

---

### 2. Process Invoice (Main Endpoint)
```http
POST /process-invoice
Content-Type: multipart/form-data
```

**Parameters:**
- `file` (required): Invoice file (PDF, JPG, PNG, TIFF, BMP)
- Max size: 10MB

---

### 3. Verify Invoice Email (NEW)
```http
POST /verify-invoice-email
```

**Query Parameters:**
- `subject` (required): Email subject line
- `body` (required): Email body text
- `attachment_filename` (optional): Attachment filename

**Example:**
```http
POST /verify-invoice-email?subject=Your%20Invoice&body=Please%20find%20attached&attachment_filename=invoice.pdf
```

**Response:**
```json
{
  "success": true,
  "data": {
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
      "value": 58349.04,
      "confidence": 0.95
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
      "value": 9724.92,
      "confidence": 0.957
    }
  },
  "metadata": {
    "filename": "invoice.pdf",
    "file_size_kb": 245.67,
    "file_type": "PDF"
  },
  "message": "Invoice processed successfully. All amounts in INR."
}
```

---

**Response:**
```json
{
  "success": true,
  "is_invoice": true,
  "confidence": "high",
  "message": "Email contains invoice-based data",
  "details": {
    "subject": "Your Invoice for October Services",
    "body_length": 58,
    "has_attachment": true,
    "attachment_name": "invoice_123.pdf"
  }
}
```

---

### 4. Process Invoice (Raw OCR + Enhanced)
```http
POST /process-invoice-raw
Content-Type: multipart/form-data
```

Returns both raw OCR data and enhanced data for comparison.

---

## 🔨 Usage Examples

### PowerShell
```powershell
# Simple request
$file = Get-Item "invoice.pdf"
$form = @{
    file = $file
}
$response = Invoke-RestMethod -Uri "http://localhost:8000/process-invoice" -Method Post -Form $form

# Display result
$response | ConvertTo-Json -Depth 10

# Save to file
$response | ConvertTo-Json -Depth 10 | Out-File "result.json"
```

### Python (requests)
```python
import requests

# Process invoice
url = "http://localhost:8000/process-invoice"
files = {'file': open('invoice.pdf', 'rb')}
response = requests.post(url, files=files)

if response.status_code == 200:
    data = response.json()
    print("Invoice processed!")
    print(f"Total Amount: ₹{data['data']['total_amount']['value']}")
else:
    print(f"Error: {response.status_code}")
```

### cURL
```bash
curl -X POST "http://localhost:8000/process-invoice" \
  -H "accept: application/json" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@invoice.pdf"
```

### JavaScript (fetch)
```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);

fetch('http://localhost:8000/process-invoice', {
  method: 'POST',
  body: formData
})
.then(response => response.json())
.then(data => {
  console.log('Invoice processed:', data);
  console.log('Total:', data.data.total_amount.value, 'INR');
})
.catch(error => console.error('Error:', error));
```

---

## 🧪 Testing

### Run Test Suite
```powershell
python test_api.py
```

This will:
1. Check API health
2. Process a test invoice (if `temp.jpg` exists)
3. Show example commands

### Using Swagger UI
1. Start the server: `python api.py`
2. Open: http://localhost:8000/docs
3. Click on **POST /process-invoice**
4. Click **"Try it out"**
5. Upload your file
6. Click **"Execute"**
7. View the response below

---

## 📁 Supported File Types

- ✅ **PDF** (.pdf)
- ✅ **JPEG** (.jpg, .jpeg)
- ✅ **PNG** (.png)
- ✅ **TIFF** (.tiff, .tif)
- ✅ **BMP** (.bmp)

**Maximum file size**: 10MB

---

## ⚙️ Configuration

### Change Port
Edit `api.py`:
```python
uvicorn.run(
    "api:app",
    host="0.0.0.0",
    port=8080,  # Change port here
    reload=True
)
```

### Enable CORS for Specific Domains
Edit `api.py`:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://yourdomain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 🔐 Environment Variables

Make sure your `.env` file contains:
```env
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=your_endpoint
AZURE_DOCUMENT_INTELLIGENCE_KEY=your_key
OPENAI_API_KEY=your_openai_key
```

---

## 📊 Response Fields

All responses include:

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Request success status |
| `data` | object | Enhanced invoice data (all amounts in INR) |
| `metadata` | object | File information |
| `message` | string | Status message |

### Data Object Fields:

| Field | Description | Example |
|-------|-------------|---------|
| `invoice_number` | Invoice ID | "F1000876/23" |
| `vendor_name` | Vendor/Company name | "ACME Corp" |
| `invoice_date` | Invoice date (YYYY-MM-DD) | "2023-08-14" |
| `total_amount` | Total amount in INR | 58349.04 |
| `tax_amount` | Tax amount in INR | 9724.92 |
| `purchase_order` | PO number | "X001525" |
| `due_date` | Payment due date | "2023-09-14" or "nil" |
| `gst_number` | GST number | "22AAAAA0000A1Z5" or "nil" |

Each field includes a `confidence` score (0.0 - 1.0).

---

## 🐛 Troubleshooting

### Server won't start
```powershell
# Check if port 8000 is in use
netstat -ano | findstr :8000

# Kill process if needed (replace PID)
taskkill /PID <PID> /F

# Or use a different port
# Edit api.py and change port number
```

### Import errors
```powershell
# Reinstall dependencies
pip install -r requirements.txt --upgrade
```

### Azure/OpenAI errors
```powershell
# Check .env file exists and has valid keys
cat .env
```

---

## 🚀 Production Deployment

### Using Gunicorn (Linux/Mac)
```bash
gunicorn api:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

### Using Docker
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## 📞 API Integration Example (React)

```jsx
import { useState } from 'react';

function InvoiceUpload() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);

    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/process-invoice', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input type="file" onChange={handleUpload} accept=".pdf,.jpg,.jpeg,.png" />
      {loading && <p>Processing...</p>}
      {result && (
        <div>
          <h3>Invoice: {result.data.invoice_number.value}</h3>
          <p>Total: ₹{result.data.total_amount.value}</p>
          <p>Vendor: {result.data.vendor_name.value}</p>
        </div>
      )}
    </div>
  );
}
```

---

## 📝 Notes

- All amounts are automatically converted to **INR (Indian Rupees)**
- Currency field is removed from output
- OCR processing uses **Azure Document Intelligence**
- Data enhancement uses **OpenAI GPT-4**
- Live exchange rates from **ExchangeRate-API**
- Files are processed in temporary storage and automatically cleaned up

---

**Need help?** Check the interactive docs at http://localhost:8000/docs
