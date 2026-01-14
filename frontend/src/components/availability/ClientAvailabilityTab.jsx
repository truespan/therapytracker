import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, RefreshCw, AlertCircle } from 'lucide-react';
import AvailabilityCalendar from './AvailabilityCalendar';
import BookingConfirmationModal from './BookingConfirmationModal';
import { availabilityAPI, appointmentAPI, partnerAPI, razorpayAPI } from '../../services/api';
import { initializeRazorpayCheckout } from '../../utils/razorpayHelper';

const ClientAvailabilityTab = ({ userId, partners, defaultPartnerId = null }) => {
  const navigate = useNavigate();
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [feeSettings, setFeeSettings] = useState(null);

  useEffect(() => {
    // Use defaultPartnerId if provided, otherwise auto-select partner if only one exists
    if (defaultPartnerId && partners) {
      const partner = partners.find(p => p.id === defaultPartnerId);
      if (partner) {
        setSelectedPartner(partner);
      } else if (partners.length === 1) {
        setSelectedPartner(partners[0]);
      }
    } else if (partners && partners.length === 1) {
      setSelectedPartner(partners[0]);
    }
  }, [partners, defaultPartnerId]);

  useEffect(() => {
    if (selectedPartner) {
      loadAvailableSlots(selectedPartner.id);
      loadFeeSettings(selectedPartner.id);
    }
  }, [selectedPartner]);

  /**
   * Load fee settings for selected partner
   */
  const loadFeeSettings = async (partnerId) => {
    try {
      const response = await partnerAPI.getFeeSettings(partnerId);
      setFeeSettings(response.data.feeSettings);
    } catch (error) {
      console.error('Failed to load fee settings:', error);
      // Continue without fee settings
      setFeeSettings(null);
    }
  };

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
   * Confirm booking - with payment flow if booking fee exists
   */
  const confirmBooking = async () => {
    try {
      setBookingLoading(true);

      const bookingFee = feeSettings?.booking_fee || 0;

      // If booking fee exists, initiate payment flow
      if (bookingFee > 0) {
        await handleBookingWithPayment();
      } else {
        // Direct booking without payment
        await handleDirectBooking();
      }
    } catch (error) {
      console.error('Failed to book slot:', error);
      const errorMessage = error.response?.data?.error || 'Failed to book appointment';
      alert(errorMessage);
      setBookingLoading(false);
    }
  };

  /**
   * Handle booking with payment
   */
  const handleBookingWithPayment = async () => {
    try {
      // Create Razorpay order for booking fee
      const orderResponse = await razorpayAPI.createBookingOrder({
        slot_id: selectedSlot.id,
        partner_id: selectedPartner.id
      });

      // Check if test mode - skip payment flow
      if (orderResponse.data.skip_payment || orderResponse.data.test_mode) {
        // Test mode: Skip payment and directly verify
        const verifyResponse = await razorpayAPI.verifyBookingPayment({
          razorpay_order_id: null,
          razorpay_payment_id: null,
          razorpay_signature: null,
          slot_id: selectedSlot.id
        });

        if (verifyResponse.data.booking_confirmed) {
          // Payment skipped, now book the slot
          const bookingResponse = await availabilityAPI.bookSlot(selectedSlot.id);

          setShowBookingModal(false);
          setBookingLoading(false);

          // Check if there was a Google Calendar conflict
          if (bookingResponse.data.google_conflict) {
            alert(
              'Booking confirmed! (Test Mode - Payment Skipped)\n\n' +
              'Note: There was a conflict with Google Calendar, so the appointment was not added to the calendar. ' +
              'However, your booking has been confirmed in the system.'
            );
          } else {
            alert('Booking confirmed! (Test Mode - Payment Skipped) The appointment has been added to your calendar.');
          }

          // Reload slots to show updated availability
          loadAvailableSlots(selectedPartner.id);
        } else {
          throw new Error('Booking verification failed');
        }
        return;
      }

      // Normal flow: Proceed with Razorpay payment
      const order = orderResponse.data.order;

      // Get user details for prefill
      const userDetails = {
        name: '', // Will be filled from user context if available
        email: '',
        contact: ''
      };

      // Initialize Razorpay checkout
      const paymentResult = await initializeRazorpayCheckout(order, {
        name: 'TheraP Track',
        description: 'Booking Fee Payment',
        prefill: userDetails
      });

      // Verify payment
      const verifyResponse = await razorpayAPI.verifyBookingPayment({
        razorpay_order_id: paymentResult.razorpay_order_id,
        razorpay_payment_id: paymentResult.razorpay_payment_id,
        razorpay_signature: paymentResult.razorpay_signature,
        slot_id: selectedSlot.id
      });

      if (verifyResponse.data.booking_confirmed) {
        // Payment successful, now book the slot
        const bookingResponse = await availabilityAPI.bookSlot(selectedSlot.id);

        setShowBookingModal(false);
        setBookingLoading(false);

        // Navigate to payment success page with payment details
        navigate('/payment-success', {
          state: {
            payment: verifyResponse.data.payment,
            booking: {
              slot_id: selectedSlot.id,
              appointment_id: bookingResponse.data.appointment_id,
              google_conflict: bookingResponse.data.google_conflict
            }
          },
          replace: true
        });
      } else {
        throw new Error('Payment verification failed');
      }
    } catch (error) {
      setBookingLoading(false);
      if (error.message === 'Payment cancelled by user') {
        setShowBookingModal(false);
        alert('Payment cancelled. Your booking was not completed.');
      } else {
        throw error;
      }
    }
  };

  /**
   * Handle direct booking without payment
   */
  const handleDirectBooking = async () => {
    const response = await availabilityAPI.bookSlot(selectedSlot.id);

    setShowBookingModal(false);
    setBookingLoading(false);

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
  };

  /**
   * Cancel booking modal
   */
  const cancelBooking = () => {
    setShowBookingModal(false);
    setSelectedSlot(null);
    setBookingLoading(false);
  };

  /**
   * Handle payment for remaining balance
   */
  const handlePayRemaining = async (slot) => {
    try {
      setPaymentLoading(true);

      // Create Razorpay order for remaining payment
      const orderResponse = await razorpayAPI.createRemainingPaymentOrder({
        slot_id: slot.id
      });

      // Check if test mode - skip payment flow
      if (orderResponse.data.skip_payment || orderResponse.data.test_mode) {
        // Test mode: Skip payment and directly verify
        const verifyResponse = await razorpayAPI.verifyRemainingPayment({
          razorpay_order_id: null,
          razorpay_payment_id: null,
          razorpay_signature: null,
          slot_id: slot.id
        });

        if (verifyResponse.data.payment_confirmed) {
          setPaymentLoading(false);
          alert('Payment successful! Your booking is now confirmed.');
          // Reload slots to show updated status
          loadAvailableSlots(selectedPartner.id);
        } else {
          throw new Error('Payment verification failed');
        }
        return;
      }

      // Normal flow: Proceed with Razorpay payment
      const order = orderResponse.data.order;

      // Get user details for prefill
      const userDetails = {
        name: '',
        email: '',
        contact: ''
      };

      // Initialize Razorpay checkout
      const paymentResult = await initializeRazorpayCheckout(order, {
        name: 'TheraP Track',
        description: 'Remaining Payment for Booking',
        prefill: userDetails
      });

      // Verify payment
      const verifyResponse = await razorpayAPI.verifyRemainingPayment({
        razorpay_order_id: paymentResult.razorpay_order_id,
        razorpay_payment_id: paymentResult.razorpay_payment_id,
        razorpay_signature: paymentResult.razorpay_signature,
        slot_id: slot.id
      });

      if (verifyResponse.data.payment_confirmed) {
        setPaymentLoading(false);
        alert('Payment successful! Your booking is now confirmed.');
        // Reload slots to show updated status
        loadAvailableSlots(selectedPartner.id);
      } else {
        throw new Error('Payment verification failed');
      }
    } catch (error) {
      setPaymentLoading(false);
      if (error.message === 'Payment cancelled by user') {
        alert('Payment cancelled. Please try again when ready.');
      } else {
        console.error('Failed to process remaining payment:', error);
        const errorMessage = error.response?.data?.error || 'Failed to process payment';
        alert(errorMessage);
      }
    }
  };

  // Handle case where no partners are available
  if (!partners || partners.length === 0) {
    return (
      <div className="bg-white dark:bg-dark-bg-primary rounded-lg shadow-md p-8 text-center">
        <AlertCircle className="h-12 w-12 text-gray-300 dark:text-dark-text-tertiary mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-2">No Therapist Assigned</h3>
        <p className="text-gray-500 dark:text-dark-text-secondary">
          You don't have a therapist assigned yet. Please contact support for assistance.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary mb-2">Book an Appointment</h2>
        <p className="text-gray-600 dark:text-dark-text-secondary">
          View your therapist's available time slots and book an appointment.
        </p>
      </div>

      {/* Partner Selector (if multiple partners) - Hidden when user has exactly 2 therapists (already shown in dashboard) */}
      {partners.length > 2 && (
        <div className="bg-white dark:bg-dark-bg-primary rounded-lg shadow-md p-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-primary mb-2">
            Select Therapist
          </label>
          <select
            value={selectedPartner?.id || ''}
            onChange={(e) => {
              const partner = partners.find(p => p.id === parseInt(e.target.value));
              setSelectedPartner(partner);
            }}
            className="w-full md:w-1/2 px-3 py-2 border border-gray-300 dark:border-dark-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-dark-bg-secondary dark:text-dark-text-primary"
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
        <div className="bg-primary-50 dark:bg-dark-bg-secondary border border-primary-200 dark:border-dark-border rounded-lg p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-primary-700 dark:text-dark-text-secondary">Booking with</p>
            <p className="font-semibold text-primary-900 dark:text-dark-text-primary">{selectedPartner.name}</p>
          </div>
          <button
            onClick={() => loadAvailableSlots(selectedPartner.id)}
            disabled={loading}
            className="p-2 text-primary-700 dark:text-dark-primary-400 hover:bg-primary-100 dark:hover:bg-dark-bg-tertiary rounded-md transition-colors disabled:opacity-50"
            title="Refresh slots"
          >
            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      )}

      {/* Calendar View */}
      {!selectedPartner ? (
        <div className="bg-white dark:bg-dark-bg-primary rounded-lg shadow-md p-8 text-center">
          <Calendar className="h-12 w-12 text-gray-300 dark:text-dark-text-tertiary mx-auto mb-3" />
          <p className="text-gray-500 dark:text-dark-text-secondary">Please select a therapist to view available time slots.</p>
        </div>
      ) : loading ? (
        <div className="bg-white dark:bg-dark-bg-primary rounded-lg shadow-md p-8 text-center">
          <RefreshCw className="h-8 w-8 text-gray-400 dark:text-dark-text-tertiary mx-auto mb-3 animate-spin" />
          <p className="text-gray-500 dark:text-dark-text-secondary">Loading available slots...</p>
        </div>
      ) : (
        <AvailabilityCalendar
          slots={availableSlots}
          onBook={handleBookSlot}
          onPayRemaining={handlePayRemaining}
          viewMode="client"
        />
      )}

      {/* Booking Confirmation Modal */}
      {showBookingModal && selectedSlot && (
        <BookingConfirmationModal
          slot={selectedSlot}
          partnerName={selectedPartner.name}
          feeSettings={feeSettings}
          onConfirm={confirmBooking}
          onCancel={cancelBooking}
          loading={bookingLoading}
        />
      )}
    </div>
  );
};

export default ClientAvailabilityTab;
