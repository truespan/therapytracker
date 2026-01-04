/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // Enable class-based dark mode
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // PRIMARY COLOR: Teal - Main accent for buttons, links, active states
        primary: {
          50: '#e0f2f1',   // Lightest - subtle backgrounds
          100: '#b2dfdb',  // Very light - hover backgrounds
          200: '#80cbc4',  // Light - disabled states
          300: '#4db6ac',  // Medium light - borders
          400: '#26a69a',  // Medium - secondary elements
          500: '#009688',  // BASE - Main primary color (Teal)
          600: '#00897b',  // Medium dark - hover states
          700: '#00796b',  // Dark - active states (USE FOR BUTTONS - accessibility)
          800: '#00695c',  // Darker - pressed states
          900: '#004d40',  // Darkest - high contrast elements
        },

        // BACKGROUND COLOR: Light Gray/Beige - Main application background
        hudson: {
          50: '#fafaf9',   // Almost white
          100: '#f7f6f5',  // Very light
          200: '#f5f4f2',  // Light
          300: '#f3f2f0',  // Medium light
          400: '#f2f0ef',  // Medium
          500: '#F2F0EF',  // BASE - Main background color
          600: '#d8d6d4',  // Medium dark
          700: '#bebbb9',  // Dark
          800: '#a4a09e',  // Darker
          900: '#8a8683',  // Darkest
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

        // TEXT/NEUTRAL COLOR: Dark Gray - Primary text, dark UI elements
        umbra: {
          50: '#f5f5f5',   // Very light gray (for subtle backgrounds)
          100: '#e8e8e8',  // Light gray
          200: '#d1d1d1',  // Medium light gray
          300: '#bababa',  // Medium gray
          400: '#999999',  // Gray
          500: '#666666',  // Medium dark gray
          600: '#4d4d4d',  // Dark gray
          700: '#404040',  // Darker gray
          800: '#333333',  // Very dark gray
          900: '#333333',  // BASE - Main text color
        },

        // SECONDARY/ACCENT COLOR: Yellow - For buttons and accents
        secondary: {
          50: '#fffbf0',   // Lightest
          100: '#fff7e0',  // Very light
          200: '#fff3d1',  // Light
          300: '#ffefc2',  // Medium light
          400: '#ffdf93',  // Medium
          500: '#ffcb56',  // BASE - Secondary/accent color
          600: '#ffc142',  // Medium dark - hover states
          700: '#ffb72e',  // Dark - active states
          800: '#e6a84d',  // Darker - pressed states
          900: '#cc9544',  // Darkest - high contrast
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

        // GLOSSY PINK: Based on #FF6FAF for availability slots
        glossyPink: {
          50: '#FFF0F8',   // Lightest - glossy background
          100: '#FFE0F1',  // Very light
          200: '#FFC1E3',  // Light
          300: '#FFA2D5',  // Medium light
          400: '#FF83C7',  // Medium
          500: '#FF6FAF',  // BASE - Main pink color
          600: '#E65A9D',  // Medium dark
          700: '#CC458B',  // Dark
          800: '#B33079',  // Darker
          900: '#991B67',  // Darkest
        },

        // BANNER COLORS: Custom colors for home page banners
        banner: {
          bg: '#FFF4CC',  // Light yellow background
          text: '#5C3A00', // Dark brown text
        },

        // DARK MODE COLORS: Optimized for dark theme
        dark: {
          bg: {
            primary: '#0F172A',    // Main background (slate-900)
            secondary: '#1E293B',  // Elevated surfaces (slate-800)
            tertiary: '#334155',   // Cards/panels (slate-700)
          },
          text: {
            primary: '#F1F5F9',    // Main text (slate-100)
            secondary: '#CBD5E1',  // Secondary text (slate-300)
            tertiary: '#94A3B8',   // Muted text (slate-400)
          },
          border: '#475569',       // Borders (slate-600)
          primary: {
            500: '#14B8A6',        // Brighter teal for dark mode
            600: '#0D9488',
            700: '#0F766E',
          },
        },
      }
    },
  },
  plugins: [],
}

