/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // PRIMARY COLOR: Penna (Soft Blue) - Main accent for buttons, links, active states
        primary: {
          50: '#f6f8fc',   // Lightest - subtle backgrounds
          100: '#eef2f9',  // Very light - hover backgrounds
          200: '#dce5f3',  // Light - disabled states
          300: '#c5d5ea',  // Medium light - borders
          400: '#aac4e3',  // Medium - secondary elements
          500: '#B9C7E0',  // BASE - Main primary color (Penna)
          600: '#96a8c9',  // Medium dark - hover states
          700: '#7689b1',  // Dark - active states (USE FOR BUTTONS - accessibility)
          800: '#5c6d94',  // Darker - pressed states
          900: '#475776',  // Darkest - high contrast elements
        },

        // BACKGROUND COLOR: Hudson (Soft Peachy/Beige) - Main application background
        hudson: {
          50: '#fdfcfc',   // Almost white
          100: '#faf8f7',  // Very light
          200: '#f5f1ef',  // Light
          300: '#f0e7e3',  // Medium light
          400: '#ebe0d8',  // Medium
          500: '#EBDBD3',  // BASE - Main background color (Hudson)
          600: '#d4bfb3',  // Medium dark
          700: '#bda393',  // Dark
          800: '#a68777',  // Darker
          900: '#8a6f5f',  // Darkest
        },

        // CARD/SURFACE COLOR: French Porcelain (Light Lavender/White) - Elevated surfaces
        porcelain: {
          50: '#fefefe',   // Pure white
          100: '#fcfcfd',  // Almost white
          200: '#f9f9fb',  // Very light
          300: '#f7f7f9',  // Light
          400: '#f6f5f8',  // Medium light
          500: '#F5F4F7',  // BASE - Card background (French Porcelain)
          600: '#dddce3',  // Medium dark
          700: '#c5c4cf',  // Dark
          800: '#adacbb',  // Darker
          900: '#9594a7',  // Darkest
        },

        // SUCCESS COLOR: Farmer's Market (Muted Olive) - Success states, confirmations
        success: {
          50: '#f7f8f6',   // Lightest
          100: '#eff0ed',  // Very light
          200: '#dfe1db',  // Light
          300: '#cfd2c9',  // Medium light
          400: '#bfc3b7',  // Medium
          500: '#8F917C',  // BASE - Success color (Farmer's Market)
          600: '#7a7c69',  // Medium dark
          700: '#656756',  // Dark
          800: '#505243',  // Darker
          900: '#3b3d30',  // Darkest
        },

        // WARNING COLOR: Country Rubble (Warm Tan) - Warnings, cautions
        warning: {
          50: '#faf9f7',   // Lightest
          100: '#f5f3ef',  // Very light
          200: '#ebe7df',  // Light
          300: '#e1dbcf',  // Medium light
          400: '#d7cfbf',  // Medium
          500: '#D0BEA3',  // BASE - Warning color (Country Rubble)
          600: '#b8a48a',  // Medium dark
          700: '#a08a71',  // Dark
          800: '#887058',  // Darker
          900: '#70563f',  // Darkest
        },

        // TEXT/NEUTRAL COLOR: Umbra (Dark Charcoal) - Primary text, dark UI elements
        umbra: {
          50: '#f5f5f5',   // Very light gray (for subtle backgrounds)
          100: '#e8e8e8',  // Light gray
          200: '#d1d1d1',  // Medium light gray
          300: '#bababa',  // Medium gray
          400: '#a3a3a3',  // Gray
          500: '#8c8c8c',  // Medium dark gray
          600: '#757575',  // Dark gray
          700: '#5e5e5e',  // Darker gray
          800: '#474747',  // Very dark gray
          900: '#1F1F1F',  // BASE - Main text color (Umbra)
        },

        // ERROR COLOR: Custom red for consistency
        error: {
          50: '#fef2f2',   // Lightest
          100: '#fee2e2',  // Very light
          200: '#fecaca',  // Light
          300: '#fca5a5',  // Medium light
          400: '#f87171',  // Medium
          500: '#ef4444',  // BASE - Standard error red
          600: '#dc2626',  // Medium dark
          700: '#b91c1c',  // Dark
          800: '#991b1b',  // Darker
          900: '#7f1d1d',  // Darkest
        },
      }
    },
  },
  plugins: [],
}

