import React from 'react';

const CountryCodeSelect = ({ value, onChange, name = 'countryCode', className = '' }) => {
  const countryCodes = [
    { code: '+91', flag: '🇮🇳', country: 'India' },
    { code: '+1', flag: '🇺🇸', country: 'USA' },
    { code: '+44', flag: '🇬🇧', country: 'UK' },
    { code: '+61', flag: '🇦🇺', country: 'Australia' },
    { code: '+81', flag: '🇯🇵', country: 'Japan' },
    { code: '+86', flag: '🇨🇳', country: 'China' },
    { code: '+33', flag: '🇫🇷', country: 'France' },
    { code: '+49', flag: '🇩🇪', country: 'Germany' },
    { code: '+39', flag: '🇮🇹', country: 'Italy' },
    { code: '+34', flag: '🇪🇸', country: 'Spain' },
    { code: '+7', flag: '🇷🇺', country: 'Russia' },
    { code: '+55', flag: '🇧🇷', country: 'Brazil' },
    { code: '+27', flag: '🇿🇦', country: 'South Africa' },
    { code: '+971', flag: '🇦🇪', country: 'UAE' },
    { code: '+966', flag: '🇸🇦', country: 'Saudi Arabia' },
    { code: '+65', flag: '🇸🇬', country: 'Singapore' },
    { code: '+60', flag: '🇲🇾', country: 'Malaysia' },
    { code: '+62', flag: '🇮🇩', country: 'Indonesia' },
    { code: '+63', flag: '🇵🇭', country: 'Philippines' },
    { code: '+66', flag: '🇹🇭', country: 'Thailand' },
  ];

  return (
    <select
      name={name}
      value={value}
      onChange={onChange}
      className={`input w-24 text-sm px-2 ${className}`}
    >
      {countryCodes.map(({ code, flag }) => (
        <option key={code} value={code}>
          {flag} {code}
        </option>
      ))}
    </select>
  );
};

export default CountryCodeSelect;
