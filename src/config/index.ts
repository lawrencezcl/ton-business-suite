import dotenv from 'dotenv';
import { z } from 'zod';
import { Environment } from '../types';

// Load environment variables
dotenv.config();

// Environment validation schema
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  
  // Server Configuration
  API_PORT: z.string().transform(Number).default('3000'),
  PAYMENT_SERVICE_PORT: z.string().transform(Number).default('3001'),
  LOYALTY_SERVICE_PORT: z.string().transform(Number).default('3002'),
  TIPPING_SERVICE_PORT: z.string().transform(Number).default('3003'),
  
  // Database Configuration
  POSTGRES_HOST: z.string().default('localhost'),
  POSTGRES_PORT: z.string().transform(Number).default('5432'),
  POSTGRES_DB: z.string().default('ton_business'),
  POSTGRES_USER: z.string().default('tonapp'),
  POSTGRES_PASSWORD: z.string().default('tonpass123'),
  POSTGRES_SSL: z.string().transform(val => val === 'true').default('false'),
  
  // MongoDB Configuration
  MONGO_HOST: z.string().default('localhost'),
  MONGO_PORT: z.string().transform(Number).default('27017'),
  MONGO_DB: z.string().default('ton_business_analytics'),
  MONGO_USER: z.string().default('tonapp'),
  MONGO_PASSWORD: z.string().default('tonpass123'),
  
  // Redis Configuration
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().transform(Number).default('6379'),
  REDIS_PASSWORD: z.string().default('tonpass123'),
  REDIS_DB: z.string().transform(Number).default('0'),
  
  // RabbitMQ Configuration
  RABBITMQ_HOST: z.string().default('localhost'),
  RABBITMQ_PORT: z.string().transform(Number).default('5672'),
  RABBITMQ_USER: z.string().default('tonapp'),
  RABBITMQ_PASSWORD: z.string().default('tonpass123'),
  RABBITMQ_VHOST: z.string().default('/'),
  
  // TON Blockchain Configuration
  TON_NETWORK: z.enum(['testnet', 'mainnet']).default('testnet'),
  TON_API_URL: z.string().url().default('https://testnet.toncenter.com/api/v2/jsonRPC'),
  TON_API_KEY: z.string().optional(),
  TON_MNEMONIC: z.string().optional(),
  TON_WORKCHAIN: z.string().transform(Number).default('0'),
  
  // Telegram Configuration
  TELEGRAM_BOT_TOKEN: z.string(),
  TELEGRAM_WEBHOOK_URL: z.string().url().optional(),
  TELEGRAM_MINI_APP_URL: z.string().url().optional(),
  
  // Security & JWT
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
  ENCRYPTION_KEY: z.string().min(32),
  
  // External API Keys
  EXCHANGE_RATE_API_KEY: z.string().optional(),
  KYC_API_KEY: z.string().optional(),
  COMPLIANCE_API_KEY: z.string().optional(),
  
  // Notification Services
  EMAIL_SERVICE_API_KEY: z.string().optional(),
  SMS_SERVICE_API_KEY: z.string().optional(),
  
  // Monitoring & Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  SENTRY_DSN: z.string().url().optional(),
  PROMETHEUS_PORT: z.string().transform(Number).default('9090'),
  
  // Webhook URLs
  PAYMENT_WEBHOOK_URL: z.string().url().optional(),
  LOYALTY_WEBHOOK_URL: z.string().url().optional(),
  TIPPING_WEBHOOK_URL: z.string().url().optional(),
  
  // Feature Flags
  ENABLE_PAYMENT_MODULE: z.string().transform(val => val === 'true').default('true'),
  ENABLE_LOYALTY_MODULE: z.string().transform(val => val === 'true').default('true'),
  ENABLE_TIPPING_MODULE: z.string().transform(val => val === 'true').default('true'),
  ENABLE_ANALYTICS: z.string().transform(val => val === 'true').default('true'),
  ENABLE_COMPLIANCE_CHECKS: z.string().transform(val => val === 'true').default('true'),
  
  // Rate Limiting
  RATE_LIMIT_REQUESTS: z.string().transform(Number).default('100'),
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'),
  
  // Cache Configuration
  CACHE_TTL: z.string().transform(Number).default('3600'),
  CACHE_MAX_SIZE: z.string().transform(Number).default('1000'),
  
  // Transaction Limits
  MAX_PAYMENT_AMOUNT: z.string().transform(Number).default('10000'),
  MAX_DAILY_PAYMENTS: z.string().transform(Number).default('1000'),
  MAX_TIP_AMOUNT: z.string().transform(Number).default('1000'),
  
  // Compliance Settings
  KYC_REQUIRED: z.string().transform(val => val === 'true').default('true'),
  AML_SCREENING: z.string().transform(val => val === 'true').default('true'),
  TRANSACTION_REPORTING: z.string().transform(val => val === 'true').default('true'),
  DATA_RETENTION_DAYS: z.string().transform(Number).default('2555'),
  
  // Development Settings
  DEBUG_MODE: z.string().transform(val => val === 'true').default('false'),
  MOCK_EXTERNAL_SERVICES: z.string().transform(val => val === 'true').default('false'),
  SKIP_BLOCKCHAIN_CONFIRMATIONS: z.string().transform(val => val === 'true').default('false'),
});

// Parse and validate environment variables
const validatedEnv = envSchema.safeParse(process.env);

if (!validatedEnv.success) {
  console.error('❌ Invalid environment configuration:');
  console.error(validatedEnv.error.format());
  process.exit(1);
}

const env = validatedEnv.data as Environment;

// Database URLs
export const database = {
  postgres: {
    url: `postgresql://${env.POSTGRES_USER}:${env.POSTGRES_PASSWORD}@${env.POSTGRES_HOST}:${env.POSTGRES_PORT}/${env.POSTGRES_DB}${env.POSTGRES_SSL ? '?sslmode=require' : ''}`,
    host: env.POSTGRES_HOST,
    port: env.POSTGRES_PORT,
    database: env.POSTGRES_DB,
    username: env.POSTGRES_USER,
    password: env.POSTGRES_PASSWORD,
    ssl: env.POSTGRES_SSL,
  },
  mongodb: {
    url: `mongodb://${env.MONGO_USER}:${env.MONGO_PASSWORD}@${env.MONGO_HOST}:${env.MONGO_PORT}/${env.MONGO_DB}`,
    host: env.MONGO_HOST,
    port: env.MONGO_PORT,
    database: env.MONGO_DB,
    username: env.MONGO_USER,
    password: env.MONGO_PASSWORD,
  },
  redis: {
    url: `redis://${env.REDIS_PASSWORD ? ':' + env.REDIS_PASSWORD + '@' : ''}${env.REDIS_HOST}:${env.REDIS_PORT}/${env.REDIS_DB}`,
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD,
    db: env.REDIS_DB,
  },
  rabbitmq: {
    url: `amqp://${env.RABBITMQ_USER}:${env.RABBITMQ_PASSWORD}@${env.RABBITMQ_HOST}:${env.RABBITMQ_PORT}${env.RABBITMQ_VHOST}`,
    host: env.RABBITMQ_HOST,
    port: env.RABBITMQ_PORT,
    username: env.RABBITMQ_USER,
    password: env.RABBITMQ_PASSWORD,
    vhost: env.RABBITMQ_VHOST,
  },
};

// Application Configuration
export const app = {
  name: 'TON Business Suite',
  version: '1.0.0',
  environment: env.NODE_ENV,
  port: env.API_PORT,
  isDevelopment: env.NODE_ENV === 'development',
  isProduction: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
};

// Blockchain Configuration
export const blockchain = {
  ton: {
    network: env.TON_NETWORK,
    apiUrl: env.TON_API_URL,
    apiKey: env.TON_API_KEY,
    mnemonic: env.TON_MNEMONIC,
    workchain: env.TON_WORKCHAIN,
  },
};

// External Services Configuration
export const services = {
  telegram: {
    botToken: env.TELEGRAM_BOT_TOKEN,
    webhookUrl: env.TELEGRAM_WEBHOOK_URL,
    miniAppUrl: env.TELEGRAM_MINI_APP_URL,
  },
  exchangeRate: {
    apiKey: env.EXCHANGE_RATE_API_KEY,
  },
  kyc: {
    apiKey: env.KYC_API_KEY,
  },
  compliance: {
    apiKey: env.COMPLIANCE_API_KEY,
  },
  notifications: {
    email: {
      apiKey: env.EMAIL_SERVICE_API_KEY,
    },
    sms: {
      apiKey: env.SMS_SERVICE_API_KEY,
    },
  },
};

// Security Configuration
export const security = {
  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
  },
  encryption: {
    key: env.ENCRYPTION_KEY,
  },
  rateLimiting: {
    requests: env.RATE_LIMIT_REQUESTS,
    windowMs: env.RATE_LIMIT_WINDOW_MS,
  },
};

// Feature Flags
export const features = {
  paymentModule: env.ENABLE_PAYMENT_MODULE,
  loyaltyModule: env.ENABLE_LOYALTY_MODULE,
  tippingModule: env.ENABLE_TIPPING_MODULE,
  analytics: env.ENABLE_ANALYTICS,
  complianceChecks: env.ENABLE_COMPLIANCE_CHECKS,
  debugMode: env.DEBUG_MODE,
  mockExternalServices: env.MOCK_EXTERNAL_SERVICES,
  skipBlockchainConfirmations: env.SKIP_BLOCKCHAIN_CONFIRMATIONS,
};

// Cache Configuration
export const cache = {
  ttl: env.CACHE_TTL,
  maxSize: env.CACHE_MAX_SIZE,
};

// Transaction Limits
export const limits = {
  payment: {
    maxAmount: env.MAX_PAYMENT_AMOUNT,
    maxDailyTransactions: env.MAX_DAILY_PAYMENTS,
  },
  tip: {
    maxAmount: env.MAX_TIP_AMOUNT,
  },
};

// Compliance Configuration
export const compliance = {
  kycRequired: env.KYC_REQUIRED,
  amlScreening: env.AML_SCREENING,
  transactionReporting: env.TRANSACTION_REPORTING,
  dataRetentionDays: env.DATA_RETENTION_DAYS,
};

// Monitoring Configuration
export const monitoring = {
  logLevel: env.LOG_LEVEL,
  sentry: {
    dsn: env.SENTRY_DSN,
  },
  prometheus: {
    port: env.PROMETHEUS_PORT,
  },
};

// Webhooks Configuration
export const webhooks = {
  payment: env.PAYMENT_WEBHOOK_URL,
  loyalty: env.LOYALTY_WEBHOOK_URL,
  tipping: env.TIPPING_WEBHOOK_URL,
};

// Development Configuration
export const development = {
  debugMode: env.DEBUG_MODE,
  mockExternalServices: env.MOCK_EXTERNAL_SERVICES,
  skipBlockchainConfirmations: env.SKIP_BLOCKCHAIN_CONFIRMATIONS,
};

// Export the complete configuration
export const config = {
  app,
  database,
  blockchain,
  services,
  security,
  features,
  cache,
  limits,
  compliance,
  monitoring,
  webhooks,
  development,
  // Raw environment for backwards compatibility
  env,
};

// Validate critical configurations
if (config.app.isProduction) {
  if (!config.security.jwt.secret || config.security.jwt.secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters in production');
  }
  
  if (!config.security.encryption.key || config.security.encryption.key.length < 32) {
    throw new Error('ENCRYPTION_KEY must be at least 32 characters in production');
  }
  
  if (!config.services.telegram.botToken) {
    throw new Error('TELEGRAM_BOT_TOKEN is required in production');
  }
}

export default config;