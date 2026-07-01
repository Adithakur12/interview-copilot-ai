require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { initializeDatabase, seedDatabase, isPostgresEnabled } = require('./db/database');
const authRoutes = require('./routes/auth');
const { requestLogger, info, error } = require('./utils/logger');
const interviewRoutes = require('./routes/interview');
const paymentRoutes = require('./routes/payment');
const coachRoutes = require('./routes/coach');
const adminRoutes = require('./routes/admin');

const app = express();

// --------------- Security Middleware ---------------
app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// CORS
const corsOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: corsOrigins.length > 0 ? corsOrigins : ['http://localhost:5173', 'http://localhost:4173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX) || 200,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many auth attempts, please try again later.' },
});

// Body parsing
app.use(requestLogger);
app.use('/api/payment/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// --------------- API Routes ---------------
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/interview', apiLimiter, interviewRoutes);
app.use('/api/coach', apiLimiter, coachRoutes);
app.use('/api/payment', apiLimiter, paymentRoutes);
app.use('/api/admin', apiLimiter, adminRoutes);

// --------------- Legacy / Simplified Routes ---------------
// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Interview Copilot API is live',
    geminiEnabled: Boolean(process.env.GEMINI_API_KEY),
    database: isPostgresEnabled() ? 'postgres' : 'sqlite',
    version: '2.0.0',
    uptime: process.uptime(),
  });
});

// --------------- Frontend Static Serving ---------------
const frontendBuildPath = path.join(__dirname, '../src/dist');
if (fs.existsSync(frontendBuildPath)) {
  app.use(express.static(frontendBuildPath));
}

// SPA fallback
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }

  if (fs.existsSync(path.join(frontendBuildPath, 'index.html'))) {
    return res.sendFile(path.join(frontendBuildPath, 'index.html'));
  }

  return res.status(404).json({
    error: 'Frontend build not found. Run `npm run build` from the src directory.',
  });
});

// --------------- Error Handler ---------------
app.use((err, req, res, _next) => {
  error('Unhandled error', { message: err.message, stack: err.stack, path: req.originalUrl });
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal Server Error'
      : err.message || 'Internal Server Error',
  });
});

// --------------- Start Server ---------------
function getPort(envPort = process.env.PORT) {
  const parsed = Number(envPort || 4000);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 4000;
}

if (require.main === module) {
  // Initialize database and seed data
  try {
    initializeDatabase();
    seedDatabase();
    info('Database initialized and seeded.', { postgres: isPostgresEnabled() });
  } catch (err) {
    error('Database initialization error', { message: err.message });
  }

  const port = getPort(process.env.PORT);
  const host = process.env.HOST || '0.0.0.0';
  app.listen(port, host, () => {
    console.log(`\n  Interview Copilot API v2`);
    console.log(`  ─────────────────────`);
    console.log(`  Server:    http://localhost:${port}`);
    console.log(`  Health:    http://localhost:${port}/api/health`);
    console.log(`  Gemini AI: ${process.env.GEMINI_API_KEY ? 'Enabled' : 'Fallback mode'}`);
    console.log(`  Frontend:  http://localhost:5173 (dev mode)\n`);
  });
}

module.exports = { app, getPort };
