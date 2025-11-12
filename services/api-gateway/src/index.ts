import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import { config } from '../../../src/config';
import { createLogger } from '@ton-business/common';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import { authMiddleware } from './middleware/auth';
import { healthRoutes } from './routes/health';
import { authRoutes } from './routes/auth';
import { paymentRoutes } from './routes/payment';
import { loyaltyRoutes } from './routes/loyalty';
import { tippingRoutes } from './routes/tipping';
import { webhookRoutes } from './routes/webhook';
import { database } from '../../../src/database/connection';
import { redis } from '../../../src/cache/connection';
import { rabbitMQ } from '../../../src/messaging/connection';

const logger = createLogger('API Gateway');

// Create Express application
const app = express();
const PORT = config.app.port;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https:"],
      fontSrc: ["'self'", "https:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'", "https://t.me"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: [
    'http://localhost:3005', // Payment mini app
    'http://localhost:3006', // Merchant dashboard
    'https://web.telegram.org', // Telegram web
    'https://t.me', // Telegram
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-API-Key'],
}));

// Compression and parsing
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (config.app.isDevelopment) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: {
      write: (message: string) => logger.info(message.trim())
    }
  }));
}

// Rate limiting
app.use(rateLimiter);

// Request ID middleware
app.use((req, res, next) => {
  req.requestId = crypto.randomUUID();
  res.setHeader('X-Request-ID', req.requestId);
  next();
});

// Health check routes (no auth required)
app.use('/health', healthRoutes);

// API routes (auth required)
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/payments', authMiddleware, paymentRoutes);
app.use('/api/v1/loyalty', authMiddleware, loyaltyRoutes);
app.use('/api/v1/tips', authMiddleware, tippingRoutes);
app.use('/api/v1/webhooks', webhookRoutes);

// Admin routes (special auth)
app.use('/api/v1/admin', authMiddleware, requireAuth(['ADMIN']), adminRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Helper functions
function requireAuth(allowedRoles?: string[]) {
  return (req: any, res: any, next: any) => {
    // Enhanced auth middleware with role checking
    authMiddleware(req, res, next);
  };
}

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  try {
    await database.disconnect();
    await redis.disconnect();
    await rabbitMQ.disconnect();
    
    server.close(() => {
      logger.info('Process terminated');
      process.exit(0);
    });
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
const server = app.listen(PORT, async () => {
  try {
    // Initialize database connections
    await database.connect();
    await redis.connect();
    await rabbitMQ.connect();
    
    logger.info(`🚀 API Gateway started on port ${PORT}`);
    logger.info(`Environment: ${config.app.environment}`);
    logger.info(`TON Network: ${config.blockchain.ton.network}`);
    logger.info(`Health check: http://localhost:${PORT}/health`);
    
    if (config.app.isDevelopment) {
      logger.info('🔧 Development mode enabled');
      logger.info('📚 API Documentation: http://localhost:3000/api/docs');
    }
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
});

// Export for testing
export default app;