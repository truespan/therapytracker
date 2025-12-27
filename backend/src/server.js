const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const routes = require('./routes');
const { scheduleSlotArchival } = require('./jobs/archiveOldSlots');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());

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
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

  // Initialize cron jobs
  scheduleSlotArchival();
});

module.exports = app;

