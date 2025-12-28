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
    // Check if this partner has blog posting permission
    const result = await db.query(
      'SELECT can_post_blogs FROM partners WHERE id = $1',
      [req.user.id]
    );

    if (!result.rows[0] || !result.rows[0].can_post_blogs) {
      return res.status(403).json({ 
        error: 'You do not have permission to post blogs. Please contact your administrator.',
        hasPermission: false
      });
    }

    next();
  } catch (error) {
    console.error('Error checking blog permission:', error);
    return res.status(500).json({ error: 'Error checking permissions' });
  }
};

module.exports = { checkBlogPermission };

