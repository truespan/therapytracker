import React, { useEffect, useRef } from 'react';
import { Calendar, Clock, Video, MapPin, User, X } from 'lucide-react';
import { formatTime } from '../../utils/dateUtils';
import { CurrencyIcon } from '../../utils/currencyIcon';

const BookingConfirmationModal = ({ slot, partnerName, feeSettings, onConfirm, onCancel, loading }) => {
  const backdropRef = useRef(null);

  // Handle modal opening - ensure modal is visible and prevent body scroll
  useEffect(() => {
    if (slot) {
      // Prevent body scroll when modal is open
      const originalOverflow = document.body.style.overflow;
      const originalPosition = document.body.style.position;
      const scrollY = window.scrollY;
      
      document.body.style.overflow = 'hidden';
      // On mobile, prevent scroll jumping
      if (window.innerWidth <= 768) {
        document.body.style.position = 'fixed';
        document.body.style.top = `-${scrollY}px`;
        document.body.style.width = '100%';
      }
      
      // Ensure backdrop scrolls to top and modal is visible
      const timer = setTimeout(() => {
        if (backdropRef.current) {
          backdropRef.current.scrollTop = 0;
          backdropRef.current.scrollTo({ top: 0, behavior: 'auto' });
        }
        if (window.scrollY > 0 && window.innerWidth > 768) {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 10);

      return () => {
        clearTimeout(timer);
        document.body.style.overflow = originalOverflow;
        if (window.innerWidth <= 768) {
          document.body.style.position = originalPosition;
          document.body.style.top = '';
          document.body.style.width = '';
          window.scrollTo(0, scrollY);
        }
      };
    }
  }, [slot]);

  if (!slot) return null;

  const formattedDate = new Date(slot.slot_date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  const isOnline = slot.location_type === 'online' || slot.status.includes('online');

  // Fee calculations - ensure values are numbers
  // Use session_fee (same as public booking flow)
  const sessionFee = parseFloat(feeSettings?.session_fee) || 0;
  const currency = feeSettings?.fee_currency || 'INR';

  // Currency symbol helper
  const getCurrencySymbol = (curr) => {
    const symbols = {
      'INR': '₹',
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'AUD': 'A$',
      'CAD': 'C$'
    };
    return symbols[curr] || curr;
  };

  const currencySymbol = getCurrencySymbol(currency);
  const hasFees = sessionFee > 0;

  return (
    <div 
      ref={backdropRef}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 pt-4 sm:pt-8 pb-4 sm:pb-8 overflow-y-auto"
    >
      <div className="bg-white dark:bg-dark-bg-primary rounded-lg shadow-xl max-w-md w-full my-auto max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)]">
        {/* Header */}
        <div className="bg-primary-50 dark:bg-dark-bg-secondary border-b border-primary-200 dark:border-dark-border px-6 py-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-primary-900 dark:text-dark-text-primary">
              Confirm Appointment Booking
            </h3>
            <button
              onClick={onCancel}
              className="text-primary-600 dark:text-dark-primary-400 hover:text-primary-800 dark:hover:text-dark-primary-300 transition-colors"
              disabled={loading}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          <div className="bg-blue-50 dark:bg-dark-bg-secondary border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-3">
            {/* Therapist */}
            <div className="flex items-center">
              <User className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-3 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-600 dark:text-dark-text-secondary">Therapist</p>
                <p className="font-semibold text-gray-900 dark:text-dark-text-primary">{partnerName}</p>
              </div>
            </div>

            {/* Date */}
            <div className="flex items-center">
              <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-3 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-600 dark:text-dark-text-secondary">Date</p>
                <p className="font-semibold text-gray-900 dark:text-dark-text-primary">{formattedDate}</p>
              </div>
            </div>

            {/* Time */}
            <div className="flex items-center">
              <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-3 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-600 dark:text-dark-text-secondary">Time</p>
                <p className="font-semibold text-gray-900 dark:text-dark-text-primary">
                  {formatTime(slot.start_datetime)} - {formatTime(slot.end_datetime)}
                </p>
              </div>
            </div>

            {/* Session Type */}
            <div className="flex items-center">
              {isOnline ? (
                <Video className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-3 flex-shrink-0" />
              ) : (
                <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-3 flex-shrink-0" />
              )}
              <div>
                <p className="text-xs text-gray-600 dark:text-dark-text-secondary">Session Type</p>
                <p className="font-semibold text-gray-900 dark:text-dark-text-primary">
                  {isOnline ? 'Online Session' : 'In-Person Session'}
                </p>
              </div>
            </div>
          </div>

          {/* Fee Details Section */}
          {hasFees && (
            <div className="mt-4 bg-green-50 dark:bg-dark-bg-secondary border border-green-200 dark:border-green-800 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-green-900 dark:text-green-300 mb-3 flex items-center">
                <CurrencyIcon className="h-4 w-4 mr-2" />
                Fee Details
              </h4>
              <div className="space-y-2">
                {sessionFee > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-700 dark:text-dark-text-secondary">Session fee (to be paid now):</span>
                    <span className="text-sm font-semibold text-green-700 dark:text-green-400">
                      {currencySymbol}{sessionFee.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="mt-4 p-3 bg-yellow-50 dark:bg-dark-bg-secondary border border-yellow-200 dark:border-yellow-800 rounded-md">
            <p className="text-sm text-yellow-800 dark:text-yellow-300">
              <strong>Important:</strong> Please arrive on time for your appointment.
              {isOnline && ' You will receive session details after booking.'}
              {hasFees && sessionFee > 0 && ' You will be redirected to payment gateway to complete the booking.'}
            </p>
          </div>

          <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-4">
            {hasFees && sessionFee > 0 
              ? 'Click "Proceed to Payment" to complete your booking.'
              : 'Are you sure you want to book this appointment?'}
          </p>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 dark:bg-dark-bg-secondary px-6 py-4 border-t border-gray-200 dark:border-dark-border">
          <div className="flex gap-3 justify-end">
            <button
              onClick={onCancel}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 dark:border-dark-border rounded-md text-gray-700 dark:text-dark-text-primary bg-white dark:bg-dark-bg-primary hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className={`px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                loading ? 'cursor-wait' : ''
              }`}
            >
              {loading 
                ? (hasFees && sessionFee > 0 ? 'Processing...' : 'Booking...') 
                : (hasFees && sessionFee > 0 ? 'Proceed to Payment' : 'Confirm Booking')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingConfirmationModal;
