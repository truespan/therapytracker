import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { formatTime } from '../../utils/dateUtils';

const DeleteWarningDialog = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  slot, 
  paymentInfo, 
  actionType = 'deleteSlotAndBooking' // 'deleteSlotAndBooking' or 'cancelBooking'
}) => {
  if (!isOpen) return null;

  const bookedStatuses = ['booked', 'confirmed', 'confirmed_balance_pending', 'confirmed_payment_pending'];
  const isBooked = slot && bookedStatuses.includes(slot.status);
  
  const hasPayment = paymentInfo && (paymentInfo.amount_paid > 0 || paymentInfo.balance_pending > 0);
  
  const getTitle = () => {
    if (actionType === 'deleteSlotAndBooking') {
      return 'Delete Availability Slot and Booking';
    } else {
      return 'Cancel Booking';
    }
  };

  const getMessage = () => {
    if (actionType === 'deleteSlotAndBooking') {
      if (isBooked) {
        return `This will permanently delete the availability slot and the associated booking. The appointment will be removed from both your calendar and the client's dashboard.`;
      } else {
        return `This will permanently delete the availability slot.`;
      }
    } else {
      return `This will cancel the booking and remove the associated appointment. The availability slot will be retained and made available again.`;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-dark-bg-secondary rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-border">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">
              {getTitle()}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <p className="text-gray-700 dark:text-dark-text-secondary">
            {getMessage()}
          </p>

          {slot && (
            <div className="bg-gray-50 dark:bg-dark-bg-tertiary rounded-lg p-3 space-y-1">
              <div className="text-sm">
                <span className="font-medium text-gray-700 dark:text-dark-text-secondary">Date:</span>
                <span className="ml-2 text-gray-600 dark:text-dark-text-tertiary">{slot.slot_date}</span>
              </div>
              <div className="text-sm">
                <span className="font-medium text-gray-700 dark:text-dark-text-secondary">Time:</span>
                <span className="ml-2 text-gray-600 dark:text-dark-text-tertiary">
                  {slot.start_datetime ? `${formatTime(slot.start_datetime)} - ${formatTime(slot.end_datetime)}` : `${slot.start_time} - ${slot.end_time}`}
                </span>
              </div>
              {isBooked && slot.booked_by_user_name && (
                <div className="text-sm">
                  <span className="font-medium text-gray-700 dark:text-dark-text-secondary">Client:</span>
                  <span className="ml-2 text-gray-600 dark:text-dark-text-tertiary">{slot.booked_by_user_name}</span>
                </div>
              )}
            </div>
          )}

          {/* Payment Information */}
          {hasPayment && (
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                <span className="font-semibold text-orange-800 dark:text-orange-300 text-sm">
                  Payment Information
                </span>
              </div>
              <div className="space-y-1 text-sm">
                {paymentInfo.amount_paid > 0 && (
                  <div>
                    <span className="text-orange-700 dark:text-orange-300">Amount Paid: </span>
                    <span className="font-medium text-orange-900 dark:text-orange-200">
                      {paymentInfo.currency || 'INR'} {paymentInfo.amount_paid.toFixed(2)}
                    </span>
                  </div>
                )}
                {paymentInfo.balance_pending > 0 && (
                  <div>
                    <span className="text-orange-700 dark:text-orange-300">Balance Pending: </span>
                    <span className="font-medium text-orange-900 dark:text-orange-200">
                      {paymentInfo.currency || 'INR'} {paymentInfo.balance_pending.toFixed(2)}
                    </span>
                  </div>
                )}
                {paymentInfo.session_fee > 0 && (
                  <div>
                    <span className="text-orange-700 dark:text-orange-300">Session Fee: </span>
                    <span className="font-medium text-orange-900 dark:text-orange-200">
                      {paymentInfo.currency || 'INR'} {paymentInfo.session_fee.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
              <p className="text-xs text-orange-700 dark:text-orange-300 mt-2">
                Please ensure refunds are processed if needed before proceeding.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-4 border-t border-gray-200 dark:border-dark-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-dark-text-secondary bg-gray-100 dark:bg-dark-bg-tertiary rounded-md hover:bg-gray-200 dark:hover:bg-dark-bg-primary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-white rounded-md transition-colors ${
              actionType === 'deleteSlotAndBooking'
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-orange-600 hover:bg-orange-700'
            }`}
          >
            {actionType === 'deleteSlotAndBooking' ? 'Delete' : 'Cancel Booking'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteWarningDialog;

