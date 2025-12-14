/**
 * Session Time Validation Utilities
 *
 * Provides date and time validation functions for session management.
 * All comparisons use local timezone for UI consistency.
 */

/**
 * Check if a scheduled date is in the future (tomorrow or later)
 * @param {string|Date} scheduledDate - The scheduled date/time
 * @returns {boolean} - True if the date (not time) is after today
 */
export const isFutureDate = (scheduledDate) => {
  if (!scheduledDate) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const scheduled = new Date(scheduledDate);
  scheduled.setHours(0, 0, 0, 0);

  return scheduled > today;
};

/**
 * Check if current time is within a time window of the scheduled time
 * @param {string|Date} scheduledDateTime - The scheduled date and time
 * @param {number} windowMinutes - The time window in minutes (default: 15)
 * @returns {Object} - { withinWindow: boolean, minutesDifference: number }
 *                     minutesDifference is positive if starting early, negative if late
 */
export const isWithinTimeWindow = (scheduledDateTime, windowMinutes = 15) => {
  if (!scheduledDateTime) {
    return { withinWindow: false, minutesDifference: 0 };
  }

  const now = new Date();
  const scheduled = new Date(scheduledDateTime);

  // Calculate difference in milliseconds
  const diffMs = scheduled - now;

  // Convert to minutes
  const minutesDifference = Math.round(diffMs / (1000 * 60));

  // Check if within window (inclusive of boundary)
  const withinWindow = Math.abs(minutesDifference) <= windowMinutes;

  return { withinWindow, minutesDifference };
};

/**
 * Format time difference for display
 * @param {number} minutesDifference - Minutes difference (positive = early, negative = late)
 * @returns {string} - Formatted string like "10 minutes early" or "5 minutes late"
 */
export const formatTimeDifference = (minutesDifference) => {
  const absDiff = Math.abs(minutesDifference);

  if (minutesDifference === 0) {
    return "on time";
  }

  // Convert to hours and minutes if >= 60 minutes
  if (absDiff >= 60) {
    const hours = Math.floor(absDiff / 60);
    const minutes = absDiff % 60;

    let timeStr = `${hours} hour${hours !== 1 ? 's' : ''}`;
    if (minutes > 0) {
      timeStr += ` ${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }

    return minutesDifference > 0
      ? `${timeStr} early`
      : `${timeStr} late`;
  }

  // Just minutes
  const minuteStr = `${absDiff} minute${absDiff !== 1 ? 's' : ''}`;
  return minutesDifference > 0
    ? `${minuteStr} early`
    : `${minuteStr} late`;
};

/**
 * Get current date and time as ISO 8601 UTC string
 * @returns {string} - ISO 8601 formatted datetime in UTC
 */
export const getCurrentDateTime = () => {
  return new Date().toISOString();
};

/**
 * Format a datetime for display in the UI
 * @param {string|Date} dateTime - The date/time to format
 * @returns {string} - Formatted string like "Dec 14, 2:30 PM"
 */
export const formatDateTime = (dateTime) => {
  if (!dateTime) return '';

  const date = new Date(dateTime);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};
