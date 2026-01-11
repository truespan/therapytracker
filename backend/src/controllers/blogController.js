const Blog = require('../models/Blog');
const Event = require('../models/Event');

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
// For theraptrack_controlled organizations, return all organization blogs
const getMyBlogs = async (req, res) => {
  try {
    let blogs;
    
    // If user is in theraptrack_controlled organization with blog permission, get all org blogs
    if (req.blogPermission && req.blogPermission.theraptrackControlled) {
      blogs = await Blog.findByOrganization(req.blogPermission.organizationId);
    } else {
      // Otherwise, only get own blogs
      blogs = await Blog.findByAuthor(req.user.id);
    }
    
    res.json(blogs);
  } catch (error) {
    console.error('Error fetching my blogs:', error);
    res.status(500).json({ error: 'Failed to fetch blogs' });
  }
};

// Create new blog (requires blog permission)
const createBlog = async (req, res) => {
  try {
    const { title, event_date, event_time, fee, event_type, address, max_participants, content, category, featured_image_url, published } = req.body;

    // Validation
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    if (title.trim().length === 0 || content.trim().length === 0) {
      return res.status(400).json({ error: 'Title and content cannot be empty' });
    }

    // Validate address for offline events
    if (event_type === 'Offline' && (!address || !address.trim())) {
      return res.status(400).json({ error: 'Address is required for offline events' });
    }

    // Validate max_participants if provided
    if (max_participants !== undefined && max_participants !== null && max_participants !== '') {
      const maxParticipantsNum = parseInt(max_participants);
      if (isNaN(maxParticipantsNum) || maxParticipantsNum <= 0) {
        return res.status(400).json({ error: 'Maximum participants must be a positive integer' });
      }
    }

    const blogData = {
      title: title.trim(),
      excerpt: null, // Removed excerpt field
      content: content.trim(),
      category: category ? category.trim() : null,
      author_id: req.user.id,
      author_type: 'partner',
      featured_image_url: featured_image_url || null,
      published: published === true || published === 'true',
      // New event fields
      event_date: event_date || null,
      event_time: event_time || null,
      fee: fee ? parseFloat(fee) : null,
      event_type: event_type || 'Online',
      address: address ? address.trim() : null,
      max_participants: max_participants && max_participants !== '' ? parseInt(max_participants) : null
    };

    const blog = await Blog.create(blogData);
    
    // If event fields are present, also create an event in the events table
    if (event_date) {
      try {
        // Combine date and time if both are provided
        let eventDateTime = event_date;
        if (event_time) {
          const date = new Date(event_date);
          const [hours, minutes] = event_time.split(':');
          date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
          eventDateTime = date.toISOString();
        }
        
        const eventData = {
          title: title.trim(),
          description: content.trim(),
          event_date: eventDateTime,
          location: event_type === 'Offline' && address ? address : (event_type === 'Online' ? 'Online' : null),
          fee_amount: fee ? parseFloat(fee) : 0.00,
          partner_id: req.user.id,
          image_url: featured_image_url || null,
          address: event_type === 'Offline' ? address : null,
          max_participants: max_participants && max_participants !== '' ? parseInt(max_participants) : null
        };
        
        await Event.create(eventData);
      } catch (eventError) {
        console.error('Error creating event:', eventError);
        // Don't fail the blog creation if event creation fails, but log it
      }
    }
    
    res.status(201).json(blog);
  } catch (error) {
    console.error('Error creating blog:', error);
    res.status(500).json({ error: 'Failed to create blog' });
  }
};

// Update blog (requires blog permission + ownership or organization access)
const updateBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, event_date, event_time, fee, event_type, address, max_participants, content, category, featured_image_url, published } = req.body;

    // Validation
    if (title !== undefined && title.trim().length === 0) {
      return res.status(400).json({ error: 'Title cannot be empty' });
    }

    if (content !== undefined && content.trim().length === 0) {
      return res.status(400).json({ error: 'Content cannot be empty' });
    }

    // Verify blog exists
    const existingBlog = await Blog.findById(id);
    if (!existingBlog) {
      return res.status(404).json({ error: 'Blog not found' });
    }

    // Check permissions: user can edit if:
    // 1. They are the author, OR
    // 2. They are in a theraptrack_controlled organization with blog permissions
    const canEdit = existingBlog.author_id === req.user.id ||
      (req.blogPermission && req.blogPermission.theraptrackControlled);

    if (!canEdit) {
      return res.status(403).json({ error: 'You do not have permission to edit this blog' });
    }

    // Validate address for offline events if event_type is being changed to Offline
    if (event_type === 'Offline' && (!address || !address.trim()) && (!existingBlog.address || !existingBlog.address.trim())) {
      return res.status(400).json({ error: 'Address is required for offline events' });
    }

    // Validate max_participants if provided
    if (max_participants !== undefined && max_participants !== null && max_participants !== '') {
      const maxParticipantsNum = parseInt(max_participants);
      if (isNaN(maxParticipantsNum) || maxParticipantsNum <= 0) {
        return res.status(400).json({ error: 'Maximum participants must be a positive integer' });
      }
    }

    const blogData = {
      title: title !== undefined ? title.trim() : existingBlog.title,
      excerpt: null, // Excerpt removed
      content: content !== undefined ? content.trim() : existingBlog.content,
      category: category !== undefined ? (category ? category.trim() : null) : existingBlog.category,
      featured_image_url: featured_image_url !== undefined ? featured_image_url : existingBlog.featured_image_url,
      published: published !== undefined ? (published === true || published === 'true') : existingBlog.published,
      // New event fields
      event_date: event_date !== undefined ? event_date : existingBlog.event_date,
      event_time: event_time !== undefined ? event_time : existingBlog.event_time,
      fee: fee !== undefined ? (fee ? parseFloat(fee) : null) : existingBlog.fee,
      event_type: event_type !== undefined ? event_type : (existingBlog.event_type || 'Online'),
      address: address !== undefined ? (address ? address.trim() : null) : existingBlog.address,
      max_participants: max_participants !== undefined ? (max_participants && max_participants !== '' ? parseInt(max_participants) : null) : existingBlog.max_participants
    };

    const organizationId = (req.blogPermission && req.blogPermission.theraptrackControlled) 
      ? req.blogPermission.organizationId 
      : null;
    
    const blog = await Blog.update(id, blogData, req.user.id, organizationId);
    
    // If event fields are present and blog was successfully updated, update/create event
    const hasEventFields = (event_date !== undefined || existingBlog.event_date);
    if (hasEventFields && blog) {
      try {
        // Try to find existing event by matching title and partner
        const partnerEvents = await Event.findByPartner(req.user.id);
        const matchingEvent = partnerEvents.find(e => e.title === blog.title && e.partner_id === req.user.id);
        
        // Combine date and time if both are provided
        let eventDateTime = event_date !== undefined ? event_date : existingBlog.event_date;
        const timeToUse = event_time !== undefined ? event_time : existingBlog.event_time;
        if (eventDateTime && timeToUse) {
          const date = new Date(eventDateTime);
          const [hours, minutes] = timeToUse.split(':');
          date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
          eventDateTime = date.toISOString();
        }
        
        const finalEventType = event_type !== undefined ? event_type : (existingBlog.event_type || 'Online');
        const finalFee = fee !== undefined ? (fee ? parseFloat(fee) : 0.00) : (existingBlog.fee || 0.00);
        const finalAddress = address !== undefined ? (address ? address.trim() : null) : existingBlog.address;
        const finalMaxParticipants = max_participants !== undefined ? (max_participants && max_participants !== '' ? parseInt(max_participants) : null) : existingBlog.max_participants;
        
        const eventData = {
          title: blog.title,
          description: blog.content,
          event_date: eventDateTime,
          location: finalEventType === 'Offline' && finalAddress ? finalAddress : (finalEventType === 'Online' ? 'Online' : null),
          fee_amount: finalFee,
          partner_id: req.user.id,
          image_url: blog.featured_image_url || null,
          address: finalEventType === 'Offline' ? finalAddress : null,
          max_participants: finalMaxParticipants
        };
        
        if (matchingEvent) {
          // Update existing event
          await Event.update(matchingEvent.id, eventData, req.user.id);
        } else if (event_date || existingBlog.event_date) {
          // Create new event only if event_date exists
          await Event.create(eventData);
        }
      } catch (eventError) {
        console.error('Error updating/creating event:', eventError);
        // Don't fail the blog update if event update fails
      }
    }
    if (!blog) {
      return res.status(404).json({ error: 'Blog not found or update failed' });
    }

    res.json(blog);
  } catch (error) {
    console.error('Error updating blog:', error);
    res.status(500).json({ error: 'Failed to update blog' });
  }
};

// Delete blog (requires blog permission + ownership or organization access)
const deleteBlog = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify blog exists
    const existingBlog = await Blog.findById(id);
    if (!existingBlog) {
      return res.status(404).json({ error: 'Blog not found' });
    }

    // Check permissions: user can delete if:
    // 1. They are the author, OR
    // 2. They are in a theraptrack_controlled organization with blog permissions
    const canDelete = existingBlog.author_id === req.user.id ||
      (req.blogPermission && req.blogPermission.theraptrackControlled);

    if (!canDelete) {
      return res.status(403).json({ error: 'You do not have permission to delete this blog' });
    }

    const organizationId = (req.blogPermission && req.blogPermission.theraptrackControlled) 
      ? req.blogPermission.organizationId 
      : null;

    const deletedBlog = await Blog.delete(id, req.user.id, organizationId);
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


