import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const DarkModeToggle = ({ variant = 'switch', className = '', showLabel = false }) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  if (variant === 'switch') {
    // Switch variant for Settings tabs
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        {showLabel && (
          <span className="text-sm font-medium text-gray-700 dark:text-dark-text-primary">
            Dark Mode
          </span>
        )}
        <button
          onClick={toggleTheme}
          className={`relative inline-flex items-center h-6 w-11 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
            isDark ? 'bg-dark-primary-600' : 'bg-gray-200'
          }`}
          aria-label="Toggle dark mode"
          role="switch"
          aria-checked={isDark}
        >
          <span
            className={`inline-flex items-center justify-center h-5 w-5 transform rounded-full bg-white transition-transform ${
              isDark ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          >
            {isDark ? (
              <Moon className="h-3 w-3 text-dark-primary-600" />
            ) : (
              <Sun className="h-3 w-3 text-yellow-500" />
            )}
          </span>
        </button>
      </div>
    );
  }

  // Button variant for mobile menu
  return (
    <button
      onClick={toggleTheme}
      className={`flex items-center space-x-3 w-full px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-bg-secondary transition-colors ${className}`}
      aria-label="Toggle dark mode"
    >
      {isDark ? (
        <Moon className="h-5 w-5 text-gray-600 dark:text-dark-text-secondary" />
      ) : (
        <Sun className="h-5 w-5 text-gray-600" />
      )}
      <span className="text-sm font-medium text-gray-700 dark:text-dark-text-primary">
        {isDark ? 'Dark Mode' : 'Light Mode'}
      </span>
    </button>
  );
};

export default DarkModeToggle;
