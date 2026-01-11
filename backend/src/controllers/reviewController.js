const db = require('../config/database');

// Create or update a review (client submits feedback)
const createReview = async (req, res) => {
  try {
    const { therapist_id, rating, feedback_text } = req.body;
    const client_id = req.user.id; // From auth token

    // Validate input
    if (!therapist_id || !rating) {
      return res.status(400).json({ error: 'Therapist ID and rating are required' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // Check if client is assigned to this therapist
    const assignmentCheck = await db.query(
      `SELECT user_id FROM user_partner_assignments 
       WHERE user_id = $1 AND partner_id = $2`,
      [client_id, therapist_id]
    );

    if (assignmentCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You can only review therapists assigned to you' });
    }

    // Check if review already exists (upsert)
    const existingReview = await db.query(
      `SELECT id FROM therapist_reviews 
       WHERE client_id = $1 AND therapist_id = $2`,
      [client_id, therapist_id]
    );

    let result;
    if (existingReview.rows.length > 0) {
      // Update existing review
      result = await db.query(
        `UPDATE therapist_reviews 
         SET rating = $1, feedback_text = $2, updated_at = CURRENT_TIMESTAMP
         WHERE client_id = $3 AND therapist_id = $4
         RETURNING *`,
        [rating, feedback_text || null, client_id, therapist_id]
      );
    } else {
      // Create new review
      result = await db.query(
        `INSERT INTO therapist_reviews (client_id, therapist_id, rating, feedback_text)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [client_id, therapist_id, rating, feedback_text || null]
      );
    }

    res.status(200).json({
      message: existingReview.rows.length > 0 ? 'Review updated successfully' : 'Review submitted successfully',
      review: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating/updating review:', error);
    res.status(500).json({ error: 'Failed to submit review' });
  }
};

// Get all reviews for a therapist (therapist can see all their reviews)
const getTherapistReviews = async (req, res) => {
  try {
    const therapist_id = req.user.id; // Therapist's ID from auth token

    const result = await db.query(
      `SELECT 
        tr.id,
        tr.client_id,
        tr.therapist_id,
        tr.rating,
        tr.feedback_text,
        tr.is_published,
        tr.created_at,
        tr.updated_at,
        u.name as client_name,
        u.email as client_email
       FROM therapist_reviews tr
       JOIN users u ON tr.client_id = u.id
       WHERE tr.therapist_id = $1
       ORDER BY tr.created_at DESC`,
      [therapist_id]
    );

    res.status(200).json({
      reviews: result.rows
    });
  } catch (error) {
    console.error('Error fetching therapist reviews:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
};

// Toggle publish status of a review
const togglePublishStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const therapist_id = req.user.id; // Therapist's ID from auth token

    // Verify the review belongs to this therapist
    const reviewCheck = await db.query(
      `SELECT id, is_published FROM therapist_reviews 
       WHERE id = $1 AND therapist_id = $2`,
      [id, therapist_id]
    );

    if (reviewCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found or you do not have permission to modify it' });
    }

    const newStatus = !reviewCheck.rows[0].is_published;

    const result = await db.query(
      `UPDATE therapist_reviews 
       SET is_published = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND therapist_id = $3
       RETURNING *`,
      [newStatus, id, therapist_id]
    );

    res.status(200).json({
      message: newStatus ? 'Review published successfully' : 'Review unpublished successfully',
      review: result.rows[0]
    });
  } catch (error) {
    console.error('Error toggling publish status:', error);
    res.status(500).json({ error: 'Failed to update review status' });
  }
};

// Get published reviews for a therapist (public endpoint for clients to see)
const getPublishedReviews = async (req, res) => {
  try {
    const { therapistId } = req.params;

    const result = await db.query(
      `SELECT 
        tr.id,
        tr.rating,
        tr.feedback_text,
        tr.created_at,
        u.name as client_name
       FROM therapist_reviews tr
       JOIN users u ON tr.client_id = u.id
       WHERE tr.therapist_id = $1 AND tr.is_published = true
       ORDER BY tr.created_at DESC`,
      [therapistId]
    );

    res.status(200).json({
      reviews: result.rows
    });
  } catch (error) {
    console.error('Error fetching published reviews:', error);
    res.status(500).json({ error: 'Failed to fetch published reviews' });
  }
};

// Get client's review for a specific therapist (to check if they already reviewed)
const getClientReview = async (req, res) => {
  try {
    const { therapistId } = req.params;
    const client_id = req.user.id; // Client's ID from auth token

    const result = await db.query(
      `SELECT * FROM therapist_reviews 
       WHERE client_id = $1 AND therapist_id = $2`,
      [client_id, therapistId]
    );

    if (result.rows.length === 0) {
      return res.status(200).json({ review: null });
    }

    res.status(200).json({
      review: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching client review:', error);
    res.status(500).json({ error: 'Failed to fetch review' });
  }
};

module.exports = {
  createReview,
  getTherapistReviews,
  togglePublishStatus,
  getPublishedReviews,
  getClientReview
};
