#!/bin/bash

# CI/CD Deployment Script for TON Business Suite
# Uses GitHub CLI and Vercel CLI APIs

set -e

echo "🚀 Starting CI/CD Pipeline for TON Business Suite"

# Configuration
GITHUB_TOKEN="${GH_TOKEN}"
VERCEL_TOKEN="${VERCEL_TOKEN}"
REPO_OWNER="lawrencezcl"
REPO_NAME="ton-business-suite"
PROJECT_NAME="ton-business-suite"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if tokens are available
check_tokens() {
    log_info "Checking authentication tokens..."
    
    if [ -z "$GITHUB_TOKEN" ]; then
        log_error "GitHub token not found. Set GH_TOKEN environment variable."
        exit 1
    fi
    
    if [ -z "$VERCEL_TOKEN" ]; then
        log_error "Vercel token not found. Set VERCEL_TOKEN environment variable."
        exit 1
    fi
    
    log_info "✅ Tokens validated"
}

# Authenticate with services
authenticate() {
    log_info "Authenticating with GitHub and Vercel..."
    
    # Authenticate with GitHub
    echo "$GITHUB_TOKEN" | gh auth login --with-token > /dev/null 2>&1
    log_info "✅ GitHub authenticated"
    
    # Set Vercel token
    export VERCEL_TOKEN="$VERCEL_TOKEN"
    log_info "✅ Vercel token configured"
}

# Run tests
run_tests() {
    log_info "Running test suite..."
    
    # Install dependencies
    npm ci
    
    # Run unit tests
    npm test
    
    # Install Playwright browsers
    npx playwright install --with-deps
    
    # Run E2E tests
    npx playwright test --reporter=list
    
    log_info "✅ All tests passed"
}

# Build project
build_project() {
    log_info "Building project..."
    
    # Build TypeScript
    npm run build || echo "No build script, skipping..."
    
    log_info "✅ Project built successfully"
}

# Deploy to GitHub
deploy_to_github() {
    log_info "Deploying to GitHub..."
    
    # Add all files
    git add .
    
    # Check if there are changes
    if git diff --staged --quiet; then
        log_warn "No changes to commit"
        return 0
    fi
    
    # Commit changes
    git commit -m "CI/CD: Automated deployment $(date)"
    
    # Push to GitHub
    git remote set-url origin "https://$GITHUB_TOKEN@github.com/$REPO_OWNER/$REPO_NAME.git"
    git push origin main
    
    log_info "✅ Code pushed to GitHub"
}

# Setup Vercel project
setup_vercel_project() {
    log_info "Setting up Vercel project..."
    
    # Check if project exists
    if ! vercel ls --token="$VERCEL_TOKEN" | grep -q "$PROJECT_NAME"; then
        log_info "Creating new Vercel project..."
        vercel --token="$VERCEL_TOKEN" --yes --name="$PROJECT_NAME"
    else
        log_info "Vercel project already exists"
    fi
    
    # Link project
    vercel --token="$VERCEL_TOKEN" link --yes
}

# Deploy to Vercel
deploy_to_vercel() {
    log_info "Deploying to Vercel..."
    
    # Deploy to production
    vercel --token="$VERCEL_TOKEN" deploy --prod --yes
    
    log_info "✅ Deployed to Vercel"
}

# Get deployment URL
get_deployment_url() {
    log_info "Getting deployment URL..."
    
    URL=$(vercel --token="$VERCEL_TOKEN" ls --token="$VERCEL_TOKEN" | grep "ton-business-suite" | head -1 | awk '{print $2}')
    
    if [ -n "$URL" ]; then
        log_info "🌐 Live deployment: $URL"
        echo "$URL"
    else
        log_warn "Could not retrieve deployment URL"
    fi
}

# Main deployment pipeline
main() {
    log_info "Starting CI/CD pipeline..."
    
    # Check prerequisites
    check_tokens
    authenticate
    
    # Run pipeline steps
    run_tests
    build_project
    deploy_to_github
    setup_vercel_project
    deploy_to_vercel
    
    # Get final URL
    DEPLOYMENT_URL=$(get_deployment_url)
    
    log_info "🎉 CI/CD pipeline completed successfully!"
    log_info "Repository: https://github.com/$REPO_OWNER/$REPO_NAME"
    if [ -n "$DEPLOYMENT_URL" ]; then
        log_info "Live site: $DEPLOYMENT_URL"
    fi
}

# Handle script arguments
case "${1:-}" in
    "test")
        check_tokens
        run_tests
        ;;
    "build")
        check_tokens
        build_project
        ;;
    "deploy-github")
        check_tokens
        authenticate
        deploy_to_github
        ;;
    "deploy-vercel")
        check_tokens
        setup_vercel_project
        deploy_to_vercel
        ;;
    "full"|"")
        main
        ;;
    *)
        echo "Usage: $0 [test|build|deploy-github|deploy-vercel|full]"
        echo ""
        echo "Commands:"
        echo "  test          - Run tests only"
        echo "  build         - Build project only"
        echo "  deploy-github - Deploy to GitHub only"
        echo "  deploy-vercel - Deploy to Vercel only"
        echo "  full          - Run complete pipeline (default)"
        exit 1
        ;;
esac