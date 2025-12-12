const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');
const subscriptionPlanController = require('../controllers/subscriptionPlanController');

// Public routes - anyone can view plans
router.get('/', subscriptionPlanController.getAllPlans);
router.get('/active', subscriptionPlanController.getActivePlans);
router.get('/:id', subscriptionPlanController.getPlanById);

// Admin-only routes
router.post('/', authenticateToken, checkRole('admin'), subscriptionPlanController.createPlan);
router.put('/:id', authenticateToken, checkRole('admin'), subscriptionPlanController.updatePlan);
router.delete('/:id', authenticateToken, checkRole('admin'), subscriptionPlanController.deletePlan);

// Price calculation route (can be used by organizations)
router.post('/calculate', authenticateToken, subscriptionPlanController.calculateOrganizationPrice);

module.exports = router;

