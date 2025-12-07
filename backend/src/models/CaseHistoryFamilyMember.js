const db = require('../config/database');

class CaseHistoryFamilyMember {
  static async findByCaseHistoryId(caseHistoryId) {
    const query = `
      SELECT * FROM case_history_family_members 
      WHERE case_history_id = $1
      ORDER BY 
        CASE member_type 
          WHEN 'father' THEN 1
          WHEN 'mother' THEN 2
          WHEN 'sibling' THEN 3
          WHEN 'other' THEN 4
        END,
        sibling_number NULLS LAST,
        id
    `;
    const result = await db.query(query, [caseHistoryId]);
    return result.rows;
  }

  static async deleteByCaseHistoryId(caseHistoryId, client = null) {
    const dbClient = client || db;
    const query = 'DELETE FROM case_history_family_members WHERE case_history_id = $1';
    await dbClient.query(query, [caseHistoryId]);
  }

  static async create(familyMemberData, client = null) {
    const dbClient = client || db;
    const {
      case_history_id,
      member_type,
      name,
      age,
      education,
      occupation,
      religion,
      nationality,
      mother_tongue,
      health,
      personality,
      relationship_attitude,
      sibling_number,
      other_label
    } = familyMemberData;

    const query = `
      INSERT INTO case_history_family_members (
        case_history_id, member_type, name, age, education, occupation,
        religion, nationality, mother_tongue, health, personality,
        relationship_attitude, sibling_number, other_label
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;

    const values = [
      case_history_id, member_type, name, age, education, occupation,
      religion, nationality, mother_tongue, health, personality,
      relationship_attitude, sibling_number, other_label
    ];

    const result = await dbClient.query(query, values);
    return result.rows[0];
  }

  static async createMultiple(familyMembers, client = null) {
    const dbClient = client || db;
    const results = [];

    for (const member of familyMembers) {
      const created = await this.create(member, dbClient);
      results.push(created);
    }

    return results;
  }

  static async update(id, familyMemberData, client = null) {
    const dbClient = client || db;
    const {
      name,
      age,
      education,
      occupation,
      religion,
      nationality,
      mother_tongue,
      health,
      personality,
      relationship_attitude,
      sibling_number,
      other_label
    } = familyMemberData;

    const query = `
      UPDATE case_history_family_members SET
        name = COALESCE($1, name),
        age = COALESCE($2, age),
        education = COALESCE($3, education),
        occupation = COALESCE($4, occupation),
        religion = COALESCE($5, religion),
        nationality = COALESCE($6, nationality),
        mother_tongue = COALESCE($7, mother_tongue),
        health = COALESCE($8, health),
        personality = COALESCE($9, personality),
        relationship_attitude = COALESCE($10, relationship_attitude),
        sibling_number = COALESCE($11, sibling_number),
        other_label = COALESCE($12, other_label)
      WHERE id = $13
      RETURNING *
    `;

    const values = [
      name, age, education, occupation, religion, nationality,
      mother_tongue, health, personality, relationship_attitude,
      sibling_number, other_label, id
    ];

    const result = await dbClient.query(query, values);
    return result.rows[0];
  }

  static async delete(id, client = null) {
    const dbClient = client || db;
    const query = 'DELETE FROM case_history_family_members WHERE id = $1 RETURNING *';
    const result = await dbClient.query(query, [id]);
    return result.rows[0];
  }
}

module.exports = CaseHistoryFamilyMember;

