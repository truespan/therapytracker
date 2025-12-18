/**
 * Date/Time Utility Functions (Frontend)
 *
 * Following DateAndTimeHandlingLogic33.pdf requirements:
 * - Use date-fns-tz for timezone conversions
 * - Detect user timezone with Intl.DateTimeFormat().resolvedOptions().timeZone
 * - Display dates in user's local timezone
 * - Send dates to API as ISO 8601 UTC
 */

import {
  format,
  parseISO,
  isValid,
  addDays,
  startOfDay,
  isAfter,
  isBefore
} from 'date-fns';

import {
  formatInTimeZone,
  fromZonedTime,
  toZonedTime
} from 'date-fns-tz';

/**
 * Get the user's IANA timezone
 * Uses Intl API as required by spec (not moment.tz.guess())
 * @returns {string} IANA timezone identifier (e.g., 'America/New_York', 'Asia/Kolkata')
 */
export function getUserTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    console.error('Failed to detect user timezone:', error);
    return 'UTC'; // Fallback to UTC
  }
}

/**
 * Format UTC date in user's timezone
 * @param {Date|string} utcDate - UTC date/time
 * @param {string} formatString - Format string (date-fns format tokens)
 * @param {string} timezone - Optional timezone (defaults to user's timezone)
 * @returns {string} Formatted date string in user's timezone
 */
export function formatInUserTimezone(utcDate, formatString = 'MMM dd, yyyy hh:mm a', timezone = null) {
  if (!utcDate) {
    return '';
  }

  try {
    const tz = timezone || getUserTimezone();
    const dateObj = typeof utcDate === 'string' ? parseISO(utcDate) : utcDate;

    if (!isValid(dateObj)) {
      console.error('Invalid date:', utcDate);
      return '';
    }

    return formatInTimeZone(dateObj, tz, formatString);
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
}

/**
 * Format date and time (default format)
 * @param {Date|string} utcDate - UTC date/time
 * @returns {string} Formatted as "Dec 18, 2025 02:30 PM"
 */
export function formatDateTime(utcDate) {
  return formatInUserTimezone(utcDate, 'MMM dd, yyyy hh:mm a');
}

/**
 * Format date only
 * @param {Date|string} utcDate - UTC date/time
 * @returns {string} Formatted as "Dec 18, 2025"
 */
export function formatDate(utcDate) {
  return formatInUserTimezone(utcDate, 'MMM dd, yyyy');
}

/**
 * Format time only
 * @param {Date|string} utcDate - UTC date/time
 * @returns {string} Formatted as "02:30 PM"
 */
export function formatTime(utcDate) {
  return formatInUserTimezone(utcDate, 'hh:mm a');
}

/**
 * Convert local date/time to UTC for API submission
 * @param {Date|string} localDate - Date in user's local timezone
 * @param {string} timezone - Optional timezone (defaults to user's timezone)
 * @returns {Date} Date converted to UTC
 */
export function convertLocalToUTC(localDate, timezone = null) {
  if (!localDate) {
    throw new Error('Date is required');
  }

  try {
    const tz = timezone || getUserTimezone();
    const dateObj = typeof localDate === 'string' ? parseISO(localDate) : localDate;

    if (!isValid(dateObj)) {
      throw new Error('Invalid date');
    }

    return fromZonedTime(dateObj, tz);
  } catch (error) {
    console.error('Error converting local to UTC:', error);
    throw error;
  }
}

/**
 * Convert UTC date/time to user's local timezone
 * @param {string} utcString - ISO 8601 UTC string from API
 * @param {string} timezone - Optional timezone (defaults to user's timezone)
 * @returns {Date} Date in user's local timezone
 */
export function convertUTCToLocal(utcString, timezone = null) {
  if (!utcString) {
    throw new Error('UTC string is required');
  }

  try {
    const tz = timezone || getUserTimezone();
    const utcDate = parseISO(utcString);

    if (!isValid(utcDate)) {
      throw new Error('Invalid UTC date string');
    }

    return toZonedTime(utcDate, tz);
  } catch (error) {
    console.error('Error converting UTC to local:', error);
    throw error;
  }
}

/**
 * Combine date and time strings into UTC Date for API submission
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @param {string} timeString - Time in HH:mm format
 * @param {string} timezone - Optional timezone (defaults to user's timezone)
 * @returns {Date} Combined date/time as UTC Date object
 */
export function combineDateAndTime(dateString, timeString, timezone = null) {
  if (!dateString || !timeString) {
    throw new Error('Date and time strings are required');
  }

  try {
    const tz = timezone || getUserTimezone();

    // Ensure time has seconds
    let normalizedTime = timeString;
    if (timeString.split(':').length === 2) {
      normalizedTime = `${timeString}:00`;
    }

    // Create datetime string
    const datetimeString = `${dateString}T${normalizedTime}`;

    // Convert from user's timezone to UTC
    return fromZonedTime(datetimeString, tz);
  } catch (error) {
    console.error('Error combining date and time:', error);
    throw error;
  }
}

/**
 * Get date string for HTML date input (YYYY-MM-DD)
 * Converts UTC date to user's local date
 * @param {Date|string} utcDate - UTC date/time
 * @returns {string} Date in YYYY-MM-DD format for input[type="date"]
 */
export function getDateForInput(utcDate) {
  if (!utcDate) {
    return '';
  }

  try {
    const dateObj = typeof utcDate === 'string' ? parseISO(utcDate) : utcDate;

    if (!isValid(dateObj)) {
      return '';
    }

    const localDate = toZonedTime(dateObj, getUserTimezone());
    return format(localDate, 'yyyy-MM-dd');
  } catch (error) {
    console.error('Error getting date for input:', error);
    return '';
  }
}

/**
 * Get time string for HTML time input (HH:mm)
 * Converts UTC time to user's local time
 * @param {Date|string} utcDate - UTC date/time
 * @returns {string} Time in HH:mm format for input[type="time"]
 */
export function getTimeForInput(utcDate) {
  if (!utcDate) {
    return '';
  }

  try {
    const dateObj = typeof utcDate === 'string' ? parseISO(utcDate) : utcDate;

    if (!isValid(dateObj)) {
      return '';
    }

    const localDate = toZonedTime(dateObj, getUserTimezone());
    return format(localDate, 'HH:mm');
  } catch (error) {
    console.error('Error getting time for input:', error);
    return '';
  }
}

/**
 * Get datetime string for HTML datetime-local input (YYYY-MM-DDTHH:mm)
 * Converts UTC datetime to user's local datetime
 * @param {Date|string} utcDate - UTC date/time
 * @returns {string} Datetime in YYYY-MM-DDTHH:mm format for input[type="datetime-local"]
 */
export function getDateTimeForInput(utcDate) {
  if (!utcDate) {
    return '';
  }

  try {
    const dateObj = typeof utcDate === 'string' ? parseISO(utcDate) : utcDate;

    if (!isValid(dateObj)) {
      return '';
    }

    const localDate = toZonedTime(dateObj, getUserTimezone());
    return format(localDate, "yyyy-MM-dd'T'HH:mm");
  } catch (error) {
    console.error('Error getting datetime for input:', error);
    return '';
  }
}

/**
 * Parse ISO date string
 * @param {string} isoString - ISO 8601 date string
 * @returns {Date} Parsed Date object
 */
export function parseISODate(isoString) {
  if (!isoString) {
    throw new Error('ISO string is required');
  }

  const date = parseISO(isoString);

  if (!isValid(date)) {
    throw new Error(`Invalid ISO date string: ${isoString}`);
  }

  return date;
}

/**
 * Get array of next N days starting from today
 * Used for availability calendar
 * @param {number} count - Number of days
 * @returns {Array<Date>} Array of Date objects
 */
export function getNextNDays(count = 7) {
  const days = [];
  const today = startOfDay(new Date());

  for (let i = 0; i < count; i++) {
    days.push(addDays(today, i));
  }

  return days;
}

/**
 * Check if date is in the future
 * @param {Date|string} date - Date to check
 * @returns {boolean} True if date is after now
 */
export function isFutureDate(date) {
  if (!date) {
    return false;
  }

  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    const now = new Date();

    return isAfter(dateObj, now);
  } catch (error) {
    console.error('Error checking future date:', error);
    return false;
  }
}

/**
 * Check if date is in the past
 * @param {Date|string} date - Date to check
 * @returns {boolean} True if date is before now
 */
export function isPastDate(date) {
  if (!date) {
    return false;
  }

  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    const now = new Date();

    return isBefore(dateObj, now);
  } catch (error) {
    console.error('Error checking past date:', error);
    return false;
  }
}

/**
 * Validate date string
 * @param {string} dateString - Date string to validate
 * @returns {boolean} True if valid date
 */
export function isValidDate(dateString) {
  if (!dateString) {
    return false;
  }

  try {
    const date = parseISO(dateString);
    return isValid(date);
  } catch (error) {
    return false;
  }
}

/**
 * Get current date/time as ISO string (UTC)
 * For API submissions
 * @returns {string} Current datetime as ISO 8601 string
 */
export function getCurrentUTC() {
  return new Date().toISOString();
}

// Export everything as named exports
export default {
  getUserTimezone,
  formatInUserTimezone,
  formatDateTime,
  formatDate,
  formatTime,
  convertLocalToUTC,
  convertUTCToLocal,
  combineDateAndTime,
  getDateForInput,
  getTimeForInput,
  getDateTimeForInput,
  parseISODate,
  getNextNDays,
  isFutureDate,
  isPastDate,
  isValidDate,
  getCurrentUTC
};
