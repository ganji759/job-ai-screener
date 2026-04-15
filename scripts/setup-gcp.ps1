# PowerShell Setup script for Google Cloud Gemini API

$ErrorActionPreference = "Stop"

$PROJECT_ID = "sunbird-ai-job-screener"

Write-Host "=== Umurava AI Screener - GCP Setup ===" -ForegroundColor Cyan
Write-Host ""

# Check if gcloud is installed
$gcloudPath = Get-Command gcloud -ErrorAction SilentlyContinue
if (-not $gcloudPath) {
    Write-Host "ERROR: gcloud CLI not found. Install from: https://cloud.google.com/sdk" -ForegroundColor Red
    exit 1
}

# Set the project
Write-Host "Setting project to: $PROJECT_ID" -ForegroundColor Yellow
gcloud config set project $PROJECT_ID

# Verify project
$CURRENT_PROJECT = gcloud config get-value project
if ($CURRENT_PROJECT -ne $PROJECT_ID) {
    Write-Host "ERROR: Failed to set project. Current: $CURRENT_PROJECT" -ForegroundColor Red
    exit 1
}
Write-Host "Project set successfully: $CURRENT_PROJECT" -ForegroundColor Green
Write-Host ""

# Enable the Gemini API
Write-Host "Enabling Gemini API..." -ForegroundColor Yellow
gcloud services enable generativelanguage.googleapis.com
Write-Host "API enabled successfully" -ForegroundColor Green
Write-Host ""

# Check API status
Write-Host "Checking enabled services..." -ForegroundColor Yellow
gcloud services list --enabled --filter="generative" --format="table(name,title)"
Write-Host ""

# Instructions for API key creation
Write-Host "=== Next Steps ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Create an API key using one of these methods:" -ForegroundColor White
Write-Host ""
Write-Host "Option 1: Using gcloud (recommended)" -ForegroundColor Green
Write-Host "  gcloud alpha services api-keys create --display-name='Umurava Screener'"
Write-Host ""
Write-Host "Option 2: Using Google AI Studio" -ForegroundColor Green
Write-Host "  Visit: https://aistudio.google.com/app/apikey"
Write-Host "  Create a new API key and copy it"
Write-Host ""
Write-Host "Option 3: Using Cloud Console" -ForegroundColor Green
Write-Host "  Visit: https://console.cloud.google.com/apis/credentials"
Write-Host "  Click 'Create Credentials' > 'API Key'"
Write-Host ""
Write-Host "Then add to your .env file:" -ForegroundColor White
Write-Host "  GEMINI_API_KEY=your-api-key-here"
Write-Host ""
Write-Host "=== Setup Complete ===" -ForegroundColor Cyan