/**
 * Detect user locale from browser and localStorage
 * @returns {Object} Object with locale and countryCode
 */
export const detectUserLocale = () => {
  // Try to get from localStorage (user preference)
  const savedLocale = localStorage.getItem('userLocale');
  if (savedLocale) {
    try {
      const parsed = JSON.parse(savedLocale);
      if (parsed.locale && parsed.countryCode) {
        return parsed;
      }
    } catch (e) {
      // Invalid JSON, continue to browser detection
    }
  }
  
  // Get from browser
  const browserLocale = navigator.language || navigator.userLanguage || 'en-IN';
  
  // Parse locale (e.g., 'en-US' -> {locale: 'en-US', countryCode: 'US'})
  const parts = browserLocale.split('-');
  const language = parts[0].toLowerCase();
  const country = parts[1] ? parts[1].toUpperCase() : 'IN'; // Default to India
  
  return {
    locale: `${language}-${country}`,
    countryCode: country
  };
};

/**
 * Save user locale preference to localStorage
 * @param {string} locale - Locale string (e.g., 'en-US')
 * @param {string} countryCode - Country code (e.g., 'US')
 */
export const saveUserLocale = (locale, countryCode) => {
  const localeData = {
    locale,
    countryCode
  };
  localStorage.setItem('userLocale', JSON.stringify(localeData));
};

/**
 * Clear saved locale preference
 */
export const clearUserLocale = () => {
  localStorage.removeItem('userLocale');
};

/**
 * Format currency based on locale
 * @param {number} amount - Amount to format
 * @param {string} currencyCode - Currency code (e.g., 'USD', 'INR')
 * @param {string} locale - Locale string (e.g., 'en-US', 'en-IN')
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, currencyCode = 'INR', locale = 'en-IN') => {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  } catch (error) {
    // Fallback formatting
    return `${currencyCode} ${amount.toFixed(2)}`;
  }
};
