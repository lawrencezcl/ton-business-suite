import { Pool } from 'pg';
import { MongoClient } from 'mongodb';
import { config } from '../config';
import { createLogger } from '@ton-business/common';

const logger = createLogger('Database');

// PostgreSQL Connection
class PostgreSQLConnection {
  private pool: Pool;
  private connected: boolean = false;

  constructor() {
    this.pool = new Pool({
      host: config.database.postgres.host,
      port: config.database.postgres.port,
      database: config.database.postgres.database,
      user: config.database.postgres.username,
      password: config.database.postgres.password,
      ssl: config.database.postgres.ssl ? { rejectUnauthorized: false } : false,
      max: 20, // Maximum number of clients
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  async connect(): Promise<void> {
    try {
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      
      this.connected = true;
      logger.info('✅ PostgreSQL connected successfully');
      
      // Set up connection error handling
      this.pool.on('error', (err) => {
        logger.error('Unexpected PostgreSQL error:', err);
        this.connected = false;
      });
      
    } catch (error) {
      logger.error('Failed to connect to PostgreSQL:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.pool.end();
      this.connected = false;
      logger.info('✅ PostgreSQL disconnected');
    } catch (error) {
      logger.error('Error disconnecting PostgreSQL:', error);
    }
  }

  async query(text: string, params?: any[]): Promise<any> {
    if (!this.connected) {
      throw new Error('PostgreSQL not connected');
    }
    
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      
      if (config.development.debugMode) {
        logger.debug(`Query executed in ${duration}ms: ${text}`, { params });
      }
      
      return result;
    } catch (error) {
      logger.error('Database query error:', { text, params, error });
      throw error;
    }
  }

  async getClient(): Promise<any> {
    if (!this.connected) {
      throw new Error('PostgreSQL not connected');
    }
    return await this.pool.connect();
  }

  async transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  isConnected(): boolean {
    return this.connected;
  }
}

// MongoDB Connection
class MongoDBConnection {
  private client: MongoClient | null = null;
  private connected: boolean = false;

  constructor() {
    this.client = new MongoClient(config.database.mongodb.url, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
  }

  async connect(): Promise<void> {
    try {
      await this.client!.connect();
      
      // Test connection
      await this.client!.db().admin().ping();
      
      this.connected = true;
      logger.info('✅ MongoDB connected successfully');
      
      // Set up connection error handling
      this.client!.on('error', (error) => {
        logger.error('MongoDB connection error:', error);
        this.connected = false;
      });
      
    } catch (error) {
      logger.error('Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.client) {
        await this.client.close();
      }
      this.connected = false;
      logger.info('✅ MongoDB disconnected');
    } catch (error) {
      logger.error('Error disconnecting MongoDB:', error);
    }
  }

  getDb(databaseName?: string) {
    if (!this.connected || !this.client) {
      throw new Error('MongoDB not connected');
    }
    return this.client.db(databaseName || config.database.mongodb.database);
  }

  getCollection(collectionName: string, databaseName?: string) {
    return this.getDb(databaseName).collection(collectionName);
  }

  async createIndexes(collectionName: string, indexes: any[]): Promise<void> {
    try {
      const collection = this.getCollection(collectionName);
      await collection.createIndexes(indexes);
      logger.info(`✅ Indexes created for ${collectionName}`);
    } catch (error) {
      logger.error(`Error creating indexes for ${collectionName}:`, error);
      throw error;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }
}

// Database Manager
class DatabaseManager {
  postgres: PostgreSQLConnection;
  mongodb: MongoDBConnection;
  
  constructor() {
    this.postgres = new PostgreSQLConnection();
    this.mongodb = new MongoDBConnection();
  }

  async connect(): Promise<void> {
    const promises = [];
    
    promises.push(this.postgres.connect());
    promises.push(this.mongodb.connect());
    
    await Promise.all(promises);
  }

  async disconnect(): Promise<void> {
    const promises = [];
    
    promises.push(this.postgres.disconnect());
    promises.push(this.mongodb.disconnect());
    
    await Promise.all(promises);
  }

  isConnected(): boolean {
    return this.postgres.isConnected() && this.mongodb.isConnected();
  }
}

// Export singleton instance
export const database = new DatabaseManager();

// Additional helper functions for common queries
export class DatabaseHelpers {
  static async ensureTables(): Promise<void> {
    const queries = [
      // Users table
      `
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          telegram_id BIGINT UNIQUE NOT NULL,
          ton_wallet_address VARCHAR(100),
          phone_number VARCHAR(20),
          kyc_verified BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          preferences JSONB DEFAULT '{}',
          settings JSONB DEFAULT '{}'
        );
      `,
      // Merchants table
      `
        CREATE TABLE IF NOT EXISTS merchants (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          business_type VARCHAR(50) NOT NULL,
          ton_wallet_address VARCHAR(100) NOT NULL,
          kyc_status VARCHAR(20) DEFAULT 'pending',
          subscription_tier VARCHAR(20) DEFAULT 'basic',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          settings JSONB DEFAULT '{}'
        );
      `,
      // Payments table
      `
        CREATE TABLE IF NOT EXISTS payments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          merchant_id UUID REFERENCES merchants(id),
          customer_id UUID REFERENCES users(id),
          amount_ton DECIMAL(18,9) NOT NULL,
          amount_aed DECIMAL(10,2) NOT NULL,
          ton_tx_hash VARCHAR(100) UNIQUE,
          status VARCHAR(20) DEFAULT 'pending',
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP DEFAULT NOW(),
          confirmed_at TIMESTAMP
        );
      `,
      // Service staff table
      `
        CREATE TABLE IF NOT EXISTS service_staff (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          merchant_id UUID REFERENCES merchants(id),
          name VARCHAR(255) NOT NULL,
          ton_wallet_address VARCHAR(100) NOT NULL,
          telegram_username VARCHAR(100),
          qr_code_url VARCHAR(500),
          total_tips_received DECIMAL(18,9) DEFAULT 0,
          status VARCHAR(20) DEFAULT 'active',
          created_at TIMESTAMP DEFAULT NOW()
        );
      `,
      // Tips table
      `
        CREATE TABLE IF NOT EXISTS tips (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          staff_id UUID REFERENCES service_staff(id),
          customer_id UUID REFERENCES users(id),
          amount_ton DECIMAL(18,9) NOT NULL,
          ton_tx_hash VARCHAR(100) UNIQUE,
          status VARCHAR(20) DEFAULT 'pending',
          message TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          settlement_time TIMESTAMP
        );
      `
    ];

    for (const query of queries) {
      await database.postgres.query(query);
    }

    logger.info('✅ Database tables ensured');
  }

  static async createIndexes(): Promise<void> {
    const indexes = [
      { collection: 'users', indexes: [{ telegram_id: 1 }, { kyc_verified: 1 }] },
      { collection: 'merchants', indexes: [{ business_type: 1 }, { kyc_status: 1 }] },
      { collection: 'payments', indexes: [{ status: 1 }, { created_at: -1 }] },
      { collection: 'tips', indexes: [{ status: 1 }, { created_at: -1 }] },
    ];

    for (const { collection, indexes: collectionIndexes } of indexes) {
      await database.mongodb.createIndexes(collection, collectionIndexes);
    }

    logger.info('✅ Database indexes created');
  }
}

// Auto-initialize database on module load if in production
if (config.app.isProduction) {
  database.connect().catch((error) => {
    logger.error('Failed to initialize database on startup:', error);
    process.exit(1);
  });
}