#!/bin/bash

# Vercel CLI Setup and Automation Script
# Automates Vercel project configuration and deployment

set -e

VERCEL_TOKEN="${VERCEL_TOKEN}"
PROJECT_NAME="ton-business-suite"
DOMAIN="ton-business-suite.vercel.app"

echo "🔧 Setting up Vercel CLI automation..."

# Check Vercel token
if [ -z "$VERCEL_TOKEN" ]; then
    echo "❌ VERCEL_TOKEN not found. Please set environment variable."
    exit 1
fi

# Install Vercel CLI if not present
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel@latest
fi

echo "✅ Vercel CLI ready"

# Configure authentication
export VERCEL_TOKEN="$VERCEL_TOKEN"

# Login to Vercel
echo "🔐 Authenticating with Vercel..."
export VERCEL_TOKEN="$VERCEL_TOKEN"
# Note: Vercel token is set via environment variable, no explicit login needed

# Create or link project
echo "🏗️ Setting up project: $PROJECT_NAME"

# Check if project exists
if vercel ls --token="$VERCEL_TOKEN" | grep -q "$PROJECT_NAME"; then
    echo "📎 Linking existing project..."
    vercel link --yes --token="$VERCEL_TOKEN"
else
    echo "🆕 Creating new Vercel project..."
    vercel --yes --name="$PROJECT_NAME" --token="$VERCEL_TOKEN"
fi

# Configure project settings
echo "⚙️ Configuring project settings..."

# Set environment variables
vercel env add NODE_ENV production --token="$VERCEL_TOKEN" <<< "production"
vercel env add API_PORT production --token="$VERCEL_TOKEN" <<< "3001"

# Configure build settings
echo "🔨 Configuring build settings..."

# Create/update vercel.json for proper routing
cat > vercel.json << EOF
{
  "version": 2,
  "name": "$PROJECT_NAME",
  "builds": [
    {
      "src": "services/api-gateway/src/simple-index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/services/api-gateway/src/simple-index.js"
    },
    {
      "src": "/(.*)",
      "dest": "/services/api-gateway/src/simple-index.js"
    }
  ],
  "env": {
    "NODE_ENV": "production",
    "API_PORT": "3001"
  },
  "regions": ["iad1"]
}
EOF

echo "✅ Vercel configuration updated"

# Initial deployment
echo "🚀 Deploying to production..."
vercel deploy --prod --yes --token="$VERCEL_TOKEN"

# Get deployment URL
DEPLOYMENT_URL=$(vercel ls --token="$VERCEL_TOKEN" | grep "$PROJECT_NAME" | head -1 | awk '{print $2}')
echo "🌐 Live at: $DEPLOYMENT_URL"

# Setup webhook for GitHub integration
echo "🔗 Setting up GitHub webhook integration..."
echo "Configure GitHub webhook in repository settings:"
echo "URL: https://api.vercel.com/v1/integrations/deploy/$PROJECT_NAME"
echo "Events: push, pull_request"

echo "✅ Vercel setup completed!"
echo "Next steps:"
echo "1. Configure GitHub secrets (VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID)"
echo "2. Enable GitHub Actions in the repository"
echo "3. Push to main branch to trigger deployment"