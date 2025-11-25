const db = require('../config/database');

class Questionnaire {
  // Create a new questionnaire
  static async create(partnerId, name, description, hasTextField = false, textFieldLabel = null, textFieldPlaceholder = null, colorCodingScheme = null) {
    try {
      const result = await db.query(
        'INSERT INTO questionnaires (partner_id, name, description, has_text_field, text_field_label, text_field_placeholder, color_coding_scheme) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
        [partnerId, name, description, hasTextField, textFieldLabel, textFieldPlaceholder, colorCodingScheme]
      );
      return result.rows[0].id;
    } catch (error) {
      throw new Error(`Error creating questionnaire: ${error.message}`);
    }
  }

  // Find questionnaire by ID
  static async findById(id) {
    try {
      const result = await db.query(
        'SELECT * FROM questionnaires WHERE id = $1',
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Error finding questionnaire: ${error.message}`);
    }
  }

  // Find all questionnaires for a partner
  static async findByPartner(partnerId) {
    try {
      const result = await db.query(
        `SELECT q.*, 
         COUNT(DISTINCT qq.id) as question_count,
         COUNT(DISTINCT uqa.id) as assignment_count,
         COUNT(DISTINCT CASE WHEN uqa.status = 'completed' THEN uqa.id END) as completed_count
         FROM questionnaires q
         LEFT JOIN questionnaire_questions qq ON q.id = qq.questionnaire_id
         LEFT JOIN user_questionnaire_assignments uqa ON q.id = uqa.questionnaire_id
         WHERE q.partner_id = $1
         GROUP BY q.id
         ORDER BY q.created_at DESC`,
        [partnerId]
      );
      return result.rows;
    } catch (error) {
      throw new Error(`Error finding questionnaires by partner: ${error.message}`);
    }
  }

  // Update questionnaire
  static async update(id, name, description, hasTextField = false, textFieldLabel = null, textFieldPlaceholder = null, colorCodingScheme = null) {
    try {
      const result = await db.query(
        'UPDATE questionnaires SET name = $1, description = $2, has_text_field = $3, text_field_label = $4, text_field_placeholder = $5, color_coding_scheme = $6, updated_at = CURRENT_TIMESTAMP WHERE id = $7',
        [name, description, hasTextField, textFieldLabel, textFieldPlaceholder, colorCodingScheme, id]
      );
      return result.rowCount > 0;
    } catch (error) {
      throw new Error(`Error updating questionnaire: ${error.message}`);
    }
  }

  // Delete questionnaire
  static async delete(id) {
    try {
      const result = await db.query(
        'DELETE FROM questionnaires WHERE id = $1',
        [id]
      );
      return result.rowCount > 0;
    } catch (error) {
      throw new Error(`Error deleting questionnaire: ${error.message}`);
    }
  }

  // Add a question to questionnaire
  static async addQuestion(questionnaireId, questionText, questionOrder, subHeading = null) {
    try {
      const result = await db.query(
        'INSERT INTO questionnaire_questions (questionnaire_id, question_text, question_order, sub_heading) VALUES ($1, $2, $3, $4) RETURNING id',
        [questionnaireId, questionText, questionOrder, subHeading]
      );
      return result.rows[0].id;
    } catch (error) {
      throw new Error(`Error adding question: ${error.message}`);
    }
  }

  // Update a question
  static async updateQuestion(questionId, questionText, questionOrder, subHeading = null) {
    try {
      const result = await db.query(
        'UPDATE questionnaire_questions SET question_text = $1, question_order = $2, sub_heading = $3 WHERE id = $4',
        [questionText, questionOrder, subHeading, questionId]
      );
      return result.rowCount > 0;
    } catch (error) {
      throw new Error(`Error updating question: ${error.message}`);
    }
  }

  // Delete a question
  static async deleteQuestion(questionId) {
    try {
      const result = await db.query(
        'DELETE FROM questionnaire_questions WHERE id = $1',
        [questionId]
      );
      return result.rowCount > 0;
    } catch (error) {
      throw new Error(`Error deleting question: ${error.message}`);
    }
  }

  // Add answer option to a question
  static async addAnswerOption(questionId, optionText, optionValue, optionOrder) {
    try {
      const result = await db.query(
        'INSERT INTO questionnaire_answer_options (question_id, option_text, option_value, option_order) VALUES ($1, $2, $3, $4) RETURNING id',
        [questionId, optionText, optionValue, optionOrder]
      );
      return result.rows[0].id;
    } catch (error) {
      throw new Error(`Error adding answer option: ${error.message}`);
    }
  }

  // Update answer option
  static async updateAnswerOption(optionId, optionText, optionValue, optionOrder) {
    try {
      const result = await db.query(
        'UPDATE questionnaire_answer_options SET option_text = $1, option_value = $2, option_order = $3 WHERE id = $4',
        [optionText, optionValue, optionOrder, optionId]
      );
      return result.rowCount > 0;
    } catch (error) {
      throw new Error(`Error updating answer option: ${error.message}`);
    }
  }

  // Delete answer option
  static async deleteAnswerOption(optionId) {
    try {
      const result = await db.query(
        'DELETE FROM questionnaire_answer_options WHERE id = $1',
        [optionId]
      );
      return result.rowCount > 0;
    } catch (error) {
      throw new Error(`Error deleting answer option: ${error.message}`);
    }
  }

  // Get complete questionnaire with all questions and options
  static async getQuestionnaireWithQuestions(id) {
    try {
      // Get questionnaire
      const questionnaire = await this.findById(id);
      if (!questionnaire) {
        return null;
      }

      // Get questions
      const questionsResult = await db.query(
        'SELECT * FROM questionnaire_questions WHERE questionnaire_id = $1 ORDER BY question_order',
        [id]
      );
      const questions = questionsResult.rows;

      // Get answer options for each question
      for (let question of questions) {
        const optionsResult = await db.query(
          'SELECT * FROM questionnaire_answer_options WHERE question_id = $1 ORDER BY option_order',
          [question.id]
        );
        question.options = optionsResult.rows;
      }

      questionnaire.questions = questions;
      return questionnaire;
    } catch (error) {
      throw new Error(`Error getting questionnaire with questions: ${error.message}`);
    }
  }

  // Get all questions for a questionnaire
  static async getQuestions(questionnaireId) {
    try {
      const result = await db.query(
        'SELECT * FROM questionnaire_questions WHERE questionnaire_id = $1 ORDER BY question_order',
        [questionnaireId]
      );
      return result.rows;
    } catch (error) {
      throw new Error(`Error getting questions: ${error.message}`);
    }
  }

  // Get all answer options for a question
  static async getAnswerOptions(questionId) {
    try {
      const result = await db.query(
        'SELECT * FROM questionnaire_answer_options WHERE question_id = $1 ORDER BY option_order',
        [questionId]
      );
      return result.rows;
    } catch (error) {
      throw new Error(`Error getting answer options: ${error.message}`);
    }
  }

  // Verify questionnaire belongs to partner
  static async verifyOwnership(questionnaireId, partnerId) {
    try {
      const result = await db.query(
        'SELECT id FROM questionnaires WHERE id = $1 AND partner_id = $2',
        [questionnaireId, partnerId]
      );
      return result.rows.length > 0;
    } catch (error) {
      throw new Error(`Error verifying ownership: ${error.message}`);
    }
  }
}

module.exports = Questionnaire;
