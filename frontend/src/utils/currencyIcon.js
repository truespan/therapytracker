import React from 'react';
import { DollarSign } from 'lucide-react';

/**
 * Check if the user's timezone is Asia/Kolkata
 * @returns {boolean} True if timezone is Asia/Kolkata or Asia/Calcutta
 */
export const isKolkataTimezone = () => {
  try {
    if (typeof window === 'undefined') {
      return false; // Server-side rendering
    }
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    // Check for both Asia/Kolkata and Asia/Calcutta (some browsers use the older name)
    const isKolkata = timezone === 'Asia/Kolkata' || timezone === 'Asia/Calcutta';
    console.log('[isKolkataTimezone] Detected timezone:', timezone, 'Is Kolkata:', isKolkata);
    return isKolkata;
  } catch (error) {
    console.error('Error detecting timezone:', error);
    return false;
  }
};

/**
 * Currency Icon Component
 * Shows rupee symbol (₹) for Asia/Kolkata timezone, DollarSign icon for others
 */
export const CurrencyIcon = ({ className = '', style, ...props }) => {
  const isKolkata = isKolkataTimezone();
  
  if (isKolkata) {
    // Extract size classes from className to apply appropriate font size
    // For rupee symbol, we need to render it as text with proper styling
    let fontSize = '1.5rem'; // Default size (h-6 equivalent)
    
    // Extract size from className (h-4, h-5, h-6, etc.)
    const sizeMatch = className.match(/h-(\d+)/);
    if (sizeMatch) {
      const size = parseInt(sizeMatch[1]);
      fontSize = `${size * 0.25}rem`; // Convert Tailwind size to rem (h-6 = 1.5rem)
    }
    
    // Extract all text color classes (including dark mode variants)
    // Match patterns like: text-green-600, dark:text-green-400, etc.
    const colorClasses = (className.match(/(?:dark:)?text-\S+/g) || []).join(' ');
    
    // Remove icon-specific size classes (h-*, w-*) but keep everything else
    // This preserves color classes, dark mode, and other utility classes
    const cleanedClassName = className
      .replace(/\bh-\d+\b/g, '')
      .replace(/\bw-\d+\b/g, '')
      .replace(/\binline\b/g, '')
      .trim();
    
    const combinedStyle = {
      fontSize: fontSize,
      lineHeight: '1',
      display: 'inline-block',
      fontWeight: 'bold',
      ...style
    };
    
    // Use the cleaned className which should already include color classes
    const finalClassName = cleanedClassName || undefined;
    
    return (
      <span 
        className={finalClassName}
        style={combinedStyle}
        {...props}
      >
        ₹
      </span>
    );
  }
  
  return <DollarSign className={className} style={style} {...props} />;
};

