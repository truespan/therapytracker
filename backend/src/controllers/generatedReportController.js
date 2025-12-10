const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const Docxtemplater = require('docxtemplater');
const PizZip = require('pizzip');
const GeneratedReport = require('../models/GeneratedReport');
const ReportTemplate = require('../models/ReportTemplate');
const Partner = require('../models/Partner');
const User = require('../models/User');

const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const getTemplateForReport = async (report) => {
  if (report.template_id) {
    const template = await ReportTemplate.findById(report.template_id);
    if (template) {
      return template;
    }
  }

  const partnerWithTemplate = await Partner.getDefaultReportTemplate(report.partner_id);
  if (partnerWithTemplate?.template_id) {
    const fallbackTemplate = await ReportTemplate.findById(partnerWithTemplate.template_id);
    if (fallbackTemplate) {
      return fallbackTemplate;
    }
  }

  return null;
};

/**
 * Create a new generated report
 */
const createReport = async (req, res) => {
  try {
    const {
      user_id,
      template_id,
      report_name,
      client_name,
      client_age,
      client_sex,
      report_date,
      description
    } = req.body;

    // Validate required fields (template_id is now optional since we use PDF generation)
    if (!user_id || !report_name || !report_date) {
      return res.status(400).json({
        error: 'User ID, report name, and report date are required'
      });
    }

    const reportData = {
      partner_id: req.user.id, // Partner ID from auth middleware
      user_id,
      template_id: template_id || null,
      report_name,
      client_name,
      client_age,
      client_sex,
      report_date,
      description
    };

    const report = await GeneratedReport.create(reportData);

    res.status(201).json({
      success: true,
      message: 'Report created successfully',
      report
    });
  } catch (error) {
    console.error('Error creating report:', error);
    res.status(500).json({
      error: 'Failed to create report',
      details: error.message
    });
  }
};

/**
 * Get all reports by partner
 */
const getPartnerReports = async (req, res) => {
  try {
    const partnerId = req.user.id;
    const reports = await GeneratedReport.getByPartner(partnerId);

    res.json({
      success: true,
      reports
    });
  } catch (error) {
    console.error('Error fetching partner reports:', error);
    res.status(500).json({
      error: 'Failed to fetch reports',
      details: error.message
    });
  }
};

/**
 * Get reports for a specific client (partner view)
 */
const getClientReports = async (req, res) => {
  try {
    const partnerId = req.user.id;
    const { userId } = req.params;

    const reports = await GeneratedReport.getByPartnerAndUser(partnerId, userId);

    res.json({
      success: true,
      reports
    });
  } catch (error) {
    console.error('Error fetching client reports:', error);
    res.status(500).json({
      error: 'Failed to fetch client reports',
      details: error.message
    });
  }
};

/**
 * Get shared reports for a user (client view)
 */
const getUserSharedReports = async (req, res) => {
  try {
    const userId = req.user.id;
    const reports = await GeneratedReport.getSharedReportsByUser(userId);

    res.json({
      success: true,
      reports
    });
  } catch (error) {
    console.error('Error fetching user shared reports:', error);
    res.status(500).json({
      error: 'Failed to fetch shared reports',
      details: error.message
    });
  }
};

/**
 * Get unread reports count for user
 */
const getUserUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const count = await GeneratedReport.getUnreadCountByUser(userId);

    res.json({
      success: true,
      count
    });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({
      error: 'Failed to fetch unread count',
      details: error.message
    });
  }
};

/**
 * Get report by ID
 */
const getReportById = async (req, res) => {
  try {
    const { id } = req.params;
    const report = await GeneratedReport.findById(id);

    if (!report) {
      return res.status(404).json({
        error: 'Report not found'
      });
    }

    // Check access permissions
    if (req.user.userType === 'partner' && report.partner_id !== req.user.id) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    if (req.user.userType === 'user' && (report.user_id !== req.user.id || !report.is_shared)) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    res.json({
      success: true,
      report
    });
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({
      error: 'Failed to fetch report',
      details: error.message
    });
  }
};

/**
 * Download a report as PDF with background image
 */
const downloadReport = async (req, res) => {
  try {
    const { id } = req.params;
    const report = await GeneratedReport.findById(id);

    if (!report) {
      return res.status(404).json({
        error: 'Report not found'
      });
    }

    // Access control
    if (req.user.userType === 'partner' && report.partner_id !== req.user.id) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    if (req.user.userType === 'user' && (report.user_id !== req.user.id || !report.is_shared)) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    // Fetch partner (therapist) data
    const partner = await Partner.findById(report.partner_id);
    if (!partner) {
      return res.status(404).json({
        error: 'Partner not found'
      });
    }

    // Fetch client data
    const client = await User.findById(report.user_id);
    if (!client) {
      return res.status(404).json({
        error: 'Client not found'
      });
    }

    // Parse contact number (format: +91xxxxxxxxxx)
    const parseContact = (contact) => {
      if (!contact) return { code: '', number: '' };
      const match = contact.match(/^(\+\d{1,3})(\d+)$/);
      if (match) {
        return { code: match[1], number: match[2] };
      }
      return { code: '', number: contact };
    };

    const partnerContact = parseContact(partner.contact);

    // Create PDF document
    const doc = new PDFDocument({
      size: 'A4',
      margins: {
        top: 50,
        bottom: 50,
        left: 50,
        right: 50
      }
    });

    // Set response headers for PDF download
    const safeFileName = `${(report.report_name || 'report').replace(/[^a-z0-9_\-]+/gi, '_')}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}"`);

    // Pipe PDF to response
    doc.pipe(res);

    // Add background image (first page only) - use partner's selected background
    const backgroundFilename = partner.default_report_background || 'report-background.jpg';
    const backgroundPath = path.join(__dirname, '../../assets', backgroundFilename);

    if (fs.existsSync(backgroundPath)) {
      doc.image(backgroundPath, 0, 0, {
        width: 595.28,  // A4 width in points
        height: 841.89  // A4 height in points
      });
    } else {
      console.warn('Background image not found at:', backgroundPath, '- using default');
      // Fallback to default
      const defaultPath = path.join(__dirname, '../../assets/report-background.jpg');
      if (fs.existsSync(defaultPath)) {
        doc.image(defaultPath, 0, 0, {
          width: 595.28,
          height: 841.89
        });
      }
    }

    // --- HEADER SECTION (Top-Left) ---
    doc.fontSize(14).font('Helvetica-Bold');
    doc.text(partner.name, 50, 60);

    doc.fontSize(10).font('Helvetica');
    doc.text(partner.qualification, 50, 80);

    // Add License ID if available (between qualification and email)
    let currentY = 95;
    doc.fontSize(9).font('Helvetica');
    if (partner.license_id) {
      doc.text(`License ID: ${partner.license_id}`, 50, currentY);
      currentY += 15;
    }

    doc.text(`Email: ${partner.email}`, 50, currentY);
    doc.text(`Phone: ${partnerContact.code} ${partnerContact.number}`, 50, currentY + 15);

    // --- CLIENT DETAILS SECTION (Horizontal) ---
    // Shifted down to avoid overlapping with colored header background (4+ lines = 80 points)
    const clientDetailsY = 240;
    doc.fontSize(11).font('Helvetica-Bold');
    doc.text('Client Details', 50, clientDetailsY);

    doc.fontSize(10).font('Helvetica');
    const detailsY = clientDetailsY + 20;

    // Name
    doc.text('Name:', 50, detailsY);
    doc.text(report.client_name || client.name, 120, detailsY);

    // Age (next column)
    doc.text('Age:', 280, detailsY);
    doc.text(report.client_age?.toString() || client.age?.toString() || 'N/A', 320, detailsY);

    // Sex
    doc.text('Sex:', 50, detailsY + 20);
    doc.text(report.client_sex || client.sex || 'N/A', 120, detailsY + 20);

    // Date (next column)
    doc.text('Date:', 280, detailsY + 20);
    const reportDate = new Date(report.report_date).toLocaleDateString('en-GB');
    doc.text(reportDate, 320, detailsY + 20);

    // --- REPORT NAME SECTION ---
    const reportNameY = detailsY + 60;
    doc.fontSize(12).font('Helvetica-Bold');
    doc.text('Report Name:', 50, reportNameY);

    doc.fontSize(11).font('Helvetica');
    doc.text(report.report_name, 50, reportNameY + 20, {
      width: 495,
      align: 'left'
    });

    // --- DESCRIPTION/PRESCRIPTION SECTION ---
    const descriptionY = reportNameY + 60;
    doc.fontSize(12).font('Helvetica-Bold');
    doc.text('Prescription Details:', 50, descriptionY);

    doc.fontSize(10).font('Helvetica');
    doc.text(report.description || 'No prescription details provided.', 50, descriptionY + 25, {
      width: 495,
      align: 'left',
      lineGap: 5
    });

    // Finalize PDF
    doc.end();

  } catch (error) {
    console.error('Error generating PDF report:', error);
    res.status(500).json({
      error: 'Failed to generate report PDF',
      details: error.message
    });
  }
};

/**
 * Update a report
 */
const updateReport = async (req, res) => {
  try {
    const { id } = req.params;
    const reportData = req.body;

    const existingReport = await GeneratedReport.findById(id);
    if (!existingReport) {
      return res.status(404).json({
        error: 'Report not found'
      });
    }

    // Check if partner owns this report
    if (existingReport.partner_id !== req.user.id) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    const updatedReport = await GeneratedReport.update(id, reportData);

    res.json({
      success: true,
      message: 'Report updated successfully',
      report: updatedReport
    });
  } catch (error) {
    console.error('Error updating report:', error);
    res.status(500).json({
      error: 'Failed to update report',
      details: error.message
    });
  }
};

/**
 * Share report with client
 */
const shareReport = async (req, res) => {
  try {
    const { id } = req.params;

    const report = await GeneratedReport.findById(id);
    if (!report) {
      return res.status(404).json({
        error: 'Report not found'
      });
    }

    // Check if partner owns this report
    if (report.partner_id !== req.user.id) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    const sharedReport = await GeneratedReport.share(id);

    res.json({
      success: true,
      message: 'Report shared successfully',
      report: sharedReport
    });
  } catch (error) {
    console.error('Error sharing report:', error);
    res.status(500).json({
      error: 'Failed to share report',
      details: error.message
    });
  }
};

/**
 * Unshare report from client
 */
const unshareReport = async (req, res) => {
  try {
    const { id } = req.params;

    const report = await GeneratedReport.findById(id);
    if (!report) {
      return res.status(404).json({
        error: 'Report not found'
      });
    }

    // Check if partner owns this report
    if (report.partner_id !== req.user.id) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    const unsharedReport = await GeneratedReport.unshare(id);

    res.json({
      success: true,
      message: 'Report unshared successfully',
      report: unsharedReport
    });
  } catch (error) {
    console.error('Error unsharing report:', error);
    res.status(500).json({
      error: 'Failed to unshare report',
      details: error.message
    });
  }
};

/**
 * Delete a report
 */
const deleteReport = async (req, res) => {
  try {
    const { id } = req.params;

    const report = await GeneratedReport.findById(id);
    if (!report) {
      return res.status(404).json({
        error: 'Report not found'
      });
    }

    // Check if partner owns this report
    if (report.partner_id !== req.user.id) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    await GeneratedReport.delete(id);

    res.json({
      success: true,
      message: 'Report deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting report:', error);
    res.status(500).json({
      error: 'Failed to delete report',
      details: error.message
    });
  }
};

/**
 * Mark report as viewed (for clients)
 */
const markReportAsViewed = async (req, res) => {
  try {
    const { id } = req.params;

    const report = await GeneratedReport.findById(id);
    if (!report) {
      return res.status(404).json({
        error: 'Report not found'
      });
    }

    // Check if user owns this report
    if (report.user_id !== req.user.id || !report.is_shared) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    const updatedReport = await GeneratedReport.markAsViewed(id);

    res.json({
      success: true,
      message: 'Report marked as viewed',
      report: updatedReport
    });
  } catch (error) {
    console.error('Error marking report as viewed:', error);
    res.status(500).json({
      error: 'Failed to mark report as viewed',
      details: error.message
    });
  }
};

module.exports = {
  createReport,
  getPartnerReports,
  getClientReports,
  getUserSharedReports,
  getUserUnreadCount,
  getReportById,
  downloadReport,
  updateReport,
  shareReport,
  unshareReport,
  deleteReport,
  markReportAsViewed
};
