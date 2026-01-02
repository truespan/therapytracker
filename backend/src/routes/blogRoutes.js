const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { checkBlogPermission } = require('../middleware/blogPermission');
const {
  getAllBlogs,
  getBlogById,
  getMyBlogs,
  createBlog,
  updateBlog,
  deleteBlog
} = require('../controllers/blogController');

// Public routes - no authentication required
router.get('/', getAllBlogs);
router.get('/:id', getBlogById);

// Protected routes - require authentication and blog permission
router.get('/my/blogs', authenticateToken, checkBlogPermission, getMyBlogs);
router.post('/', authenticateToken, checkBlogPermission, createBlog);
router.put('/:id', authenticateToken, checkBlogPermission, updateBlog);
router.delete('/:id', authenticateToken, checkBlogPermission, deleteBlog);

module.exports = router;






