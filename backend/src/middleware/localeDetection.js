const geoip = require('geoip-lite');

/**
 * Parse locale string to extract locale and country code
 * Examples: 'en-US' -> {locale: 'en-US', countryCode: 'US'}
 *           'en' -> {locale: 'en-IN', countryCode: 'IN'} (default to India)
 *           'hi-IN' -> {locale: 'hi-IN', countryCode: 'IN'}
 */
function parseLocale(localeString) {
  if (!localeString) {
    return { locale: 'en-IN', countryCode: 'IN' };
  }
  
  // Remove any quality values (e.g., 'en-US;q=0.9' -> 'en-US')
  const cleaned = localeString.split(';')[0].trim();
  const parts = cleaned.split('-');
  const language = parts[0].toLowerCase();
  const country = parts[1] ? parts[1].toUpperCase() : 'IN'; // Default to India
  
  return {
    locale: `${language}-${country}`,
    countryCode: country
  };
}

/**
 * Detect user locale from request
 * Priority: 
 * 1. Query parameter (?locale=en-US or ?country_code=US)
 * 2. Accept-Language header
 * 3. IP-based geolocation (fallback)
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const detectLocale = (req, res, next) => {
  let locale = 'en-IN'; // Default
  let countryCode = 'IN'; // Default
  
  // Priority 1: Check query parameter
  if (req.query.locale) {
    const parsed = parseLocale(req.query.locale);
    locale = parsed.locale;
    countryCode = parsed.countryCode;
  }
  // Alternative: Check country_code query parameter
  else if (req.query.country_code) {
    countryCode = req.query.country_code.toUpperCase();
    // Try to infer locale from country code
    const langMatch = req.headers['accept-language'];
    const language = langMatch ? langMatch.split(',')[0].split('-')[0].toLowerCase() : 'en';
    locale = `${language}-${countryCode}`;
  }
  // Priority 2: Check Accept-Language header
  else if (req.headers['accept-language']) {
    const parsed = parseLocale(req.headers['accept-language'].split(',')[0]);
    locale = parsed.locale;
    countryCode = parsed.countryCode;
  }
  // Priority 3: IP-based detection (fallback)
  else {
    try {
      // Get client IP (handle proxies)
      let ip = req.ip;
      if (!ip || ip === '::1' || ip === '127.0.0.1') {
        // Check x-forwarded-for header (from proxy/load balancer)
        const forwarded = req.headers['x-forwarded-for'];
        if (forwarded) {
          ip = forwarded.split(',')[0].trim();
        } else if (req.connection && req.connection.remoteAddress) {
          ip = req.connection.remoteAddress;
        }
      }
      
      if (ip) {
        const geo = geoip.lookup(ip);
        if (geo && geo.country) {
          countryCode = geo.country;
          // Try to get language from Accept-Language header, default to 'en'
          const langMatch = req.headers['accept-language'];
          const language = langMatch ? langMatch.split(',')[0].split('-')[0].toLowerCase() : 'en';
          locale = `${language}-${countryCode}`;
        }
      }
    } catch (error) {
      console.error('GeoIP lookup failed:', error);
      // Fall back to defaults
    }
  }
  
  // Attach locale info to request object
  req.locale = locale;
  req.countryCode = countryCode;
  
  next();
};

module.exports = { detectLocale, parseLocale };
