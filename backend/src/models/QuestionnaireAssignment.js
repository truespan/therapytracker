const db = require('../config/database');

class QuestionnaireAssignment {
  // Assign questionnaire to user
  static async assignToUser(questionnaireId, userId, partnerId) {
    try {
      const result = await db.query(
        'INSERT INTO user_questionnaire_assignments (questionnaire_id, user_id, partner_id) VALUES ($1, $2, $3) RETURNING id',
        [questionnaireId, userId, partnerId]
      );
      return result.rows[0].id;
    } catch (error) {
      throw new Error(`Error assigning questionnaire: ${error.message}`);
    }
  }

  // Find assignments for a user
  static async findByUser(userId) {
    try {
      const result = await db.query(
        `SELECT uqa.*, q.name, q.description, p.name as partner_name,
         COUNT(DISTINCT uqr.id) as response_count
         FROM user_questionnaire_assignments uqa
         JOIN questionnaires q ON uqa.questionnaire_id = q.id
         JOIN partners p ON uqa.partner_id = p.id
         LEFT JOIN user_questionnaire_responses uqr ON uqa.id = uqr.assignment_id
         WHERE uqa.user_id = $1
         GROUP BY uqa.id, q.name, q.description, p.name
         ORDER BY uqa.assigned_at DESC`,
        [userId]
      );
      return result.rows;
    } catch (error) {
      throw new Error(`Error finding assignments by user: ${error.message}`);
    }
  }

  // Find assignments created by partner
  static async findByPartner(partnerId) {
    try {
      const result = await db.query(
        `SELECT uqa.*, q.name as questionnaire_name, u.name as user_name, u.email as user_email,
         COUNT(DISTINCT uqr.id) as response_count
         FROM user_questionnaire_assignments uqa
         JOIN questionnaires q ON uqa.questionnaire_id = q.id
         JOIN users u ON uqa.user_id = u.id
         LEFT JOIN user_questionnaire_responses uqr ON uqa.id = uqr.assignment_id
         WHERE uqa.partner_id = $1
         GROUP BY uqa.id, q.name, u.name, u.email
         ORDER BY uqa.assigned_at DESC`,
        [partnerId]
      );
      return result.rows;
    } catch (error) {
      throw new Error(`Error finding assignments by partner: ${error.message}`);
    }
  }

  // Find assignment by ID
  static async findById(id) {
    try {
      const result = await db.query(
        `SELECT uqa.*, q.name, q.description
         FROM user_questionnaire_assignments uqa
         JOIN questionnaires q ON uqa.questionnaire_id = q.id
         WHERE uqa.id = $1`,
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Error finding assignment: ${error.message}`);
    }
  }

  // Update assignment status
  static async updateStatus(assignmentId, status) {
    try {
      const completedAt = status === 'completed' ? new Date() : null;
      const result = await db.query(
        'UPDATE user_questionnaire_assignments SET status = $1, completed_at = $2 WHERE id = $3',
        [status, completedAt, assignmentId]
      );
      return result.rowCount > 0;
    } catch (error) {
      throw new Error(`Error updating assignment status: ${error.message}`);
    }
  }

  // Save responses for an assignment
  static async saveResponses(assignmentId, responses, sessionId = null, textResponse = null) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // Delete existing responses for this assignment and session (if updating)
      if (sessionId) {
        await client.query(
          'DELETE FROM user_questionnaire_responses WHERE assignment_id = $1 AND session_id = $2',
          [assignmentId, sessionId]
        );
        await client.query(
          'DELETE FROM user_questionnaire_text_responses WHERE assignment_id = $1',
          [assignmentId]
        );
      } else {
        // If no session, create a new response set
        await client.query(
          'DELETE FROM user_questionnaire_responses WHERE assignment_id = $1 AND session_id IS NULL',
          [assignmentId]
        );
        await client.query(
          'DELETE FROM user_questionnaire_text_responses WHERE assignment_id = $1',
          [assignmentId]
        );
      }

      // Insert new responses
      for (const response of responses) {
        await client.query(
          'INSERT INTO user_questionnaire_responses (assignment_id, question_id, answer_option_id, response_value, session_id) VALUES ($1, $2, $3, $4, $5)',
          [assignmentId, response.question_id, response.answer_option_id, response.response_value, sessionId]
        );
      }

      // Insert text response if provided
      if (textResponse !== null && textResponse !== undefined) {
        await client.query(
          'INSERT INTO user_questionnaire_text_responses (assignment_id, text_response) VALUES ($1, $2)',
          [assignmentId, textResponse]
        );
      }

      // Update assignment status to completed
      await client.query(
        'UPDATE user_questionnaire_assignments SET status = $1, completed_at = NOW() WHERE id = $2',
        ['completed', assignmentId]
      );

      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Error saving responses: ${error.message}`);
    } finally {
      client.release();
    }
  }

  // Get responses for an assignment
  static async getResponses(assignmentId) {
    try {
      const result = await db.query(
        `SELECT uqr.*, qq.question_text, qao.option_text, qao.option_value
         FROM user_questionnaire_responses uqr
         JOIN questionnaire_questions qq ON uqr.question_id = qq.id
         JOIN questionnaire_answer_options qao ON uqr.answer_option_id = qao.id
         WHERE uqr.assignment_id = $1
         ORDER BY uqr.responded_at DESC, qq.question_order`,
        [assignmentId]
      );
      return result.rows;
    } catch (error) {
      throw new Error(`Error getting responses: ${error.message}`);
    }
  }

  // Get text response for an assignment
  static async getTextResponse(assignmentId) {
    try {
      const result = await db.query(
        'SELECT * FROM user_questionnaire_text_responses WHERE assignment_id = $1 ORDER BY responded_at DESC LIMIT 1',
        [assignmentId]
      );
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Error getting text response: ${error.message}`);
    }
  }

  // Get user response history across all sessions for a questionnaire
  static async getUserResponseHistory(userId, questionnaireId) {
    try {
      const result = await db.query(
        `SELECT uqr.*, qq.question_text, qq.question_order, qao.option_text, qao.option_value,
         uqa.assigned_at
         FROM user_questionnaire_responses uqr
         JOIN user_questionnaire_assignments uqa ON uqr.assignment_id = uqa.id
         JOIN questionnaire_questions qq ON uqr.question_id = qq.id
         JOIN questionnaire_answer_options qao ON uqr.answer_option_id = qao.id
         WHERE uqa.user_id = $1 AND uqa.questionnaire_id = $2
         ORDER BY uqr.responded_at, qq.question_order`,
        [userId, questionnaireId]
      );
      return result.rows;
    } catch (error) {
      throw new Error(`Error getting user response history: ${error.message}`);
    }
  }

  // Get response statistics for a questionnaire
  static async getQuestionnaireStats(questionnaireId, partnerId) {
    try {
      const result = await db.query(
        `SELECT 
          COUNT(DISTINCT uqa.id) as total_assignments,
          COUNT(DISTINCT CASE WHEN uqa.status = 'completed' THEN uqa.id END) as completed_assignments,
          COUNT(DISTINCT CASE WHEN uqa.status = 'pending' THEN uqa.id END) as pending_assignments,
          COUNT(DISTINCT uqr.id) as total_responses,
          COUNT(DISTINCT uqa.user_id) as unique_users
         FROM user_questionnaire_assignments uqa
         LEFT JOIN user_questionnaire_responses uqr ON uqa.id = uqr.assignment_id
         WHERE uqa.questionnaire_id = $1 AND uqa.partner_id = $2`,
        [questionnaireId, partnerId]
      );
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error getting questionnaire stats: ${error.message}`);
    }
  }

  // Get aggregated response data for charts
  static async getAggregatedResponses(questionnaireId, userId) {
    try {
      const result = await db.query(
        `SELECT
          qq.id as question_id,
          qq.question_text,
          qq.question_order,
          uqr.responded_at,
          uqr.response_value,
          qao.option_text
         FROM user_questionnaire_responses uqr
         JOIN user_questionnaire_assignments uqa ON uqr.assignment_id = uqa.id
         JOIN questionnaire_questions qq ON uqr.question_id = qq.id
         JOIN questionnaire_answer_options qao ON uqr.answer_option_id = qao.id
         WHERE uqa.questionnaire_id = $1 AND uqa.user_id = $2
         ORDER BY uqr.responded_at, qq.question_order`,
        [questionnaireId, userId]
      );
      return result.rows;
    } catch (error) {
      throw new Error(`Error getting aggregated responses: ${error.message}`);
    }
  }

  // Check if user has access to assignment
  static async verifyUserAccess(assignmentId, userId) {
    try {
      const result = await db.query(
        'SELECT id FROM user_questionnaire_assignments WHERE id = $1 AND user_id = $2',
        [assignmentId, userId]
      );
      return result.rows.length > 0;
    } catch (error) {
      throw new Error(`Error verifying user access: ${error.message}`);
    }
  }

  // Check if partner has access to assignment
  static async verifyPartnerAccess(assignmentId, partnerId) {
    try {
      const result = await db.query(
        'SELECT id FROM user_questionnaire_assignments WHERE id = $1 AND partner_id = $2',
        [assignmentId, partnerId]
      );
      return result.rows.length > 0;
    } catch (error) {
      throw new Error(`Error verifying partner access: ${error.message}`);
    }
  }

  // Delete assignment
  static async delete(assignmentId) {
    try {
      const result = await db.query(
        'DELETE FROM user_questionnaire_assignments WHERE id = $1',
        [assignmentId]
      );
      return result.rowCount > 0;
    } catch (error) {
      throw new Error(`Error deleting assignment: ${error.message}`);
    }
  }

  // Get completed questionnaires grouped by type for a specific user (for chart comparisons)
  static async getCompletedByTypeForUser(userId, partnerId) {
    try {
      // First, get all questionnaire types that have completed assignments for this user
      const typesResult = await db.query(
        `SELECT DISTINCT q.id as questionnaire_id, q.name as questionnaire_name,
         COUNT(DISTINCT uqa.id) as completion_count
         FROM user_questionnaire_assignments uqa
         JOIN questionnaires q ON uqa.questionnaire_id = q.id
         WHERE uqa.user_id = $1 AND uqa.partner_id = $2 AND uqa.status = 'completed'
         GROUP BY q.id, q.name
         HAVING COUNT(DISTINCT uqa.id) >= 1
         ORDER BY q.name`,
        [userId, partnerId]
      );

      // For each questionnaire type, get the completed assignments with response details
      const questionnaireTypes = [];

      for (const type of typesResult.rows) {
        const completionsResult = await db.query(
          `SELECT uqa.id as assignment_id, uqa.completed_at,
           COUNT(DISTINCT uqr.id) as response_count
           FROM user_questionnaire_assignments uqa
           LEFT JOIN user_questionnaire_responses uqr ON uqa.id = uqr.assignment_id
           WHERE uqa.questionnaire_id = $1 AND uqa.user_id = $2
           AND uqa.partner_id = $3 AND uqa.status = 'completed'
           GROUP BY uqa.id, uqa.completed_at
           ORDER BY uqa.completed_at ASC`,
          [type.questionnaire_id, userId, partnerId]
        );

        questionnaireTypes.push({
          questionnaire_id: type.questionnaire_id,
          questionnaire_name: type.questionnaire_name,
          completion_count: parseInt(type.completion_count),
          completions: completionsResult.rows.map((c, index) => ({
            assignment_id: c.assignment_id,
            completed_at: c.completed_at,
            response_count: parseInt(c.response_count),
            submission_number: index + 1
          }))
        });
      }

      return questionnaireTypes;
    } catch (error) {
      throw new Error(`Error getting completed questionnaires by type: ${error.message}`);
    }
  }

  // Get responses for multiple assignments (for chart comparison)
  static async getResponsesForAssignments(assignmentIds) {
    try {
      // First get questionnaire_id, user_id, and partner_id from the first assignment
      const assignmentInfo = await db.query(
        `SELECT questionnaire_id, user_id, partner_id FROM user_questionnaire_assignments WHERE id = $1`,
        [assignmentIds[0]]
      );

      if (assignmentInfo.rows.length === 0) {
        throw new Error('Assignment not found');
      }

      const { questionnaire_id, user_id, partner_id } = assignmentInfo.rows[0];

      // Get all completed assignments for this questionnaire/user/partner to calculate submission numbers
      const allAssignmentsResult = await db.query(
        `SELECT id as assignment_id FROM user_questionnaire_assignments
         WHERE questionnaire_id = $1 AND user_id = $2 AND partner_id = $3 AND status = 'completed'
         ORDER BY completed_at ASC`,
        [questionnaire_id, user_id, partner_id]
      );

      // Create a map of assignment_id to submission_number
      const submissionNumberMap = {};
      allAssignmentsResult.rows.forEach((row, index) => {
        submissionNumberMap[row.assignment_id] = index + 1;
      });

      // Get responses with all fields including submission numbers
      const result = await db.query(
        `SELECT uqa.id as assignment_id, uqa.completed_at,
         qq.id as question_id, qq.question_text, qq.question_order, qq.sub_heading,
         uqr.response_value, qao.option_text
         FROM user_questionnaire_responses uqr
         JOIN user_questionnaire_assignments uqa ON uqr.assignment_id = uqa.id
         JOIN questionnaire_questions qq ON uqr.question_id = qq.id
         JOIN questionnaire_answer_options qao ON uqr.answer_option_id = qao.id
         WHERE uqa.id = ANY($1)
         ORDER BY uqa.completed_at ASC, qq.question_order ASC`,
        [assignmentIds]
      );

      // Add submission_number to each row
      const rowsWithSubmissionNumbers = result.rows.map(row => ({
        ...row,
        submission_number: submissionNumberMap[row.assignment_id]
      }));

      return rowsWithSubmissionNumbers;
    } catch (error) {
      throw new Error(`Error getting responses for assignments: ${error.message}`);
    }
  }
}

module.exports = QuestionnaireAssignment;
