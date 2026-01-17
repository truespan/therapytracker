const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const routes = require('./routes');
const { scheduleSlotArchival } = require('./jobs/archiveOldSlots');
const { scheduleExpiredSessionCompletion } = require('./jobs/completeExpiredSessions');
const { scheduleAppointmentReminders } = require('./jobs/sendAppointmentReminders');
const { startSettlementSyncCron } = require('./jobs/settlementSyncCron');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
// CORS
// Render + browser clients (www.theraptrack.com) require proper preflight handling.
// If you see: "No 'Access-Control-Allow-Origin' header" on OPTIONS preflight,
// ensure the requesting origin is included below (or provided via CORS_ORIGINS).
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const defaultAllowedOrigins = [
  'https://www.theraptrack.com',
  'https://theraptrack.com',
  'http://localhost:3000',
  'http://localhost:5173'
];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (no Origin header)
    if (!origin) return callback(null, true);

    const list = allowedOrigins.length > 0 ? allowedOrigins : defaultAllowedOrigins;
    if (list.includes(origin)) return callback(null, true);

    // Fail closed (no CORS) for unknown origins
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// JSON body parser - skip webhook route (needs raw body for signature verification)
app.use((req, res, next) => {
  if (req.path === '/api/razorpay/webhook') {
    return next(); // Skip JSON parsing for webhook route
  }
  express.json()(req, res, next);
});

app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// API Routes
app.use('/api', routes);

// Root route
app.get('/', (req, res) => {
  res.json({ 
    message: 'TheraP Track API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      partners: '/api/partners',
      organizations: '/api/organizations',
      sessions: '/api/sessions',
      profileFields: '/api/profile-fields'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
// Bind to 0.0.0.0 to allow external connections (required for Render)
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

  // Initialize cron jobs
  scheduleSlotArchival();
  scheduleExpiredSessionCompletion();
  scheduleAppointmentReminders();
  startSettlementSyncCron(); // Start settlement sync cron job (runs every 6 hours)
});

module.exports = app;

