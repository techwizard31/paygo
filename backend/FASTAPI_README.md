# 🚀 FastAPI Invoice Processing - Quick Start

## ✅ What's Been Created

### 1. **FastAPI Server** (`api.py`)
   - Accepts PDF/image uploads via POST request
   - Processes invoices using Azure OCR + OpenAI
   - Converts all amounts to INR automatically
   - Removes currency field from output
   - CORS enabled for frontend access

### 2. **Supporting Files**
   - `test_api.py` - Python test script
   - `test_ui.html` - Web interface for testing
   - `start_api.ps1` - PowerShell startup script
   - `Invoice_API.postman_collection.json` - Postman collection
   - `API_USAGE.md` - Complete API documentation

---

## 🎯 Quick Start (3 Steps)

### Step 1: Install Dependencies
```powershell
cd c:\Users\kunal\OneDrive\Desktop\paygo\backend
pip install -r requirements.txt
```

### Step 2: Start the Server
```powershell
python api.py
```

**OR** use the PowerShell script:
```powershell
.\start_api.ps1
```

### Step 3: Test It!
Open one of these in your browser:
- **Interactive Docs**: http://localhost:8000/docs
- **Test UI**: Open `test_ui.html` in browser
- **Health Check**: http://localhost:8000/health

---

## 📡 API Endpoints

### Main Endpoint
```http
POST http://localhost:8000/process-invoice
Content-Type: multipart/form-data

Body: file (PDF/JPG/PNG)
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "invoice_number": {"value": "F1000876/23", "confidence": 0.966},
    "vendor_name": {"value": "COMPANY", "confidence": 0.391},
    "total_amount": {"value": 58349.04, "confidence": 0.95},
    "tax_amount": {"value": 9724.92, "confidence": 0.957}
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

## 🧪 Testing Methods

### Method 1: Web UI (Easiest)
1. Open `test_ui.html` in your browser
2. Drag and drop or click to upload invoice
3. Click "Process Invoice"
4. View results instantly!

### Method 2: Swagger UI (Interactive)
1. Start server: `python api.py`
2. Open: http://localhost:8000/docs
3. Click on POST `/process-invoice`
4. Click "Try it out"
5. Upload file and execute

### Method 3: Python Script
```powershell
python test_api.py
```

### Method 4: PowerShell
```powershell
$file = Get-Item "temp.jpg"
$form = @{ file = $file }
$response = Invoke-RestMethod -Uri "http://localhost:8000/process-invoice" -Method Post -Form $form
$response | ConvertTo-Json -Depth 10
```

### Method 5: Postman
1. Import `Invoice_API.postman_collection.json`
2. Open "Process Invoice" request
3. Go to Body → form-data
4. Select file
5. Send request

### Method 6: cURL
```bash
curl -X POST "http://localhost:8000/process-invoice" \
  -F "file=@temp.jpg"
```

---

## 📦 What's Included

```
backend/
├── api.py                                  # FastAPI server
├── currency_converter.py                    # Currency conversion module
├── extract_json.py                          # OpenAI extraction (updated)
├── ocr.py                                   # Azure OCR processing
├── main.py                                  # CLI workflow
├── requirements.txt                         # Updated dependencies
├── test_api.py                              # API test script
├── test_ui.html                             # Web test interface
├── start_api.ps1                            # Startup script
├── Invoice_API.postman_collection.json      # Postman collection
├── API_USAGE.md                             # Full documentation
└── CURRENCY_CONVERSION_README.md            # Currency info
```

---

## 🔧 Configuration

### Environment Variables
Create/update `.env` file:
```env
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=your_endpoint
AZURE_DOCUMENT_INTELLIGENCE_KEY=your_key
OPENAI_API_KEY=your_openai_key
```

### Change Port
Edit `api.py` line 240:
```python
uvicorn.run("api:app", host="0.0.0.0", port=8080)  # Change 8000 to 8080
```

---

## 💡 Usage Examples

### JavaScript/TypeScript
```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);

const response = await fetch('http://localhost:8000/process-invoice', {
  method: 'POST',
  body: formData
});

const data = await response.json();
console.log('Total Amount (INR):', data.data.total_amount.value);
```

### Python
```python
import requests

files = {'file': open('invoice.pdf', 'rb')}
response = requests.post('http://localhost:8000/process-invoice', files=files)
data = response.json()

print(f"Total: ₹{data['data']['total_amount']['value']}")
```

### React Component
```jsx
async function uploadInvoice(file) {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch('http://localhost:8000/process-invoice', {
    method: 'POST',
    body: formData
  });
  
  return await response.json();
}
```

---

## 🎯 Key Features

✅ **Multiple File Formats**: PDF, JPG, PNG, TIFF, BMP  
✅ **Automatic INR Conversion**: All amounts converted to Indian Rupees  
✅ **Live Exchange Rates**: Real-time currency conversion  
✅ **No Currency Field**: Clean output without currency key  
✅ **High Accuracy**: Azure OCR + OpenAI GPT-4  
✅ **RESTful API**: Standard HTTP POST endpoint  
✅ **CORS Enabled**: Works with any frontend  
✅ **Interactive Docs**: Built-in Swagger UI  
✅ **Error Handling**: Comprehensive error messages  
✅ **File Validation**: Size and type checking  

---

## 🐛 Troubleshooting

### Server won't start
```powershell
# Check if port is in use
netstat -ano | findstr :8000

# Kill the process
taskkill /PID <PID> /F
```

### Cannot connect to API
1. Make sure server is running: `python api.py`
2. Check firewall settings
3. Try accessing: http://localhost:8000/health

### Import errors
```powershell
pip install -r requirements.txt --upgrade
```

### Azure/OpenAI errors
1. Check `.env` file exists
2. Verify API keys are correct
3. Check Azure endpoint URL

---

## 📊 Response Format

All responses follow this structure:

```json
{
  "success": boolean,
  "data": {
    "invoice_number": {"value": string, "confidence": number},
    "vendor_name": {"value": string, "confidence": number},
    "invoice_date": {"value": string, "confidence": number},
    "total_amount": {"value": number, "confidence": number},
    "tax_amount": {"value": number, "confidence": number},
    "purchase_order": {"value": string, "confidence": number},
    "due_date": {"value": string, "confidence": number},
    "gst_number": {"value": string, "confidence": number}
  },
  "metadata": {
    "filename": string,
    "file_size_kb": number,
    "file_type": string
  },
  "message": string
}
```

**Note**: Currency field is automatically removed. All amounts are in INR.

---

## 🚀 Next Steps

### 1. Production Deployment
```bash
# Install gunicorn
pip install gunicorn

# Run with workers
gunicorn api:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

### 2. Docker Deployment
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 3. Add Authentication
```python
from fastapi.security import HTTPBearer

security = HTTPBearer()

@app.post("/process-invoice")
async def process_invoice(
    file: UploadFile,
    token: str = Depends(security)
):
    # Verify token
    ...
```

---

## 📚 Documentation Links

- **FastAPI Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **API Usage**: See `API_USAGE.md`
- **Currency Conversion**: See `CURRENCY_CONVERSION_README.md`

---

## ✨ What Changed from CLI Version

| Feature | CLI (`main.py`) | API (`api.py`) |
|---------|----------------|----------------|
| Interface | Command line | HTTP REST API |
| Input | File path argument | Multipart upload |
| Output | JSON files | JSON response |
| Usage | `python main.py --file` | `POST /process-invoice` |
| Access | Local only | Network accessible |
| Integration | Terminal/scripts | Any HTTP client |

Both versions use the same processing pipeline:
1. Azure OCR → 2. Extract data → 3. OpenAI enhancement → 4. Currency conversion

---

## 🎉 Ready to Use!

Start the server:
```powershell
python api.py
```

Then open: http://localhost:8000/docs

Upload an invoice and get instant JSON results! 🚀
