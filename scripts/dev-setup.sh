#!/bin/bash

# TON Business Suite - Local Development Setup Script
# This script sets up the complete development environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
    echo -e "\n${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}\n"
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

# Check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"
    
    # Check Node.js
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        print_success "Node.js found: $NODE_VERSION"
        
        # Check if version is >= 18.0.0
        MAJOR_VERSION=$(echo $NODE_VERSION | sed 's/v//' | cut -d. -f1)
        if [ "$MAJOR_VERSION" -lt 18 ]; then
            print_error "Node.js version 18 or higher is required. Current: $NODE_VERSION"
            exit 1
        fi
    else
        print_error "Node.js is not installed. Please install Node.js 18+ from https://nodejs.org/"
        exit 1
    fi
    
    # Check npm
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        print_success "npm found: $NPM_VERSION"
    else
        print_error "npm is not installed. Please install npm."
        exit 1
    fi
    
    # Check Docker (optional but recommended)
    if command -v docker &> /dev/null; then
        DOCKER_VERSION=$(docker --version)
        print_success "Docker found: $DOCKER_VERSION"
    else
        print_warning "Docker not found. Docker is recommended for database services."
    fi
    
    # Check Docker Compose (optional)
    if command -v docker-compose &> /dev/null; then
        COMPOSE_VERSION=$(docker-compose --version)
        print_success "Docker Compose found: $COMPOSE_VERSION"
    else
        print_warning "Docker Compose not found. You'll need to set up databases manually."
    fi
}

# Setup environment files
setup_environment() {
    print_header "Setting up Environment Files"
    
    if [ ! -f .env ]; then
        print_info "Creating .env from .env.example..."
        cp .env.example .env
        print_success "Created .env file"
        print_warning "Please edit .env file with your actual configuration values"
    else
        print_info ".env file already exists, skipping..."
    fi
    
    if [ ! -f .env.test ]; then
        print_info "Test environment file exists"
    else
        print_info "Test environment file ready"
    fi
}

# Install dependencies
install_dependencies() {
    print_header "Installing Dependencies"
    
    print_info "Installing root dependencies..."
    npm install
    
    # Install workspace dependencies
    print_info "Installing package dependencies..."
    npm run build:workspaces || {
        print_warning "Some workspace dependencies failed to install, continuing..."
    }
    
    print_success "Dependencies installed"
}

# Build project
build_project() {
    print_header "Building Project"
    
    print_info "Building TypeScript..."
    npm run build || {
        print_warning "Build failed, but continuing..."
    }
    
    print_success "Project built"
}

# Setup databases with Docker
setup_databases() {
    print_header "Setting up Databases with Docker"
    
    if command -v docker &> /dev/null && command -v docker-compose &> /dev/null; then
        print_info "Starting databases with Docker Compose..."
        
        # Create test databases docker-compose override
        cat > docker-compose.test.yml << 'EOF'
version: '3.8'

services:
  postgres-test:
    image: postgres:15-alpine
    container_name: ton-business-postgres-test
    environment:
      POSTGRES_DB: ton_business_test
      POSTGRES_USER: testuser
      POSTGRES_PASSWORD: testpass123
    ports:
      - "5433:5432"
    networks:
      - ton-network-test

  mongodb-test:
    image: mongo:6.0
    container_name: ton-business-mongodb-test
    environment:
      MONGO_INITDB_ROOT_USERNAME: testuser
      MONGO_INITDB_ROOT_PASSWORD: testpass123
      MONGO_INITDB_DATABASE: ton_business_test
    ports:
      - "27018:27017"
    networks:
      - ton-network-test

  redis-test:
    image: redis:7-alpine
    container_name: ton-business-redis-test
    command: redis-server --appendonly yes --requirepass testpass123
    ports:
      - "6380:6379"
    networks:
      - ton-network-test

  rabbitmq-test:
    image: rabbitmq:3-management-alpine
    container_name: ton-business-rabbitmq-test
    environment:
      RABBITMQ_DEFAULT_USER: testuser
      RABBITMQ_DEFAULT_PASS: testpass123
    ports:
      - "5673:5672"
      - "15673:15672"
    networks:
      - ton-network-test

networks:
  ton-network-test:
    driver: bridge
EOF
        
        # Start test databases
        docker-compose -f docker-compose.yml -f docker-compose.test.yml up -d postgres-test mongodb-test redis-test rabbitmq-test
        
        print_success "Test databases started"
        print_info "Waiting for databases to be ready..."
        sleep 10
        
    else
        print_warning "Docker not available. Please set up databases manually:"
        print_info "- PostgreSQL on port 5433 with database 'ton_business_test'"
        print_info "- MongoDB on port 27018"
        print_info "- Redis on port 6380"
        print_info "- RabbitMQ on port 5673"
    fi
}

# Run tests
run_tests() {
    print_header "Running Tests"
    
    print_info "Running test suite..."
    npm test || {
        print_warning "Some tests failed, but development setup continues..."
    }
    
    print_success "Tests completed"
}

# Start development servers
start_development() {
    print_header "Starting Development Servers"
    
    print_info "Starting development servers in background..."
    
    # Start API Gateway
    print_info "Starting API Gateway on port 3000..."
    cd services/api-gateway && npm run dev &
    API_GATEWAY_PID=$!
    cd ../../
    
    # Start services (if needed)
    print_info "Starting services..."
    
    print_success "Development servers started"
    print_info "API Gateway: http://localhost:3000"
    print_info "Health Check: http://localhost:3000/health"
    
    # Create a trap to kill background processes
    trap "kill $API_GATEWAY_PID; exit" INT TERM
    
    print_info "Press Ctrl+C to stop all servers"
    wait $API_GATEWAY_PID
}

# Main execution
main() {
    print_header "TON Business Suite - Development Setup"
    print_info "Setting up local development environment..."
    
    check_prerequisites
    setup_environment
    install_dependencies
    build_project
    
    # Ask user if they want to setup databases
    echo
    read -p "Do you want to start databases with Docker? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        setup_databases
        sleep 5  # Give databases time to start
        
        # Ask if they want to run tests
        echo
        read -p "Do you want to run tests? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            run_tests
        fi
    fi
    
    echo
    print_info "Setup completed!"
    print_info "To start development servers, run: ./scripts/dev-setup.sh --start"
    echo
    
    # Ask if they want to start development now
    read -p "Do you want to start development servers now? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        start_development
    else
        print_info "You can start development servers later with:"
        print_info "  ./scripts/dev-setup.sh --start"
        print_info ""
        print_info "Or manually run:"
        print_info "  cd services/api-gateway && npm run dev"
        print_info "  cd services/payment-service && npm run dev"
        print_info "  cd services/loyalty-service && npm run dev"
        print_info "  cd services/tipping-service && npm run dev"
    fi
}

# Handle command line arguments
case "${1:-}" in
    --start)
        start_development
        ;;
    --test)
        run_tests
        ;;
    --build)
        build_project
        ;;
    --deps)
        install_dependencies
        ;;
    --db)
        setup_databases
        ;;
    --help)
        echo "TON Business Suite Development Setup"
        echo ""
        echo "Usage: $0 [option]"
        echo ""
        echo "Options:"
        echo "  (no option)  Run full setup"
        echo "  --start      Start development servers"
        echo "  --test       Run tests only"
        echo "  --build      Build project only"
        echo "  --deps       Install dependencies only"
        echo "  --db         Setup databases only"
        echo "  --help       Show this help"
        ;;
    *)
        main
        ;;
esac