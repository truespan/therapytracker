import React, { useState, useEffect } from 'react';
import { Calendar, RefreshCw, AlertCircle } from 'lucide-react';
import AvailabilityCalendar from './AvailabilityCalendar';
import BookingConfirmationModal from './BookingConfirmationModal';
import { availabilityAPI, appointmentAPI } from '../../services/api';

const ClientAvailabilityTab = ({ userId, partners }) => {
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);

  useEffect(() => {
    // Auto-select partner if only one exists
    if (partners && partners.length === 1) {
      setSelectedPartner(partners[0]);
    }
  }, [partners]);

  useEffect(() => {
    if (selectedPartner) {
      loadAvailableSlots(selectedPartner.id);
    }
  }, [selectedPartner]);

  /**
   * Load available slots for selected partner
   */
  const loadAvailableSlots = async (partnerId) => {
    try {
      setLoading(true);
      const response = await availabilityAPI.getClientSlots(partnerId);
      setAvailableSlots(response.data.slots || []);
    } catch (error) {
      console.error('Failed to load available slots:', error);
      alert('Failed to load available time slots. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle slot selection for booking
   */
  const handleBookSlot = (slot) => {
    setSelectedSlot(slot);
    setShowBookingModal(true);
  };

  /**
   * Confirm booking
   */
  const confirmBooking = async () => {
    try {
      setBookingLoading(true);
      const response = await availabilityAPI.bookSlot(selectedSlot.id);

      setShowBookingModal(false);

      // Check if there was a Google Calendar conflict
      if (response.data.google_conflict) {
        alert(
          'Booking successful!\n\n' +
          'Note: There was a conflict with Google Calendar, so the appointment was not added to the calendar. ' +
          'However, your booking has been confirmed in the system.'
        );
      } else {
        alert('Appointment booked successfully! The appointment has been added to your calendar.');
      }

      // Reload slots to show updated availability
      loadAvailableSlots(selectedPartner.id);
    } catch (error) {
      console.error('Failed to book slot:', error);
      const errorMessage = error.response?.data?.error || 'Failed to book appointment';
      alert(errorMessage);
    } finally {
      setBookingLoading(false);
    }
  };

  /**
   * Cancel booking modal
   */
  const cancelBooking = () => {
    setShowBookingModal(false);
    setSelectedSlot(null);
    setBookingLoading(false);
  };

  // Handle case where no partners are available
  if (!partners || partners.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Therapist Assigned</h3>
        <p className="text-gray-500">
          You don't have a therapist assigned yet. Please contact support for assistance.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Book an Appointment</h2>
        <p className="text-gray-600">
          View your therapist's available time slots and book an appointment.
        </p>
      </div>

      {/* Partner Selector (if multiple partners) */}
      {partners.length > 1 && (
        <div className="bg-white rounded-lg shadow-md p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Therapist
          </label>
          <select
            value={selectedPartner?.id || ''}
            onChange={(e) => {
              const partner = partners.find(p => p.id === parseInt(e.target.value));
              setSelectedPartner(partner);
            }}
            className="w-full md:w-1/2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Choose a therapist</option>
            {partners.map(partner => (
              <option key={partner.id} value={partner.id}>
                {partner.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Selected Partner Info */}
      {selectedPartner && (
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-primary-700">Booking with</p>
            <p className="font-semibold text-primary-900">{selectedPartner.name}</p>
          </div>
          <button
            onClick={() => loadAvailableSlots(selectedPartner.id)}
            disabled={loading}
            className="p-2 text-primary-700 hover:bg-primary-100 rounded-md transition-colors disabled:opacity-50"
            title="Refresh slots"
          >
            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      )}

      {/* Calendar View */}
      {!selectedPartner ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Please select a therapist to view available time slots.</p>
        </div>
      ) : loading ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <RefreshCw className="h-8 w-8 text-gray-400 mx-auto mb-3 animate-spin" />
          <p className="text-gray-500">Loading available slots...</p>
        </div>
      ) : (
        <AvailabilityCalendar
          slots={availableSlots}
          onBook={handleBookSlot}
          viewMode="client"
        />
      )}

      {/* Booking Confirmation Modal */}
      {showBookingModal && selectedSlot && (
        <BookingConfirmationModal
          slot={selectedSlot}
          partnerName={selectedPartner.name}
          onConfirm={confirmBooking}
          onCancel={cancelBooking}
          loading={bookingLoading}
        />
      )}
    </div>
  );
};

export default ClientAvailabilityTab;
