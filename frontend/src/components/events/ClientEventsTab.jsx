import React, { useState, useEffect } from 'react';
import { eventAPI, razorpayAPI } from '../../services/api';
import { initializeRazorpayCheckout } from '../../utils/razorpayHelper';
import { useAuth } from '../../context/AuthContext';
import { Calendar, MapPin, DollarSign, User as UserIcon, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

const ClientEventsTab = ({ userId, partnerId = null }) => {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [enrollingEventId, setEnrollingEventId] = useState(null);

  useEffect(() => {
    loadEvents();
  }, [partnerId]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const response = await eventAPI.getUserEvents(partnerId);
      setEvents(response.data.events || []);
      setError(null);
    } catch (err) {
      console.error('Failed to load events:', err);
      setError('Failed to load events. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), 'MMM d, yyyy h:mm a');
  };

  const stripHtmlTags = (htmlString) => {
    if (!htmlString) return '';
    // Create a temporary DOM element to extract text
    const tmp = document.createElement('DIV');
    tmp.innerHTML = htmlString;
    return tmp.textContent || tmp.innerText || '';
  };

  const handleEnroll = async (event) => {
    try {
      setEnrollingEventId(event.id);
      setError(null);

      // Check if event has a fee
      const hasFee = event.fee_amount > 0;

      // If no fee, auto-enroll directly
      if (!hasFee) {
        const enrollResponse = await eventAPI.enrollInEvent(event.id);
        if (enrollResponse.data.enrollment) {
          await loadEvents(); // Reload to update UI
          alert('Successfully enrolled in event!');
        }
        return;
      }

      // If fee > 0, trigger payment flow first
      const feeInPaise = Math.round(event.fee_amount * 100); // Convert to paise for Razorpay

      // Create booking order for event payment
      const orderResponse = await razorpayAPI.createBookingOrder({
        amount: feeInPaise,
        currency: 'INR',
        paymentType: 'event_enrollment',
        event_id: event.id,
        notes: {
          payment_type: 'event_enrollment',
          event_id: event.id,
          user_id: userId
        }
      });

      const order = orderResponse.data.order;

      // Initialize Razorpay checkout
      try {
        const paymentDetails = await initializeRazorpayCheckout(order, {
          name: 'Event Enrollment',
          description: `Payment for event: ${event.title}`,
          prefill: {
            name: user.name || '',
            email: user.email || '',
            contact: user.contact || ''
          }
        });

        // Verify payment - this will automatically confirm enrollment on success
        const verifyResponse = await razorpayAPI.verifyBookingPayment({
          razorpay_order_id: paymentDetails.razorpay_order_id,
          razorpay_payment_id: paymentDetails.razorpay_payment_id,
          razorpay_signature: paymentDetails.razorpay_signature
        });

        if (verifyResponse.data.success) {
          // Payment verified, enrollment is confirmed by backend
          await loadEvents(); // Reload to update UI
          alert('Payment successful! You have been enrolled in the event.');
        } else {
          throw new Error('Payment verification failed');
        }
      } catch (paymentError) {
        if (paymentError.message.includes('cancelled')) {
          setError('Payment was cancelled. Please try again when ready.');
        } else {
          throw paymentError;
        }
      }
    } catch (err) {
      console.error('Failed to enroll in event:', err);
      setError(err.response?.data?.error || err.message || 'Failed to enroll in event. Please try again.');
    } finally {
      setEnrollingEventId(null);
    }
  };

  const isEnrolled = (event) => {
    // This will be updated when we load enrollment status
    // For now, we can check by making another API call or store enrollment status with events
    return false; // Placeholder
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-dark-text-secondary">Loading events...</p>
        </div>
      </div>
    );
  }

  if (error && !loading) {
    return (
      <div className="card text-center py-12">
        <div className="text-red-600 dark:text-red-400 mb-4">
          <AlertCircle className="h-16 w-16 mx-auto mb-4" />
          <p className="text-lg">{error}</p>
        </div>
        <button
          onClick={loadEvents}
          className="btn btn-primary"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary mb-2">Events</h2>
        <p className="text-gray-600 dark:text-dark-text-secondary">
          Events shared by your therapist
        </p>
      </div>

      {events.length === 0 ? (
        <div className="card text-center py-12">
          <Calendar className="h-16 w-16 text-gray-400 dark:text-dark-text-tertiary mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-dark-text-primary mb-2">No Events Available</h3>
          <p className="text-gray-600 dark:text-dark-text-secondary">
            Your therapist hasn't shared any events yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <div key={event.id} className="card hover:shadow-lg transition-shadow">
              <div className="flex flex-col h-full">
                {/* Event Image */}
                {event.image_url && (
                  <div className="w-full h-48 bg-gray-200 dark:bg-dark-bg-secondary rounded-t-lg mb-4 overflow-hidden">
                    <img 
                      src={event.image_url} 
                      alt={event.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Event Info */}
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-2">
                    {event.title}
                  </h3>

                  {event.description && (
                    <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-4 line-clamp-3">
                      {stripHtmlTags(event.description)}
                    </p>
                  )}

                  <div className="space-y-2 text-sm text-gray-600 dark:text-dark-text-secondary mb-4">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(event.event_date)}</span>
                    </div>
                    {event.location && (
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4" />
                        <span>{event.location}</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-4 w-4" />
                      <span className="font-medium">
                        {event.fee_amount > 0 
                          ? `₹${parseFloat(event.fee_amount).toFixed(2)}`
                          : 'Free'
                        }
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <UserIcon className="h-4 w-4" />
                      <span>by {event.partner_name}</span>
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                <div className="mt-4">
                  <button
                    onClick={() => handleEnroll(event)}
                    disabled={enrollingEventId === event.id}
                    className="w-full btn btn-primary disabled:opacity-60"
                  >
                    {enrollingEventId === event.id ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        {event.fee_amount > 0 ? 'Enroll & Pay' : 'Enroll'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="fixed bottom-4 right-4 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded shadow-lg z-50 max-w-md">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            <p>{error}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientEventsTab;
