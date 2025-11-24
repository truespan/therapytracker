const Questionnaire = require('../models/Questionnaire');
const QuestionnaireAssignment = require('../models/QuestionnaireAssignment');

// Create a new questionnaire
exports.createQuestionnaire = async (req, res) => {
  try {
    const { name, description, questions, has_text_field, text_field_label, text_field_placeholder } = req.body;
    const partnerId = req.user.id;

    if (!name || !questions || questions.length === 0) {
      return res.status(400).json({ error: 'Name and questions are required' });
    }

    // Create questionnaire
    const questionnaireId = await Questionnaire.create(
      partnerId, 
      name, 
      description, 
      has_text_field || false,
      text_field_label || null,
      text_field_placeholder || null
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

// Get all questionnaires for a partner
exports.getPartnerQuestionnaires = async (req, res) => {
  try {
    const partnerId = req.user.userType === 'partner' ? req.user.id : req.params.partnerId;
    const questionnaires = await Questionnaire.findByPartner(partnerId);
    res.json(questionnaires);
  } catch (error) {
    console.error('Error getting partner questionnaires:', error);
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

    // Verify ownership if partner
    if (req.user.userType === 'partner' && questionnaire.partner_id !== req.user.id) {
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
    const { name, description, questions, has_text_field, text_field_label, text_field_placeholder } = req.body;
    const partnerId = req.user.id;

    // Verify ownership
    const isOwner = await Questionnaire.verifyOwnership(id, partnerId);
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
      text_field_placeholder || null
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
    const partnerId = req.user.id;

    // Verify ownership
    const isOwner = await Questionnaire.verifyOwnership(id, partnerId);
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
    const partnerId = req.user.id;

    if (!questionnaire_id || !user_ids || user_ids.length === 0) {
      return res.status(400).json({ error: 'Questionnaire ID and user IDs are required' });
    }

    // Verify ownership
    const isOwner = await Questionnaire.verifyOwnership(questionnaire_id, partnerId);
    if (!isOwner) {
      return res.status(403).json({ error: 'Access denied' });
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
    const assignments = await QuestionnaireAssignment.findByUser(userId);
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
    const partnerId = req.user.id;

    // Verify ownership
    const isOwner = await Questionnaire.verifyOwnership(id, partnerId);
    if (!isOwner) {
      return res.status(403).json({ error: 'Access denied' });
    }

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

