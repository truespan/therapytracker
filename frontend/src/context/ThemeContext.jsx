import React, { createContext, useState, useEffect, useContext } from 'react';

const ThemeContext = createContext(null);

// Helper function to get initial theme
const getInitialTheme = () => {
  if (typeof window === 'undefined') return 'light';
  
  const savedTheme = localStorage.getItem('theme-preference');
  return savedTheme || 'light';
};

// Helper function to apply theme to document
const applyThemeToDocument = (theme) => {
  if (typeof document === 'undefined') return;
  
  const root = document.documentElement;
  
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
};

export const ThemeProvider = ({ children }) => {
  // Initialize theme from localStorage immediately to prevent flash
  const [theme, setTheme] = useState(() => getInitialTheme());

  // Apply theme immediately on mount and when theme changes
  useEffect(() => {
    // Apply theme as early as possible
    applyThemeToDocument(theme);
    
    // Persist to localStorage
    localStorage.setItem('theme-preference', theme);
  }, [theme]);

  // Ensure theme is applied on initial mount (in case it wasn't applied during SSR)
  useEffect(() => {
    applyThemeToDocument(theme);
  }, []);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const value = {
    theme,
    toggleTheme,
    isDark: theme === 'dark'
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
};

export default ThemeContext;
