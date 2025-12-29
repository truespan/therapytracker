const db = require('../config/database');

const checkBlogPermission = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Only partners can have blog permissions
  if (req.user.userType !== 'partner') {
    return res.status(403).json({ 
      error: 'Only therapists can post blogs',
      userType: req.user.userType
    });
  }

  try {
    // Check if this partner has blog posting permission and get organization info
    const result = await db.query(
      `SELECT p.can_post_blogs, p.organization_id, o.theraptrack_controlled
       FROM partners p
       JOIN organizations o ON p.organization_id = o.id
       WHERE p.id = $1`,
      [req.user.id]
    );

    if (!result.rows[0] || !result.rows[0].can_post_blogs) {
      return res.status(403).json({ 
        error: 'You do not have permission to post blogs. Please contact your administrator.',
        hasPermission: false
      });
    }

    // Store organization info for use in controllers
    req.blogPermission = {
      canPostBlogs: result.rows[0].can_post_blogs,
      organizationId: result.rows[0].organization_id,
      theraptrackControlled: result.rows[0].theraptrack_controlled
    };

    next();
  } catch (error) {
    console.error('Error checking blog permission:', error);
    return res.status(500).json({ error: 'Error checking permissions' });
  }
};

module.exports = { checkBlogPermission };


