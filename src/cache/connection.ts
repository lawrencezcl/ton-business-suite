import Redis from 'ioredis';
import { config } from '../config';
import { createLogger } from '@ton-business/common';

const logger = createLogger('Redis Cache');

// Redis Connection Manager
class RedisConnection {
  private client: Redis | null = null;
  private connected: boolean = false;
  private subscribers: Map<string, (message: string) => void> = new Map();

  constructor() {
    this.client = new Redis(config.database.redis.url, {
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
  }

  async connect(): Promise<void> {
    try {
      await this.client!.connect();
      this.connected = true;
      logger.info('✅ Redis connected successfully');
      
      // Set up error handling
      this.client!.on('error', (error) => {
        logger.error('Redis connection error:', error);
        this.connected = false;
      });

      this.client!.on('connect', () => {
        logger.info('Redis connected');
        this.connected = true;
      });

      this.client!.on('close', () => {
        logger.warn('Redis connection closed');
        this.connected = false;
      });

      // Set default key expiration for the application
      await this.client!.config('SET', 'notify-keyspace-events', 'Ex');
      
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.client) {
        await this.client.quit();
      }
      this.connected = false;
      logger.info('✅ Redis disconnected');
    } catch (error) {
      logger.error('Error disconnecting Redis:', error);
    }
  }

  // Cache operations
  async get<T = any>(key: string): Promise<T | null> {
    if (!this.connected) {
      throw new Error('Redis not connected');
    }

    try {
      const value = await this.client!.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Redis GET error:', { key, error });
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
    if (!this.connected) {
      throw new Error('Redis not connected');
    }

    try {
      const stringValue = JSON.stringify(value);
      
      if (ttlSeconds) {
        await this.client!.setex(key, ttlSeconds, stringValue);
      } else {
        await this.client!.set(key, stringValue);
      }
      
      return true;
    } catch (error) {
      logger.error('Redis SET error:', { key, error });
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    if (!this.connected) {
      throw new Error('Redis not connected');
    }

    try {
      await this.client!.del(key);
      return true;
    } catch (error) {
      logger.error('Redis DEL error:', { key, error });
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.connected) {
      throw new Error('Redis not connected');
    }

    try {
      const result = await this.client!.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Redis EXISTS error:', { key, error });
      return false;
    }
  }

  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    if (!this.connected) {
      throw new Error('Redis not connected');
    }

    try {
      await this.client!.expire(key, ttlSeconds);
      return true;
    } catch (error) {
      logger.error('Redis EXPIRE error:', { key, error });
      return false;
    }
  }

  async incr(key: string): Promise<number> {
    if (!this.connected) {
      throw new Error('Redis not connected');
    }

    try {
      return await this.client!.incr(key);
    } catch (error) {
      logger.error('Redis INCR error:', { key, error });
      throw error;
    }
  }

  async decr(key: string): Promise<number> {
    if (!this.connected) {
      throw new Error('Redis not connected');
    }

    try {
      return await this.client!.decr(key);
    } catch (error) {
      logger.error('Redis DECR error:', { key, error });
      throw error;
    }
  }

  // Hash operations for complex data structures
  async hget(key: string, field: string): Promise<string | null> {
    if (!this.connected) {
      throw new Error('Redis not connected');
    }

    try {
      return await this.client!.hget(key, field);
    } catch (error) {
      logger.error('Redis HGET error:', { key, field, error });
      return null;
    }
  }

  async hset(key: string, field: string, value: any): Promise<boolean> {
    if (!this.connected) {
      throw new Error('Redis not connected');
    }

    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      await this.client!.hset(key, field, stringValue);
      return true;
    } catch (error) {
      logger.error('Redis HSET error:', { key, field, error });
      return false;
    }
  }

  async hgetall(key: string): Promise<Record<string, any>> {
    if (!this.connected) {
      throw new Error('Redis not connected');
    }

    try {
      const result = await this.client!.hgetall(key);
      const parsed: Record<string, any> = {};
      
      for (const [field, value] of Object.entries(result)) {
        try {
          parsed[field] = JSON.parse(value);
        } catch {
          parsed[field] = value;
        }
      }
      
      return parsed;
    } catch (error) {
      logger.error('Redis HGETALL error:', { key, error });
      return {};
    }
  }

  // Pub/Sub operations
  async publish(channel: string, message: any): Promise<boolean> {
    if (!this.connected) {
      throw new Error('Redis not connected');
    }

    try {
      const stringMessage = typeof message === 'string' ? message : JSON.stringify(message);
      await this.client!.publish(channel, stringMessage);
      return true;
    } catch (error) {
      logger.error('Redis PUBLISH error:', { channel, error });
      return false;
    }
  }

  async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
    if (!this.connected) {
      throw new Error('Redis not connected');
    }

    try {
      this.subscribers.set(channel, callback);
      await this.client!.subscribe(channel);
    } catch (error) {
      logger.error('Redis SUBSCRIBE error:', { channel, error });
      throw error;
    }
  }

  // Rate limiting utilities
  async checkRateLimit(key: string, maxRequests: number, windowSeconds: number): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    if (!this.connected) {
      throw new Error('Redis not connected');
    }

    try {
      const now = Date.now();
      const window = Math.floor(now / (windowSeconds * 1000));
      const rateLimitKey = `rate_limit:${key}:${window}`;

      const current = await this.incr(rateLimitKey);
      
      if (current === 1) {
        await this.expire(rateLimitKey, windowSeconds);
      }

      const allowed = current <= maxRequests;
      const remaining = Math.max(0, maxRequests - current);
      const resetTime = (window + 1) * windowSeconds * 1000;

      return { allowed, remaining, resetTime };
    } catch (error) {
      logger.error('Rate limit check error:', { key, error });
      return { allowed: true, remaining: maxRequests, resetTime: Date.now() + windowSeconds * 1000 };
    }
  }

  // Session management utilities
  async createSession(sessionId: string, data: any, ttlSeconds: number): Promise<boolean> {
    const sessionKey = `session:${sessionId}`;
    return await this.set(sessionKey, data, ttlSeconds);
  }

  async getSession(sessionId: string): Promise<any | null> {
    const sessionKey = `session:${sessionId}`;
    return await this.get(sessionKey);
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    const sessionKey = `session:${sessionId}`;
    return await this.del(sessionKey);
  }

  // Cache key patterns for business logic
  async cacheUser(userId: string, userData: any): Promise<void> {
    await this.set(`user:${userId}`, userData, config.cache.ttl);
  }

  async getCachedUser(userId: string): Promise<any | null> {
    return await this.get(`user:${userId}`);
  }

  async cacheMerchant(merchantId: string, merchantData: any): Promise<void> {
    await this.set(`merchant:${merchantId}`, merchantData, config.cache.ttl);
  }

  async getCachedMerchant(merchantId: string): Promise<any | null> {
    return await this.get(`merchant:${merchantId}`);
  }

  async cachePayment(paymentId: string, paymentData: any): Promise<void> {
    await this.set(`payment:${paymentId}`, paymentData, 3600); // 1 hour for payments
  }

  async getCachedPayment(paymentId: string): Promise<any | null> {
    return await this.get(`payment:${paymentId}`);
  }

  async cachePoints(userId: string, merchantId: string, pointsData: any): Promise<void> {
    await this.set(`points:${userId}:${merchantId}`, pointsData, 300); // 5 minutes for points
  }

  async getCachedPoints(userId: string, merchantId: string): Promise<any | null> {
    return await this.get(`points:${userId}:${merchantId}`);
  }

  isConnected(): boolean {
    return this.connected;
  }
}

// Export singleton instance
export const redis = new RedisConnection();

// Auto-connect in production
if (config.app.isProduction) {
  redis.connect().catch((error) => {
    logger.error('Failed to connect to Redis on startup:', error);
    process.exit(1);
  });
}

// Cache helper functions
export const cacheHelpers = {
  // Generate cache keys with prefixes
  generateKey: (prefix: string, ...parts: (string | number)[]): string => {
    return [prefix, ...parts.map(String)].join(':');
  },

  // Cache wrapper for expensive operations
  async withCache<T>(
    key: string,
    ttlSeconds: number,
    operation: () => Promise<T>
  ): Promise<T> {
    // Try to get from cache first
    const cached = await redis.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Execute operation and cache result
    const result = await operation();
    await redis.set(key, result, ttlSeconds);
    
    return result;
  },

  // Invalidate cache patterns
  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await redis.client!.keys(pattern);
      if (keys.length > 0) {
        await redis.client!.del(...keys);
        logger.info(`Cache invalidated for pattern ${pattern}: ${keys.length} keys`);
      }
    } catch (error) {
      logger.error('Cache invalidation error:', { pattern, error });
    }
  }
};