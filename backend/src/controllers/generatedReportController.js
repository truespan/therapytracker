const fs = require('fs');
const path = require('path');
const Docxtemplater = require('docxtemplater');
const PizZip = require('pizzip');
const GeneratedReport = require('../models/GeneratedReport');
const ReportTemplate = require('../models/ReportTemplate');
const Partner = require('../models/Partner');

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

    // Validate required fields
    if (!user_id || !report_name || !client_name || !report_date || !description) {
      return res.status(400).json({
        error: 'User ID, report name, client name, report date, and description are required'
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
 * Download a report merged with its template (keeps header/footer design)
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

    const template = await getTemplateForReport(report);
    if (!template || !template.file_path) {
      return res.status(400).json({
        error: 'No report template configured for this report. Please select a template or set a default template first.'
      });
    }

    let templateBuffer;
    try {
      templateBuffer = fs.readFileSync(path.resolve(template.file_path));
    } catch (fileError) {
      console.error('Template file read error:', fileError);
      return res.status(404).json({
        error: 'Template file not found on server'
      });
    }

    let docBuffer;
    try {
      const zip = new PizZip(templateBuffer);
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true
      });

      doc.setData({
        report_name: report.report_name || '',
        client_name: report.client_name || '',
        client_age: report.client_age || '',
        client_sex: report.client_sex || '',
        report_date: formatDate(report.report_date),
        description: report.description || '',
        partner_name: report.partner_name || '',
        template_name: template.name || '',
        generated_on: formatDate(new Date())
      });

      doc.render();
      docBuffer = doc.getZip().generate({
        type: 'nodebuffer',
        compression: 'DEFLATE'
      });
    } catch (renderError) {
      console.error('Error rendering report template:', renderError);
      return res.status(500).json({
        error: 'Failed to generate report document',
        details: renderError.message
      });
    }

    const safeFileName = `${(report.report_name || 'report').replace(/[^a-z0-9_\-]+/gi, '_')}.docx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}"`);
    return res.send(docBuffer);
  } catch (error) {
    console.error('Error downloading report:', error);
    res.status(500).json({
      error: 'Failed to download report',
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
  deleteReport
};
