const db = require('../config/database');

class Questionnaire {
  // Create a new questionnaire
  static async create(createdByType, ownerId, name, description, hasTextField = false, textFieldLabel = null, textFieldPlaceholder = null, colorCodingScheme = null) {
    try {
      let partnerId = null;
      let adminId = null;
      let organizationId = null;

      if (createdByType === 'partner') {
        partnerId = ownerId;
      } else if (createdByType === 'admin') {
        adminId = ownerId;
      } else if (createdByType === 'organization') {
        organizationId = ownerId;
      } else {
        throw new Error('Invalid created_by_type. Must be admin, organization, or partner');
      }

      const result = await db.query(
        'INSERT INTO questionnaires (created_by_type, partner_id, admin_id, organization_id, name, description, has_text_field, text_field_label, text_field_placeholder, color_coding_scheme) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id',
        [createdByType, partnerId, adminId, organizationId, name, description, hasTextField, textFieldLabel, textFieldPlaceholder, colorCodingScheme]
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

  // Find all questionnaires for a partner (own + preset)
  static async findByPartner(partnerId) {
    try {
      const result = await db.query(
        `SELECT q.*, 
         COUNT(DISTINCT qq.id) as question_count,
         COUNT(DISTINCT uqa.id) as assignment_count,
         COUNT(DISTINCT CASE WHEN uqa.status = 'completed' THEN uqa.id END) as completed_count,
         false as is_preset
         FROM questionnaires q
         LEFT JOIN questionnaire_questions qq ON q.id = qq.questionnaire_id
         LEFT JOIN user_questionnaire_assignments uqa ON q.id = uqa.questionnaire_id
         WHERE q.partner_id = $1 AND q.created_by_type = 'partner'
         GROUP BY q.id
         ORDER BY q.created_at DESC`,
        [partnerId]
      );
      return result.rows;
    } catch (error) {
      throw new Error(`Error finding questionnaires by partner: ${error.message}`);
    }
  }

  // Find all questionnaires for an admin
  static async findByAdmin(adminId) {
    try {
      const result = await db.query(
        `SELECT q.*, 
         COUNT(DISTINCT qq.id) as question_count,
         COUNT(DISTINCT uqa.id) as assignment_count,
         COUNT(DISTINCT CASE WHEN uqa.status = 'completed' THEN uqa.id END) as completed_count
         FROM questionnaires q
         LEFT JOIN questionnaire_questions qq ON q.id = qq.questionnaire_id
         LEFT JOIN user_questionnaire_assignments uqa ON q.id = uqa.questionnaire_id
         WHERE q.admin_id = $1 AND q.created_by_type = 'admin'
         GROUP BY q.id
         ORDER BY q.created_at DESC`,
        [adminId]
      );
      return result.rows;
    } catch (error) {
      throw new Error(`Error finding questionnaires by admin: ${error.message}`);
    }
  }

  // Find all questionnaires for an organization
  static async findByOrganization(organizationId) {
    try {
      const result = await db.query(
        `SELECT q.*, 
         COUNT(DISTINCT qq.id) as question_count,
         COUNT(DISTINCT uqa.id) as assignment_count,
         COUNT(DISTINCT CASE WHEN uqa.status = 'completed' THEN uqa.id END) as completed_count,
         false as is_preset
         FROM questionnaires q
         LEFT JOIN questionnaire_questions qq ON q.id = qq.questionnaire_id
         LEFT JOIN user_questionnaire_assignments uqa ON q.id = uqa.questionnaire_id
         WHERE q.organization_id = $1 AND q.created_by_type = 'organization'
         GROUP BY q.id
         ORDER BY q.created_at DESC`,
        [organizationId]
      );
      return result.rows;
    } catch (error) {
      throw new Error(`Error finding questionnaires by organization: ${error.message}`);
    }
  }

  // Find preset questionnaires for an organization (shared by admin)
  static async findPresetForOrganization(organizationId) {
    try {
      const result = await db.query(
        `SELECT q.*, 
         COUNT(DISTINCT qq.id) as question_count,
         COUNT(DISTINCT uqa.id) as assignment_count,
         COUNT(DISTINCT CASE WHEN uqa.status = 'completed' THEN uqa.id END) as completed_count,
         true as is_preset,
         qs.shared_by_id as shared_by_admin_id
         FROM questionnaire_shares qs
         JOIN questionnaires q ON qs.questionnaire_id = q.id
         LEFT JOIN questionnaire_questions qq ON q.id = qq.questionnaire_id
         LEFT JOIN user_questionnaire_assignments uqa ON q.id = uqa.questionnaire_id
         WHERE qs.shared_with_type = 'organization' 
         AND qs.shared_with_id = $1
         AND qs.shared_by_type = 'admin'
         GROUP BY q.id, qs.shared_by_id
         ORDER BY q.created_at DESC`,
        [organizationId]
      );
      return result.rows;
    } catch (error) {
      throw new Error(`Error finding preset questionnaires for organization: ${error.message}`);
    }
  }

  // Find preset questionnaires for a partner (shared by organization)
  static async findPresetForPartner(partnerId) {
    try {
      const result = await db.query(
        `SELECT q.*, 
         COUNT(DISTINCT qq.id) as question_count,
         COUNT(DISTINCT uqa.id) as assignment_count,
         COUNT(DISTINCT CASE WHEN uqa.status = 'completed' THEN uqa.id END) as completed_count,
         true as is_preset,
         qs.shared_by_id as shared_by_organization_id
         FROM questionnaire_shares qs
         JOIN questionnaires q ON qs.questionnaire_id = q.id
         LEFT JOIN questionnaire_questions qq ON q.id = qq.questionnaire_id
         LEFT JOIN user_questionnaire_assignments uqa ON q.id = uqa.questionnaire_id
         WHERE qs.shared_with_type = 'partner' 
         AND qs.shared_with_id = $1
         AND qs.shared_by_type = 'organization'
         GROUP BY q.id, qs.shared_by_id
         ORDER BY q.created_at DESC`,
        [partnerId]
      );
      return result.rows;
    } catch (error) {
      throw new Error(`Error finding preset questionnaires for partner: ${error.message}`);
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

  // Verify questionnaire ownership
  static async verifyOwnership(questionnaireId, ownerType, ownerId) {
    try {
      let query = '';
      if (ownerType === 'partner') {
        query = 'SELECT id FROM questionnaires WHERE id = $1 AND partner_id = $2 AND created_by_type = $3';
      } else if (ownerType === 'admin') {
        query = 'SELECT id FROM questionnaires WHERE id = $1 AND admin_id = $2 AND created_by_type = $3';
      } else if (ownerType === 'organization') {
        query = 'SELECT id FROM questionnaires WHERE id = $1 AND organization_id = $2 AND created_by_type = $3';
      } else {
        return false;
      }
      const result = await db.query(query, [questionnaireId, ownerId, ownerType]);
      return result.rows.length > 0;
    } catch (error) {
      throw new Error(`Error verifying ownership: ${error.message}`);
    }
  }

  // Share questionnaire with organizations (by admin)
  static async shareWithOrganizations(questionnaireId, organizationIds, adminId) {
    try {
      const shares = [];
      for (const orgId of organizationIds) {
        try {
          const result = await db.query(
            `INSERT INTO questionnaire_shares (questionnaire_id, shared_by_type, shared_by_id, shared_with_type, shared_with_id)
             VALUES ($1, 'admin', $2, 'organization', $3)
             ON CONFLICT (questionnaire_id, shared_with_type, shared_with_id) DO NOTHING
             RETURNING id`,
            [questionnaireId, adminId, orgId]
          );
          if (result.rows.length > 0) {
            shares.push(result.rows[0].id);
          }
        } catch (error) {
          // Skip duplicates, continue with others
          console.error(`Error sharing with organization ${orgId}:`, error.message);
        }
      }
      return shares;
    } catch (error) {
      throw new Error(`Error sharing questionnaire with organizations: ${error.message}`);
    }
  }

  // Share questionnaire with partners (by organization)
  static async shareWithPartners(questionnaireId, partnerIds, organizationId) {
    try {
      const shares = [];
      for (const partnerId of partnerIds) {
        try {
          const result = await db.query(
            `INSERT INTO questionnaire_shares (questionnaire_id, shared_by_type, shared_by_id, shared_with_type, shared_with_id)
             VALUES ($1, 'organization', $2, 'partner', $3)
             ON CONFLICT (questionnaire_id, shared_with_type, shared_with_id) DO NOTHING
             RETURNING id`,
            [questionnaireId, organizationId, partnerId]
          );
          if (result.rows.length > 0) {
            shares.push(result.rows[0].id);
          }
        } catch (error) {
          // Skip duplicates, continue with others
          console.error(`Error sharing with partner ${partnerId}:`, error.message);
        }
      }
      return shares;
    } catch (error) {
      throw new Error(`Error sharing questionnaire with partners: ${error.message}`);
    }
  }

  // Unshare questionnaire from organizations
  static async unshareFromOrganizations(questionnaireId, organizationIds, adminId) {
    try {
      const result = await db.query(
        `DELETE FROM questionnaire_shares 
         WHERE questionnaire_id = $1 
         AND shared_by_type = 'admin' 
         AND shared_by_id = $2
         AND shared_with_type = 'organization'
         AND shared_with_id = ANY($3::int[])`,
        [questionnaireId, adminId, organizationIds]
      );
      return result.rowCount;
    } catch (error) {
      throw new Error(`Error unsharing questionnaire from organizations: ${error.message}`);
    }
  }

  // Unshare questionnaire from partners
  static async unshareFromPartners(questionnaireId, partnerIds, organizationId) {
    try {
      const result = await db.query(
        `DELETE FROM questionnaire_shares 
         WHERE questionnaire_id = $1 
         AND shared_by_type = 'organization' 
         AND shared_by_id = $2
         AND shared_with_type = 'partner'
         AND shared_with_id = ANY($3::int[])`,
        [questionnaireId, organizationId, partnerIds]
      );
      return result.rowCount;
    } catch (error) {
      throw new Error(`Error unsharing questionnaire from partners: ${error.message}`);
    }
  }

  // Copy a questionnaire (creates a new questionnaire owned by the copier)
  static async copyQuestionnaire(questionnaireId, newOwnerType, newOwnerId) {
    try {
      // Get the original questionnaire
      const original = await this.getQuestionnaireWithQuestions(questionnaireId);
      if (!original) {
        throw new Error('Questionnaire not found');
      }

      // Create new questionnaire
      const newQuestionnaireId = await this.create(
        newOwnerType,
        newOwnerId,
        `${original.name} (Copy)`,
        original.description,
        original.has_text_field || false,
        original.text_field_label,
        original.text_field_placeholder,
        original.color_coding_scheme
      );

      // Copy questions and answer options
      if (original.questions && original.questions.length > 0) {
        for (const question of original.questions) {
          const newQuestionId = await this.addQuestion(
            newQuestionnaireId,
            question.question_text,
            question.question_order,
            question.sub_heading
          );

          // Copy answer options
          if (question.options && question.options.length > 0) {
            for (const option of question.options) {
              await this.addAnswerOption(
                newQuestionId,
                option.option_text,
                option.option_value,
                option.option_order
              );
            }
          }
        }
      }

      return newQuestionnaireId;
    } catch (error) {
      throw new Error(`Error copying questionnaire: ${error.message}`);
    }
  }

  // Get organizations that a questionnaire is shared with (for admin)
  static async getSharedOrganizations(questionnaireId) {
    try {
      const result = await db.query(
        `SELECT qs.shared_with_id as organization_id, o.name as organization_name, qs.created_at as shared_at
         FROM questionnaire_shares qs
         JOIN organizations o ON qs.shared_with_id = o.id
         WHERE qs.questionnaire_id = $1 
         AND qs.shared_with_type = 'organization'
         AND qs.shared_by_type = 'admin'
         ORDER BY qs.created_at DESC`,
        [questionnaireId]
      );
      return result.rows;
    } catch (error) {
      throw new Error(`Error getting shared organizations: ${error.message}`);
    }
  }

  // Get partners that a questionnaire is shared with (for organization)
  static async getSharedPartners(questionnaireId) {
    try {
      const result = await db.query(
        `SELECT qs.shared_with_id as partner_id, p.name as partner_name, qs.created_at as shared_at
         FROM questionnaire_shares qs
         JOIN partners p ON qs.shared_with_id = p.id
         WHERE qs.questionnaire_id = $1 
         AND qs.shared_with_type = 'partner'
         AND qs.shared_by_type = 'organization'
         ORDER BY qs.created_at DESC`,
        [questionnaireId]
      );
      return result.rows;
    } catch (error) {
      throw new Error(`Error getting shared partners: ${error.message}`);
    }
  }
}

module.exports = Questionnaire;
