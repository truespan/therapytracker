const express = require('express');
const router = express.Router();
const razorpayController = require('../controllers/razorpayController');
const { authenticateToken } = require('../middleware/auth');

// Create order for subscription payment (requires authentication)
router.post('/create-order', authenticateToken, razorpayController.createOrder);

// Verify payment (requires authentication)
router.post('/verify-payment', authenticateToken, razorpayController.verifyPayment);

// Create order for booking fee payment (requires authentication)
router.post('/create-booking-order', authenticateToken, razorpayController.createBookingOrder);

// Verify booking payment (requires authentication)
router.post('/verify-booking-payment', authenticateToken, razorpayController.verifyBookingPayment);

// Get payment history (requires authentication)
router.get('/payment-history', authenticateToken, razorpayController.getPaymentHistory);

// Webhook endpoint (no authentication required, but verifies Razorpay signature)
// Uses express.raw() to capture raw body for signature verification, then parses JSON
router.post('/webhook', 
  express.raw({ type: 'application/json' }),
  razorpayController.handleWebhook
);

module.exports = router;

