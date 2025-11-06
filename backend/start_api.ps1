# Invoice Processing API - Quick Start Script
# This script installs dependencies and starts the API server

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Invoice Processing API - Setup & Start" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Check if Python is installed
Write-Host "Checking Python installation..." -ForegroundColor Yellow
$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $python) {
    Write-Host "Error: Python not found!" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Python found: $($python.Version)" -ForegroundColor Green

# Navigate to backend directory
Set-Location $PSScriptRoot
Write-Host "`n✓ Current directory: $PWD" -ForegroundColor Green

# Check .env file
if (-not (Test-Path ".env")) {
    Write-Host "`n⚠️  Warning: .env file not found!" -ForegroundColor Yellow
    Write-Host "Create .env file with:" -ForegroundColor Yellow
    Write-Host "  AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=your_endpoint"
    Write-Host "  AZURE_DOCUMENT_INTELLIGENCE_KEY=your_key"
    Write-Host "  OPENAI_API_KEY=your_openai_key`n"
}

# Install dependencies
Write-Host "`nInstalling dependencies..." -ForegroundColor Yellow
pip install -r requirements.txt --quiet

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Dependencies installed successfully" -ForegroundColor Green
} else {
    Write-Host "⚠️  Some dependencies may have failed to install" -ForegroundColor Yellow
}

# Start the server
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Starting API Server..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📍 API URL: http://localhost:8000" -ForegroundColor Green
Write-Host "📚 Docs: http://localhost:8000/docs" -ForegroundColor Green
Write-Host "🔧 ReDoc: http://localhost:8000/redoc" -ForegroundColor Green
Write-Host "`nPress Ctrl+C to stop the server`n" -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Cyan

python api.py
