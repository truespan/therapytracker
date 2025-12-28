const Blog = require('../models/Blog');

// Get all published blogs (public)
const getAllBlogs = async (req, res) => {
  try {
    const { published } = req.query;
    // If published query param is explicitly 'false', show all (for admin/editors)
    // Otherwise, default to published only
    const showPublished = published === 'false' ? false : true;
    const blogs = await Blog.findAll(showPublished);
    res.json(blogs);
  } catch (error) {
    console.error('Error fetching blogs:', error);
    res.status(500).json({ error: 'Failed to fetch blogs' });
  }
};

// Get single blog by ID (public)
const getBlogById = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ error: 'Blog not found' });
    }
    res.json(blog);
  } catch (error) {
    console.error('Error fetching blog:', error);
    res.status(500).json({ error: 'Failed to fetch blog' });
  }
};

// Get blogs by current author (authenticated)
const getMyBlogs = async (req, res) => {
  try {
    const blogs = await Blog.findByAuthor(req.user.id);
    res.json(blogs);
  } catch (error) {
    console.error('Error fetching my blogs:', error);
    res.status(500).json({ error: 'Failed to fetch blogs' });
  }
};

// Create new blog (requires blog permission)
const createBlog = async (req, res) => {
  try {
    const { title, excerpt, content, category, featured_image_url, published } = req.body;

    // Validation
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    if (title.trim().length === 0 || content.trim().length === 0) {
      return res.status(400).json({ error: 'Title and content cannot be empty' });
    }

    const blogData = {
      title: title.trim(),
      excerpt: excerpt ? excerpt.trim() : null,
      content: content.trim(),
      category: category ? category.trim() : null,
      author_id: req.user.id,
      author_type: 'partner',
      featured_image_url: featured_image_url || null,
      published: published === true || published === 'true'
    };

    const blog = await Blog.create(blogData);
    res.status(201).json(blog);
  } catch (error) {
    console.error('Error creating blog:', error);
    res.status(500).json({ error: 'Failed to create blog' });
  }
};

// Update blog (requires blog permission + ownership)
const updateBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, excerpt, content, category, featured_image_url, published } = req.body;

    // Validation
    if (title !== undefined && title.trim().length === 0) {
      return res.status(400).json({ error: 'Title cannot be empty' });
    }

    if (content !== undefined && content.trim().length === 0) {
      return res.status(400).json({ error: 'Content cannot be empty' });
    }

    // Verify blog exists and belongs to user
    const existingBlog = await Blog.findById(id);
    if (!existingBlog) {
      return res.status(404).json({ error: 'Blog not found' });
    }

    if (existingBlog.author_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only edit your own blogs' });
    }

    const blogData = {
      title: title !== undefined ? title.trim() : existingBlog.title,
      excerpt: excerpt !== undefined ? (excerpt ? excerpt.trim() : null) : existingBlog.excerpt,
      content: content !== undefined ? content.trim() : existingBlog.content,
      category: category !== undefined ? (category ? category.trim() : null) : existingBlog.category,
      featured_image_url: featured_image_url !== undefined ? featured_image_url : existingBlog.featured_image_url,
      published: published !== undefined ? (published === true || published === 'true') : existingBlog.published
    };

    const blog = await Blog.update(id, blogData, req.user.id);
    if (!blog) {
      return res.status(404).json({ error: 'Blog not found or update failed' });
    }

    res.json(blog);
  } catch (error) {
    console.error('Error updating blog:', error);
    res.status(500).json({ error: 'Failed to update blog' });
  }
};

// Delete blog (requires blog permission + ownership)
const deleteBlog = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify blog exists and belongs to user
    const existingBlog = await Blog.findById(id);
    if (!existingBlog) {
      return res.status(404).json({ error: 'Blog not found' });
    }

    if (existingBlog.author_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only delete your own blogs' });
    }

    const deletedBlog = await Blog.delete(id, req.user.id);
    if (!deletedBlog) {
      return res.status(404).json({ error: 'Blog not found or delete failed' });
    }

    res.json({ message: 'Blog deleted successfully', blog: deletedBlog });
  } catch (error) {
    console.error('Error deleting blog:', error);
    res.status(500).json({ error: 'Failed to delete blog' });
  }
};

module.exports = {
  getAllBlogs,
  getBlogById,
  getMyBlogs,
  createBlog,
  updateBlog,
  deleteBlog
};

