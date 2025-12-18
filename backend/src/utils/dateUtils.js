/**
 * Date/Time Utility Functions
 *
 * Following DateAndTimeHandlingLogic33.pdf requirements:
 * - Store everything in UTC
 * - Use date-fns and date-fns-tz for all date operations
 * - Never use manual date arithmetic
 * - Always return ISO 8601 format for API responses
 */

const {
  addHours: dateFnsAddHours,
  addMinutes: dateFnsAddMinutes,
  addDays: dateFnsAddDays,
  differenceInMinutes: dateFnsDifferenceInMinutes,
  format: dateFnsFormat,
  parseISO,
  isValid
} = require('date-fns');

const {
  formatInTimeZone,
  zonedTimeToUtc,
  utcToZonedTime
} = require('date-fns-tz');

/**
 * Get current date/time in UTC
 * @returns {Date} Current date in UTC
 */
function getCurrentUTC() {
  return new Date();
}

/**
 * Convert Date to ISO 8601 string with explicit UTC timezone
 * @param {Date|string} date - Date to convert
 * @returns {string} ISO 8601 string with 'Z' suffix (e.g., "2025-12-18T04:30:00.000Z")
 */
function toISOStringUTC(date) {
  if (!date) {
    throw new Error('Date parameter is required');
  }

  const dateObj = typeof date === 'string' ? parseISO(date) : date;

  if (!isValid(dateObj)) {
    throw new Error('Invalid date provided');
  }

  return dateObj.toISOString();
}

/**
 * Parse ISO date string to UTC Date object
 * @param {string} dateString - ISO 8601 date string
 * @returns {Date} Date object in UTC
 */
function parseUTCDate(dateString) {
  if (!dateString) {
    throw new Error('Date string is required');
  }

  const date = parseISO(dateString);

  if (!isValid(date)) {
    throw new Error(`Invalid date string: ${dateString}`);
  }

  return date;
}

/**
 * Add hours to a date
 * @param {Date} date - Base date
 * @param {number} hours - Number of hours to add (can be negative)
 * @returns {Date} New date with hours added
 */
function addHours(date, hours) {
  if (!date || typeof hours !== 'number') {
    throw new Error('Valid date and hours number are required');
  }

  return dateFnsAddHours(date, hours);
}

/**
 * Add minutes to a date
 * @param {Date} date - Base date
 * @param {number} minutes - Number of minutes to add (can be negative)
 * @returns {Date} New date with minutes added
 */
function addMinutes(date, minutes) {
  if (!date || typeof minutes !== 'number') {
    throw new Error('Valid date and minutes number are required');
  }

  return dateFnsAddMinutes(date, minutes);
}

/**
 * Add days to a date
 * @param {Date} date - Base date
 * @param {number} days - Number of days to add (can be negative)
 * @returns {Date} New date with days added
 */
function addDays(date, days) {
  if (!date || typeof days !== 'number') {
    throw new Error('Valid date and days number are required');
  }

  return dateFnsAddDays(date, days);
}

/**
 * Calculate difference between two dates in minutes
 * @param {Date} dateLeft - Later date
 * @param {Date} dateRight - Earlier date
 * @returns {number} Difference in minutes
 */
function differenceInMinutes(dateLeft, dateRight) {
  if (!dateLeft || !dateRight) {
    throw new Error('Both dates are required');
  }

  return dateFnsDifferenceInMinutes(dateLeft, dateRight);
}

/**
 * Convert UTC date to a specific timezone
 * @param {Date|string} utcDate - Date in UTC
 * @param {string} timezone - IANA timezone name (e.g., 'Asia/Kolkata', 'America/New_York')
 * @returns {Date} Date in specified timezone
 */
function convertToTimezone(utcDate, timezone) {
  if (!utcDate || !timezone) {
    throw new Error('Date and timezone are required');
  }

  if (!isValidTimezone(timezone)) {
    throw new Error(`Invalid timezone: ${timezone}`);
  }

  const dateObj = typeof utcDate === 'string' ? parseISO(utcDate) : utcDate;
  return utcToZonedTime(dateObj, timezone);
}

/**
 * Format date in a specific timezone
 * @param {Date|string} utcDate - Date in UTC
 * @param {string} timezone - IANA timezone name
 * @param {string} formatString - Format string (date-fns format tokens)
 * @returns {string} Formatted date string
 */
function formatInTimezone(utcDate, timezone, formatString = 'yyyy-MM-dd HH:mm:ss') {
  if (!utcDate || !timezone) {
    throw new Error('Date and timezone are required');
  }

  if (!isValidTimezone(timezone)) {
    throw new Error(`Invalid timezone: ${timezone}`);
  }

  const dateObj = typeof utcDate === 'string' ? parseISO(utcDate) : utcDate;
  return formatInTimeZone(dateObj, timezone, formatString);
}

/**
 * Validate IANA timezone string
 * @param {string} timezone - Timezone to validate
 * @returns {boolean} True if valid timezone
 */
function isValidTimezone(timezone) {
  if (!timezone || typeof timezone !== 'string') {
    return false;
  }

  try {
    // Try to format a date in this timezone
    // If it throws, timezone is invalid
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Validate ISO 8601 date string
 * @param {string} dateString - Date string to validate
 * @returns {boolean} True if valid ISO date string
 */
function isValidISODate(dateString) {
  if (!dateString || typeof dateString !== 'string') {
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
 * Format date for PostgreSQL TIMESTAMPTZ insertion
 * @param {Date|string} date - Date to format
 * @returns {string} ISO 8601 string compatible with PostgreSQL TIMESTAMPTZ
 */
function formatForPostgres(date) {
  if (!date) {
    throw new Error('Date is required');
  }

  return toISOStringUTC(date);
}

/**
 * Combine date and time strings into a UTC Date object
 * Replaces string concatenation pattern used in AvailabilitySlot model
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @param {string} timeString - Time in HH:mm or HH:mm:ss format
 * @param {string} timezone - Optional timezone (defaults to UTC)
 * @returns {Date} Combined date/time as UTC Date object
 */
function combineDateAndTime(dateString, timeString, timezone = 'UTC') {
  if (!dateString || !timeString) {
    throw new Error('Date and time strings are required');
  }

  // Ensure time has seconds
  let normalizedTime = timeString;
  if (timeString.split(':').length === 2) {
    normalizedTime = `${timeString}:00`;
  }

  // Create ISO datetime string
  const datetimeString = `${dateString}T${normalizedTime}`;

  // If timezone is UTC, parse directly
  if (timezone === 'UTC') {
    const date = parseISO(datetimeString + 'Z');
    if (!isValid(date)) {
      throw new Error(`Invalid date/time: ${datetimeString}`);
    }
    return date;
  }

  // Otherwise, convert from timezone to UTC
  if (!isValidTimezone(timezone)) {
    throw new Error(`Invalid timezone: ${timezone}`);
  }

  return zonedTimeToUtc(datetimeString, timezone);
}

/**
 * Format date as YYYY-MM-DD (date-only)
 * @param {Date|string} date - Date to format
 * @returns {string} Date in YYYY-MM-DD format
 */
function formatDate(date) {
  if (!date) {
    throw new Error('Date is required');
  }

  const dateObj = typeof date === 'string' ? parseISO(date) : date;

  if (!isValid(dateObj)) {
    throw new Error('Invalid date provided');
  }

  return dateFnsFormat(dateObj, 'yyyy-MM-dd');
}

/**
 * Format time as HH:mm
 * @param {Date|string} date - Date to extract time from
 * @returns {string} Time in HH:mm format
 */
function formatTime(date) {
  if (!date) {
    throw new Error('Date is required');
  }

  const dateObj = typeof date === 'string' ? parseISO(date) : date;

  if (!isValid(dateObj)) {
    throw new Error('Invalid date provided');
  }

  return dateFnsFormat(dateObj, 'HH:mm');
}

module.exports = {
  // UTC Management
  getCurrentUTC,
  toISOStringUTC,
  parseUTCDate,

  // Date Arithmetic
  addHours,
  addMinutes,
  addDays,
  differenceInMinutes,

  // Timezone Conversion
  convertToTimezone,
  formatInTimezone,

  // Validation
  isValidTimezone,
  isValidISODate,

  // Database Formatting
  formatForPostgres,
  combineDateAndTime,

  // Display Formatting
  formatDate,
  formatTime
};
