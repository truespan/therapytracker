/**
 * Text Measurement Utilities
 *
 * Provides functions for measuring text width and calculating optimal pill sizes
 * for questionnaire answer options using Canvas API for accurate measurements.
 */

/**
 * Measures the rendered width of text using Canvas API
 * @param {string} text - The text to measure
 * @param {string} font - CSS font string (e.g., "600 14px system-ui, -apple-system, sans-serif")
 * @returns {number} Width in pixels
 */
export const measureTextWidth = (text, font = '600 14px system-ui, -apple-system, sans-serif') => {
  // SSR safety check
  if (typeof window === 'undefined') return 0;

  // Create or reuse canvas for text measurement (singleton pattern)
  const canvas = measureTextWidth.canvas || (measureTextWidth.canvas = document.createElement('canvas'));
  const context = canvas.getContext('2d');
  context.font = font;

  const metrics = context.measureText(text);
  return metrics.width;
};

/**
 * Progressive fallback strategy for pill display configuration
 * Implements a 4-step decision tree to optimize display:
 * 1. Try without scroll, without ellipsis
 * 2. Try without scroll, with ellipsis (max 1 option)
 * 3. Enable scroll with wider pills (to reduce ellipsis)
 * 4. Last resort: multiline text
 *
 * @param {Array<string>} optionTexts - Array of option text strings
 * @param {number} containerWidth - Available container width in pixels (default: 848)
 * @param {number} optionCount - Number of options
 * @param {Object} constraints - Display constraints
 * @param {number} constraints.min - Minimum width in pixels (default: 96)
 * @param {number} constraints.max - Maximum width in pixels (default: 280)
 * @param {number} constraints.padding - Horizontal padding in pixels (default: 24)
 * @param {number} constraints.gap - Gap between pills in pixels (default: 12)
 * @returns {Object} { width: number, useScroll: boolean, useMultiline: boolean, needsTruncation: boolean }
 */
export const calculatePillDisplay = (
  optionTexts,
  containerWidth = 848,
  optionCount,
  constraints = { min: 96, max: 280, padding: 24, gap: 12 }
) => {
  const { min, max, padding, gap } = constraints;

  // Measure all option text widths
  const textWidths = optionTexts.map(text => measureTextWidth(text));
  const longestTextWidth = Math.max(...textWidths);

  // Calculate gap spacing
  const totalGapWidth = gap * (optionCount - 1);

  // ==========================================
  // STEP 1: Try without scroll, without ellipsis
  // ==========================================
  const fullContentWidth = longestTextWidth + padding;
  const totalWidthNeeded = (fullContentWidth * optionCount) + totalGapWidth;

  if (totalWidthNeeded <= containerWidth) {
    // All options fit with full text - NO truncation needed
    return {
      width: Math.round(Math.max(min, fullContentWidth)),
      useScroll: false,
      useMultiline: false,
      needsTruncation: false
    };
  }

  // ==========================================
  // STEP 2: Try without scroll, with ellipsis
  // ==========================================
  const availableWidthNoScroll = containerWidth - totalGapWidth;
  const widthPerOptionNoScroll = availableWidthNoScroll / optionCount;
  const constrainedWidthNoScroll = Math.max(min, Math.min(max, widthPerOptionNoScroll));

  // Count how many options would need ellipsis at this width
  const usableWidthNoScroll = constrainedWidthNoScroll - padding;
  const ellipsisCountNoScroll = textWidths.filter(w => w > usableWidthNoScroll).length;

  if (ellipsisCountNoScroll <= 1) {
    // At most 1 option needs ellipsis - apply truncation
    return {
      width: Math.round(constrainedWidthNoScroll),
      useScroll: false,
      useMultiline: false,
      needsTruncation: ellipsisCountNoScroll > 0
    };
  }

  // ==========================================
  // STEP 3: Enable scroll, try with wider pills
  // ==========================================
  // With scroll enabled, we can use wider pills up to max constraint
  const widerWidth = Math.min(fullContentWidth, max);
  const usableWidthWithScroll = widerWidth - padding;
  const ellipsisCountWithScroll = textWidths.filter(w => w > usableWidthWithScroll).length;

  if (ellipsisCountWithScroll <= 1) {
    // With scroll, 0-1 ellipsis - apply truncation if needed
    return {
      width: Math.round(Math.max(min, widerWidth)),
      useScroll: true,
      useMultiline: false,
      needsTruncation: ellipsisCountWithScroll > 0
    };
  }

  // ==========================================
  // STEP 4: Last resort - multiline text
  // ==========================================
  // Even with scroll, more than 1 option needs ellipsis
  // Allow text wrapping to 2 lines to show full text - NO truncation
  return {
    width: Math.round(Math.max(min, widerWidth)),
    useScroll: true,
    useMultiline: true,
    needsTruncation: false
  };
};

/**
 * Determines if text needs truncation
 * @param {string} text - The text to check
 * @param {number} width - Available width in pixels
 * @param {number} padding - Horizontal padding in pixels (default: 24)
 * @returns {boolean} True if text will overflow
 */
export const needsTruncation = (text, width, padding = 24) => {
  const textWidth = measureTextWidth(text);
  return textWidth > (width - padding);
};
