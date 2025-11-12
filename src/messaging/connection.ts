import amqplib, { Connection, Channel, Queue, Exchange } from 'amqplib';
import { config } from '../config';
import { createLogger } from '@ton-business/common';

const logger = createLogger('RabbitMQ');

// Message queue patterns for TON Business Suite
export const QUEUES = {
  PAYMENT_PROCESSING: 'payment.processing',
  PAYMENT_CONFIRMED: 'payment.confirmed',
  PAYMENT_FAILED: 'payment.failed',
  LOYALTY_POINTS_EARNED: 'loyalty.points.earned',
  LOYALTY_POINTS_REDEEMED: 'loyalty.points.redeemed',
  TIP_PROCESSING: 'tip.processing',
  TIP_SETTLED: 'tip.settled',
  WEBHOOK_NOTIFICATION: 'webhook.notification',
  COMPLIANCE_CHECK: 'compliance.check',
  ANALYTICS_EVENT: 'analytics.event',
  NOTIFICATION_EMAIL: 'notification.email',
  NOTIFICATION_SMS: 'notification.sms',
} as const;

export const EXCHANGES = {
  PAYMENT_EVENTS: 'payment.events',
  LOYALTY_EVENTS: 'loyalty.events',
  TIP_EVENTS: 'tip.events',
  SYSTEM_EVENTS: 'system.events',
  COMPLIANCE_EVENTS: 'compliance.events',
} as const;

// Message interface
export interface QueueMessage {
  id: string;
  type: string;
  timestamp: number;
  data: any;
  metadata?: {
    correlationId?: string;
    replyTo?: string;
    priority?: number;
    ttl?: number;
  };
}

// RabbitMQ Connection Manager
class RabbitMQConnection {
  private connection: Connection | null = null;
  private channels: Map<string, Channel> = new Map();
  private connected: boolean = false;

  async connect(): Promise<void> {
    try {
      this.connection = await amqplib.connect(config.database.rabbitmq.url);
      
      this.connected = true;
      logger.info('✅ RabbitMQ connected successfully');

      // Set up error handling
      this.connection.on('error', (error) => {
        logger.error('RabbitMQ connection error:', error);
        this.connected = false;
      });

      this.connection.on('close', () => {
        logger.warn('RabbitMQ connection closed');
        this.connected = false;
      });

      // Initialize default exchanges and queues
      await this.initializeExchanges();
      await this.initializeQueues();
      
    } catch (error) {
      logger.error('Failed to connect to RabbitMQ:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.connection) {
        await this.connection.close();
      }
      
      // Close all channels
      for (const [, channel] of this.channels) {
        await channel.close();
      }
      this.channels.clear();
      
      this.connected = false;
      logger.info('✅ RabbitMQ disconnected');
    } catch (error) {
      logger.error('Error disconnecting RabbitMQ:', error);
    }
  }

  private async initializeExchanges(): Promise<void> {
    const channel = await this.getChannel('init');
    
    const exchanges = [
      { name: EXCHANGES.PAYMENT_EVENTS, type: 'topic' },
      { name: EXCHANGES.LOYALTY_EVENTS, type: 'topic' },
      { name: EXCHANGES.TIP_EVENTS, type: 'topic' },
      { name: EXCHANGES.SYSTEM_EVENTS, type: 'fanout' },
      { name: EXCHANGES.COMPLIANCE_EVENTS, type: 'direct' },
    ];

    for (const exchange of exchanges) {
      await channel.assertExchange(exchange.name, exchange.type, {
        durable: true,
        arguments: {
          'x-message-ttl': 86400000, // 24 hours
        },
      });
    }

    logger.info('✅ RabbitMQ exchanges initialized');
  }

  private async initializeQueues(): Promise<void> {
    const channel = await this.getChannel('init');

    const queues = [
      QUEUES.PAYMENT_PROCESSING,
      QUEUES.PAYMENT_CONFIRMED,
      QUEUES.PAYMENT_FAILED,
      QUEUES.LOYALTY_POINTS_EARNED,
      QUEUES.LOYALTY_POINTS_REDEEMED,
      QUEUES.TIP_PROCESSING,
      QUEUES.TIP_SETTLED,
      QUEUES.WEBHOOK_NOTIFICATION,
      QUEUES.COMPLIANCE_CHECK,
      QUEUES.ANALYTICS_EVENT,
      QUEUES.NOTIFICATION_EMAIL,
      QUEUES.NOTIFICATION_SMS,
    ];

    for (const queueName of queues) {
      await channel.assertQueue(queueName, {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': 'dead-letter',
          'x-message-ttl': 86400000, // 24 hours
          'x-max-priority': 10,
        },
      });
    }

    // Dead letter exchange for failed messages
    await channel.assertExchange('dead-letter', 'fanout', { durable: true });
    await channel.assertQueue('dead-letter-queue', { durable: true });
    await channel.bindQueue('dead-letter-queue', 'dead-letter', '');

    logger.info('✅ RabbitMQ queues initialized');
  }

  private async getChannel(name: string): Promise<Channel> {
    if (this.channels.has(name)) {
      return this.channels.get(name)!;
    }

    if (!this.connection) {
      throw new Error('RabbitMQ not connected');
    }

    const channel = await this.connection.createChannel();
    
    // Set up prefetch for better performance
    await channel.prefetch(10);
    
    this.channels.set(name, channel);
    return channel;
  }

  // Publish message to exchange
  async publish(exchange: string, routingKey: string, message: QueueMessage, options?: any): Promise<boolean> {
    try {
      const channel = await this.getChannel('publisher');
      
      const messageOptions = {
        persistent: true,
        messageId: message.id,
        timestamp: message.timestamp,
        type: message.type,
        ...options,
      };

      const buffer = Buffer.from(JSON.stringify(message));

      const result = channel.publish(exchange, routingKey, buffer, messageOptions);
      
      if (result) {
        logger.debug('Message published', { exchange, routingKey, messageId: message.id });
      } else {
        logger.warn('Message not published - queue full', { exchange, routingKey, messageId: message.id });
      }

      return result;
    } catch (error) {
      logger.error('Error publishing message:', { exchange, routingKey, error });
      return false;
    }
  }

  // Send message to queue
  async sendToQueue(queue: string, message: QueueMessage, options?: any): Promise<boolean> {
    try {
      const channel = await this.getChannel('publisher');
      
      const messageOptions = {
        persistent: true,
        messageId: message.id,
        timestamp: message.timestamp,
        type: message.type,
        ...options,
      };

      const buffer = Buffer.from(JSON.stringify(message));
      const result = channel.sendToQueue(queue, buffer, messageOptions);

      if (result) {
        logger.debug('Message sent to queue', { queue, messageId: message.id });
      } else {
        logger.warn('Message not sent - queue full', { queue, messageId: message.id });
      }

      return result;
    } catch (error) {
      logger.error('Error sending message to queue:', { queue, error });
      return false;
    }
  }

  // Subscribe to queue with consumer
  async consume(queue: string, handler: (message: QueueMessage) => Promise<void>, options?: any): Promise<void> {
    try {
      const channel = await this.getChannel(`consumer:${queue}`);
      
      await channel.consume(queue, async (msg) => {
        if (!msg) return;

        try {
          const content = JSON.parse(msg.content.toString());
          const message: QueueMessage = content;
          
          logger.debug('Message received', { queue, messageId: message.id });
          
          await handler(message);
          
          // Acknowledge message
          channel.ack(msg);
          
        } catch (error) {
          logger.error('Error processing message:', { queue, error });
          
          // Negative acknowledge and requeue
          channel.nack(msg, false, true);
        }
      }, options);

      logger.info(`✅ Subscribed to queue: ${queue}`);
    } catch (error) {
      logger.error('Error subscribing to queue:', { queue, error });
      throw error;
    }
  }

  // RPC pattern implementation
  async rpc(queue: string, request: QueueMessage, timeoutMs: number = 5000): Promise<any> {
    return new Promise(async (resolve, reject) => {
      try {
        const channel = await this.getChannel('rpc');
        const correlationId = request.id;
        const replyQueue = 'rpc-reply-' + correlationId;

        // Create temporary reply queue
        const { queue: tempQueue } = await channel.assertQueue('', { exclusive: true, autoDelete: true });
        
        // Subscribe to reply queue
        await channel.consume(tempQueue, (msg) => {
          if (!msg || msg.properties.correlationId !== correlationId) return;

          try {
            const response = JSON.parse(msg.content.toString());
            channel.ack(msg);
            resolve(response);
          } catch (error) {
            reject(error);
          }
        }, { noAck: false });

        // Send request
        await this.sendToQueue(queue, request, {
          correlationId,
          replyTo: tempQueue,
        });

        // Set timeout
        setTimeout(() => {
          reject(new Error('RPC timeout'));
        }, timeoutMs);

      } catch (error) {
        reject(error);
      }
    });
  }

  // Business-specific message publishers
  async publishPaymentConfirmed(paymentData: any): Promise<void> {
    const message: QueueMessage = {
      id: crypto.randomUUID(),
      type: 'payment.confirmed',
      timestamp: Date.now(),
      data: paymentData,
    };

    await this.publish(
      EXCHANGES.PAYMENT_EVENTS,
      'payment.confirmed',
      message
    );
  }

  async publishLoyaltyPointsEarned(pointsData: any): Promise<void> {
    const message: QueueMessage = {
      id: crypto.randomUUID(),
      type: 'loyalty.points.earned',
      timestamp: Date.now(),
      data: pointsData,
    };

    await this.publish(
      EXCHANGES.LOYALTY_EVENTS,
      'loyalty.points.earned',
      message
    );
  }

  async publishTipSettled(tipData: any): Promise<void> {
    const message: QueueMessage = {
      id: crypto.randomUUID(),
      type: 'tip.settled',
      timestamp: Date.now(),
      data: tipData,
    };

    await this.publish(
      EXCHANGES.TIP_EVENTS,
      'tip.settled',
      message
    );
  }

  async sendWebhookNotification(webhookData: any): Promise<void> {
    const message: QueueMessage = {
      id: crypto.randomUUID(),
      type: 'webhook.notification',
      timestamp: Date.now(),
      data: webhookData,
    };

    await this.sendToQueue(QUEUES.WEBHOOK_NOTIFICATION, message);
  }

  async sendComplianceCheck(complianceData: any): Promise<void> {
    const message: QueueMessage = {
      id: crypto.randomUUID(),
      type: 'compliance.check',
      timestamp: Date.now(),
      data: complianceData,
    };

    await this.sendToQueue(QUEUES.COMPLIANCE_CHECK, message);
  }

  async sendNotificationEmail(emailData: any): Promise<void> {
    const message: QueueMessage = {
      id: crypto.randomUUID(),
      type: 'notification.email',
      timestamp: Date.now(),
      data: emailData,
    };

    await this.sendToQueue(QUEUES.NOTIFICATION_EMAIL, message);
  }

  async sendNotificationSMS(smsData: any): Promise<void> {
    const message: QueueMessage = {
      id: crypto.randomUUID(),
      type: 'notification.sms',
      timestamp: Date.now(),
      data: smsData,
    };

    await this.sendToQueue(QUEUES.NOTIFICATION_SMS, message);
  }

  isConnected(): boolean {
    return this.connected;
  }
}

// Export singleton instance
export const rabbitMQ = new RabbitMQConnection();

// Auto-connect in production
if (config.app.isProduction) {
  rabbitMQ.connect().catch((error) => {
    logger.error('Failed to connect to RabbitMQ on startup:', error);
    process.exit(1);
  });
}

// Message publishing helpers
export const messageHelpers = {
  createMessage: (type: string, data: any, metadata?: any): QueueMessage => ({
    id: crypto.randomUUID(),
    type,
    timestamp: Date.now(),
    data,
    metadata,
  }),

  // Retry logic for message publishing
  async publishWithRetry(
    publishFunction: () => Promise<boolean>,
    maxRetries: number = 3,
    delayMs: number = 1000
  ): Promise<boolean> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const result = await publishFunction();
        if (result) return true;
        
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, i)));
        }
      } catch (error) {
        logger.error('Message publishing error:', { attempt: i + 1, error });
        if (i === maxRetries - 1) throw error;
      }
    }
    return false;
  },
};