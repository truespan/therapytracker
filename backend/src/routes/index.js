const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');
const { checkVideoSessionAccess, checkVideoSessionAccessByPartnerId } = require('../middleware/videoSessionAccess');

// Controllers
const authController = require('../controllers/authController');
const userController = require('../controllers/userController');
const partnerController = require('../controllers/partnerController');
const organizationController = require('../controllers/organizationController');
const adminController = require('../controllers/adminController');
const appointmentController = require('../controllers/appointmentController');
const chartController = require('../controllers/chartController');
const videoSessionController = require('../controllers/videoSessionController');
const questionnaireController = require('../controllers/questionnaireController');
const therapySessionController = require('../controllers/therapySessionController');
const uploadController = require('../controllers/uploadController');
const googleCalendarController = require('../controllers/googleCalendarController');
const caseHistoryController = require('../controllers/caseHistoryController');
const mentalStatusExaminationController = require('../controllers/mentalStatusExaminationController');
const reportTemplateController = require('../controllers/reportTemplateController');
const generatedReportController = require('../controllers/generatedReportController');
const subscriptionPlanRoutes = require('./subscriptionPlanRoutes');
const partnerSubscriptionController = require('../controllers/partnerSubscriptionController');

// Upload middleware
const upload = require('../middleware/upload');
const uploadTemplate = require('../middleware/uploadTemplate');

const router = express.Router();

// ==================== AUTH ROUTES ====================
router.post('/auth/signup', authController.signup);
router.post('/auth/login', authController.login);
router.get('/auth/me', authenticateToken, authController.getCurrentUser);
router.post('/auth/forgot-password', authController.forgotPassword);
router.post('/auth/reset-password', authController.resetPassword);
router.get('/auth/verify-email', authController.verifyEmail);
router.post('/auth/change-password', authenticateToken, authController.changePassword);

// ==================== GOOGLE CALENDAR ROUTES ====================
router.get('/google-calendar/auth', authenticateToken, googleCalendarController.initiateOAuth);
// Callback route does NOT require authentication - OAuth redirects don't include JWT tokens
// Security is handled via state parameter (CSRF protection)
router.get('/google-calendar/callback', googleCalendarController.handleCallback);
router.get('/google-calendar/status', authenticateToken, googleCalendarController.getConnectionStatus);
router.post('/google-calendar/disconnect', authenticateToken, googleCalendarController.disconnectCalendar);
router.post('/google-calendar/resync/:eventType/:eventId', authenticateToken, googleCalendarController.resyncEvent);
router.post('/google-calendar/toggle-sync', authenticateToken, googleCalendarController.toggleSync);

// ==================== USER ROUTES ====================
router.get('/users/:id', authenticateToken, userController.getUserById);
router.put('/users/:id', authenticateToken, userController.updateUser);
router.get('/users/:id/profile', authenticateToken, userController.getUserProfile);
router.get('/users/:id/partners', authenticateToken, userController.getUserPartners);
router.post('/users/assign-partner', authenticateToken, checkRole('partner', 'organization'), userController.assignUserToPartner);

// ==================== UPLOAD ROUTES ====================
router.post('/upload/profile-picture', authenticateToken, upload.single('profilePicture'), uploadController.uploadProfilePicture);
router.delete('/upload/profile-picture', authenticateToken, uploadController.deleteProfilePicture);

// ==================== PARTNER ROUTES ====================
router.get('/partners/:id', authenticateToken, partnerController.getPartnerById);
router.put('/partners/:id', authenticateToken, partnerController.updatePartner);
router.get('/partners/:id/users', authenticateToken, partnerController.getPartnerUsers);
router.get('/partners/:partnerId/users/:userId/profile', authenticateToken, checkRole('partner', 'organization'), partnerController.getUserProfileForPartner);

// Partner report template settings
router.post('/partners/:id/default-report-template', authenticateToken, checkRole('partner'), partnerController.setDefaultReportTemplate);
router.get('/partners/:id/default-report-template', authenticateToken, checkRole('partner'), partnerController.getDefaultReportTemplate);

// Background image management routes
router.get('/backgrounds/available', authenticateToken, checkRole('partner'), partnerController.getAvailableBackgrounds);
router.get('/backgrounds/preview/:filename', authenticateToken, partnerController.getBackgroundPreview);
router.post('/partners/:id/default-report-background', authenticateToken, checkRole('partner'), partnerController.setDefaultReportBackground);
router.get('/partners/:id/default-report-background', authenticateToken, checkRole('partner'), partnerController.getDefaultReportBackground);

// ==================== CASE HISTORY ROUTES ====================
router.get('/users/:userId/case-history', authenticateToken, checkRole('partner'), caseHistoryController.getCaseHistory);
router.post('/users/:userId/case-history', authenticateToken, checkRole('partner'), caseHistoryController.saveCaseHistory);

// ==================== MENTAL STATUS EXAMINATION ROUTES ====================
router.get('/users/:userId/mental-status', authenticateToken, checkRole('partner'), mentalStatusExaminationController.getMentalStatus);
router.post('/users/:userId/mental-status', authenticateToken, checkRole('partner'), mentalStatusExaminationController.saveMentalStatus);

// ==================== ORGANIZATION ROUTES ====================
// Public route for signup - get all organizations
router.get('/organizations', organizationController.getAllOrganizations);
router.get('/organizations/:id', authenticateToken, organizationController.getOrganizationById);
router.put('/organizations/:id', authenticateToken, organizationController.updateOrganization);
router.get('/organizations/:id/partners', authenticateToken, checkRole('organization'), organizationController.getOrganizationPartners);
router.get('/organizations/:id/users', authenticateToken, checkRole('organization'), organizationController.getOrganizationUsers);

// Organization partner management
router.post('/organizations/:id/partners', authenticateToken, checkRole('organization'), organizationController.createPartner);
router.put('/organizations/:id/partners/:partnerId', authenticateToken, checkRole('organization'), organizationController.updatePartner);
router.post('/organizations/:id/partners/:partnerId/deactivate', authenticateToken, checkRole('organization'), organizationController.deactivatePartner);
router.post('/organizations/:id/partners/:partnerId/activate', authenticateToken, checkRole('organization'), organizationController.activatePartner);
router.delete('/organizations/:id/partners/:partnerId', authenticateToken, checkRole('organization'), organizationController.deletePartner);
router.post('/organizations/:id/partners/:partnerId/resend-verification', authenticateToken, checkRole('organization'), organizationController.resendVerificationEmail);
router.get('/organizations/:id/partners/:partnerId/clients', authenticateToken, checkRole('organization'), organizationController.getPartnerClients);
router.post('/organizations/:id/reassign-clients', authenticateToken, checkRole('organization'), organizationController.reassignClients);

// Organization client management
router.delete('/organizations/:id/clients/:clientId', authenticateToken, checkRole('organization'), organizationController.deleteClient);

// Organization subscription management
router.get('/organizations/:id/subscription', authenticateToken, organizationController.getSubscriptionDetails);
router.put('/organizations/:id/subscription', authenticateToken, organizationController.updateSubscription);
router.post('/organizations/:id/subscription/calculate-price', authenticateToken, organizationController.calculateSubscriptionPrice);

// Organization partner subscription management (for TheraPTrack controlled organizations)
router.get('/organizations/:id/partner-subscriptions', authenticateToken, checkRole('organization'), partnerSubscriptionController.getOrganizationPartnerSubscriptions);
router.post('/organizations/:id/partner-subscriptions/assign', authenticateToken, checkRole('organization'), partnerSubscriptionController.assignSubscriptions);
router.put('/organizations/:id/partner-subscriptions/:subscriptionId', authenticateToken, checkRole('organization'), partnerSubscriptionController.updateSubscription);
router.post('/organizations/:id/partner-subscriptions/remove', authenticateToken, checkRole('organization'), partnerSubscriptionController.removeSubscriptions);

// ==================== APPOINTMENT ROUTES ====================
router.post('/appointments', authenticateToken, appointmentController.createAppointment);
router.get('/appointments/check-conflicts', authenticateToken, appointmentController.checkAppointmentConflicts);
router.get('/appointments/:id', authenticateToken, appointmentController.getAppointmentById);
router.get('/partners/:partnerId/appointments', authenticateToken, appointmentController.getPartnerAppointments);
router.get('/partners/:partnerId/upcoming-appointments', authenticateToken, appointmentController.getUpcomingAppointments);
router.get('/users/:userId/appointments', authenticateToken, appointmentController.getUserAppointments);
router.put('/appointments/:id', authenticateToken, appointmentController.updateAppointment);
router.delete('/appointments/:id', authenticateToken, appointmentController.deleteAppointment);

// ==================== THERAPY SESSION ROUTES ====================
router.post('/therapy-sessions', authenticateToken, checkRole('partner'), therapySessionController.createTherapySession);
router.post('/therapy-sessions/standalone', authenticateToken, checkRole('partner'), therapySessionController.createStandaloneSession);
router.get('/therapy-sessions/:id', authenticateToken, therapySessionController.getTherapySessionById);
router.get('/partners/:partnerId/therapy-sessions', authenticateToken, therapySessionController.getPartnerTherapySessions);
router.get('/partners/:partnerId/users/:userId/therapy-sessions', authenticateToken, therapySessionController.getPartnerUserSessions);
router.get('/users/:userId/therapy-sessions', authenticateToken, therapySessionController.getUserTherapySessions);
router.put('/therapy-sessions/:id', authenticateToken, checkRole('partner'), therapySessionController.updateTherapySession);
router.delete('/therapy-sessions/:id', authenticateToken, checkRole('partner'), therapySessionController.deleteTherapySession);

// Session-questionnaire management
router.post('/therapy-sessions/:sessionId/assign-questionnaire', authenticateToken, checkRole('partner'), therapySessionController.assignQuestionnaireToSession);
router.get('/therapy-sessions/:sessionId/questionnaires', authenticateToken, therapySessionController.getSessionQuestionnaires);
router.delete('/therapy-sessions/:sessionId/questionnaires/:assignmentId', authenticateToken, checkRole('partner'), therapySessionController.removeQuestionnaireFromSession);

// ==================== CHART ROUTES ====================
router.post('/charts/share', authenticateToken, checkRole('partner'), chartController.shareChart);
router.post('/charts/share-questionnaire', authenticateToken, checkRole('partner'), chartController.shareQuestionnaireChart);
router.get('/charts/user/:userId', authenticateToken, chartController.getUserCharts);
router.get('/charts/user/:userId/latest', authenticateToken, chartController.getLatestUserChart);
router.get('/charts/partner/:partnerId/user/:userId', authenticateToken, checkRole('partner'), chartController.getPartnerUserCharts);
router.delete('/charts/:id', authenticateToken, checkRole('partner'), chartController.deleteChart);

// ==================== VIDEO SESSION ROUTES ====================
router.post('/video-sessions', authenticateToken, checkRole('partner'), checkVideoSessionAccess, videoSessionController.createVideoSession);
router.get('/video-sessions/:id', authenticateToken, videoSessionController.getVideoSessionById);
router.get('/partners/:partnerId/video-sessions', authenticateToken, checkVideoSessionAccessByPartnerId, videoSessionController.getPartnerVideoSessions);
router.get('/users/:userId/video-sessions', authenticateToken, videoSessionController.getUserVideoSessions);
router.put('/video-sessions/:id', authenticateToken, checkVideoSessionAccess, videoSessionController.updateVideoSession);
router.delete('/video-sessions/:id', authenticateToken, checkVideoSessionAccess, videoSessionController.deleteVideoSession);
router.post('/video-sessions/:id/verify-password', videoSessionController.verifySessionPassword);

// ==================== QUESTIONNAIRE ROUTES ====================
// Questionnaire management
router.post('/questionnaires', authenticateToken, checkRole('admin', 'organization', 'partner'), questionnaireController.createQuestionnaire);
router.get('/questionnaires/admin/:adminId', authenticateToken, checkRole('admin'), questionnaireController.getAdminQuestionnaires);
router.get('/questionnaires/organization/:organizationId', authenticateToken, checkRole('admin', 'organization'), questionnaireController.getOrganizationQuestionnaires);
router.get('/questionnaires/partner/:partnerId', authenticateToken, questionnaireController.getPartnerQuestionnaires);
router.get('/questionnaires/:id', authenticateToken, questionnaireController.getQuestionnaire);
router.put('/questionnaires/:id', authenticateToken, checkRole('admin', 'organization', 'partner'), questionnaireController.updateQuestionnaire);
router.delete('/questionnaires/:id', authenticateToken, checkRole('admin', 'organization', 'partner'), questionnaireController.deleteQuestionnaire);
router.get('/questionnaires/:id/stats', authenticateToken, checkRole('admin', 'organization', 'partner'), questionnaireController.getQuestionnaireStats);

// Questionnaire assignments
router.post('/questionnaires/assign', authenticateToken, checkRole('partner'), questionnaireController.assignQuestionnaire);
router.get('/questionnaires/assignments/user/:userId', authenticateToken, questionnaireController.getUserAssignments);
router.get('/questionnaires/assignments/partner/:partnerId', authenticateToken, checkRole('partner'), questionnaireController.getPartnerAssignments);
router.get('/questionnaires/assignments/:id', authenticateToken, questionnaireController.getAssignment);
router.delete('/questionnaires/assignments/:id', authenticateToken, checkRole('partner'), questionnaireController.deleteAssignment);

// Questionnaire responses
router.post('/questionnaires/assignments/:id/responses', authenticateToken, questionnaireController.saveResponses);
router.get('/questionnaires/assignments/:id/responses', authenticateToken, questionnaireController.getResponses);
router.get('/questionnaires/user/:userId/history/:questionnaireId', authenticateToken, questionnaireController.getUserHistory);
router.get('/questionnaires/:questionnaireId/user/:userId/aggregated', authenticateToken, questionnaireController.getAggregatedResponses);

// Questionnaire comparison routes (for Charts & Insights)
router.get('/questionnaires/completed-by-type/user/:userId', authenticateToken, checkRole('partner'), questionnaireController.getCompletedByTypeForUser);
router.post('/questionnaires/responses-for-comparison', authenticateToken, questionnaireController.getResponsesForComparison);

// Questionnaire sharing routes
router.post('/questionnaires/:id/share-organizations', authenticateToken, checkRole('admin'), questionnaireController.shareWithOrganizations);
router.post('/questionnaires/:id/share-partners', authenticateToken, checkRole('organization'), questionnaireController.shareWithPartners);
router.post('/questionnaires/:id/unshare-organizations', authenticateToken, checkRole('admin'), questionnaireController.unshareFromOrganizations);
router.post('/questionnaires/:id/unshare-partners', authenticateToken, checkRole('organization'), questionnaireController.unshareFromPartners);
router.post('/questionnaires/:id/copy', authenticateToken, checkRole('partner', 'organization'), questionnaireController.copyQuestionnaire);
router.get('/questionnaires/:id/shared-organizations', authenticateToken, checkRole('admin'), questionnaireController.getSharedOrganizations);
router.get('/questionnaires/:id/shared-partners', authenticateToken, checkRole('organization'), questionnaireController.getSharedPartners);

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

// Report template management routes - admin only
router.get('/admin/report-templates', authenticateToken, checkRole('admin'), reportTemplateController.getAllTemplates);
router.get('/admin/report-templates/count', authenticateToken, checkRole('admin'), reportTemplateController.getTemplateCount);
router.post('/admin/report-templates', authenticateToken, checkRole('admin'), uploadTemplate.single('template'), reportTemplateController.uploadTemplate);
router.put('/admin/report-templates/:id', authenticateToken, checkRole('admin'), reportTemplateController.updateTemplate);
router.delete('/admin/report-templates/:id', authenticateToken, checkRole('admin'), reportTemplateController.deleteTemplate);
router.get('/admin/report-templates/:id/download', authenticateToken, checkRole('admin'), reportTemplateController.downloadTemplate);

// Partner routes for report templates
router.get('/report-templates', authenticateToken, checkRole('partner', 'organization'), reportTemplateController.getAllTemplates);
router.get('/report-templates/:id/download', authenticateToken, checkRole('partner', 'organization'), reportTemplateController.downloadTemplate);

// ==================== SUBSCRIPTION PLAN ROUTES ====================
router.use('/subscription-plans', subscriptionPlanRoutes);

// ==================== GENERATED REPORTS ROUTES ====================
// Partner routes for generated reports
router.post('/reports', authenticateToken, checkRole('partner'), generatedReportController.createReport);
router.get('/reports', authenticateToken, checkRole('partner'), generatedReportController.getPartnerReports);
router.get('/reports/client/:userId', authenticateToken, checkRole('partner'), generatedReportController.getClientReports);
router.get('/reports/:id', authenticateToken, generatedReportController.getReportById);
router.get('/reports/:id/download', authenticateToken, generatedReportController.downloadReport);
router.get('/reports/:id/download-docx', authenticateToken, generatedReportController.downloadReportDocx);
router.put('/reports/:id', authenticateToken, checkRole('partner'), generatedReportController.updateReport);
router.post('/reports/:id/share', authenticateToken, checkRole('partner'), generatedReportController.shareReport);
router.post('/reports/:id/unshare', authenticateToken, checkRole('partner'), generatedReportController.unshareReport);
router.delete('/reports/:id', authenticateToken, checkRole('partner'), generatedReportController.deleteReport);

// User routes for shared reports
router.get('/user/reports', authenticateToken, checkRole('user'), generatedReportController.getUserSharedReports);
router.get('/user/reports/unread-count', authenticateToken, checkRole('user'), generatedReportController.getUserUnreadCount);
router.post('/user/reports/:id/mark-viewed', authenticateToken, checkRole('user'), generatedReportController.markReportAsViewed);

// ==================== CONTACT FORM ROUTES ====================
const contactController = require('../controllers/contactController');
router.post('/contact', contactController.submitContact);

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

