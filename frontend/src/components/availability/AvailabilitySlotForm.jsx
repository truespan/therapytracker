import React from 'react';
import { Calendar, Clock } from 'lucide-react';

const AvailabilitySlotForm = ({ formData, onChange, onSubmit, loading }) => {
  /**
   * Generate next 7 days including today
   * Format date in local timezone to avoid timezone conversion issues
   */
  const getNext7Days = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);

      // Format date in local timezone (YYYY-MM-DD)
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const localDateString = `${year}-${month}-${day}`;

      days.push({
        value: localDateString,
        label: i === 0 ? 'Today' : date.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric'
        })
      });
    }
    return days;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validation
    if (!formData.date || !formData.start_time || !formData.end_time || !formData.status) {
      alert('Please fill in all fields');
      return;
    }

    if (formData.start_time >= formData.end_time) {
      alert('Start time must be before end time');
      return;
    }

    onSubmit();
  };

  const statusOptions = [
    { value: 'available_online', label: 'Available Online', color: 'text-green-700' },
    { value: 'available_offline', label: 'Available Offline', color: 'text-blue-700' },
    { value: 'not_available_online', label: 'Not Available Online', color: 'text-gray-700' },
    { value: 'not_available_offline', label: 'Not Available Offline', color: 'text-gray-700' },
  ];

  return (
    <div className="bg-white dark:bg-dark-bg-secondary rounded-lg shadow-md p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center text-gray-900 dark:text-dark-text-primary">
        <Calendar className="h-5 w-5 mr-2 text-primary-600 dark:text-dark-primary-500" />
        Create Availability Slot
      </h3>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Date Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
              Date
            </label>
            <select
              value={formData.date}
              onChange={(e) => onChange({ ...formData, date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-dark-bg-secondary dark:text-dark-text-primary"
              required
            >
              <option value="">Select Date</option>
              {getNext7Days().map(day => (
                <option key={day.value} value={day.value}>
                  {day.label}
                </option>
              ))}
            </select>
          </div>

          {/* Start Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
            Start Time
          </label>
            <div className="relative">
              <input
                type="time"
                value={formData.start_time}
                onChange={(e) => onChange({ ...formData, start_time: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-dark-bg-secondary dark:text-dark-text-primary"
                required
              />
              <Clock className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-dark-text-tertiary pointer-events-none" />
            </div>
          </div>

          {/* End Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
            End Time
          </label>
            <div className="relative">
              <input
                type="time"
                value={formData.end_time}
                onChange={(e) => onChange({ ...formData, end_time: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-dark-bg-secondary dark:text-dark-text-primary"
                required
              />
              <Clock className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-dark-text-tertiary pointer-events-none" />
            </div>
          </div>

          {/* Status Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
            Availability Status
          </label>
            <select
              value={formData.status}
              onChange={(e) => onChange({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-dark-bg-secondary dark:text-dark-text-primary"
              required
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value} className={option.color}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Submit Button */}
        <div className="mt-6">
          <button
            type="submit"
            disabled={loading}
            className={`w-full md:w-auto px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors ${
              loading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {loading ? 'Creating...' : 'Create Slot'}
          </button>
        </div>
      </form>

      {/* Info Text */}
      <div className="mt-4 p-3 bg-blue-50 dark:bg-dark-bg-tertiary border border-blue-200 dark:border-blue-800 rounded-md">
        <p className="text-sm text-blue-800 dark:text-blue-300">
          <strong>Note:</strong> Available slots will be checked for Google Calendar conflicts.
          You can still create the slot if there's a conflict. Slots won't be visible to clients until you publish them.
        </p>
      </div>
    </div>
  );
};

export default AvailabilitySlotForm;
