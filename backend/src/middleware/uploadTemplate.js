const multer = require('multer');
const path = require('path');
const fs = require('fs');

// File filter - only allow docx files
const fileFilter = (req, file, cb) => {
  const allowedTypes = /docx/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only .docx files are allowed'));
  }
};

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads/report-templates');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure local storage for docx files
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const ext = path.extname(file.originalname);
    const sanitizedName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-_]/g, '_');
    cb(null, `template-${timestamp}-${random}-${sanitizedName}${ext}`);
  }
});

// Configure multer for docx uploads
const uploadTemplate = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit for docx files
  },
  fileFilter: fileFilter
});

module.exports = uploadTemplate;
