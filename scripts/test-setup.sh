#!/bin/bash

# TON Business Suite - Quick Setup Test Script
# This script tests if the development environment is properly set up

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
    echo -e "
${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}
"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Test Node.js and npm
test_nodejs() {
    print_header "Testing Node.js Environment"
    
    # Check Node.js
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        print_success "Node.js: $NODE_VERSION"
        
        # Check version
        MAJOR_VERSION=$(echo $NODE_VERSION | sed 's/v//' | cut -d. -f1)
        if [ "$MAJOR_VERSION" -lt 18 ]; then
            print_error "Node.js version 18+ required. Current: $NODE_VERSION"
            return 1
        fi
    else
        print_error "Node.js not found"
        return 1
    fi
    
    # Check npm
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        print_success "npm: $NPM_VERSION"
    else
        print_error "npm not found"
        return 1
    fi
    
    # Check TypeScript
    if command -v tsc &> /dev/null || npm list -g typescript &> /dev/null; then
        print_success "TypeScript available"
    else
        print_warning "TypeScript not globally installed (may be okay)"
    fi
}

# Test project structure
test_project_structure() {
    print_header "Testing Project Structure"
    
    local required_files=(
        "package.json"
        "tsconfig.json"
        ".eslintrc.js"
        ".prettierrc"
        ".gitignore"
        "README.md"
        "jest.config.js"
        ".env.example"
    )
    
    local required_dirs=(
        "src"
        "services"
        "contracts"
        "apps"
        "packages"
        "tests"
        "scripts"
    )
    
    # Check files
    for file in "${required_files[@]}"; do
        if [ -f "$file" ]; then
            print_success "File: $file"
        else
            print_error "Missing file: $file"
            return 1
        fi
    done
    
    # Check directories
    for dir in "${required_dirs[@]}"; do
        if [ -d "$dir" ]; then
            print_success "Directory: $dir"
        else
            print_error "Missing directory: $dir"
            return 1
        fi
    done
}

# Test environment files
test_environment() {
    print_header "Testing Environment Configuration"
    
    if [ -f ".env" ]; then
        print_success ".env file exists"
    else
        print_warning ".env file missing (will be created from .env.example)"
        cp .env.example .env 2>/dev/null || true
        print_info "Created .env from .env.example"
    fi
    
    if [ -f ".env.test" ]; then
        print_success ".env.test file exists"
    else
        print_warning ".env.test file missing"
    fi
}

# Test dependencies
test_dependencies() {
    print_header "Testing Dependencies"
    
    if [ -d "node_modules" ]; then
        print_success "node_modules directory exists"
    else
        print_warning "node_modules directory missing"
        print_info "Run: npm install"
    fi
    
    # Check if package.json has required scripts
    if grep -q '"dev"' package.json; then
        print_success "Development script defined"
    else
        print_error "Development script missing"
        return 1
    fi
    
    if grep -q '"build"' package.json; then
        print_success "Build script defined"
    else
        print_error "Build script missing"
        return 1
    fi
    
    if grep -q '"test"' package.json; then
        print_success "Test script defined"
    else
        print_error "Test script missing"
        return 1
    fi
}

# Test Docker availability
test_docker() {
    print_header "Testing Docker Setup"
    
    if command -v docker &> /dev/null; then
        DOCKER_VERSION=$(docker --version)
        print_success "Docker: $DOCKER_VERSION"
    else
        print_warning "Docker not available (databases will need manual setup)"
    fi
    
    if command -v docker-compose &> /dev/null; then
        COMPOSE_VERSION=$(docker-compose --version)
        print_success "Docker Compose: $COMPOSE_VERSION"
    else
        print_warning "Docker Compose not available"
    fi
    
    if [ -f "docker-compose.yml" ]; then
        print_success "docker-compose.yml exists"
    else
        print_error "docker-compose.yml missing"
        return 1
    fi
}

# Test services structure
test_services() {
    print_header "Testing Services Structure"
    
    local services=(
        "api-gateway"
        "payment-service"
        "loyalty-service"
        "tipping-service"
    )
    
    for service in "${services[@]}"; do
        if [ -d "services/$service" ]; then
            if [ -f "services/$service/package.json" ]; then
                print_success "Service: $service (package.json exists)"
            else
                print_error "Service: $service (package.json missing)"
                return 1
            fi
        else
            print_error "Service directory missing: $service"
            return 1
        fi
    done
}

# Test smart contracts
test_contracts() {
    print_header "Testing Smart Contracts"
    
    local contracts=(
        "loyalty-token.fc"
        "payment-escrow.fc"
        "instant-tip-transfer.fc"
        "cross-merchant-registry.fc"
        "op-codes.fc"
    )
    
    for contract in "${contracts[@]}"; do
        if [ -f "contracts/$contract" ]; then
            print_success "Contract: $contract"
        else
            print_error "Contract missing: $contract"
            return 1
        fi
    done
}

# Test build capability
test_build() {
    print_header "Testing Build Capability"
    
    if command -v tsc &> /dev/null; then
        print_success "TypeScript compiler available"
        
        # Test basic compilation
        if tsc --noEmit --skipLibCheck; then
            print_success "TypeScript compilation test passed"
        else
            print_warning "TypeScript compilation issues found"
        fi
    else
        print_warning "TypeScript compiler not available globally"
    fi
}

# Test scripts
test_scripts() {
    print_header "Testing Development Scripts"
    
    if [ -f "scripts/dev-setup.sh" ]; then
        if [ -x "scripts/dev-setup.sh" ]; then
            print_success "Development setup script is executable"
        else
            print_warning "Development setup script not executable"
            print_info "Run: chmod +x scripts/dev-setup.sh"
        fi
    else
        print_error "Development setup script missing"
        return 1
    fi
}

# Main test execution
main() {
    print_header "TON Business Suite - Development Environment Test"
    
    local failed_tests=0
    
    # Run all tests
    test_nodejs || failed_tests=$((failed_tests + 1))
    test_project_structure || failed_tests=$((failed_tests + 1))
    test_environment || failed_tests=$((failed_tests + 1))
    test_dependencies || failed_tests=$((failed_tests + 1))
    test_docker || failed_tests=$((failed_tests + 1))
    test_services || failed_tests=$((failed_tests + 1))
    test_contracts || failed_tests=$((failed_tests + 1))
    test_build || failed_tests=$((failed_tests + 1))
    test_scripts || failed_tests=$((failed_tests + 1))
    
    # Summary
    print_header "Test Summary"
    
    if [ $failed_tests -eq 0 ]; then
        print_success "All tests passed! 🎉"
        print_info "Your development environment is ready."
        print_info ""
        print_info "Next steps:"
        print_info "1. Run: ./scripts/dev-setup.sh"
        print_info "2. Or manually: npm install && npm run dev"
        print_info "3. Access API Gateway: http://localhost:3000/health"
    else
        print_error "$failed_tests test(s) failed"
        print_info "Please fix the issues above before continuing."
        print_info ""
        print_info "Common fixes:"
        print_info "- Install Node.js 18+: https://nodejs.org/"
        print_info "- Run: npm install"
        print_info "- Make scripts executable: chmod +x scripts/*.sh"
    fi
    
    return $failed_tests
}

# Handle command line arguments
case "${1:-}" in
    --help|-h)
        echo "TON Business Suite - Development Environment Test"
        echo ""
        echo "Usage: $0 [option]"
        echo ""
        echo "Options:"
        echo "  (no option)  Run all tests"
        echo "  --help       Show this help"
        echo ""
        echo "This script tests if your development environment is properly set up."
        exit 0
        ;;
    *)
        main
        ;;
esac
