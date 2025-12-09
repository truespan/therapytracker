const ReportTemplate = require('../models/ReportTemplate');
const fs = require('fs').promises;
const path = require('path');

/**
 * Get all report templates
 */
const getAllTemplates = async (req, res) => {
  try {
    const templates = await ReportTemplate.getAll();
    res.json({
      success: true,
      templates
    });
  } catch (error) {
    console.error('Error fetching report templates:', error);
    res.status(500).json({
      error: 'Failed to fetch report templates',
      details: error.message
    });
  }
};

/**
 * Upload a new report template (admin only)
 */
const uploadTemplate = async (req, res) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded'
      });
    }

    // Check if max limit (5) is reached
    const isMaxReached = await ReportTemplate.isMaxLimitReached();
    if (isMaxReached) {
      // Delete the uploaded file since we can't use it
      await fs.unlink(req.file.path);
      return res.status(400).json({
        error: 'Maximum template limit reached. Please delete an existing template before uploading a new one.',
        maxLimit: 5
      });
    }

    const { name, description } = req.body;

    // Validate required fields
    if (!name) {
      // Delete the uploaded file
      await fs.unlink(req.file.path);
      return res.status(400).json({
        error: 'Template name is required'
      });
    }

    // Create template record
    const templateData = {
      name,
      description: description || null,
      file_path: req.file.path,
      file_name: req.file.originalname,
      file_size: req.file.size,
      uploaded_by: req.user.id // Admin ID from auth middleware
    };

    const template = await ReportTemplate.create(templateData);

    res.status(201).json({
      success: true,
      message: 'Template uploaded successfully',
      template
    });
  } catch (error) {
    console.error('Error uploading report template:', error);

    // Clean up uploaded file if there was an error
    if (req.file && req.file.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting file after upload failure:', unlinkError);
      }
    }

    res.status(500).json({
      error: 'Failed to upload report template',
      details: error.message
    });
  }
};

/**
 * Update report template metadata (admin only)
 */
const updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const template = await ReportTemplate.findById(id);
    if (!template) {
      return res.status(404).json({
        error: 'Template not found'
      });
    }

    const updatedTemplate = await ReportTemplate.update(id, { name, description });

    res.json({
      success: true,
      message: 'Template updated successfully',
      template: updatedTemplate
    });
  } catch (error) {
    console.error('Error updating report template:', error);
    res.status(500).json({
      error: 'Failed to update report template',
      details: error.message
    });
  }
};

/**
 * Delete a report template (admin only)
 */
const deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;

    const template = await ReportTemplate.findById(id);
    if (!template) {
      return res.status(404).json({
        error: 'Template not found'
      });
    }

    // Delete the file from filesystem
    try {
      await fs.unlink(template.file_path);
    } catch (fileError) {
      console.error('Error deleting template file:', fileError);
      // Continue with database deletion even if file deletion fails
    }

    // Delete from database
    await ReportTemplate.delete(id);

    res.json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting report template:', error);
    res.status(500).json({
      error: 'Failed to delete report template',
      details: error.message
    });
  }
};

/**
 * Download a report template file
 */
const downloadTemplate = async (req, res) => {
  try {
    const { id } = req.params;

    const template = await ReportTemplate.findById(id);
    if (!template) {
      return res.status(404).json({
        error: 'Template not found'
      });
    }

    // Check if file exists
    try {
      await fs.access(template.file_path);
    } catch (error) {
      return res.status(404).json({
        error: 'Template file not found on server'
      });
    }

    // Send file for download
    res.download(template.file_path, template.file_name, (err) => {
      if (err) {
        console.error('Error downloading template:', err);
        if (!res.headersSent) {
          res.status(500).json({
            error: 'Failed to download template',
            details: err.message
          });
        }
      }
    });
  } catch (error) {
    console.error('Error downloading report template:', error);
    res.status(500).json({
      error: 'Failed to download report template',
      details: error.message
    });
  }
};

/**
 * Get template count
 */
const getTemplateCount = async (req, res) => {
  try {
    const count = await ReportTemplate.count();
    res.json({
      success: true,
      count,
      maxLimit: 5,
      canUpload: count < 5
    });
  } catch (error) {
    console.error('Error fetching template count:', error);
    res.status(500).json({
      error: 'Failed to fetch template count',
      details: error.message
    });
  }
};

module.exports = {
  getAllTemplates,
  uploadTemplate,
  updateTemplate,
  deleteTemplate,
  downloadTemplate,
  getTemplateCount
};
