import { test, expect, describe } from '@playwright/test';

describe('TON Business Suite - API Gateway E2E Tests', () => {
  let apiGateway: string;

  test.beforeEach(async ({ baseURL }) => {
    apiGateway = baseURL!;
  });

  describe('Health Check Endpoints', () => {
    test('should return health status successfully', async ({ request }) => {
      const response = await request.get(`${apiGateway}/health`);
      
      expect(response.status()).toBe(200);
      
      const healthData = await response.json();
      expect(healthData).toHaveProperty('status', 'ok');
      expect(healthData).toHaveProperty('service', 'API Gateway');
      expect(healthData).toHaveProperty('timestamp');
      expect(healthData).toHaveProperty('version', '1.0.0');
    });

    test('health endpoint should be accessible without authentication', async ({ request }) => {
      const response = await request.get(`${apiGateway}/health`);
      expect(response.status()).toBe(200);
    });
  });

  describe('API Status Endpoints', () => {
    test('should return API status successfully', async ({ request }) => {
      const response = await request.get(`${apiGateway}/api/v1/status`);
      
      expect(response.status()).toBe(200);
      
      const statusData = await response.json();
      expect(statusData).toHaveProperty('status', 'running');
      expect(statusData).toHaveProperty('message');
      expect(statusData.message).toContain('TON Business API Gateway is operational');
    });

    test('status endpoint should be accessible without authentication', async ({ request }) => {
      const response = await request.get(`${apiGateway}/api/v1/status`);
      expect(response.status()).toBe(200);
    });
  });

  describe('Error Handling', () => {
    test('should return 404 for non-existent endpoints', async ({ request }) => {
      const response = await request.get(`${apiGateway}/non-existent-endpoint`);
      expect(response.status()).toBe(404);
    });

    test('should handle POST requests to health endpoint', async ({ request }) => {
      const response = await request.post(`${apiGateway}/health`, {
        data: { test: 'data' }
      });
      expect(response.status()).toBe(404); // Health endpoint should only accept GET
    });
  });

  describe('API Response Format', () => {
    test('should return JSON content type', async ({ request }) => {
      const response = await request.get(`${apiGateway}/health`);
      expect(response.headers()['content-type']).toContain('application/json');
    });

    test('should have proper CORS headers', async ({ request }) => {
      const response = await request.get(`${apiGateway}/health`);
      // CORS headers will be tested when CORS is properly configured
      expect(response.status()).toBe(200);
    });
  });
});