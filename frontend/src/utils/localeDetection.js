/**
 * Detect user locale from browser, timezone, and localStorage
 * @returns {Object} Object with locale and countryCode
 */
export const detectUserLocale = () => {
  // ALWAYS check timezone FIRST to detect India (Asia/Kolkata)
  // This takes precedence over everything else
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  console.log('🔍 [detectUserLocale] Browser timezone:', timezone);
  
  // Detect India based on timezone (Asia/Kolkata or other Indian timezones)
  const isIndiaTimezone = timezone && (
    timezone.includes('Asia/Kolkata') || 
    timezone.includes('Asia/Calcutta') ||
    timezone === 'Asia/Kolkata' ||
    timezone.startsWith('Asia/') && (timezone.includes('Calcutta') || timezone.includes('Kolkata'))
  );
  
  // If India timezone detected, ALWAYS return India regardless of browser/localStorage
  if (isIndiaTimezone) {
    console.log('🔍 [detectUserLocale] ✅ India detected from timezone:', timezone);
    // Clear any incorrect saved locale in localStorage
    const savedLocale = localStorage.getItem('userLocale');
    if (savedLocale) {
      try {
        const parsed = JSON.parse(savedLocale);
        if (parsed.countryCode !== 'IN') {
          console.log('🔍 [detectUserLocale] Clearing incorrect saved locale:', parsed);
          localStorage.removeItem('userLocale');
        }
      } catch (e) {
        // Ignore parsing errors
      }
    }
    const indiaLocale = {
      locale: 'en-IN',
      countryCode: 'IN'
    };
    console.log('🔍 [detectUserLocale] Returning India locale:', indiaLocale);
    return indiaLocale;
  }
  
  // If not India timezone, check localStorage (user preference)
  const savedLocale = localStorage.getItem('userLocale');
  console.log('🔍 [detectUserLocale] localStorage savedLocale:', savedLocale);
  
  if (savedLocale) {
    try {
      const parsed = JSON.parse(savedLocale);
      if (parsed.locale && parsed.countryCode) {
        console.log('🔍 [detectUserLocale] Using saved locale from localStorage:', parsed);
        return parsed;
      }
    } catch (e) {
      console.log('🔍 [detectUserLocale] Invalid JSON in localStorage, continuing to browser detection');
      // Invalid JSON, continue to browser detection
    }
  }
  
  // Get from browser
  const browserLocale = navigator.language || navigator.userLanguage || 'en-US'; // Default to 'en-US' for non-India users
  console.log('🔍 [detectUserLocale] Browser locale:', browserLocale);
  
  // Parse locale (e.g., 'en-US' -> {locale: 'en-US', countryCode: 'US'})
  const parts = browserLocale.split('-');
  const language = parts[0].toLowerCase();
  // Default to 'US' (which will use USD) if no country code is present
  // Only India (detected via timezone) should use INR, all others use USD
  const country = parts[1] ? parts[1].toUpperCase() : 'US'; // Default to US for USD
  
  const result = {
    locale: `${language}-${country}`,
    countryCode: country
  };
  
  console.log('🔍 [detectUserLocale] Final result:', result);
  return result;
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
 * Get appropriate locale for currency code
 * @param {string} currencyCode - Currency code (e.g., 'USD', 'INR')
 * @returns {string} Appropriate locale string
 */
const getLocaleForCurrency = (currencyCode) => {
  // Map currency codes to their appropriate locales for correct symbol display
  const currencyLocaleMap = {
    'INR': 'en-IN',  // Indian Rupee - displays ₹
    'USD': 'en-US',  // US Dollar - displays $
    'GBP': 'en-GB',
    'EUR': 'de-DE',
    'CAD': 'en-CA',
    'AUD': 'en-AU',
  };
  
  const locale = currencyLocaleMap[currencyCode] || (currencyCode === 'INR' ? 'en-IN' : 'en-US');
  console.log('🌍 [getLocaleForCurrency] Currency:', currencyCode, '→ Locale:', locale);
  return locale;
};

/**
 * Format currency based on locale
 * @param {number} amount - Amount to format
 * @param {string} currencyCode - Currency code (e.g., 'USD', 'INR')
 * @param {string} locale - Locale string (e.g., 'en-US', 'en-IN') - IGNORED, always uses locale based on currency code
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, currencyCode = 'INR', locale = null) => {
  console.log('💰 [formatCurrency] Called with:', { amount, currencyCode, locale });
  
  try {
    // ALWAYS use the appropriate locale for the currency code to ensure correct symbol display
    // Ignore the passed locale parameter - currency code determines the locale
    // For INR, this ensures ₹ symbol, for USD it ensures $ symbol
    const appropriateLocale = getLocaleForCurrency(currencyCode);
    console.log('💰 [formatCurrency] Using locale:', appropriateLocale, 'for currency:', currencyCode);
    
    const formatted = new Intl.NumberFormat(appropriateLocale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
    
    console.log('💰 [formatCurrency] Formatted result:', formatted);
    return formatted;
  } catch (error) {
    console.error('💰 [formatCurrency] Error formatting currency:', error);
    // Fallback formatting
    const symbol = currencyCode === 'INR' ? '₹' : currencyCode === 'USD' ? '$' : currencyCode;
    const fallback = `${symbol} ${amount.toFixed(2)}`;
    console.log('💰 [formatCurrency] Using fallback:', fallback);
    return fallback;
  }
};
