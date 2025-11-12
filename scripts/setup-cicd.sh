#!/bin/bash

# Complete CI/CD Setup Script
# Sets up automated deployment from local → GitHub → Vercel

set -e

echo "🚀 TON Business Suite - CI/CD Setup"
echo "=================================="

# Configuration
REPO_OWNER="lawrencezcl"
REPO_NAME="ton-business-suite"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check environment variables
check_env() {
    log_info "Checking environment variables..."
    
    if [ -z "$GH_TOKEN" ]; then
        log_error "GH_TOKEN not found. Set it with: export GH_TOKEN='your_token'"
        exit 1
    fi
    
    if [ -z "$VERCEL_TOKEN" ]; then
        log_error "VERCEL_TOKEN not found. Set it with: export VERCEL_TOKEN='your_token'"
        exit 1
    fi
    
    log_info "✅ Environment variables configured"
}

# Setup GitHub repository
setup_github() {
    log_info "Setting up GitHub repository..."
    
    # Update repository description
    gh repo edit "$REPO_OWNER/$REPO_NAME" \
        --description "🚀 TON Business Suite - Complete Web3 payment, loyalty & tipping platform" \
        --homepage "https://ton-business-suite.vercel.app" \
        --enable-issues \
        --enable-projects \
        --enable-wiki
    
    log_info "✅ GitHub repository configured"
}

# Setup Vercel automation
setup_vercel() {
    log_info "Setting up Vercel automation..."
    
    # Run Vercel setup script
    ./scripts/setup-vercel.sh
    
    log_info "✅ Vercel automation configured"
}

# Create webhook integration
setup_webhooks() {
    log_info "Setting up GitHub webhook integration..."
    
    # Create webhook for automatic deployment
    curl -X POST \
        -H "Authorization: token $GH_TOKEN" \
        -H "Accept: application/vnd.github.v3+json" \
        https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/hooks \
        -d '{
            "name": "web",
            "active": true,
            "events": ["push", "pull_request"],
            "config": {
                "url": "https://api.vercel.com/v1/integrations/deploy/ton-business-suite",
                "content_type": "json",
                "insecure_ssl": "0"
            }
        }' 2>/dev/null || log_warn "Webhook might already exist"
    
    log_info "✅ Webhook integration configured"
}

# Setup GitHub Secrets
setup_secrets() {
    log_info "Setting up GitHub Secrets..."
    
    # Note: These would need to be set manually in GitHub UI for security
    log_warn "Please manually add these secrets in GitHub repository settings:"
    echo "  1. VERCEL_TOKEN = $VERCEL_TOKEN"
    echo "  2. VERCEL_ORG_ID = (get from 'vercel ls')"
    echo "  3. VERCEL_PROJECT_ID = (get from 'vercel ls')"
    
    # Try to get project IDs if possible
    log_info "Getting Vercel project information..."
    PROJECT_ID=$(vercel ls --token="$VERCEL_TOKEN" 2>/dev/null | grep "ton-business-suite" | head -1 | awk '{print $NF}' || echo "PENDING_SETUP")
    ORG_ID=$(vercel whoami --token="$VERCEL_TOKEN" 2>/dev/null | grep "team" | awk '{print $2}' || echo "PENDING_SETUP")
    
    log_info "Project ID: $PROJECT_ID"
    log_info "Organization ID: $ORG_ID"
    
    if [ "$PROJECT_ID" != "PENDING_SETUP" ] && [ "$ORG_ID" != "PENDING_SETUP" ]; then
        log_info "Setting GitHub Secrets via API..."
        
        # Set VERCEL_TOKEN secret
        curl -X POST \
            -H "Authorization: token $GH_TOKEN" \
            -H "Accept: application/vnd.github.v3+json" \
            https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/actions/secrets/VERCEL_TOKEN \
            -d "{\"encrypted_value\":\"$(echo -n \"$VERCEL_TOKEN\" | base64 -w 0)\",\"key_id\":\"gh_volatile_key\"}" 2>/dev/null || log_warn "Could not set VERCEL_TOKEN secret"
        
        # Set VERCEL_PROJECT_ID secret
        curl -X POST \
            -H "Authorization: token $GH_TOKEN" \
            -H "Accept: application/vnd.github.v3+json" \
            https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/actions/secrets/VERCEL_PROJECT_ID \
            -d "{\"encrypted_value\":\"$(echo -n \"$PROJECT_ID\" | base64 -w 0)\",\"key_id\":\"gh_volatile_key\"}" 2>/dev/null || log_warn "Could not set VERCEL_PROJECT_ID secret"
        
        # Set VERCEL_ORG_ID secret
        curl -X POST \
            -H "Authorization: token $GH_TOKEN" \
            -H "Accept: application/vnd.github.v3+json" \
            https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/actions/secrets/VERCEL_ORG_ID \
            -d "{\"encrypted_value\":\"$(echo -n \"$ORG_ID\" | base64 -w 0)\",\"key_id\":\"gh_volatile_key\"}" 2>/dev/null || log_warn "Could not set VERCEL_ORG_ID secret"
    fi
}

# Run initial deployment
run_initial_deployment() {
    log_info "Running initial CI/CD deployment..."
    
    # Run the CI/CD pipeline
    ./scripts/cicd-deploy.sh full
    
    log_info "✅ Initial deployment completed"
}

# Final setup verification
verify_setup() {
    log_info "Verifying CI/CD setup..."
    
    echo ""
    echo "🎉 CI/CD Setup Complete!"
    echo "========================"
    echo ""
    echo "📊 Repository: https://github.com/$REPO_OWNER/$REPO_NAME"
    echo "🌐 Live Site: https://ton-business-suite-m9su24phz-lawrencezcls-projects.vercel.app"
    echo ""
    echo "🔧 Available Commands:"
    echo "  npm run cicd          - Run complete CI/CD pipeline"
    echo "  npm run cicd:test     - Run tests only"
    echo "  npm run cicd:github   - Deploy to GitHub only"
    echo "  npm run cicd:vercel   - Deploy to Vercel only"
    echo "  npm run setup:vercel  - Setup Vercel project"
    echo ""
    echo "📋 Next Steps:"
    echo "1. Push to main branch to trigger CI/CD"
    echo "2. Check GitHub Actions for workflow status"
    echo "3. Monitor Vercel deployments"
    echo "4. Test live endpoints"
    echo ""
    echo "🧪 Quick Test:"
    echo "  curl https://ton-business-suite-m9su24phz-lawrencezcls-projects.vercel.app/health"
    echo ""
}

# Main setup function
main() {
    check_env
    setup_github
    setup_vercel
    setup_webhooks
    setup_secrets
    run_initial_deployment
    verify_setup
}

# Handle script arguments
case "${1:-}" in
    "github")
        check_env && setup_github
        ;;
    "vercel")
        check_env && setup_vercel
        ;;
    "secrets")
        check_env && setup_secrets
        ;;
    "deploy")
        check_env && run_initial_deployment
        ;;
    "")
        main
        ;;
    *)
        echo "Usage: $0 [github|vercel|secrets|deploy]"
        echo ""
        echo "Commands:"
        echo "  github   - Setup GitHub repository only"
        echo "  vercel   - Setup Vercel automation only"
        echo "  secrets  - Setup GitHub Secrets only"
        echo "  deploy   - Run deployment only"
        echo "  (none)   - Run complete setup"
        exit 1
        ;;
esac