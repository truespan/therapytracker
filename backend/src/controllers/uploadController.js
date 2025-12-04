const Partner = require('../models/Partner');
const Organization = require('../models/Organization');
const path = require('path');
const fs = require('fs');
const cloudinary = require('../config/cloudinary');

// Upload profile picture for partner or organization
const uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { userType, userId } = req.body;

    if (!userType || !userId) {
      // Clean up uploaded file if validation fails (only for local storage)
      if (req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ error: 'userType and userId are required' });
    }

    // Get photo URL - Cloudinary provides full URL, local storage needs path
    const photoUrl = req.file.path || `/uploads/profile-pictures/${req.file.filename}`;

    // Update the database based on user type
    let updatedRecord;
    if (userType === 'partner') {
      updatedRecord = await Partner.update(userId, { photo_url: photoUrl });
      if (!updatedRecord) {
        // Clean up uploaded file if partner not found
        if (req.file.path && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(404).json({ error: 'Partner not found' });
      }
    } else if (userType === 'organization') {
      updatedRecord = await Organization.update(userId, { photo_url: photoUrl });
      if (!updatedRecord) {
        // Clean up uploaded file if organization not found
        if (req.file.path && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(404).json({ error: 'Organization not found' });
      }
    } else {
      // Clean up uploaded file if invalid user type
      if (req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ error: 'Invalid userType. Must be "partner" or "organization"' });
    }

    res.json({
      message: 'Profile picture uploaded successfully',
      photo_url: photoUrl,
      data: updatedRecord
    });

  } catch (error) {
    console.error('Error uploading profile picture:', error);
    // Clean up uploaded file if there's an error (only for local storage)
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      error: 'Failed to upload profile picture',
      message: error.message
    });
  }
};

// Delete profile picture
const deleteProfilePicture = async (req, res) => {
  try {
    const { userType, userId } = req.body;

    if (!userType || !userId) {
      return res.status(400).json({ error: 'userType and userId are required' });
    }

    // Get current photo URL
    let currentRecord;
    if (userType === 'partner') {
      currentRecord = await Partner.findById(userId);
    } else if (userType === 'organization') {
      currentRecord = await Organization.findById(userId);
    } else {
      return res.status(400).json({ error: 'Invalid userType. Must be "partner" or "organization"' });
    }

    if (!currentRecord) {
      return res.status(404).json({ error: `${userType} not found` });
    }

    // Delete file from storage
    if (currentRecord.photo_url) {
      // Check if it's a Cloudinary URL
      if (currentRecord.photo_url.includes('cloudinary.com')) {
        try {
          // Extract public_id from Cloudinary URL
          const urlParts = currentRecord.photo_url.split('/');
          const fileNameWithExt = urlParts[urlParts.length - 1];
          const fileName = fileNameWithExt.split('.')[0];
          const folder = 'therapy-tracker/profile-pictures';
          const publicId = `${folder}/${fileName}`;

          // Delete from Cloudinary
          await cloudinary.uploader.destroy(publicId);
        } catch (cloudinaryError) {
          console.error('Error deleting from Cloudinary:', cloudinaryError);
          // Continue with database update even if Cloudinary deletion fails
        }
      } else {
        // Delete from local filesystem
        const filePath = path.join(__dirname, '../../', currentRecord.photo_url);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    }

    // Update database to remove photo_url
    let updatedRecord;
    if (userType === 'partner') {
      updatedRecord = await Partner.update(userId, { photo_url: null });
    } else {
      updatedRecord = await Organization.update(userId, { photo_url: null });
    }

    res.json({
      message: 'Profile picture deleted successfully',
      data: updatedRecord
    });

  } catch (error) {
    console.error('Error deleting profile picture:', error);
    res.status(500).json({
      error: 'Failed to delete profile picture',
      message: error.message
    });
  }
};

module.exports = {
  uploadProfilePicture,
  deleteProfilePicture
};
