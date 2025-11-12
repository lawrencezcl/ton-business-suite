import dotenv from 'dotenv';
import { config } from '../src/config';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Mock external services for testing
process.env.NODE_ENV = 'test';
process.env.TON_NETWORK = 'testnet';
process.env.MOCK_EXTERNAL_SERVICES = 'true';
process.env.SKIP_BLOCKCHAIN_CONFIRMATIONS = 'true';
process.env.SENTRY_DSN = '';

// Set test timeout
jest.setTimeout(30000);

// Global test setup
beforeAll(async () => {
  // Initialize test database
  console.log('Setting up test environment...');
  
  // Mock Redis for tests
  jest.doMock('../src/cache/connection', () => ({
    redis: {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(true),
      del: jest.fn().mockResolvedValue(true),
      exists: jest.fn().mockResolvedValue(false),
      expire: jest.fn().mockResolvedValue(true),
      incr: jest.fn().mockResolvedValue(1),
      decr: jest.fn().mockResolvedValue(1),
      publish: jest.fn().mockResolvedValue(true),
      subscribe: jest.fn().mockResolvedValue(undefined),
      checkRateLimit: jest.fn().mockResolvedValue({
        allowed: true,
        remaining: 100,
        resetTime: Date.now() + 3600000
      }),
      createSession: jest.fn().mockResolvedValue(true),
      getSession: jest.fn().mockResolvedValue(null),
      deleteSession: jest.fn().mockResolvedValue(true),
      cacheUser: jest.fn().mockResolvedValue(undefined),
      getCachedUser: jest.fn().mockResolvedValue(null),
      cacheMerchant: jest.fn().mockResolvedValue(undefined),
      getCachedMerchant: jest.fn().mockResolvedValue(null),
      cachePayment: jest.fn().mockResolvedValue(undefined),
      getCachedPayment: jest.fn().mockResolvedValue(null),
      cachePoints: jest.fn().mockResolvedValue(undefined),
      getCachedPoints: jest.fn().mockResolvedValue(null),
      isConnected: jest.fn().mockReturnValue(true)
    }
  }));

  // Mock RabbitMQ for tests
  jest.doMock('../src/messaging/connection', () => ({
    rabbitMQ: {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      publish: jest.fn().mockResolvedValue(true),
      sendToQueue: jest.fn().mockResolvedValue(true),
      consume: jest.fn().mockResolvedValue(undefined),
      rpc: jest.fn().mockResolvedValue({ success: true }),
      publishPaymentConfirmed: jest.fn().mockResolvedValue(undefined),
      publishLoyaltyPointsEarned: jest.fn().mockResolvedValue(undefined),
      publishTipSettled: jest.fn().mockResolvedValue(undefined),
      sendWebhookNotification: jest.fn().mockResolvedValue(undefined),
      sendComplianceCheck: jest.fn().mockResolvedValue(undefined),
      sendNotificationEmail: jest.fn().mockResolvedValue(undefined),
      sendNotificationSMS: jest.fn().mockResolvedValue(undefined),
      isConnected: jest.fn().mockReturnValue(true)
    },
    QUEUES: {
      PAYMENT_PROCESSING: 'test.payment.processing',
      PAYMENT_CONFIRMED: 'test.payment.confirmed',
      LOYALTY_POINTS_EARNED: 'test.loyalty.points.earned',
      TIP_SETTLED: 'test.tip.settled',
    },
    EXCHANGES: {
      PAYMENT_EVENTS: 'test.payment.events',
      LOYALTY_EVENTS: 'test.loyalty.events',
      TIP_EVENTS: 'test.tip.events',
    }
  }));

  // Mock database for tests
  jest.doMock('../src/database/connection', () => ({
    database: {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      postgres: {
        query: jest.fn().mockResolvedValue({ rows: [] }),
        transaction: jest.fn().mockImplementation(async (callback) => {
          const mockClient = { query: jest.fn(), release: jest.fn() };
          return await callback(mockClient);
        }),
        getClient: jest.fn().mockResolvedValue({
          query: jest.fn().mockResolvedValue({ rows: [] }),
          release: jest.fn()
        }),
        isConnected: jest.fn().mockReturnValue(true)
      },
      mongodb: {
        getDb: jest.fn().mockReturnValue({
          collection: jest.fn().mockReturnValue({
            find: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue([]) }),
            findOne: jest.fn().mockResolvedValue(null),
            insertOne: jest.fn().mockResolvedValue({ insertedId: 'mock-id' }),
            updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
            deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
            createIndexes: jest.fn().mockResolvedValue(undefined)
          })
        }),
        createIndexes: jest.fn().mockResolvedValue(undefined),
        isConnected: jest.fn().mockReturnValue(true)
      },
      isConnected: jest.fn().mockReturnValue(true)
    },
    DatabaseHelpers: {
      ensureTables: jest.fn().mockResolvedValue(undefined),
      createIndexes: jest.fn().mockResolvedValue(undefined)
    }
  }));
});

// Global test teardown
afterAll(async () => {
  console.log('Cleaning up test environment...');
  jest.clearAllMocks();
});

// Global test utilities
global.console = {
  ...console,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

// Mock fetch for external API calls
global.fetch = jest.fn();

// Helper function to create test user
export const createTestUser = (overrides = {}) => ({
  id: 'test-user-id',
  telegramId: 123456789,
  tonWalletAddress: 'test-wallet-address',
  phoneNumber: '+1234567890',
  kycVerified: true,
  createdAt: new Date(),
  preferences: {
    language: 'en',
    currency: 'USD',
    notifications: {
      payments: true,
      loyalty: true,
      tips: true,
    },
    privacy: {
      showTransactionHistory: true,
      shareAnalytics: false,
    },
  },
  ...overrides,
});

// Helper function to create test merchant
export const createTestMerchant = (overrides = {}) => ({
  id: 'test-merchant-id',
  name: 'Test Merchant',
  businessType: 'restaurant',
  tonWalletAddress: 'test-merchant-wallet',
  kycStatus: 'approved',
  subscriptionTier: 'basic',
  createdAt: new Date(),
  updatedAt: new Date(),
  settings: {
    autoGenerateQR: true,
    allowCustomAmount: true,
    receiptEmail: true,
    feePercentage: 0.5,
    minPaymentAmount: 0.1,
    maxPaymentAmount: 10000,
    supportedCurrencies: ['USD', 'EUR'],
  },
  ...overrides,
});

// Helper function to create test payment
export const createTestPayment = (overrides = {}) => ({
  id: 'test-payment-id',
  merchantId: 'test-merchant-id',
  customerId: 'test-user-id',
  amount: {
    ton: 10,
    aedEquivalent: 37.5,
    exchangeRate: 3.75,
  },
  paymentMethod: 'TONKEEPER',
  tonTxHash: 'test-tx-hash',
  status: 'CONFIRMED',
  metadata: {
    orderId: 'order-123',
    items: [
      { name: 'Test Product', quantity: 1, price: 10 }
    ],
    paymentSource: 'QR',
    paymentType: 'purchase',
  },
  createdAt: new Date(),
  confirmedAt: new Date(),
  ...overrides,
});

// Helper function to create test tip
export const createTestTip = (overrides = {}) => ({
  id: 'test-tip-id',
  staffId: 'test-staff-id',
  customerId: 'test-user-id',
  amount: {
    ton: 1,
    aedPreset: 3.75,
  },
  tonTxHash: 'test-tip-tx-hash',
  paymentSource: 'QR_SCAN',
  pointsAwarded: 100,
  status: 'SETTLED',
  timestamp: new Date(),
  settlementTime: new Date(),
  message: 'Great service!',
  ...overrides,
});

// Helper function to create test loyalty points
export const createTestLoyaltyPoints = (overrides = {}) => ({
  userId: 'test-user-id',
  merchantId: 'test-merchant-id',
  balance: 1000,
  totalEarned: 1500,
  totalRedeemed: 500,
  lastTransaction: new Date(),
  tier: 'silver',
  ...overrides,
});