import { Page, Request, Response } from '@playwright/test';

/**
 * Test utilities for TON Business Suite E2E tests
 */

export interface PaymentRequest {
  merchantId: string;
  amount: {
    ton: number;
    aedEquivalent: number;
  };
  metadata?: {
    orderId?: string;
    items?: Array<{
      name: string;
      quantity: number;
      price: number;
    }>;
    paymentSource?: 'QR' | 'LINK' | 'CHAT';
  };
}

export interface LoyaltyRequest {
  merchantId: string;
  points: number;
  action: string;
  userId?: string;
}

export interface TipRequest {
  staffId: string;
  amount: {
    ton: number;
    aedPreset: number;
  };
  message?: string;
}

/**
 * API Test Helpers
 */
export class APITestHelper {
  constructor(private baseURL: string) {}

  async getHealth(page: Page): Promise<any> {
    const response = await page.request.get(`${this.baseURL}/health`);
    return {
      status: response.status(),
      data: await response.json()
    };
  }

  async getStatus(page: Page): Promise<any> {
    const response = await page.request.get(`${this.baseURL}/api/v1/status`);
    return {
      status: response.status(),
      data: await response.json()
    };
  }

  async createPayment(page: Page, paymentData: PaymentRequest): Promise<any> {
    const response = await page.request.post(`${this.baseURL}/api/v1/payments/create`, {
      data: paymentData
    });
    return {
      status: response.status(),
      data: await response.json()
    };
  }

  async earnPoints(page: Page, loyaltyData: LoyaltyRequest): Promise<any> {
    const response = await page.request.post(`${this.baseURL}/api/v1/loyalty/earn`, {
      data: loyaltyData
    });
    return {
      status: response.status(),
      data: await response.json()
    };
  }

  async sendTip(page: Page, tipData: TipRequest): Promise<any> {
    const response = await page.request.post(`${this.baseURL}/api/v1/tips/send`, {
      data: tipData
    });
    return {
      status: response.status(),
      data: await response.json()
    };
  }
}

/**
 * Sample Data Generators
 */
export const SampleDataGenerator = {
  generatePaymentRequest(): PaymentRequest {
    return {
      merchantId: `merchant-${Date.now()}`,
      amount: {
        ton: Math.random() * 10,
        aedEquivalent: Math.random() * 100
      },
      metadata: {
        orderId: `ORDER-${Date.now()}`,
        items: [
          {
            name: 'Test Product',
            quantity: Math.floor(Math.random() * 5) + 1,
            price: Math.random() * 50
          }
        ],
        paymentSource: 'QR'
      }
    };
  },

  generateLoyaltyRequest(): LoyaltyRequest {
    return {
      merchantId: `merchant-${Date.now()}`,
      points: Math.floor(Math.random() * 1000) + 50,
      action: 'purchase_completed',
      userId: `user-${Date.now()}`
    };
  },

  generateTipRequest(): TipRequest {
    return {
      staffId: `staff-${Date.now()}`,
      amount: {
        ton: Math.random() * 2,
        aedPreset: [10, 20, 50][Math.floor(Math.random() * 3)]
      },
      message: 'Great service!'
    };
  }
};

/**
 * Performance Test Helpers
 */
export class PerformanceTestHelper {
  private requests: Array<{ url: string; duration: number; status: number }> = [];

  async measureRequest(page: Page, url: string): Promise<number> {
    const startTime = Date.now();
    const response = await page.request.get(url);
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    this.requests.push({
      url,
      duration,
      status: response.status()
    });

    return duration;
  }

  async measureConcurrentRequests(page: Page, urls: string[]): Promise<number[]> {
    const startTime = Date.now();
    const requests = urls.map(url => this.measureRequest(page, url));
    await Promise.all(requests);
    const endTime = Date.now();
    
    return requests.map(() => endTime - startTime);
  }

  getPerformanceReport(): any {
    const successfulRequests = this.requests.filter(r => r.status < 400);
    const avgResponseTime = successfulRequests.reduce((sum, r) => sum + r.duration, 0) / successfulRequests.length;
    
    return {
      totalRequests: this.requests.length,
      successfulRequests: successfulRequests.length,
      failedRequests: this.requests.length - successfulRequests.length,
      avgResponseTime: Math.round(avgResponseTime),
      maxResponseTime: Math.max(...this.requests.map(r => r.duration)),
      minResponseTime: Math.min(...this.requests.map(r => r.duration))
    };
  }
}

/**
 * Test Data Assertions
 */
export const Assertions = {
  assertHealthResponse(data: any): void {
    expect(data).toHaveProperty('status', 'ok');
    expect(data).toHaveProperty('service', 'API Gateway');
    expect(data).toHaveProperty('timestamp');
    expect(data).toHaveProperty('version', '1.0.0');
  },

  assertStatusResponse(data: any): void {
    expect(data).toHaveProperty('status', 'running');
    expect(data).toHaveProperty('message');
    expect(data.message).toContain('TON Business API Gateway is operational');
  },

  assertErrorResponse(status: number, data?: any): void {
    expect(status).toBeGreaterThanOrEqual(400);
    if (data) {
      expect(data).toHaveProperty('error');
    }
  },

  assertAPIStructure(endpoint: string, data: any): void {
    // Generic API response structure assertions
    if (endpoint.includes('/health')) {
      this.assertHealthResponse(data);
    } else if (endpoint.includes('/status')) {
      this.assertStatusResponse(data);
    }
  }
};

/**
 * Cleanup Helpers
 */
export class CleanupHelper {
  static async clearTestData(): Promise<void> {
    // This would implement cleanup of test data from databases
    // For now, just log that cleanup would happen here
    console.log('Test data cleanup would happen here');
  }

  static async resetAPIState(): Promise<void> {
    // Reset any in-memory state or cache
    console.log('API state reset would happen here');
  }
}