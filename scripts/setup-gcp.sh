#!/bin/bash
# Setup script for Google Cloud Gemini API

set -e

PROJECT_ID="sunbird-ai-job-screener"

echo "=== Umurava AI Screener - GCP Setup ==="
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "ERROR: gcloud CLI not found. Install from: https://cloud.google.com/sdk"
    exit 1
fi

# Set the project
echo "Setting project to: $PROJECT_ID"
gcloud config set project $PROJECT_ID

# Verify project
CURRENT_PROJECT=$(gcloud config get-value project)
if [ "$CURRENT_PROJECT" != "$PROJECT_ID" ]; then
    echo "ERROR: Failed to set project. Current: $CURRENT_PROJECT"
    exit 1
fi
echo "Project set successfully: $CURRENT_PROJECT"
echo ""

# Enable the Gemini API
echo "Enabling Gemini API..."
gcloud services enable generativelanguage.googleapis.com
echo "API enabled successfully"
echo ""

# Check API status
echo "Checking enabled services..."
gcloud services list --enabled --filter="generative" --format="table(name,title)"
echo ""

# Instructions for API key creation
echo "=== Next Steps ==="
echo ""
echo "Create an API key using one of these methods:"
echo ""
echo "Option 1: Using gcloud (recommended)"
echo "  gcloud alpha services api-keys create --display-name='Umurava Screener'"
echo ""
echo "Option 2: Using Google AI Studio"
echo "  Visit: https://aistudio.google.com/app/apikey"
echo "  Create a new API key and copy it"
echo ""
echo "Option 3: Using Cloud Console"
echo "  Visit: https://console.cloud.google.com/apis/credentials"
echo "  Click 'Create Credentials' > 'API Key'"
echo ""
echo "Then add to your .env file:"
echo "  GEMINI_API_KEY=your-api-key-here"
echo ""
echo "=== Setup Complete ==="