const multer = require('multer');
const path = require('path');
const cloudinary = require('../config/cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// File filter - only allow images
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
  }
};

// Check if Cloudinary is configured
const isCloudinaryConfigured = () => {
  return process.env.CLOUDINARY_CLOUD_NAME &&
         process.env.CLOUDINARY_API_KEY &&
         process.env.CLOUDINARY_API_SECRET;
};

let storage;

if (isCloudinaryConfigured()) {
  // Use Cloudinary storage for production
  console.log('Using Cloudinary storage for file uploads');
  storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'therapy-tracker/profile-pictures',
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
      transformation: [{ width: 500, height: 500, crop: 'limit' }],
      public_id: (req, file) => {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 15);
        return `profile-${timestamp}-${random}`;
      }
    }
  });
} else {
  // Fallback to local storage for development
  console.log('Using local storage for file uploads (Cloudinary not configured)');
  const fs = require('fs');

  // Ensure uploads directory exists
  const uploadsDir = path.join(__dirname, '../../uploads/profile-pictures');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 15);
      const ext = path.extname(file.originalname);
      cb(null, `profile-${timestamp}-${random}${ext}`);
    }
  });
}

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: fileFilter
});

module.exports = upload;
