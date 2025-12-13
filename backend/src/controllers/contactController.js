const db = require('../config/database');
const { sendContactEmail } = require('../utils/emailService');

const submitContact = async (req, res) => {
  try {
    const { name, email, message } = req.body;

    // Validation
    if (!name || !email) {
      return res.status(400).json({
        error: 'Name and email are required fields'
      });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Please provide a valid email address'
      });
    }

    // Store in database
    const result = await db.query(
      'INSERT INTO contact_submissions (name, email, message) VALUES ($1, $2, $3) RETURNING *',
      [name.trim(), email.trim(), message ? message.trim() : null]
    );

    const submission = result.rows[0];

    // Send email notification
    try {
      await sendContactEmail(name, email, message);
    } catch (emailError) {
      // Log email error but don't fail the request since data is stored
      console.error('Failed to send contact email:', emailError);
      // Continue - the submission is already saved
    }

    res.status(201).json({
      success: true,
      message: 'Thank you for contacting us! We will get back to you soon.',
      submission: {
        id: submission.id,
        name: submission.name,
        email: submission.email
      }
    });
  } catch (error) {
    console.error('Error submitting contact form:', error);
    res.status(500).json({
      error: 'Failed to submit contact form. Please try again later.'
    });
  }
};

module.exports = {
  submitContact
};

