/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e6fff9',
          100: '#ccfff3',
          200: '#99ffe7',
          300: '#66ffdb',
          400: '#33f8cf',
          500: '#00F0A8',  // Main spring green
          600: '#00d999',  // Slightly darker for primary buttons
          700: '#00a878',  // Darker for hover states
          800: '#008a63',  // Dark for white bg buttons
          900: '#006b4d',  // Very dark green
        }
      }
    },
  },
  plugins: [],
}

