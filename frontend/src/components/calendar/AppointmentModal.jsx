import React, { useState, useEffect } from 'react';
import { appointmentAPI } from '../../services/api';
import { X, AlertCircle, CheckCircle, Trash2, Calendar, Clock } from 'lucide-react';
import {
  getUserTimezone,
  getDateForInput,
  getTimeForInput,
  combineDateAndTime,
  convertLocalToUTC,
  getCurrentUTC
} from '../../utils/dateUtils';
import { differenceInMinutes, addMinutes } from 'date-fns';

const AppointmentModal = ({ partnerId, users, selectedSlot, appointment, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    user_id: '',
    title: '',
    appointment_date: '',
    appointment_time: '',
    duration_minutes: '60',
    notes: ''
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (appointment) {
      // Edit mode - Convert UTC time back to user's local timezone
      const userTimezone = getUserTimezone();

      setFormData({
        user_id: appointment.user_id,
        title: appointment.title,
        appointment_date: getDateForInput(appointment.appointment_date),
        appointment_time: getTimeForInput(appointment.appointment_date),
        duration_minutes: appointment.duration_minutes,
        notes: appointment.notes || ''
      });
    } else if (selectedSlot) {
      // Create mode - Use local time from calendar
      const startDate = new Date(selectedSlot.start);
      const endDate = new Date(selectedSlot.end);
      const duration = differenceInMinutes(endDate, startDate) || 60;

      setFormData({
        user_id: '',
        title: '',
        appointment_date: getDateForInput(startDate),
        appointment_time: getTimeForInput(startDate),
        duration_minutes: duration,
        notes: ''
      });
    }
  }, [appointment, selectedSlot]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.user_id || !formData.title || !formData.appointment_date || !formData.appointment_time) {
      setError('Please fill in all required fields');
      return;
    }

    if (!formData.duration_minutes) {
      setError('Duration is required');
      return;
    }

    setSaving(true);

    try {
      // Get user's timezone
      const userTimezone = getUserTimezone();

      // Combine date and time, then convert to UTC for storage
      const localDateTime = combineDateAndTime(
        formData.appointment_date,
        formData.appointment_time
      );

      // Calculate end datetime
      const endDateTime = addMinutes(localDateTime, parseInt(formData.duration_minutes));

      const appointmentData = {
        partner_id: partnerId,
        user_id: parseInt(formData.user_id),
        title: formData.title,
        appointment_date: localDateTime.toISOString(),
        end_date: endDateTime.toISOString(),
        duration_minutes: parseInt(formData.duration_minutes),
        notes: formData.notes,
        timezone: userTimezone
      };

      if (appointment) {
        await appointmentAPI.update(appointment.id, appointmentData);
        setSuccess('Appointment updated successfully');
      } else {
        await appointmentAPI.create(appointmentData);
        setSuccess('Appointment created successfully');
      }

      setTimeout(() => {
        onSave();
      }, 1000);
    } catch (err) {
      console.error('Save appointment error:', err);
      setError(err.response?.data?.error || 'Failed to save appointment');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this appointment?')) {
      return;
    }

    setDeleting(true);
    try {
      await appointmentAPI.delete(appointment.id);
      setSuccess('Appointment deleted successfully');
      setTimeout(() => {
        onSave();
      }, 1000);
    } catch (err) {
      console.error('Delete appointment error:', err);
      setError('Failed to delete appointment');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dark-bg-tertiary rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b dark:border-dark-border">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">
            {appointment ? 'Edit Appointment' : 'New Appointment'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-white hover:text-gray-600 dark:hover:text-gray-300 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center space-x-2 text-red-700 dark:text-red-400">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center space-x-2 text-green-700 dark:text-green-400">
              <CheckCircle className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm">{success}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
              Client <span className="text-red-500">*</span>
            </label>
            <select
              name="user_id"
              value={formData.user_id}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-dark-bg-primary dark:text-dark-text-primary"
              required
            >
              <option value="">Select a client</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g., Therapy Session"
              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-dark-bg-primary dark:text-dark-text-primary dark:placeholder-dark-text-tertiary"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                <Calendar className="inline h-4 w-4 mr-1 text-gray-700 dark:text-white" />
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="appointment_date"
                value={formData.appointment_date}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-dark-bg-primary dark:text-dark-text-primary"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                <Clock className="inline h-4 w-4 mr-1 text-gray-700 dark:text-white" />
                Time <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                name="appointment_time"
                value={formData.appointment_time}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-dark-bg-primary dark:text-dark-text-primary"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
              Duration (minutes) <span className="text-red-500">*</span>
            </label>
            <select
              name="duration_minutes"
              value={formData.duration_minutes}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-dark-bg-primary dark:text-dark-text-primary"
            >
              <option value="">Select duration</option>
              <option value="30">30 minutes</option>
              <option value="45">45 minutes</option>
              <option value="60">1 hour</option>
              <option value="90">1.5 hours</option>
              <option value="120">2 hours</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="3"
              placeholder="Add any notes about this appointment..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-dark-bg-primary dark:text-dark-text-primary dark:placeholder-dark-text-tertiary resize-none"
            />
          </div>

          <div className="flex space-x-3 pt-4">
            {appointment && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                <Trash2 className="h-4 w-4" />
                <span>{deleting ? 'Deleting...' : 'Delete'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 bg-gray-200 dark:bg-dark-bg-primary text-gray-700 dark:text-dark-text-primary rounded-lg hover:bg-gray-300 dark:hover:bg-dark-bg-tertiary transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2 px-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : appointment ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AppointmentModal;

