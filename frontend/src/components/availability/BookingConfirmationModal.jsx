import React from 'react';
import { Calendar, Clock, Video, MapPin, User, X } from 'lucide-react';
import { formatTime } from '../../utils/dateUtils';

const BookingConfirmationModal = ({ slot, partnerName, onConfirm, onCancel, loading }) => {
  if (!slot) return null;

  const formattedDate = new Date(slot.slot_date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  const isOnline = slot.location_type === 'online' || slot.status.includes('online');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="bg-primary-50 border-b border-primary-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-primary-900">
              Confirm Appointment Booking
            </h3>
            <button
              onClick={onCancel}
              className="text-primary-600 hover:text-primary-800 transition-colors"
              disabled={loading}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
            {/* Therapist */}
            <div className="flex items-center">
              <User className="h-5 w-5 text-blue-600 mr-3 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-600">Therapist</p>
                <p className="font-semibold text-gray-900">{partnerName}</p>
              </div>
            </div>

            {/* Date */}
            <div className="flex items-center">
              <Calendar className="h-5 w-5 text-blue-600 mr-3 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-600">Date</p>
                <p className="font-semibold text-gray-900">{formattedDate}</p>
              </div>
            </div>

            {/* Time */}
            <div className="flex items-center">
              <Clock className="h-5 w-5 text-blue-600 mr-3 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-600">Time</p>
                <p className="font-semibold text-gray-900">
                  {formatTime(slot.start_datetime)} - {formatTime(slot.end_datetime)}
                </p>
              </div>
            </div>

            {/* Session Type */}
            <div className="flex items-center">
              {isOnline ? (
                <Video className="h-5 w-5 text-blue-600 mr-3 flex-shrink-0" />
              ) : (
                <MapPin className="h-5 w-5 text-blue-600 mr-3 flex-shrink-0" />
              )}
              <div>
                <p className="text-xs text-gray-600">Session Type</p>
                <p className="font-semibold text-gray-900">
                  {isOnline ? 'Online Session' : 'In-Person Session'}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              <strong>Important:</strong> Please arrive on time for your appointment.
              {isOnline && ' You will receive session details after booking.'}
            </p>
          </div>

          <p className="text-sm text-gray-600 mt-4">
            Are you sure you want to book this appointment?
          </p>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <div className="flex gap-3 justify-end">
            <button
              onClick={onCancel}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
              {loading ? 'Booking...' : 'Confirm Booking'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingConfirmationModal;
