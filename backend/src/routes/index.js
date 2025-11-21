const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');

// Controllers
const authController = require('../controllers/authController');
const userController = require('../controllers/userController');
const partnerController = require('../controllers/partnerController');
const organizationController = require('../controllers/organizationController');
const sessionController = require('../controllers/sessionController');
const profileController = require('../controllers/profileController');
const adminController = require('../controllers/adminController');
const appointmentController = require('../controllers/appointmentController');

const router = express.Router();

// ==================== AUTH ROUTES ====================
router.post('/auth/signup', authController.signup);
router.post('/auth/login', authController.login);
router.get('/auth/me', authenticateToken, authController.getCurrentUser);
router.post('/auth/forgot-password', authController.forgotPassword);
router.post('/auth/reset-password', authController.resetPassword);

// ==================== PROFILE FIELDS ROUTES ====================
router.get('/profile-fields', authenticateToken, profileController.getAllFields);
router.post('/profile-fields', authenticateToken, checkRole('user', 'partner'), profileController.createCustomField);

// ==================== USER ROUTES ====================
router.get('/users/:id', authenticateToken, userController.getUserById);
router.put('/users/:id', authenticateToken, userController.updateUser);
router.get('/users/:id/profile', authenticateToken, userController.getUserProfile);
router.get('/users/:id/partners', authenticateToken, userController.getUserPartners);
router.post('/users/assign-partner', authenticateToken, checkRole('partner', 'organization'), userController.assignUserToPartner);

// ==================== PARTNER ROUTES ====================
router.get('/partners/:id', authenticateToken, partnerController.getPartnerById);
router.put('/partners/:id', authenticateToken, partnerController.updatePartner);
router.get('/partners/:id/users', authenticateToken, partnerController.getPartnerUsers);
router.get('/partners/:partnerId/users/:userId/profile', authenticateToken, checkRole('partner', 'organization'), partnerController.getUserProfileForPartner);

// ==================== ORGANIZATION ROUTES ====================
// Public route for signup - get all organizations
router.get('/organizations', organizationController.getAllOrganizations);
router.get('/organizations/:id', authenticateToken, organizationController.getOrganizationById);
router.put('/organizations/:id', authenticateToken, organizationController.updateOrganization);
router.get('/organizations/:id/partners', authenticateToken, checkRole('organization'), organizationController.getOrganizationPartners);
router.get('/organizations/:id/users', authenticateToken, checkRole('organization'), organizationController.getOrganizationUsers);

// ==================== SESSION ROUTES ====================
router.post('/sessions', authenticateToken, checkRole('partner'), sessionController.createSession);
router.get('/sessions/:id', authenticateToken, sessionController.getSessionById);
router.get('/users/:userId/sessions', authenticateToken, sessionController.getUserSessions);
router.put('/sessions/:id', authenticateToken, sessionController.updateSession);
router.delete('/sessions/:id', authenticateToken, checkRole('partner'), sessionController.deleteSession);
router.post('/sessions/:sessionId/profile', authenticateToken, sessionController.saveSessionProfile);

// ==================== PROFILE DATA ROUTES ====================
router.get('/profile-data/users/:userId', authenticateToken, profileController.getUserProfileData);

// ==================== APPOINTMENT ROUTES ====================
router.post('/appointments', authenticateToken, appointmentController.createAppointment);
router.get('/appointments/:id', authenticateToken, appointmentController.getAppointmentById);
router.get('/partners/:partnerId/appointments', authenticateToken, appointmentController.getPartnerAppointments);
router.get('/users/:userId/appointments', authenticateToken, appointmentController.getUserAppointments);
router.put('/appointments/:id', authenticateToken, appointmentController.updateAppointment);
router.delete('/appointments/:id', authenticateToken, appointmentController.deleteAppointment);

// ==================== ADMIN ROUTES ====================
// Admin management routes - require admin role
router.get('/admin/organizations', authenticateToken, checkRole('admin'), adminController.getAllOrganizations);
router.post('/admin/organizations', authenticateToken, checkRole('admin'), adminController.createOrganization);
router.put('/admin/organizations/:id', authenticateToken, checkRole('admin'), adminController.updateOrganization);
router.post('/admin/organizations/:id/deactivate', authenticateToken, checkRole('admin'), adminController.deactivateOrganization);
router.post('/admin/organizations/:id/activate', authenticateToken, checkRole('admin'), adminController.activateOrganization);
router.delete('/admin/organizations/:id', authenticateToken, checkRole('admin'), adminController.deleteOrganization);
router.get('/admin/organizations/:id/metrics', authenticateToken, checkRole('admin'), adminController.getOrganizationMetrics);
router.get('/admin/dashboard/stats', authenticateToken, checkRole('admin'), adminController.getDashboardStats);

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ==================== UTILITY ROUTES (TEMPORARY) ====================
// Temporary endpoint to populate Partner IDs for existing partners
router.post('/admin/populate-partner-ids', async (req, res) => {
  try {
    const Partner = require('../models/Partner');
    const db = require('../config/database');
    
    console.log('Starting Partner ID population...');
    
    // Check if column exists
    const columnCheck = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'partners' AND column_name = 'partner_id'
    `);
    
    if (columnCheck.rows.length === 0) {
      // Add column if it doesn't exist
      await db.query('ALTER TABLE partners ADD COLUMN partner_id VARCHAR(7)');
      await db.query('CREATE INDEX idx_partners_partner_id ON partners(partner_id)');
      console.log('Added partner_id column');
    }
    
    // Get all partners
    const result = await db.query('SELECT id, name, organization_id, partner_id FROM partners');
    const partners = result.rows;
    const partnersWithoutId = partners.filter(p => !p.partner_id);
    
    console.log(`Total partners: ${partners.length}`);
    console.log(`Partners without ID: ${partnersWithoutId.length}`);
    
    if (partnersWithoutId.length === 0) {
      return res.json({ 
        success: true,
        message: 'All partners already have Partner IDs',
        partners: partners.map(p => ({ id: p.id, name: p.name, partner_id: p.partner_id }))
      });
    }
    
    // Track existing IDs
    const existingIds = new Set(partners.filter(p => p.partner_id).map(p => p.partner_id));
    const updated = [];
    
    // Generate IDs for partners without them
    for (const partner of partnersWithoutId) {
      try {
        const partnerId = await Partner.generatePartnerId(partner.organization_id);
        await db.query('UPDATE partners SET partner_id = $1 WHERE id = $2', [partnerId, partner.id]);
        updated.push({ id: partner.id, name: partner.name, partner_id: partnerId });
        console.log(`Generated Partner ID ${partnerId} for ${partner.name}`);
      } catch (error) {
        console.error(`Failed to generate ID for partner ${partner.id}:`, error.message);
      }
    }
    
    // Add constraints if all partners now have IDs
    if (updated.length === partnersWithoutId.length) {
      try {
        await db.query('ALTER TABLE partners ALTER COLUMN partner_id SET NOT NULL');
        await db.query('ALTER TABLE partners ADD CONSTRAINT partners_partner_id_unique UNIQUE (partner_id)');
        console.log('Added database constraints');
      } catch (error) {
        console.log('Constraints may already exist:', error.message);
      }
    }
    
    res.json({
      success: true,
      message: 'Partner IDs generated successfully',
      updated,
      total: partners.length,
      updatedCount: updated.length
    });
  } catch (error) {
    console.error('Error populating Partner IDs:', error);
    res.status(500).json({ 
      success: false,
      error: error.message,
      details: 'Check server logs for more information'
    });
  }
});

module.exports = router;

