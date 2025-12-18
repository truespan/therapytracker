const db = require('../config/database');
const dateUtils = require('../utils/dateUtils');

class AvailabilitySlot {
  /**
   * Create a new availability slot
   */
  static async create(slotData) {
    const { partner_id, slot_date, start_time, end_time, status, timezone } = slotData;

    // Combine date + time into timestamps using dateUtils (ISO 8601 UTC)
    // Use provided timezone (user's local timezone) or default to UTC
    const userTimezone = timezone || 'UTC';
    const start_datetime = dateUtils.combineDateAndTime(slot_date, start_time, userTimezone);
    const end_datetime = dateUtils.combineDateAndTime(slot_date, end_time, userTimezone);

    // Derive fields from status
    const location_type = status.includes('online') ? 'online' : 'offline';
    const is_available = status.startsWith('available');

    const query = `
      INSERT INTO availability_slots
      (partner_id, slot_date, start_time, end_time, start_datetime, end_datetime, status, location_type, is_available)
      VALUES ($1, $2, $3, $4, $5::timestamptz, $6::timestamptz, $7, $8, $9)
      RETURNING *
    `;
    const values = [
      partner_id,
      slot_date,
      start_time,
      end_time,
      dateUtils.formatForPostgres(start_datetime),
      dateUtils.formatForPostgres(end_datetime),
      status,
      location_type,
      is_available
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  /**
   * Find slot by ID
   */
  static async findById(id) {
    const query = `
      SELECT
        s.id, s.partner_id, s.status, s.location_type, s.is_available,
        s.is_published, s.last_published_at, s.booked_by_user_id, s.booked_at,
        s.appointment_id, s.has_google_conflict, s.google_conflict_details,
        s.created_at, s.updated_at, s.archived_at,
        TO_CHAR(s.slot_date, 'YYYY-MM-DD') as slot_date,
        TO_CHAR(s.start_time, 'HH24:MI') as start_time,
        TO_CHAR(s.end_time, 'HH24:MI') as end_time,
        s.start_datetime::timestamptz as start_datetime,
        s.end_datetime::timestamptz as end_datetime,
        u.name as booked_by_user_name,
        u.email as booked_by_user_email
      FROM availability_slots s
      LEFT JOIN users u ON s.booked_by_user_id = u.id
      WHERE s.id = $1 AND s.archived_at IS NULL
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Find all slots for a partner (includes unpublished)
   */
  static async findByPartner(partnerId, startDate = null, endDate = null) {
    let query = `
      SELECT
        s.id, s.partner_id, s.status, s.location_type, s.is_available,
        s.is_published, s.last_published_at, s.booked_by_user_id, s.booked_at,
        s.appointment_id, s.has_google_conflict, s.google_conflict_details,
        s.created_at, s.updated_at, s.archived_at,
        TO_CHAR(s.slot_date, 'YYYY-MM-DD') as slot_date,
        TO_CHAR(s.start_time, 'HH24:MI') as start_time,
        TO_CHAR(s.end_time, 'HH24:MI') as end_time,
        s.start_datetime::timestamptz as start_datetime,
        s.end_datetime::timestamptz as end_datetime,
        u.name as booked_by_user_name,
        u.email as booked_by_user_email
      FROM availability_slots s
      LEFT JOIN users u ON s.booked_by_user_id = u.id
      WHERE s.partner_id = $1
      AND s.archived_at IS NULL
    `;
    const values = [partnerId];

    if (startDate && endDate) {
      query += ` AND s.slot_date >= $2 AND s.slot_date <= $3`;
      values.push(startDate, endDate);
    }

    query += ` ORDER BY s.slot_date ASC, s.start_time ASC`;
    const result = await db.query(query, values);
    return result.rows;
  }

  /**
   * Find published slots for client view
   */
  static async findPublishedByPartner(partnerId, startDate = null, endDate = null) {
    let query = `
      SELECT
        s.id, s.partner_id, s.status, s.location_type, s.is_available,
        s.is_published, s.last_published_at, s.booked_by_user_id, s.booked_at,
        s.appointment_id, s.has_google_conflict, s.google_conflict_details,
        s.created_at, s.updated_at, s.archived_at,
        TO_CHAR(s.slot_date, 'YYYY-MM-DD') as slot_date,
        TO_CHAR(s.start_time, 'HH24:MI') as start_time,
        TO_CHAR(s.end_time, 'HH24:MI') as end_time,
        s.start_datetime::timestamptz as start_datetime,
        s.end_datetime::timestamptz as end_datetime,
        u.name as booked_by_user_name
      FROM availability_slots s
      LEFT JOIN users u ON s.booked_by_user_id = u.id
      WHERE s.partner_id = $1
      AND s.is_published = TRUE
      AND s.archived_at IS NULL
    `;
    const values = [partnerId];

    if (startDate && endDate) {
      query += ` AND s.slot_date >= $2 AND s.slot_date <= $3`;
      values.push(startDate, endDate);
    }

    query += ` ORDER BY s.slot_date ASC, s.start_time ASC`;
    const result = await db.query(query, values);
    return result.rows;
  }

  /**
   * Update a slot
   */
  static async update(id, slotData) {
    const { slot_date, start_time, end_time, status, timezone } = slotData;

    // If date/time changed, recalculate datetimes using dateUtils
    let start_datetime, end_datetime, location_type, is_available;
    if (slot_date && start_time && end_time) {
      const userTimezone = timezone || 'UTC';
      const startDateObj = dateUtils.combineDateAndTime(slot_date, start_time, userTimezone);
      const endDateObj = dateUtils.combineDateAndTime(slot_date, end_time, userTimezone);
      start_datetime = dateUtils.formatForPostgres(startDateObj);
      end_datetime = dateUtils.formatForPostgres(endDateObj);
    }

    // Derive fields from status if status is being updated
    if (status) {
      location_type = status.includes('online') ? 'online' : 'offline';
      is_available = status.startsWith('available');
    }

    const query = `
      UPDATE availability_slots
      SET slot_date = COALESCE($1, slot_date),
          start_time = COALESCE($2, start_time),
          end_time = COALESCE($3, end_time),
          start_datetime = COALESCE($4::timestamptz, start_datetime),
          end_datetime = COALESCE($5::timestamptz, end_datetime),
          status = COALESCE($6, status),
          location_type = COALESCE($7, location_type),
          is_available = COALESCE($8, is_available),
          is_published = FALSE,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $9 AND archived_at IS NULL
      RETURNING *
    `;
    const values = [
      slot_date,
      start_time,
      end_time,
      start_datetime,
      end_datetime,
      status,
      location_type,
      is_available,
      id
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  /**
   * Archive (soft delete) a slot
   */
  static async archive(id) {
    const query = `
      UPDATE availability_slots
      SET archived_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND archived_at IS NULL
      RETURNING *
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Hard delete a slot (for cleanup)
   */
  static async delete(id) {
    const query = 'DELETE FROM availability_slots WHERE id = $1 RETURNING *';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Book a slot - mark as booked with user and appointment info
   */
  static async bookSlot(id, userId, appointmentId = null) {
    const query = `
      UPDATE availability_slots
      SET status = 'booked',
          is_available = FALSE,
          booked_by_user_id = $1,
          booked_at = CURRENT_TIMESTAMP,
          appointment_id = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3 AND archived_at IS NULL
      RETURNING *
    `;
    const values = [userId, appointmentId, id];
    const result = await db.query(query, values);
    return result.rows[0];
  }

  /**
   * Check for conflicts with Google Calendar (appointments and video sessions)
   */
  static async checkGoogleCalendarConflict(partnerId, startDatetime, endDatetime) {
    // Check appointments table
    const appointmentQuery = `
      SELECT
        a.*,
        u.name as user_name,
        u.email as user_email,
        'appointment' as conflict_type
      FROM appointments a
      JOIN users u ON a.user_id = u.id
      WHERE a.partner_id = $1
      AND a.status != 'cancelled'
      AND (
        (a.appointment_date <= $2 AND a.end_date > $2)
        OR (a.appointment_date < $3 AND a.end_date >= $3)
        OR (a.appointment_date >= $2 AND a.end_date <= $3)
      )
    `;
    const appointmentResult = await db.query(appointmentQuery, [partnerId, startDatetime, endDatetime]);

    // Check video sessions table
    const videoQuery = `
      SELECT
        v.*,
        u.name as user_name,
        u.email as user_email,
        'video_session' as conflict_type
      FROM video_sessions v
      JOIN users u ON v.user_id = u.id
      WHERE v.partner_id = $1
      AND v.status != 'cancelled'
      AND (
        (v.session_date <= $2 AND v.end_date > $2)
        OR (v.session_date < $3 AND v.end_date >= $3)
        OR (v.session_date >= $2 AND v.end_date <= $3)
      )
    `;
    const videoResult = await db.query(videoQuery, [partnerId, startDatetime, endDatetime]);

    const conflicts = [...appointmentResult.rows, ...videoResult.rows];
    return conflicts;
  }

  /**
   * Publish all unpublished slots for a partner
   */
  static async publishSlotsForPartner(partnerId) {
    const query = `
      UPDATE availability_slots
      SET is_published = TRUE,
          last_published_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE partner_id = $1
      AND is_published = FALSE
      AND archived_at IS NULL
      RETURNING *
    `;
    const result = await db.query(query, [partnerId]);
    return result.rows;
  }

  /**
   * Archive old slots (older than 7 days from current date)
   */
  static async archiveOldSlots() {
    const query = `
      UPDATE availability_slots
      SET archived_at = CURRENT_TIMESTAMP
      WHERE slot_date < CURRENT_DATE - INTERVAL '7 days'
      AND archived_at IS NULL
      RETURNING id
    `;
    const result = await db.query(query);
    return result.rows.length;
  }

  /**
   * Update conflict tracking for a slot
   */
  static async updateConflictStatus(id, hasConflict, conflictDetails = null) {
    const query = `
      UPDATE availability_slots
      SET has_google_conflict = $1,
          google_conflict_details = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;
    const result = await db.query(query, [hasConflict, conflictDetails, id]);
    return result.rows[0];
  }
}

module.exports = AvailabilitySlot;
