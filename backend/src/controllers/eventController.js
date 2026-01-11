const Event = require('../models/Event');
const EventEnrollment = require('../models/EventEnrollment');

// Get all events (for clients to see their therapist's events)
const getUserEvents = async (req, res) => {
  try {
    const userId = req.user.id;
    const partnerId = req.query.partnerId ? parseInt(req.query.partnerId) : null;
    const events = await Event.findByUserTherapist(userId, partnerId);
    res.json({ events });
  } catch (error) {
    console.error('Error fetching user events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
};

// Get events by partner (for therapist dashboard)
const getPartnerEvents = async (req, res) => {
  try {
    const partnerId = req.user.id;
    const events = await Event.findByPartner(partnerId);
    res.json({ events });
  } catch (error) {
    console.error('Error fetching partner events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
};

// Get single event by ID
const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json(event);
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
};

// Create new event (partner only)
const createEvent = async (req, res) => {
  try {
    const { title, description, event_date, location, fee_amount, image_url, address, max_participants } = req.body;

    // Validation
    if (!title || !event_date) {
      return res.status(400).json({ error: 'Title and event date are required' });
    }

    // Validate max_participants if provided
    if (max_participants !== undefined && max_participants !== null && max_participants !== '') {
      const maxParticipantsNum = parseInt(max_participants);
      if (isNaN(maxParticipantsNum) || maxParticipantsNum <= 0) {
        return res.status(400).json({ error: 'Maximum participants must be a positive integer' });
      }
    }

    const eventData = {
      title: title.trim(),
      description: description ? description.trim() : null,
      event_date,
      location: location ? location.trim() : null,
      fee_amount: fee_amount ? parseFloat(fee_amount) : 0.00,
      partner_id: req.user.id,
      image_url: image_url || null,
      address: address ? address.trim() : null,
      max_participants: max_participants && max_participants !== '' ? parseInt(max_participants) : null
    };

    const event = await Event.create(eventData);
    res.status(201).json(event);
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
};

// Update event (partner only)
const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, event_date, location, fee_amount, image_url, address, max_participants } = req.body;

    // Check if event exists and belongs to partner
    const existingEvent = await Event.findById(id);
    if (!existingEvent) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (existingEvent.partner_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to update this event' });
    }

    // Validate max_participants if provided
    if (max_participants !== undefined && max_participants !== null && max_participants !== '') {
      const maxParticipantsNum = parseInt(max_participants);
      if (isNaN(maxParticipantsNum) || maxParticipantsNum <= 0) {
        return res.status(400).json({ error: 'Maximum participants must be a positive integer' });
      }
    }

    const eventData = {
      title: title !== undefined ? title.trim() : existingEvent.title,
      description: description !== undefined ? (description ? description.trim() : null) : existingEvent.description,
      event_date: event_date || existingEvent.event_date,
      location: location !== undefined ? (location ? location.trim() : null) : existingEvent.location,
      fee_amount: fee_amount !== undefined ? parseFloat(fee_amount) : existingEvent.fee_amount,
      image_url: image_url !== undefined ? image_url : existingEvent.image_url,
      address: address !== undefined ? (address ? address.trim() : null) : existingEvent.address,
      max_participants: max_participants !== undefined ? (max_participants && max_participants !== '' ? parseInt(max_participants) : null) : existingEvent.max_participants
    };

    const event = await Event.update(id, eventData, req.user.id);
    res.json(event);
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
};

// Delete event (partner only)
const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if event exists and belongs to partner
    const existingEvent = await Event.findById(id);
    if (!existingEvent) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (existingEvent.partner_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this event' });
    }

    await Event.delete(id, req.user.id);
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
};

// Enroll user in event
const enrollInEvent = async (req, res) => {
  try {
    const { event_id } = req.params;
    const userId = req.user.id;

    // Check if event exists
    const event = await Event.findById(event_id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Check if user is already enrolled
    const existingEnrollment = await EventEnrollment.findByEventAndUser(event_id, userId);
    
    // Determine payment status
    const payment_status = event.fee_amount > 0 ? 'pending' : 'free';
    const enrollment_status = event.fee_amount > 0 ? 'pending' : 'confirmed';

    if (existingEnrollment) {
      // Update existing enrollment
      const enrollment = await EventEnrollment.updateStatus(
        existingEnrollment.id,
        enrollment_status,
        payment_status
      );
      return res.json({ enrollment, requiresPayment: event.fee_amount > 0 });
    }

    // Create new enrollment
    const enrollmentData = {
      event_id,
      user_id: userId,
      enrollment_status,
      payment_status
    };

    const enrollment = await EventEnrollment.create(enrollmentData);
    res.status(201).json({ enrollment, requiresPayment: event.fee_amount > 0 });
  } catch (error) {
    console.error('Error enrolling in event:', error);
    res.status(500).json({ error: 'Failed to enroll in event' });
  }
};

// Get enrollments for an event (partner only)
const getEventEnrollments = async (req, res) => {
  try {
    const { event_id } = req.params;

    // Check if event exists and belongs to partner
    const event = await Event.findById(event_id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event.partner_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to view enrollments for this event' });
    }

    const enrollments = await EventEnrollment.findByEvent(event_id);
    res.json({ enrollments });
  } catch (error) {
    console.error('Error fetching event enrollments:', error);
    res.status(500).json({ error: 'Failed to fetch enrollments' });
  }
};

// Confirm enrollment after payment (called by payment verification)
const confirmEnrollment = async (eventId, userId) => {
  try {
    const enrollment = await EventEnrollment.findByEventAndUser(eventId, userId);
    if (enrollment) {
      await EventEnrollment.updateStatus(enrollment.id, 'confirmed', 'paid');
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error confirming enrollment:', error);
    return false;
  }
};

// Check if partner has events (to determine if Events tab should be shown to clients)
const checkPartnerHasEvents = async (req, res) => {
  try {
    const { partner_id } = req.params;
    const count = await Event.countByPartner(partner_id);
    res.json({ hasEvents: count > 0 });
  } catch (error) {
    console.error('Error checking partner events:', error);
    res.status(500).json({ error: 'Failed to check events' });
  }
};

module.exports = {
  getUserEvents,
  getPartnerEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  enrollInEvent,
  getEventEnrollments,
  confirmEnrollment,
  checkPartnerHasEvents
};
