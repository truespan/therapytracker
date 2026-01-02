const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');
const subscriptionPlanController = require('../controllers/subscriptionPlanController');

// Public routes - anyone can view plans
router.get('/', subscriptionPlanController.getAllPlans);
router.get('/active', subscriptionPlanController.getActivePlans);

// Specific routes must come before parameterized routes
router.get('/check-first-login', authenticateToken, checkRole('partner', 'organization'), subscriptionPlanController.checkFirstLogin);
router.post('/log-event', authenticateToken, checkRole('partner', 'organization'), subscriptionPlanController.logSubscriptionEvent);
router.post('/calculate', authenticateToken, subscriptionPlanController.calculateOrganizationPrice);
router.get('/individual/selection', authenticateToken, checkRole('partner'), subscriptionPlanController.getIndividualPlansForSelection);
router.get('/organization/selection', authenticateToken, checkRole('organization'), subscriptionPlanController.getOrganizationPlansForSelection);

// Parameterized routes must come last
router.get('/:id', subscriptionPlanController.getPlanById);

// Admin-only routes
router.post('/', authenticateToken, checkRole('admin'), subscriptionPlanController.createPlan);
router.put('/:id', authenticateToken, checkRole('admin'), subscriptionPlanController.updatePlan);
router.delete('/:id', authenticateToken, checkRole('admin'), subscriptionPlanController.deletePlan);

module.exports = router;





















