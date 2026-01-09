const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');
const { detectLocale } = require('../middleware/localeDetection');
const subscriptionPlanController = require('../controllers/subscriptionPlanController');

// Apply locale detection middleware to all routes that return plans
router.use(detectLocale);

// Public routes - anyone can view plans
router.get('/', subscriptionPlanController.getAllPlans);
router.get('/active', subscriptionPlanController.getActivePlans);

// Specific routes must come before parameterized routes
router.get('/check-first-login', authenticateToken, checkRole('partner', 'organization'), subscriptionPlanController.checkFirstLogin);
router.post('/log-event', authenticateToken, checkRole('partner', 'organization'), subscriptionPlanController.logSubscriptionEvent);
router.post('/calculate', authenticateToken, subscriptionPlanController.calculateOrganizationPrice);
router.get('/individual/selection', authenticateToken, checkRole('partner'), subscriptionPlanController.getIndividualPlansForSelection);
router.get('/organization/selection', authenticateToken, checkRole('organization'), subscriptionPlanController.getOrganizationPlansForSelection);
router.get('/locales/available', authenticateToken, checkRole('admin'), subscriptionPlanController.getAvailableLocales);

// Locale pricing management routes (admin only) - must come before /:id route
router.get('/:planId/locales', authenticateToken, checkRole('admin'), subscriptionPlanController.getPlanLocales);
router.post('/:planId/locales', authenticateToken, checkRole('admin'), subscriptionPlanController.upsertPlanLocale);
router.delete('/:planId/locales/:localeId', authenticateToken, checkRole('admin'), subscriptionPlanController.deletePlanLocale);

// Parameterized routes must come last
router.get('/:id', subscriptionPlanController.getPlanById);

// Admin-only routes
router.post('/', authenticateToken, checkRole('admin'), subscriptionPlanController.createPlan);
router.put('/:id', authenticateToken, checkRole('admin'), subscriptionPlanController.updatePlan);
router.delete('/:id', authenticateToken, checkRole('admin'), subscriptionPlanController.deletePlan);

module.exports = router;





















