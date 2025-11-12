# TON Business Suite

> Enterprise-grade Web3 infrastructure solution based on the TON blockchain for Dubai market

A comprehensive Web3 platform enabling businesses to implement blockchain-based payments, loyalty programs, and tip settlements through Telegram Mini Apps.

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18.0.0 or higher
- **npm** 9.0.0 or higher
- **Docker** and **Docker Compose** (recommended for database services)

### One-Command Setup

```bash
# Clone and setup everything automatically
./scripts/dev-setup.sh
```

This will:
- Check prerequisites
- Install all dependencies
- Build the project
- Setup test databases with Docker
- Run tests
- Start development servers

## 📋 Detailed Setup

### 1. Prerequisites Check

Ensure you have the required software:

```bash
# Check Node.js version (should be >= 18.0.0)
node --version

# Check npm version (should be >= 9.0.0)
npm --version

# Check Docker (optional but recommended)
docker --version
docker-compose --version
```

### 2. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit with your configuration
nano .env  # or your preferred editor
```

### 3. Install Dependencies

```bash
# Install all dependencies
npm install

# Install workspace dependencies
npm run build:workspaces
```

### 4. Build Project

```bash
# Build TypeScript and prepare for development
npm run build

# Build all components
npm run build:workspaces
```

## 🏃‍♂️ Running the Project

### Development Mode

#### Start All Services
```bash
# Using the setup script
./scripts/dev-setup.sh --start

# Or manually start each service
npm run dev
```

#### Individual Services
```bash
# API Gateway (Main API)
cd services/api-gateway && npm run dev

# Payment Service
cd services/payment-service && npm run dev

# Loyalty Service
cd services/loyalty-service && npm run dev

# Tipping Service
cd services/tipping-service && npm run dev

# Telegram Bot
cd services/telegram-bot && npm run dev
```

### Service URLs

| Service | URL | Purpose |
|---------|-----|---------|
| API Gateway | http://localhost:3000 | Main API endpoint |
| Payment Service | http://localhost:3001 | Payment processing |
| Loyalty Service | http://localhost:3002 | Loyalty points management |
| Tipping Service | http://localhost:3003 | Tip processing |
| Payment Mini App | http://localhost:3005 | Telegram payment interface |
| Merchant Dashboard | http://localhost:3006 | Business management interface |

## 🧪 Testing

### Run All Tests
```bash
# Run complete test suite
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Test Specific Components
```bash
# Test API Gateway
npm run test -- --testPathPattern=api-gateway

# Test services
npm run test -- --testPathPattern=services

# Test contracts
npm run test -- --testPathPattern=contracts
```

### Database Testing

The project uses Docker for test databases:

```bash
# Start test databases
docker-compose -f docker-compose.yml -f docker-compose.test.yml up -d

# View database logs
docker-compose logs postgres-test
docker-compose logs mongodb-test
docker-compose logs redis-test
docker-compose logs rabbitmq-test

# Stop test databases
docker-compose -f docker-compose.test.yml down
```

## 🔧 Development Tools

### Code Quality

```bash
# Lint all code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Type check
npm run type-check
```

### Database Management

```bash
# Start development databases
docker-compose up -d

# View database status
docker-compose ps

# View database logs
docker-compose logs -f postgres
docker-compose logs -f mongodb
docker-compose logs -f redis

# Stop databases
docker-compose down

# Reset databases (WARNING: deletes all data)
docker-compose down -v
```

### Container Management

```bash
# Build all Docker images
docker-compose build

# Start specific service
docker-compose up -d api-gateway

# Restart specific service
docker-compose restart payment-service

# View service logs
docker-compose logs -f api-gateway
```

## 📊 Monitoring & Health Checks

### Health Check Endpoints

```bash
# Overall health
curl http://localhost:3000/health

# Service-specific health
curl http://localhost:3001/health  # Payment Service
curl http://localhost:3002/health  # Loyalty Service
curl http://localhost:3003/health  # Tipping Service
```

### Database Health

```bash
# PostgreSQL
docker-compose exec postgres psql -U tonapp -d ton_business -c "SELECT version();"

# MongoDB
docker-compose exec mongodb mongo --eval "db.version()"

# Redis
docker-compose exec redis redis-cli ping

# RabbitMQ
docker-compose exec rabbitmq rabbitmqctl status
```

## 🐛 Debugging

### Common Issues

#### Port Already in Use
```bash
# Find process using port
lsof -ti:3000

# Kill process
kill -9 $(lsof -ti:3000)

# Or use the script to find and kill
./scripts/kill-ports.sh
```

#### Database Connection Issues
```bash
# Check if databases are running
docker-compose ps

# Restart databases
docker-compose restart postgres mongodb redis rabbitmq

# Check database logs
docker-compose logs postgres
```

#### Dependencies Issues
```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules packages/*/node_modules services/*/node_modules
npm install
```

### Debug Mode

```bash
# Enable debug logging
DEBUG=* npm run dev

# Enable specific service debug
DEBUG=api-gateway npm run dev
```

## 🚀 Production Deployment

### Build for Production
```bash
# Build production images
docker-compose -f docker-compose.yml build --no-cache

# Deploy to production
./scripts/deploy-production.sh
```

### Environment Variables
Ensure production environment variables are set:

```bash
# Required for production
NODE_ENV=production
JWT_SECRET=your-super-secret-jwt-key
ENCRYPTION_KEY=your-32-char-encryption-key
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
```

## 📁 Project Structure

```
TONBusiness/
├── packages/              # Shared packages
│   ├── common/           # Common utilities
│   └── utils/            # Helper functions
├── services/             # Microservices
│   ├── api-gateway/      # Main API gateway
│   ├── payment-service/  # Payment processing
│   ├── loyalty-service/  # Loyalty management
│   └── tipping-service/  # Tip processing
├── contracts/            # TON smart contracts
│   ├── loyalty-token.fc
│   ├── payment-escrow.fc
│   ├── instant-tip-transfer.fc
│   └── cross-merchant-registry.fc
├── apps/                # Frontend applications
│   ├── payment-mini-app/     # Telegram mini app
│   └── merchant-dashboard/   # Web dashboard
├── tests/               # Test files
├── scripts/             # Development scripts
└── src/                # Shared source code
```

## 🔗 API Documentation

### Core Endpoints

#### Authentication
```
POST /api/v1/auth/telegram          # Telegram authentication
POST /api/v1/auth/merchant/login    # Merchant login
GET  /api/v1/users/me               # Get user profile
```

#### Payments
```
POST /api/v1/payments/create        # Create payment
GET  /api/v1/payments/:id           # Get payment status
POST /api/v1/payments/:id/refund    # Process refund
```

#### Loyalty
```
GET  /api/v1/loyalty/balance        # Get points balance
POST /api/v1/loyalty/earn           # Award points
POST /api/v1/loyalty/redeem         # Redeem points
```

#### Tipping
```
POST /api/v1/tips/send              # Send tip
GET  /api/v1/tips/staff/:id         # Get staff profile
GET  /api/v1/tips/stats             # Tip statistics
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `npm test`
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check this README and inline code comments
- **Issues**: Report bugs via GitHub Issues
- **Telegram**: Join our developer community
- **Email**: Contact the development team

---

**Built with ❤️ for the TON ecosystem**