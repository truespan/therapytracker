const express = require('express');
const googleAuthController = require('../controllers/googleAuthController');

const router = express.Router();

// Google authentication route
router.post('/google', googleAuthController.authenticate);

// Complete Google signup for client users (requires additional info)
router.post('/google/complete-signup', googleAuthController.completeClientSignup);

module.exports = router;