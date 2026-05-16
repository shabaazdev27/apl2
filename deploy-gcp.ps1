# FanPulse AI - Google Cloud Deployment Script
# Project ID: shabaaz-ai

$PROJECT_ID = "shabaaz-ai"
$SERVICE_NAME = "fanpulse-ai"
$REGION = "us-central1"

Write-Host "🚀 Starting deployment for project: $PROJECT_ID" -ForegroundColor Cyan

# 1. Set the Google Cloud project
Write-Host "📍 Setting gcloud project to $PROJECT_ID..."
gcloud config set project $PROJECT_ID

# 2. Enable necessary Google Cloud APIs
Write-Host "⚙️ Enabling Google Cloud APIs..."
gcloud services enable run.googleapis.com `
                       cloudbuild.googleapis.com `
                       secretmanager.googleapis.com `
                       logging.googleapis.com

# 3. Build the container image using Cloud Build
Write-Host "🏗️ Building container image with Cloud Build..."
gcloud builds submit --tag gcr.io/$PROJECT_ID/$SERVICE_NAME

# 4. Deploy to Cloud Run
Write-Host "🚢 Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME `
    --image gcr.io/$PROJECT_ID/$SERVICE_NAME `
    --platform managed `
    --region $REGION `
    --allow-unauthenticated `
    --set-env-vars="GOOGLE_CLOUD_PROJECT=$PROJECT_ID,NODE_ENV=production"

Write-Host "✅ Deployment Complete!" -ForegroundColor Green
Write-Host "🔗 Your service is now live on Cloud Run."
