import React, { useState, useEffect } from 'react';
import { therapySessionAPI, appointmentAPI, videoSessionAPI } from '../../services/api';
import { X, FileText, User, Calendar, Clock, AlertTriangle, Video, Settings } from 'lucide-react';
import { CurrencyIcon } from '../../utils/currencyIcon';
import { isAfter, differenceInMinutes, format, addMinutes } from 'date-fns';
import { getUserTimezone, combineDateAndTime, convertLocalToUTC } from '../../utils/dateUtils';
import ConflictConfirmationModal from './ConflictConfirmationModal';
import { useAuth } from '../../context/AuthContext';

const CreateSessionModal = ({ partnerId, selectedUser, clients, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    user_id: selectedUser?.id || '',
    session_title: '',
    session_date: '',
    session_time: '',
    session_duration: '60',
    payment_notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showFutureDateWarning, setShowFutureDateWarning] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [conflictData, setConflictData] = useState(null);
  const [sessionCreationData, setSessionCreationData] = useState(null);
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState(false);
  const [checkingGoogleCalendar, setCheckingGoogleCalendar] = useState(true);

  useEffect(() => {
    checkGoogleCalendarConnection();
  }, []);

  const checkGoogleCalendarConnection = async () => {
    try {
      const response = await videoSessionAPI.checkGoogleCalendarStatus();
      setGoogleCalendarConnected(response.data.connected);
    } catch (err) {
      console.error('Error checking Google Calendar status:', err);
    } finally {
      setCheckingGoogleCalendar(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user changes date/time
    if (name === 'session_date' || name === 'session_time') {
      setError('');
    }
  };

  // Check if the selected date/time is in the future
  const isFutureDateTime = () => {
    if (!formData.session_date || !formData.session_time) {
      return false;
    }

    const userTimezone = getUserTimezone();
    const selectedDateTime = combineDateAndTime(
      formData.session_date,
      formData.session_time,
      userTimezone
    );
    const now = new Date();

    return isAfter(selectedDateTime, now);
  };

  // Check if the future date/time is more than 30 minutes away
  const isFutureDateTimeMoreThan30Mins = () => {
    if (!formData.session_date || !formData.session_time) {
      return false;
    }

    const userTimezone = getUserTimezone();
    const selectedDateTime = combineDateAndTime(
      formData.session_date,
      formData.session_time,
      userTimezone
    );
    const now = new Date();
    const diffInMinutes = differenceInMinutes(selectedDateTime, now);

    // Return true if it's in the future AND more than 30 minutes away
    return isAfter(selectedDateTime, now) && diffInMinutes > 30;
  };

  // Get max date (today) for date input
  const getMaxDate = () => {
    return format(new Date(), 'yyyy-MM-dd');
  };

  // Get max time for time input (if date is today)
  const getMaxTime = () => {
    if (formData.session_date === format(new Date(), 'yyyy-MM-dd')) {
      return format(new Date(), 'HH:mm');
    }
    return null; // No restriction if date is in the past
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.user_id) {
      setError('Please select a client');
      return;
    }

    if (!formData.session_title.trim()) {
      setError('Session title is required');
      return;
    }

    if (!formData.session_date || !formData.session_time) {
      setError('Session date and time are required');
      return;
    }

    if (!formData.session_duration) {
      setError('Session duration is required');
      return;
    }

    // Check if user has chosen to skip the confirmation dialog
    const dontShowDialog = localStorage.getItem('dontShowConfirmSessionCreationDialog') === 'true';
    
    // Check if session is in the future and more than 30 minutes away
    if (isFutureDateTimeMoreThan30Mins()) {
      // Show future date warning dialog first
      setShowFutureDateWarning(true);
    } else if (dontShowDialog) {
      // Skip confirmation dialog and proceed directly
      await handleConfirmCreate();
    } else {
      // Show confirmation dialog directly
      setShowConfirmDialog(true);
    }
  };

  const handleConfirmCreate = async () => {
    if (dontShowAgain) {
      localStorage.setItem('dontShowConfirmSessionCreationDialog', 'true');
    }
    setShowConfirmDialog(false);
    setLoading(true);

    try {
      // Timezone handling
      const userTimezone = getUserTimezone();

      // Combine date and time in user's timezone
      const localDateTime = combineDateAndTime(
        formData.session_date,
        formData.session_time,
        userTimezone
      );
      const localEndDateTime = addMinutes(localDateTime, parseInt(formData.session_duration));

      // Convert to UTC for storage
      const utcDateTime = convertLocalToUTC(localDateTime, userTimezone);
      const utcEndDateTime = convertLocalToUTC(localEndDateTime, userTimezone);
      const sessionDateTime = utcDateTime.toISOString();

      // Store session creation data for later use
      const creationData = {
        userTimezone,
        localDateTime,
        localEndDateTime,
        utcDateTime,
        utcEndDateTime,
        sessionDateTime
      };
      setSessionCreationData(creationData);

      // Check for appointment conflicts using the new API
      const conflictCheck = await appointmentAPI.checkConflicts(
        partnerId,
        utcDateTime.toISOString(),
        utcEndDateTime.toISOString()
      );

      if (conflictCheck.data.hasConflict && conflictCheck.data.conflicts.length > 0) {
        // Show conflict dialog
        setConflictData({
          conflicts: conflictCheck.data.conflicts,
          proposedTime: utcDateTime.toISOString(),
          proposedEndTime: utcEndDateTime.toISOString()
        });
        setShowConflictDialog(true);
        setLoading(false);
      } else {
        // No conflicts - proceed with both session and appointment
        await createSessionAndAppointment(creationData, true);
      }
    } catch (error) {
      console.error('Session creation error:', error);
      setError(error.response?.data?.error || 'Failed to create session');
      setLoading(false);
    }
  };

  const createSessionAndAppointment = async (creationData, createAppointment) => {
    setLoading(true);

    try {
      const { userTimezone, utcDateTime, utcEndDateTime, sessionDateTime } = creationData;

      // Create the therapy session
      await therapySessionAPI.createStandalone({
        partner_id: partnerId,
        user_id: formData.user_id,
        session_title: formData.session_title,
        session_date: sessionDateTime,
        session_duration: parseInt(formData.session_duration),
        payment_notes: formData.payment_notes || null
      });

      // Create appointment only if requested
      if (createAppointment) {
        try {
          await appointmentAPI.create({
            partner_id: partnerId,
            user_id: formData.user_id,
            title: formData.session_title,
            appointment_date: utcDateTime.toISOString(),
            end_date: utcEndDateTime.toISOString(),
            duration_minutes: parseInt(formData.session_duration),
            notes: formData.session_notes || '',
            timezone: userTimezone
          });
        } catch (aptErr) {
          console.error('Failed to create appointment:', aptErr);
          // Don't fail the entire operation if appointment creation fails
        }
      }

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err) {
      console.error('Create session error:', err);
      setError(err.response?.data?.error || 'Failed to create session');
      setLoading(false);
    }
  };

  const handleCreateAppointmentAnyway = async () => {
    setShowConflictDialog(false);
    await createSessionAndAppointment(sessionCreationData, true);
  };

  const handleSkipAppointment = async () => {
    setShowConflictDialog(false);
    await createSessionAndAppointment(sessionCreationData, false);
  };

  const handleCancelConflictDialog = () => {
    setShowConflictDialog(false);
    setConflictData(null);
    setSessionCreationData(null);
    setLoading(false);
  };

  const handleConfirmFutureDate = async () => {
    setShowFutureDateWarning(false);
    // Check if user has chosen to skip the confirmation dialog
    const dontShowDialog = localStorage.getItem('dontShowConfirmSessionCreationDialog') === 'true';
    if (dontShowDialog) {
      // Skip confirmation dialog and proceed directly
      await handleConfirmCreate();
    } else {
      // Proceed to confirmation dialog
      setShowConfirmDialog(true);
    }
  };

  const handleCancelFutureDate = () => {
    setShowFutureDateWarning(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dark-bg-tertiary rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary-100 dark:bg-dark-bg-secondary rounded-lg">
                <FileText className="h-6 w-6 text-primary-600 dark:text-dark-primary-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary">Create New Session</h2>
            </div>
            <button onClick={onClose} className="text-gray-400 dark:text-dark-text-tertiary hover:text-gray-600 dark:hover:text-dark-text-secondary">
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Google Calendar Connection Warning */}
          {checkingGoogleCalendar && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-blue-700 dark:text-blue-300 text-sm">
              Checking Google Calendar connection...
            </div>
          )}
          
          {!checkingGoogleCalendar && !googleCalendarConnected && (
            <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <Video className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-300 mb-1">
                    Google Calendar Required for Video Sessions
                  </h3>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
                    Please connect your Google Calendar to create video sessions with automatic Google Meet links.
                    Without this connection, you can only create regular therapy sessions.
                  </p>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => window.open('/settings/calendar', '_blank')}
                      className="px-3 py-1.5 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700 transition-colors flex items-center space-x-1"
                    >
                      <Settings className="h-4 w-4" />
                      <span>Connect Google Calendar</span>
                    </button>
                    <button
                      onClick={() => setGoogleCalendarConnected(true)}
                      className="px-3 py-1.5 text-yellow-700 dark:text-yellow-300 text-sm underline hover:text-yellow-800 dark:hover:text-yellow-200"
                    >
                      I'll connect later
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Client Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                <User className="inline h-4 w-4 mr-1" />
                Select Client *
              </label>
              <select
                name="user_id"
                value={formData.user_id}
                onChange={handleChange}
                required
                disabled={!!selectedUser}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 dark:focus:ring-dark-primary-500 focus:border-transparent bg-white dark:bg-dark-bg-primary text-gray-900 dark:text-dark-text-primary disabled:bg-gray-100 dark:disabled:bg-dark-bg-secondary disabled:cursor-not-allowed"
              >
                <option value="">-- Select a client --</option>
                {clients && clients.map(client => (
                  <option key={client.id} value={client.id}>
                    {client.name} ({client.email})
                  </option>
                ))}
              </select>
            </div>

            {/* Session Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                <FileText className="inline h-4 w-4 mr-1" />
                Session Title *
              </label>
              <input
                type="text"
                name="session_title"
                value={formData.session_title}
                onChange={handleChange}
                required
                placeholder="Enter session title..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 dark:focus:ring-dark-primary-500 focus:border-transparent bg-white dark:bg-dark-bg-primary text-gray-900 dark:text-dark-text-primary dark:placeholder-dark-text-tertiary"
              />
            </div>

            {/* Session Date and Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                  <Calendar className="inline h-4 w-4 mr-1" />
                  Session Date *
                </label>
                <input
                  type="date"
                  name="session_date"
                  value={formData.session_date}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 dark:focus:ring-dark-primary-500 focus:border-transparent bg-white dark:bg-dark-bg-primary text-gray-900 dark:text-dark-text-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                  <Clock className="inline h-4 w-4 mr-1" />
                  Session Time *
                </label>
                <input
                  type="time"
                  name="session_time"
                  value={formData.session_time}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 dark:focus:ring-dark-primary-500 focus:border-transparent bg-white dark:bg-dark-bg-primary text-gray-900 dark:text-dark-text-primary"
                />
              </div>
            </div>

            {/* Session Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                <Clock className="inline h-4 w-4 mr-1" />
                Duration (minutes) *
              </label>
              <select
                name="session_duration"
                value={formData.session_duration}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 dark:focus:ring-dark-primary-500 focus:border-transparent bg-white dark:bg-dark-bg-primary text-gray-900 dark:text-dark-text-primary"
              >
                <option value="">Select duration</option>
                <option value="30">30 minutes</option>
                <option value="45">45 minutes</option>
                <option value="60">1 hour</option>
                <option value="90">1.5 hours</option>
                <option value="120">2 hours</option>
              </select>
            </div>

            {/* Payment Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                <CurrencyIcon className="inline h-4 w-4 mr-1" />
                Payment Related Notes (Optional)
              </label>
              <input
                type="text"
                name="payment_notes"
                value={formData.payment_notes}
                onChange={handleChange}
                placeholder="₹5000 paid..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 dark:focus:ring-dark-primary-500 focus:border-transparent bg-white dark:bg-dark-bg-primary text-gray-900 dark:text-dark-text-primary dark:placeholder-dark-text-tertiary"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t dark:border-dark-border">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 dark:border-dark-border text-gray-700 dark:text-dark-text-primary rounded-lg hover:bg-gray-50 dark:hover:bg-dark-bg-primary transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-primary-600 dark:bg-dark-primary-600 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-dark-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? 'Creating Session...' : 'Create Session'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Future Date Warning Dialog */}
      {showFutureDateWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-dark-bg-tertiary rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-start space-x-3 mb-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-orange-100 dark:bg-orange-900/30">
                  <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-1">
                  Future Date and Time Warning
                </h3>
                <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
                  You are creating a session with a future date and time. Please confirm that you want to proceed with creating this session.
                </p>
              </div>
              <button
                onClick={handleCancelFutureDate}
                disabled={loading}
                className="text-gray-400 dark:text-dark-text-tertiary hover:text-gray-600 dark:hover:text-dark-text-secondary transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
              <p className="text-xs text-orange-800 dark:text-orange-300">
                <strong>Session Date & Time:</strong> {formData.session_date} at {formData.session_time}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleCancelFutureDate}
                disabled={loading}
                className="px-4 py-2 text-gray-700 dark:text-dark-text-primary bg-gray-100 dark:bg-dark-bg-primary rounded-lg hover:bg-gray-200 dark:hover:bg-dark-bg-tertiary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmFutureDate}
                disabled={loading}
                className="px-4 py-2 bg-primary-600 dark:bg-dark-primary-600 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-dark-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-dark-bg-tertiary rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-start space-x-3 mb-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-yellow-100 dark:bg-yellow-900/30">
                  <FileText className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-1">
                  Confirm Session Creation
                </h3>
                <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
                  Once a session is created, it <strong>cannot be deleted</strong>. The session will be permanently recorded in the client's session history.
                </p>
              </div>
              <button
                onClick={() => setShowConfirmDialog(false)}
                disabled={loading}
                className="text-gray-400 dark:text-dark-text-tertiary hover:text-gray-600 dark:hover:text-dark-text-secondary transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-xs text-yellow-800 dark:text-yellow-300">
                <strong>Note:</strong> You can edit session notes later.
              </p>
            </div>

            <div className="mb-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                  className="w-4 h-4 text-primary-600 dark:text-dark-primary-500 border-gray-300 dark:border-dark-border rounded focus:ring-primary-500 dark:focus:ring-dark-primary-500"
                />
                <span className="text-sm text-gray-700 dark:text-dark-text-secondary">
                  Don't show this again
                </span>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowConfirmDialog(false)}
                disabled={loading}
                className="px-4 py-2 text-gray-700 dark:text-dark-text-primary bg-gray-100 dark:bg-dark-bg-primary rounded-lg hover:bg-gray-200 dark:hover:bg-dark-bg-tertiary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmCreate}
                disabled={loading}
                className="px-4 py-2 bg-primary-600 dark:bg-dark-primary-600 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-dark-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Yes, Create Session'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Conflict Confirmation Modal */}
      {showConflictDialog && conflictData && (
        <ConflictConfirmationModal
          isOpen={showConflictDialog}
          conflicts={conflictData.conflicts}
          proposedTime={conflictData.proposedTime}
          proposedEndTime={conflictData.proposedEndTime}
          onCreateAppointment={handleCreateAppointmentAnyway}
          onSkipAppointment={handleSkipAppointment}
          onCancel={handleCancelConflictDialog}
          loading={loading}
        />
      )}
    </div>
  );
};

export default CreateSessionModal;
