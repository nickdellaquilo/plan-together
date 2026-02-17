const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config({ path: '../../.env' });

const { healthCheck } = require('@plan-together/database');

const app = express();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Security middleware
app.use(helmet());

// Compression middleware
app.use(compression());

// Logging middleware
if (NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => NODE_ENV === 'development' && req.ip === '::1',
});

app.use('/api/', limiter);

// Health check endpoint
app.get('/health', async (req, res) => {
  const dbHealth = await healthCheck();
  res.json({
    status: dbHealth.healthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    database: dbHealth,
    environment: NODE_ENV,
  });
});

// API version info
app.get('/api', (req, res) => {
  res.json({
    name: 'Plan Together API',
    version: '1.0.0',
    environment: NODE_ENV,
  });
});

// API Routes
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const friendsRoutes = require('./routes/friends');

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/friends', friendsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);

  const error = NODE_ENV === 'development'
    ? { message: err.message, stack: err.stack }
    : { message: 'Internal server error' };

  res.status(err.status || 500).json({
    error: error.message,
    ...(NODE_ENV === 'development' && { stack: error.stack }),
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════╗
║   Plan Together API                   ║
║   Port: ${PORT.toString().padEnd(29)}║
║   Environment: ${NODE_ENV.padEnd(22)}║
║   Status: Running ✓                   ║
╚═══════════════════════════════════════╝
  `);
});

// Graceful shutdown
const shutdown = () => {
  console.log('Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('Forcing shutdown');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

module.exports = app;