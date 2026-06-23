// ============================================================
// Fakemon Chaos — Auth Server Entry Point
// File:  src/index.ts
// Repo:  fakemon-server (Uddissh)
// ============================================================

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ALLOWED_ORIGINS?.split(',') || 'http://localhost:5173',
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// Body parser
app.use(express.json({ limit: '1mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Basic API route
app.get('/api/v1/status', (req, res) => {
  res.json({
    service: 'fakemon-auth-server',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  });
});

// TODO: Import and mount route handlers
// app.use('/auth', authRoutes);
// app.use('/patreon', patreonRoutes);
// app.use('/sprites', spriteRoutes);
// app.use('/teams', teamRoutes);
// app.use('/admin', adminRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[ERROR]', err);
  res.status(500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`[fakemon-auth-server] Listening on port ${PORT}`);
  console.log(`[fakemon-auth-server] Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`[fakemon-auth-server] Health check: http://localhost:${PORT}/health`);
});

export default app;