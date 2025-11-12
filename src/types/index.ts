// Core Type Definitions for TON Business Suite

export interface Environment {
  NODE_ENV: 'development' | 'staging' | 'production';
  API_PORT: number;
  PAYMENT_SERVICE_PORT: number;
  LOYALTY_SERVICE_PORT: number;
  TIPPING_SERVICE_PORT: number;
  POSTGRES_URL: string;
  MONGO_URL: string;
  REDIS_URL: string;
  RABBITMQ_URL: string;
  TON_NETWORK: 'testnet' | 'mainnet';
  TON_API_URL: string;
  TELEGRAM_BOT_TOKEN: string;
  JWT_SECRET: string;
  ENCRYPTION_KEY: string;
}

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
  maxConnections: number;
  idleTimeoutMillis: number;
}

export interface ServiceConfig {
  name: string;
  port: number;
  healthCheckPath: string;
  dependencies: string[];
  environment: Environment;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    timestamp: string;
    requestId: string;
    version: string;
  };
}

export interface PaginatedResponse<T = any> extends APIResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Blockchain Types
export interface TONTransaction {
  hash: string;
  lt: number;
  to: string;
  from: string;
  value: string;
  fee: string;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
}

export interface TONContractAddress {
  workchain: number;
  hash: string;
  bounceable: boolean;
  testnet: boolean;
}

// Business Domain Types
export interface Merchant {
  id: string;
  name: string;
  businessType: 'restaurant' | 'retail' | 'service' | 'hotel' | 'airline';
  tonWalletAddress: string;
  kycStatus: 'pending' | 'approved' | 'rejected';
  subscriptionTier: 'basic' | 'premium' | 'enterprise';
  createdAt: Date;
  updatedAt: Date;
  settings: MerchantSettings;
}

export interface MerchantSettings {
  autoGenerateQR: boolean;
  allowCustomAmount: boolean;
  receiptEmail: boolean;
  feePercentage: number;
  minPaymentAmount: number;
  maxPaymentAmount: number;
  supportedCurrencies: string[];
}

export interface User {
  id: string;
  telegramId: number;
  tonWalletAddress?: string;
  phoneNumber?: string;
  kycVerified: boolean;
  createdAt: Date;
  preferences: UserPreferences;
}

export interface UserPreferences {
  language: 'en' | 'ar';
  currency: string;
  notifications: {
    payments: boolean;
    loyalty: boolean;
    tips: boolean;
  };
  privacy: {
    showTransactionHistory: boolean;
    shareAnalytics: boolean;
  };
}

export interface Payment {
  id: string;
  merchantId: string;
  customerId?: string;
  amount: {
    ton: number;
    aedEquivalent: number;
    exchangeRate: number;
  };
  paymentMethod: 'TONKEEPER' | 'TELEGRAM_WALLET';
  tonTxHash: string;
  status: 'INITIATED' | 'PENDING' | 'CONFIRMED' | 'FAILED' | 'REFUNDED';
  metadata: PaymentMetadata;
  createdAt: Date;
  confirmedAt?: Date;
}

export interface PaymentMetadata {
  orderId?: string;
  items?: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  paymentSource: 'QR' | 'LINK' | 'CHAT';
  paymentType: 'purchase' | 'subscription' | 'donation';
  campaign?: string;
}

export interface LoyaltyPoints {
  userId: string;
  merchantId: string;
  balance: number;
  totalEarned: number;
  totalRedeemed: number;
  lastTransaction: Date;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
}

export interface LoyaltyTransaction {
  id: string;
  userId: string;
  merchantId: string;
  transactionType: 'EARN' | 'REDEEM' | 'TRANSFER' | 'BONUS';
  points: number;
  tonTxHash?: string;
  metadata: {
    action: string;
    orderId?: string;
    campaign?: string;
    source: string;
  };
  timestamp: Date;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED';
}

export interface Tip {
  id: string;
  staffId: string;
  customerId?: string;
  amount: {
    ton: number;
    aedPreset: number;
  };
  tonTxHash: string;
  paymentSource: 'QR_SCAN' | 'CHAT_DIRECT' | 'TIP_LINK';
  pointsAwarded: number;
  status: 'PENDING' | 'SETTLED' | 'FAILED';
  timestamp: Date;
  settlementTime?: Date;
  message?: string;
}

export interface ServiceStaff {
  id: string;
  merchantId: string;
  personalInfo: {
    name: string;
    phone: string;
    position: string;
  };
  tonWalletAddress: string;
  qrCodeUrl: string;
  telegramUsername?: string;
  stats: {
    totalTipsReceived: number;
    tipCount: number;
    averageTip: number;
    monthlyTips: number;
  };
  status: 'ACTIVE' | 'RESIGNED' | 'SUSPENDED';
  createdAt: Date;
}

// Mini App Types
export interface MiniApp {
  id: string;
  merchantId: string;
  appUrl: string;
  template: 'cafe' | 'retail' | 'service' | 'restaurant' | 'custom';
  branding: {
    logo: string;
    primaryColor: string;
    secondaryColor: string;
    merchantName: string;
  };
  configuration: MiniAppConfiguration;
  deploymentStatus: 'draft' | 'deployed' | 'active' | 'suspended';
  createdAt: Date;
  updatedAt: Date;
}

export interface MiniAppConfiguration {
  paymentAddress: string;
  products?: Array<{
    id: string;
    name: string;
    description?: string;
    price: number;
    image?: string;
    category: string;
  }>;
  paymentSettings: {
    allowCustomAmount: boolean;
    presetAmounts: number[];
    defaultCurrency: string;
  };
  uiSettings: {
    theme: 'light' | 'dark' | 'auto';
    language: 'en' | 'ar';
    layout: 'grid' | 'list';
  };
  features: {
    loyaltyIntegration: boolean;
    tipIntegration: boolean;
    analytics: boolean;
  };
}

// Analytics Types
export interface AnalyticsEvent {
  id: string;
  eventType: string;
  userId?: string;
  merchantId?: string;
  sessionId: string;
  timestamp: Date;
  properties: Record<string, any>;
  metadata: {
    userAgent: string;
    ipAddress: string;
    referrer?: string;
    utmSource?: string;
    utmCampaign?: string;
  };
}

export interface BusinessMetrics {
  merchantId: string;
  period: 'daily' | 'weekly' | 'monthly';
  metrics: {
    totalRevenue: number;
    transactionCount: number;
    averageTransactionValue: number;
    uniqueCustomers: number;
    loyaltyPointsIssued: number;
    tipsReceived: number;
    conversionRate: number;
    retentionRate: number;
  };
  comparisons: {
    previousPeriod: number;
    growthRate: number;
  };
}

// Error Types
export interface ApplicationError extends Error {
  code: string;
  statusCode: number;
  timestamp: Date;
  requestId?: string;
  metadata?: Record<string, any>;
}

export interface ValidationError extends ApplicationError {
  field: string;
  value: any;
  constraint: string;
}

// Utility Types
export type DeepPartial<T> = {
  [P in keyof T]?: DeepPartial<T[P]>;
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;