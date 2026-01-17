const SupportConversation = require('../models/SupportConversation');
const SupportMessage = require('../models/SupportMessage');
const Partner = require('../models/Partner');
const Organization = require('../models/Organization');
const Admin = require('../models/Admin');

/**
 * Get or create an open conversation for the current user
 */
const getOrCreateConversation = async (req, res) => {
  try {
    const userType = req.user.userType;
    const userId = req.user.id;

    // Map user types to requester types
    const requesterType = userType === 'partner' ? 'partner' : 'organization';

    const conversation = await SupportConversation.getOrCreateOpenConversation(requesterType, userId);

    // Get requester details
    let requester = null;
    if (requesterType === 'partner') {
      requester = await Partner.findById(userId);
    } else {
      requester = await Organization.findById(userId);
    }

    res.json({
      conversation: {
        ...conversation,
        requester: requester ? {
          id: requester.id,
          name: requester.name,
          email: requester.email,
          photo_url: requester.photo_url
        } : null
      }
    });
  } catch (error) {
    console.error('Get or create conversation error:', error);
    res.status(500).json({ error: 'Failed to get or create conversation', details: error.message });
  }
};

/**
 * Get all conversations for the current user (app user) or all conversations (support team)
 */
const getConversations = async (req, res) => {
  try {
    const userType = req.user.userType;
    const userId = req.user.id;
    const status = req.query.status; // Optional filter for support team

    let conversations = [];
    let isSupportTeam = false;

    // Check if user is support team
    if (userType === 'admin') {
      isSupportTeam = true;
    } else if (userType === 'partner') {
      const partner = await Partner.findById(userId);
      isSupportTeam = partner && partner.query_resolver === true;
    } else if (userType === 'organization') {
      const org = await Organization.findById(userId);
      isSupportTeam = org && org.query_resolver === true;
    }

    // Support team sees all conversations, sorted by priority
    if (isSupportTeam) {
      conversations = await SupportConversation.getAllForSupportTeam({ status });
      
      // Enrich with requester details
      for (const conv of conversations) {
        if (conv.requester_type === 'partner') {
          const partner = await Partner.findById(conv.requester_id);
          conv.requester = partner ? {
            id: partner.id,
            name: partner.name,
            email: partner.email,
            photo_url: partner.photo_url
          } : null;
        } else {
          const org = await Organization.findById(conv.requester_id);
          conv.requester = org ? {
            id: org.id,
            name: org.name,
            email: org.email,
            photo_url: org.photo_url
          } : null;
        }

        // Get unread count (messages not sent by current user)
        conv.unread_count = await SupportMessage.getUnreadCount(conv.id, userType, userId);
      }
    } else {
      // App users see only their own conversations
      const requesterType = userType === 'partner' ? 'partner' : 'organization';
      conversations = await SupportConversation.findByRequester(requesterType, userId);
      
      // Enrich with requester details (self)
      for (const conv of conversations) {
        if (conv.requester_type === 'partner') {
          const partner = await Partner.findById(conv.requester_id);
          conv.requester = partner ? {
            id: partner.id,
            name: partner.name,
            email: partner.email,
            photo_url: partner.photo_url
          } : null;
        } else {
          const org = await Organization.findById(conv.requester_id);
          conv.requester = org ? {
            id: org.id,
            name: org.name,
            email: org.email,
            photo_url: org.photo_url
          } : null;
        }

        // Get unread count for app user
        conv.unread_count = await SupportMessage.getUnreadCount(conv.id, userType, userId);
      }
    }

    res.json({ conversations });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Failed to get conversations', details: error.message });
  }
};

/**
 * Get conversation by ID with authorization check
 */
const getConversationById = async (req, res) => {
  try {
    const { id } = req.params;
    const userType = req.user.userType;
    const userId = req.user.id;

    const conversation = await SupportConversation.findById(id);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Authorization check - check if user is support team
    let isSupportTeam = false;
    if (userType === 'admin') {
      isSupportTeam = true;
    } else if (userType === 'partner') {
      const partner = await Partner.findById(userId);
      isSupportTeam = partner && partner.query_resolver === true;
    } else if (userType === 'organization') {
      const org = await Organization.findById(userId);
      isSupportTeam = org && org.query_resolver === true;
    }

    if (!isSupportTeam) {
      // App users can only see their own conversations
      const requesterType = userType === 'partner' ? 'partner' : 'organization';
      if (conversation.requester_type !== requesterType || conversation.requester_id !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Get requester details
    let requester = null;
    if (conversation.requester_type === 'partner') {
      requester = await Partner.findById(conversation.requester_id);
    } else {
      requester = await Organization.findById(conversation.requester_id);
    }

    conversation.requester = requester ? {
      id: requester.id,
      name: requester.name,
      email: requester.email,
      photo_url: requester.photo_url
    } : null;

    // Get unread count
    conversation.unread_count = await SupportMessage.getUnreadCount(id, userType, userId);

    res.json({ conversation });
  } catch (error) {
    console.error('Get conversation by ID error:', error);
    res.status(500).json({ error: 'Failed to get conversation', details: error.message });
  }
};

/**
 * Get all messages for a conversation
 */
const getConversationMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const userType = req.user.userType;
    const userId = req.user.id;

    // Verify conversation exists and user has access
    const conversation = await SupportConversation.findById(id);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Authorization check - check if user is support team
    let isSupportTeam = false;
    if (userType === 'admin') {
      isSupportTeam = true;
    } else if (userType === 'partner') {
      const partner = await Partner.findById(userId);
      isSupportTeam = partner && partner.query_resolver === true;
    } else if (userType === 'organization') {
      const org = await Organization.findById(userId);
      isSupportTeam = org && org.query_resolver === true;
    }

    if (!isSupportTeam) {
      // App users can only see their own conversations
      const requesterType = userType === 'partner' ? 'partner' : 'organization';
      if (conversation.requester_type !== requesterType || conversation.requester_id !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const messages = await SupportMessage.findByConversationId(id);

    // Mark messages as read for the current user
    await SupportMessage.markAsRead(id, userType, userId);

    res.json({ messages });
  } catch (error) {
    console.error('Get conversation messages error:', error);
    res.status(500).json({ error: 'Failed to get messages', details: error.message });
  }
};

/**
 * Send a message in a conversation
 */
const sendMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    const userType = req.user.userType;
    const userId = req.user.id;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message text is required' });
    }

    // Verify conversation exists and user has access
    const conversation = await SupportConversation.findById(id);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Authorization check - check if user is support team
    let isSupportTeam = false;
    if (userType === 'admin') {
      isSupportTeam = true;
    } else if (userType === 'partner') {
      const partner = await Partner.findById(userId);
      isSupportTeam = partner && partner.query_resolver === true;
    } else if (userType === 'organization') {
      const org = await Organization.findById(userId);
      isSupportTeam = org && org.query_resolver === true;
    }

    if (!isSupportTeam) {
      // App users can only send messages in their own conversations
      const requesterType = userType === 'partner' ? 'partner' : 'organization';
      if (conversation.requester_type !== requesterType || conversation.requester_id !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Map user type to sender type
    const senderType = userType === 'admin' ? 'admin' : (userType === 'partner' ? 'partner' : (userType === 'user' ? 'user' : 'organization'));

    const newMessage = await SupportMessage.create({
      conversation_id: id,
      sender_type: senderType,
      sender_id: userId,
      message: message.trim()
    });

    // Get sender details
    let sender = null;
    if (senderType === 'admin') {
      sender = await Admin.findById(userId);
    } else if (senderType === 'partner') {
      sender = await Partner.findById(userId);
    } else if (senderType === 'user') {
      const User = require('../models/User');
      sender = await User.findById(userId);
    } else {
      sender = await Organization.findById(userId);
    }

    // Use support-specific name/photo if available, otherwise fall back to regular name/photo
    let senderName = null;
    let senderPhotoUrl = null;
    
    if (sender) {
      if (senderType === 'admin') {
        senderName = sender.support_display_name || sender.name;
        senderPhotoUrl = sender.support_photo_url || null; // Admins don't have photo_url
      } else if (senderType === 'partner' || senderType === 'organization') {
        senderName = sender.support_display_name || sender.name;
        senderPhotoUrl = sender.support_photo_url || sender.photo_url;
      } else {
        senderName = sender.name;
        senderPhotoUrl = sender.photo_url;
      }
    }

    const messageWithSender = {
      ...newMessage,
      sender_name: senderName,
      sender_email: sender ? sender.email : null,
      sender_photo_url: senderPhotoUrl
    };

    res.status(201).json({
      message: 'Message sent successfully',
      data: messageWithSender
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message', details: error.message });
  }
};

/**
 * Mark messages as read
 */
const markMessagesAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userType = req.user.userType;
    const userId = req.user.id;

    // Verify conversation exists and user has access
    const conversation = await SupportConversation.findById(id);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Authorization check - check if user is support team
    let isSupportTeam = false;
    if (userType === 'admin') {
      isSupportTeam = true;
    } else if (userType === 'partner') {
      const partner = await Partner.findById(userId);
      isSupportTeam = partner && partner.query_resolver === true;
    } else if (userType === 'organization') {
      const org = await Organization.findById(userId);
      isSupportTeam = org && org.query_resolver === true;
    }

    if (!isSupportTeam) {
      // App users can only mark messages in their own conversations
      const requesterType = userType === 'partner' ? 'partner' : 'organization';
      if (conversation.requester_type !== requesterType || conversation.requester_id !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const count = await SupportMessage.markAsRead(id, userType, userId);

    res.json({
      message: 'Messages marked as read',
      count
    });
  } catch (error) {
    console.error('Mark messages as read error:', error);
    res.status(500).json({ error: 'Failed to mark messages as read', details: error.message });
  }
};

/**
 * Close a conversation
 */
const closeConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const userType = req.user.userType;
    const userId = req.user.id;

    // Verify conversation exists
    const conversation = await SupportConversation.findById(id);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Authorization check - only support team can close conversations
    let isSupportTeam = false;
    if (userType === 'admin') {
      isSupportTeam = true;
    } else if (userType === 'partner') {
      const partner = await Partner.findById(userId);
      isSupportTeam = partner && partner.query_resolver === true;
    } else if (userType === 'organization') {
      const org = await Organization.findById(userId);
      isSupportTeam = org && org.query_resolver === true;
    }

    if (!isSupportTeam) {
      return res.status(403).json({ error: 'Only support team members can close conversations' });
    }

    const updatedConversation = await SupportConversation.close(id);

    res.json({
      message: 'Conversation closed successfully',
      conversation: updatedConversation
    });
  } catch (error) {
    console.error('Close conversation error:', error);
    res.status(500).json({ error: 'Failed to close conversation', details: error.message });
  }
};

/**
 * Update support display settings (name and photo) for the current support person
 */
const updateSupportSettings = async (req, res) => {
  try {
    const userType = req.user.userType;
    const userId = req.user.id;
    const { support_display_name, support_photo_url } = req.body;

    // Admins, partners, and organizations with query_resolver can update support settings
    if (userType === 'admin') {
      await Admin.update(userId, { support_display_name, support_photo_url });
      const updatedAdmin = await Admin.findById(userId);
      res.json({
        message: 'Support settings updated successfully',
        support_display_name: updatedAdmin.support_display_name,
        support_photo_url: updatedAdmin.support_photo_url
      });
      return;
    } else if (userType === 'partner') {
      const partner = await Partner.findById(userId);
      if (partner && partner.query_resolver === true) {
        await Partner.update(userId, { support_display_name, support_photo_url });
        const updatedPartner = await Partner.findById(userId);
        res.json({
          message: 'Support settings updated successfully',
          support_display_name: updatedPartner.support_display_name,
          support_photo_url: updatedPartner.support_photo_url
        });
        return;
      }
    } else if (userType === 'organization') {
      const org = await Organization.findById(userId);
      if (org && org.query_resolver === true) {
        await Organization.update(userId, { support_display_name, support_photo_url });
        const updatedOrg = await Organization.findById(userId);
        res.json({
          message: 'Support settings updated successfully',
          support_display_name: updatedOrg.support_display_name,
          support_photo_url: updatedOrg.support_photo_url
        });
        return;
      }
    }

    res.status(403).json({ error: 'Only support team members can update support settings' });
  } catch (error) {
    console.error('Update support settings error:', error);
    res.status(500).json({ error: 'Failed to update support settings', details: error.message });
  }
};

/**
 * Get support display settings for the current support person
 */
const getSupportSettings = async (req, res) => {
  try {
    const userType = req.user.userType;
    const userId = req.user.id;

    // Admins, partners, and organizations with query_resolver can get support settings
    if (userType === 'admin') {
      const admin = await Admin.findById(userId);
      if (admin) {
        res.json({
          support_display_name: admin.support_display_name,
          support_photo_url: admin.support_photo_url,
          name: admin.name,
          photo_url: null // Admins don't have photo_url
        });
        return;
      }
    } else if (userType === 'partner') {
      const partner = await Partner.findById(userId);
      if (partner && partner.query_resolver === true) {
        res.json({
          support_display_name: partner.support_display_name,
          support_photo_url: partner.support_photo_url,
          name: partner.name,
          photo_url: partner.photo_url
        });
        return;
      }
    } else if (userType === 'organization') {
      const org = await Organization.findById(userId);
      if (org && org.query_resolver === true) {
        res.json({
          support_display_name: org.support_display_name,
          support_photo_url: org.support_photo_url,
          name: org.name,
          photo_url: org.photo_url
        });
        return;
      }
    }

    res.status(403).json({ error: 'Only support team members can access support settings' });
  } catch (error) {
    console.error('Get support settings error:', error);
    res.status(500).json({ error: 'Failed to get support settings', details: error.message });
  }
};

/**
 * Get support team members list (for display to app users)
 */
const getSupportTeamMembers = async (req, res) => {
  try {
    const members = [];

    // Get all admins
    const admins = await Admin.getAll();
    for (const admin of admins) {
      members.push({
        id: admin.id,
        name: admin.name,
        email: admin.email,
        photo_url: null, // Admins don't have photo_url in the schema
        type: 'admin'
      });
    }

    // Get all partners with query_resolver = true
    const db = require('../config/database');
    const partnersQuery = 'SELECT id, name, email, photo_url FROM partners WHERE query_resolver = TRUE';
    const partnersResult = await db.query(partnersQuery);
    for (const partner of partnersResult.rows) {
      members.push({
        id: partner.id,
        name: partner.name,
        email: partner.email,
        photo_url: partner.photo_url,
        type: 'partner'
      });
    }

    // Get all organizations with query_resolver = true
    const orgsQuery = 'SELECT id, name, email, photo_url FROM organizations WHERE query_resolver = TRUE';
    const orgsResult = await db.query(orgsQuery);
    for (const org of orgsResult.rows) {
      members.push({
        id: org.id,
        name: org.name,
        email: org.email,
        photo_url: org.photo_url,
        type: 'organization'
      });
    }

    res.json({ members });
  } catch (error) {
    console.error('Get support team members error:', error);
    res.status(500).json({ error: 'Failed to get support team members', details: error.message });
  }
};

module.exports = {
  getOrCreateConversation,
  getConversations,
  getConversationById,
  getConversationMessages,
  sendMessage,
  markMessagesAsRead,
  closeConversation,
  getSupportTeamMembers,
  updateSupportSettings,
  getSupportSettings
};

