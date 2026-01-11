const Questionnaire = require('../models/Questionnaire');
const QuestionnaireAssignment = require('../models/QuestionnaireAssignment');

// Create a new questionnaire
exports.createQuestionnaire = async (req, res) => {
  try {
    const { name, description, questions, has_text_field, text_field_label, text_field_placeholder, color_coding_scheme } = req.body;
    const userType = req.user.userType;
    const userId = req.user.id;

    if (!name || !questions || questions.length === 0) {
      return res.status(400).json({ error: 'Name and questions are required' });
    }

    // Determine created_by_type based on user type
    let createdByType;
    if (userType === 'admin') {
      createdByType = 'admin';
    } else if (userType === 'organization') {
      createdByType = 'organization';
    } else if (userType === 'partner') {
      createdByType = 'partner';
    } else {
      return res.status(403).json({ error: 'Invalid user type for creating questionnaires' });
    }

    // Create questionnaire
    const questionnaireId = await Questionnaire.create(
      createdByType,
      userId,
      name,
      description,
      has_text_field || false,
      text_field_label || null,
      text_field_placeholder || null,
      color_coding_scheme || null
    );

    // Add questions and answer options
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      const questionId = await Questionnaire.addQuestion(
        questionnaireId,
        question.question_text,
        i,
        question.sub_heading || null
      );

      // Add answer options
      if (question.options && question.options.length > 0) {
        for (let j = 0; j < question.options.length; j++) {
          const option = question.options[j];
          await Questionnaire.addAnswerOption(
            questionId,
            option.option_text,
            option.option_value,
            j
          );
        }
      }
    }

    // Get complete questionnaire
    const completeQuestionnaire = await Questionnaire.getQuestionnaireWithQuestions(questionnaireId);

    res.status(201).json({
      message: 'Questionnaire created successfully',
      questionnaire: completeQuestionnaire
    });
  } catch (error) {
    console.error('Error creating questionnaire:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get all questionnaires for a partner (own + preset)
exports.getPartnerQuestionnaires = async (req, res) => {
  try {
    const partnerId = req.user.userType === 'partner' ? req.user.id : req.params.partnerId;
    const [ownQuestionnaires, presetQuestionnaires] = await Promise.all([
      Questionnaire.findByPartner(partnerId),
      Questionnaire.findPresetForPartner(partnerId)
    ]);
    res.json({
      own: ownQuestionnaires,
      preset: presetQuestionnaires
    });
  } catch (error) {
    console.error('Error getting partner questionnaires:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get all questionnaires for an admin
exports.getAdminQuestionnaires = async (req, res) => {
  try {
    const adminId = req.user.userType === 'admin' ? req.user.id : req.params.adminId;
    if (req.user.userType !== 'admin' && req.user.userType !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    const questionnaires = await Questionnaire.findByAdmin(adminId);
    res.json(questionnaires);
  } catch (error) {
    console.error('Error getting admin questionnaires:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get all questionnaires for an organization (own + preset)
exports.getOrganizationQuestionnaires = async (req, res) => {
  try {
    const organizationId = req.user.userType === 'organization' ? req.user.id : req.params.organizationId;
    if (req.user.userType !== 'organization' && req.user.userType !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    const [ownQuestionnaires, presetQuestionnaires] = await Promise.all([
      Questionnaire.findByOrganization(organizationId),
      Questionnaire.findPresetForOrganization(organizationId)
    ]);
    res.json({
      own: ownQuestionnaires,
      preset: presetQuestionnaires
    });
  } catch (error) {
    console.error('Error getting organization questionnaires:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get questionnaire by ID with all questions and options
exports.getQuestionnaire = async (req, res) => {
  try {
    const { id } = req.params;
    const questionnaire = await Questionnaire.getQuestionnaireWithQuestions(id);

    if (!questionnaire) {
      return res.status(404).json({ error: 'Questionnaire not found' });
    }

    // Verify access based on user type
    const userType = req.user.userType;
    const userId = req.user.id;
    let hasAccess = false;

    if (userType === 'partner') {
      // Partner can access if they own it or if it's shared with them
      if (questionnaire.created_by_type === 'partner' && questionnaire.partner_id === userId) {
        hasAccess = true;
      } else {
        // Check if shared with this partner
        const presetQuestionnaires = await Questionnaire.findPresetForPartner(userId);
        hasAccess = presetQuestionnaires.some(q => q.id === parseInt(id));
      }
    } else if (userType === 'organization') {
      // Organization can access if they own it or if it's shared with them
      if (questionnaire.created_by_type === 'organization' && questionnaire.organization_id === userId) {
        hasAccess = true;
      } else {
        // Check if shared with this organization
        const presetQuestionnaires = await Questionnaire.findPresetForOrganization(userId);
        hasAccess = presetQuestionnaires.some(q => q.id === parseInt(id));
      }
    } else if (userType === 'admin') {
      // Admin can access if they own it
      if (questionnaire.created_by_type === 'admin' && questionnaire.admin_id === userId) {
        hasAccess = true;
      } else {
        // Admin can access any questionnaire
        hasAccess = true;
      }
    }

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(questionnaire);
  } catch (error) {
    console.error('Error getting questionnaire:', error);
    res.status(500).json({ error: error.message });
  }
};

// Update questionnaire
exports.updateQuestionnaire = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, questions, has_text_field, text_field_label, text_field_placeholder, color_coding_scheme } = req.body;
    const userType = req.user.userType;
    const userId = req.user.id;

    // Verify ownership
    const isOwner = await Questionnaire.verifyOwnership(id, userType, userId);
    if (!isOwner) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update questionnaire basic info
    await Questionnaire.update(
      id,
      name,
      description,
      has_text_field || false,
      text_field_label || null,
      text_field_placeholder || null,
      color_coding_scheme || null
    );

    // If questions are provided, update them
    if (questions) {
      // Get existing questions
      const existingQuestions = await Questionnaire.getQuestions(id);
      const existingQuestionIds = existingQuestions.map(q => q.id);

      // Track which questions to keep
      const updatedQuestionIds = [];

      // Update or create questions
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        
        if (question.id && existingQuestionIds.includes(question.id)) {
          // Update existing question
          await Questionnaire.updateQuestion(question.id, question.question_text, i, question.sub_heading || null);
          updatedQuestionIds.push(question.id);

          // Update answer options
          const existingOptions = await Questionnaire.getAnswerOptions(question.id);
          const existingOptionIds = existingOptions.map(o => o.id);
          const updatedOptionIds = [];

          for (let j = 0; j < question.options.length; j++) {
            const option = question.options[j];
            
            if (option.id && existingOptionIds.includes(option.id)) {
              // Update existing option
              await Questionnaire.updateAnswerOption(option.id, option.option_text, option.option_value, j);
              updatedOptionIds.push(option.id);
            } else {
              // Create new option
              const newOptionId = await Questionnaire.addAnswerOption(
                question.id,
                option.option_text,
                option.option_value,
                j
              );
              updatedOptionIds.push(newOptionId);
            }
          }

          // Delete removed options
          for (const optionId of existingOptionIds) {
            if (!updatedOptionIds.includes(optionId)) {
              await Questionnaire.deleteAnswerOption(optionId);
            }
          }
        } else {
          // Create new question
          const newQuestionId = await Questionnaire.addQuestion(id, question.question_text, i, question.sub_heading || null);
          updatedQuestionIds.push(newQuestionId);

          // Add answer options
          for (let j = 0; j < question.options.length; j++) {
            const option = question.options[j];
            await Questionnaire.addAnswerOption(
              newQuestionId,
              option.option_text,
              option.option_value,
              j
            );
          }
        }
      }

      // Delete removed questions
      for (const questionId of existingQuestionIds) {
        if (!updatedQuestionIds.includes(questionId)) {
          await Questionnaire.deleteQuestion(questionId);
        }
      }
    }

    // Get updated questionnaire
    const updatedQuestionnaire = await Questionnaire.getQuestionnaireWithQuestions(id);

    res.json({
      message: 'Questionnaire updated successfully',
      questionnaire: updatedQuestionnaire
    });
  } catch (error) {
    console.error('Error updating questionnaire:', error);
    res.status(500).json({ error: error.message });
  }
};

// Delete questionnaire
exports.deleteQuestionnaire = async (req, res) => {
  try {
    const { id } = req.params;
    const userType = req.user.userType;
    const userId = req.user.id;

    // Verify ownership
    const isOwner = await Questionnaire.verifyOwnership(id, userType, userId);
    if (!isOwner) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await Questionnaire.delete(id);
    res.json({ message: 'Questionnaire deleted successfully' });
  } catch (error) {
    console.error('Error deleting questionnaire:', error);
    res.status(500).json({ error: error.message });
  }
};

// Assign questionnaire to user(s)
exports.assignQuestionnaire = async (req, res) => {
  try {
    const { questionnaire_id, user_ids } = req.body;
    const userType = req.user.userType;
    const userId = req.user.id;

    if (!questionnaire_id || !user_ids || user_ids.length === 0) {
      return res.status(400).json({ error: 'Questionnaire ID and user IDs are required' });
    }

    // Verify ownership or access (partners can assign their own or preset questionnaires)
    const questionnaire = await Questionnaire.findById(questionnaire_id);
    if (!questionnaire) {
      return res.status(404).json({ error: 'Questionnaire not found' });
    }

    let hasAccess = false;
    if (userType === 'partner') {
      // Partner can assign if they own it or if it's a preset
      if (questionnaire.created_by_type === 'partner' && questionnaire.partner_id === userId) {
        hasAccess = true;
      } else {
        // Check if it's shared with this partner
        const presetQuestionnaires = await Questionnaire.findPresetForPartner(userId);
        hasAccess = presetQuestionnaires.some(q => q.id === parseInt(questionnaire_id));
      }
    } else {
      hasAccess = await Questionnaire.verifyOwnership(questionnaire_id, userType, userId);
    }

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // For assignment, we still need partner_id (the assigner)
    const partnerId = userType === 'partner' ? userId : null;
    if (!partnerId) {
      return res.status(400).json({ error: 'Only partners can assign questionnaires to users' });
    }

    // Assign to each user
    const assignments = [];
    for (const userId of user_ids) {
      const assignmentId = await QuestionnaireAssignment.assignToUser(
        questionnaire_id,
        userId,
        partnerId
      );
      assignments.push(assignmentId);
    }

    res.status(201).json({
      message: 'Questionnaire assigned successfully',
      assignments
    });
  } catch (error) {
    console.error('Error assigning questionnaire:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get assignments for a user
exports.getUserAssignments = async (req, res) => {
  try {
    const userId = req.user.userType === 'user' ? req.user.id : req.params.userId;
    const partnerId = req.query.partnerId ? parseInt(req.query.partnerId) : null;
    const assignments = await QuestionnaireAssignment.findByUser(userId, partnerId);
    res.json(assignments);
  } catch (error) {
    console.error('Error getting user assignments:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get assignments created by partner
exports.getPartnerAssignments = async (req, res) => {
  try {
    const partnerId = req.user.userType === 'partner' ? req.user.id : req.params.partnerId;
    const assignments = await QuestionnaireAssignment.findByPartner(partnerId);
    res.json(assignments);
  } catch (error) {
    console.error('Error getting partner assignments:', error);
    res.status(500).json({ error: error.message });
  }
};

// Save responses for an assignment
exports.saveResponses = async (req, res) => {
  try {
    const { id } = req.params;
    const { responses, session_id, text_response } = req.body;
    const userId = req.user.id;

    if (!responses || responses.length === 0) {
      return res.status(400).json({ error: 'Responses are required' });
    }

    // Verify user has access to this assignment
    const hasAccess = await QuestionnaireAssignment.verifyUserAccess(id, userId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await QuestionnaireAssignment.saveResponses(id, responses, session_id, text_response);

    res.json({ message: 'Responses saved successfully' });
  } catch (error) {
    console.error('Error saving responses:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get responses for an assignment
exports.getResponses = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.userType;

    // Verify access
    if (userRole === 'user') {
      const hasAccess = await QuestionnaireAssignment.verifyUserAccess(id, userId);
      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied' });
      }
    } else if (userRole === 'partner') {
      const hasAccess = await QuestionnaireAssignment.verifyPartnerAccess(id, userId);
      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const responses = await QuestionnaireAssignment.getResponses(id);
    const textResponse = await QuestionnaireAssignment.getTextResponse(id);
    
    res.json({ 
      responses,
      text_response: textResponse ? textResponse.text_response : null
    });
  } catch (error) {
    console.error('Error getting responses:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get user response history for a questionnaire
exports.getUserHistory = async (req, res) => {
  try {
    const { userId, questionnaireId } = req.params;
    const requesterId = req.user.id;
    const requesterRole = req.user.userType;

    // Verify access
    if (requesterRole === 'user' && requesterId !== parseInt(userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const history = await QuestionnaireAssignment.getUserResponseHistory(userId, questionnaireId);
    res.json(history);
  } catch (error) {
    console.error('Error getting user history:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get questionnaire statistics
exports.getQuestionnaireStats = async (req, res) => {
  try {
    const { id } = req.params;
    const userType = req.user.userType;
    const userId = req.user.id;

    // Verify ownership
    const isOwner = await Questionnaire.verifyOwnership(id, userType, userId);
    if (!isOwner) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // For stats, we need partner_id - get it from questionnaire
    const questionnaire = await Questionnaire.findById(id);
    const partnerId = questionnaire.partner_id || userId; // Fallback to userId if not partner-owned

    const stats = await QuestionnaireAssignment.getQuestionnaireStats(id, partnerId);
    res.json(stats);
  } catch (error) {
    console.error('Error getting questionnaire stats:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get aggregated responses for charts
exports.getAggregatedResponses = async (req, res) => {
  try {
    const { questionnaireId, userId } = req.params;
    const requesterId = req.user.id;
    const requesterRole = req.user.userType;

    // Verify access
    if (requesterRole === 'user' && requesterId !== parseInt(userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const responses = await QuestionnaireAssignment.getAggregatedResponses(questionnaireId, userId);
    res.json(responses);
  } catch (error) {
    console.error('Error getting aggregated responses:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get assignment details
exports.getAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.userType;

    // Verify access
    if (userRole === 'user') {
      const hasAccess = await QuestionnaireAssignment.verifyUserAccess(id, userId);
      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied' });
      }
    } else if (userRole === 'partner') {
      const hasAccess = await QuestionnaireAssignment.verifyPartnerAccess(id, userId);
      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const assignment = await QuestionnaireAssignment.findById(id);
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // Get the full questionnaire details
    const questionnaire = await Questionnaire.getQuestionnaireWithQuestions(assignment.questionnaire_id);
    assignment.questionnaire = questionnaire;

    res.json(assignment);
  } catch (error) {
    console.error('Error getting assignment:', error);
    res.status(500).json({ error: error.message });
  }
};

// Delete assignment
exports.deleteAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const partnerId = req.user.id;

    // Verify partner has access
    const hasAccess = await QuestionnaireAssignment.verifyPartnerAccess(id, partnerId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await QuestionnaireAssignment.delete(id);
    res.json({ message: 'Assignment deleted successfully' });
  } catch (error) {
    console.error('Error deleting assignment:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get completed questionnaires grouped by type for a user (for chart comparisons)
exports.getCompletedByTypeForUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const partnerId = req.user.id;

    // Only partners can access this endpoint
    if (req.user.userType !== 'partner') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const questionnaireTypes = await QuestionnaireAssignment.getCompletedByTypeForUser(userId, partnerId);
    res.json({ questionnaireTypes });
  } catch (error) {
    console.error('Error getting completed questionnaires by type:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get responses for multiple assignments (for chart comparison)
exports.getResponsesForComparison = async (req, res) => {
  try {
    const { assignmentIds } = req.body;
    const userId = req.user.id;
    const userType = req.user.userType;

    if (!assignmentIds || !Array.isArray(assignmentIds) || assignmentIds.length < 2) {
      return res.status(400).json({ error: 'At least 2 assignment IDs are required' });
    }

    if (assignmentIds.length > 4) {
      return res.status(400).json({ error: 'Maximum 4 assignments can be compared' });
    }

    // Verify access based on user type
    for (const assignmentId of assignmentIds) {
      let hasAccess = false;

      if (userType === 'partner') {
        hasAccess = await QuestionnaireAssignment.verifyPartnerAccess(assignmentId, userId);
      } else if (userType === 'user') {
        hasAccess = await QuestionnaireAssignment.verifyUserAccess(assignmentId, userId);
      }

      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied to one or more assignments' });
      }
    }

    const responses = await QuestionnaireAssignment.getResponsesForAssignments(assignmentIds);
    res.json({ responses });
  } catch (error) {
    console.error('Error getting responses for comparison:', error);
    res.status(500).json({ error: error.message });
  }
};

// Share questionnaire with organizations (admin only)
exports.shareWithOrganizations = async (req, res) => {
  try {
    const { id } = req.params;
    const { organization_ids } = req.body;
    const adminId = req.user.id;

    if (req.user.userType !== 'admin') {
      return res.status(403).json({ error: 'Only admins can share questionnaires with organizations' });
    }

    if (!organization_ids || !Array.isArray(organization_ids) || organization_ids.length === 0) {
      return res.status(400).json({ error: 'Organization IDs array is required' });
    }

    // Verify ownership
    const isOwner = await Questionnaire.verifyOwnership(id, 'admin', adminId);
    if (!isOwner) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const shareIds = await Questionnaire.shareWithOrganizations(id, organization_ids, adminId);
    res.json({
      message: 'Questionnaire shared successfully',
      shares_created: shareIds.length
    });
  } catch (error) {
    console.error('Error sharing questionnaire with organizations:', error);
    res.status(500).json({ error: error.message });
  }
};

// Share questionnaire with partners (organization only)
exports.shareWithPartners = async (req, res) => {
  try {
    const { id } = req.params;
    const { partner_ids } = req.body;
    const organizationId = req.user.id;

    if (req.user.userType !== 'organization') {
      return res.status(403).json({ error: 'Only organizations can share questionnaires with partners' });
    }

    if (!partner_ids || !Array.isArray(partner_ids) || partner_ids.length === 0) {
      return res.status(400).json({ error: 'Partner IDs array is required' });
    }

    // Verify ownership
    const isOwner = await Questionnaire.verifyOwnership(id, 'organization', organizationId);
    if (!isOwner) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const shareIds = await Questionnaire.shareWithPartners(id, partner_ids, organizationId);
    res.json({
      message: 'Questionnaire shared successfully',
      shares_created: shareIds.length
    });
  } catch (error) {
    console.error('Error sharing questionnaire with partners:', error);
    res.status(500).json({ error: error.message });
  }
};

// Unshare questionnaire from organizations (admin only)
exports.unshareFromOrganizations = async (req, res) => {
  try {
    const { id } = req.params;
    const { organization_ids } = req.body;
    const adminId = req.user.id;

    if (req.user.userType !== 'admin') {
      return res.status(403).json({ error: 'Only admins can unshare questionnaires from organizations' });
    }

    if (!organization_ids || !Array.isArray(organization_ids) || organization_ids.length === 0) {
      return res.status(400).json({ error: 'Organization IDs array is required' });
    }

    // Verify ownership
    const isOwner = await Questionnaire.verifyOwnership(id, 'admin', adminId);
    if (!isOwner) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const unsharedCount = await Questionnaire.unshareFromOrganizations(id, organization_ids, adminId);
    res.json({
      message: 'Questionnaire unshared successfully',
      unshared_count: unsharedCount
    });
  } catch (error) {
    console.error('Error unsharing questionnaire from organizations:', error);
    res.status(500).json({ error: error.message });
  }
};

// Unshare questionnaire from partners (organization only)
exports.unshareFromPartners = async (req, res) => {
  try {
    const { id } = req.params;
    const { partner_ids } = req.body;
    const organizationId = req.user.id;

    if (req.user.userType !== 'organization') {
      return res.status(403).json({ error: 'Only organizations can unshare questionnaires from partners' });
    }

    if (!partner_ids || !Array.isArray(partner_ids) || partner_ids.length === 0) {
      return res.status(400).json({ error: 'Partner IDs array is required' });
    }

    // Verify ownership
    const isOwner = await Questionnaire.verifyOwnership(id, 'organization', organizationId);
    if (!isOwner) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const unsharedCount = await Questionnaire.unshareFromPartners(id, partner_ids, organizationId);
    res.json({
      message: 'Questionnaire unshared successfully',
      unshared_count: unsharedCount
    });
  } catch (error) {
    console.error('Error unsharing questionnaire from partners:', error);
    res.status(500).json({ error: error.message });
  }
};

// Copy a preset questionnaire
exports.copyQuestionnaire = async (req, res) => {
  try {
    const { id } = req.params;
    const userType = req.user.userType;
    const userId = req.user.id;

    if (!['partner', 'organization'].includes(userType)) {
      return res.status(403).json({ error: 'Only partners and organizations can copy questionnaires' });
    }

    // Verify the questionnaire exists and is accessible
    const original = await Questionnaire.getQuestionnaireWithQuestions(id);
    if (!original) {
      return res.status(404).json({ error: 'Questionnaire not found' });
    }

    // Check if user has access (either owns it or it's shared with them)
    let hasAccess = false;
    if (userType === 'partner') {
      if (original.created_by_type === 'partner' && original.partner_id === userId) {
        hasAccess = true;
      } else {
        const presetQuestionnaires = await Questionnaire.findPresetForPartner(userId);
        hasAccess = presetQuestionnaires.some(q => q.id === parseInt(id));
      }
    } else if (userType === 'organization') {
      if (original.created_by_type === 'organization' && original.organization_id === userId) {
        hasAccess = true;
      } else {
        const presetQuestionnaires = await Questionnaire.findPresetForOrganization(userId);
        hasAccess = presetQuestionnaires.some(q => q.id === parseInt(id));
      }
    }

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Copy the questionnaire
    const newQuestionnaireId = await Questionnaire.copyQuestionnaire(id, userType, userId);
    const newQuestionnaire = await Questionnaire.getQuestionnaireWithQuestions(newQuestionnaireId);

    res.status(201).json({
      message: 'Questionnaire copied successfully',
      questionnaire: newQuestionnaire
    });
  } catch (error) {
    console.error('Error copying questionnaire:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get shared organizations for a questionnaire (admin only)
exports.getSharedOrganizations = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;

    if (req.user.userType !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Verify ownership
    const isOwner = await Questionnaire.verifyOwnership(id, 'admin', adminId);
    if (!isOwner) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const sharedOrgs = await Questionnaire.getSharedOrganizations(id);
    res.json(sharedOrgs);
  } catch (error) {
    console.error('Error getting shared organizations:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get shared partners for a questionnaire (organization only)
exports.getSharedPartners = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.id;

    if (req.user.userType !== 'organization') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Verify ownership
    const isOwner = await Questionnaire.verifyOwnership(id, 'organization', organizationId);
    if (!isOwner) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const sharedPartners = await Questionnaire.getSharedPartners(id);
    res.json(sharedPartners);
  } catch (error) {
    console.error('Error getting shared partners:', error);
    res.status(500).json({ error: error.message });
  }
};

