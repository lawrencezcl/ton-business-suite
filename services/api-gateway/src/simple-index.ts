import express from 'express';

const app = express();
const PORT = (process.env as any).API_PORT || 3000;

// Basic middleware
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'API Gateway',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Basic API endpoint
app.get('/api/v1/status', (req, res) => {
  res.json({
    status: 'running',
    message: 'TON Business API Gateway is operational'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 API Gateway started on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔧 Environment: ${(process.env as any).NODE_ENV || 'development'}`);
});

export default app;