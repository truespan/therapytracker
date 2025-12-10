// Convert rating strings to numeric values for charting
export const ratingToNumber = (ratingValue, fieldType) => {
  switch (fieldType) {
    case 'rating_5':
      const rating5Map = {
        'Excellent': 5,
        'Good': 4,
        'Fair': 3,
        'Poor': 2,
        'Very Poor': 1
      };
      return rating5Map[ratingValue] || 0;
    
    case 'rating_4':
      const rating4Map = {
        'Excellent': 4,
        'Good': 3,
        'Fair': 2,
        'Poor': 1
      };
      return rating4Map[ratingValue] || 0;
    
    case 'sleep_quality':
      const sleepMap = {
        'Always': 5,
        'Mostly': 4,
        'Sometimes': 3,
        'Rarely': 2,
        'Very rarely': 1
      };
      return sleepMap[ratingValue] || 0;
    
    case 'energy_levels':
      const energyMap = {
        'Energetic': 4,
        'Tired': 3,
        'Drained': 2,
        'Fatigued': 1
      };
      return energyMap[ratingValue] || 0;
    
    default:
      return 0;
  }
};

// Transform profile data for radar chart
export const transformProfileForRadar = (profileData) => {
  if (!profileData || profileData.length === 0) return [];
  
  return profileData.map(item => ({
    field: item.field_name,
    value: ratingToNumber(item.rating_value, item.field_type),
    fullMark: item.field_type === 'rating_4' || item.field_type === 'energy_levels' ? 4 : 5,
    category: item.category
  }));
};

// Transform multiple sessions for comparison
export const transformMultipleSessionsForRadar = (profileHistory) => {
  if (!profileHistory || profileHistory.length === 0) return { fields: [], sessions: [] };
  
  // Get all unique fields
  const fields = [];
  const fieldMap = new Map();
  
  profileHistory.forEach(session => {
    if (session.ratings) {
      session.ratings.forEach(rating => {
        if (!fieldMap.has(rating.field_id)) {
          fieldMap.set(rating.field_id, {
            field_name: rating.field_name,
            field_type: rating.field_type,
            category: rating.category
          });
          fields.push(rating.field_name);
        }
      });
    }
  });
  
  // Transform each session
  const sessions = profileHistory.map(session => {
    const sessionData = {
      session_number: session.session_number,
      session_date: session.session_date,
    };
    
    if (session.ratings) {
      session.ratings.forEach(rating => {
        sessionData[rating.field_name] = ratingToNumber(rating.rating_value, rating.field_type);
      });
    }
    
    return sessionData;
  });
  
  return { fields, sessions, fieldMap };
};

// Get color for session line in chart
export const getSessionColor = (index) => {
  const colors = [
    '#00F0A8', // primary blue
    '#10b981', // green
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#f97316', // orange
  ];
  return colors[index % colors.length];
};

// Format date for display
export const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
};

// Get rating options based on field type
export const getRatingOptions = (fieldType) => {
  switch (fieldType) {
    case 'rating_5':
      return ['Excellent', 'Good', 'Fair', 'Poor', 'Very Poor'];
    case 'rating_4':
      return ['Excellent', 'Good', 'Fair', 'Poor'];
    case 'sleep_quality':
      return ['Always', 'Mostly', 'Sometimes', 'Rarely', 'Very rarely'];
    case 'energy_levels':
      return ['Energetic', 'Tired', 'Drained', 'Fatigued'];
    default:
      return [];
  }
};

// Get color for rating options
export const getRatingColor = (rating) => {
  const colorMap = {
    'Excellent': '#00c951',
    'Good': '#7ccf00',
    'Fair': '#f0b100',
    'Poor': '#ff6900',
    'Very Poor': '#fb2c36'
  };
  return colorMap[rating] || '#6b7280'; // Default to gray if not found
};

// Get hover color (20% darker) for rating options
export const getHoverColor = (rating) => {
  const hoverColorMap = {
    'Excellent': '#00a142',
    'Good': '#63a600',
    'Fair': '#c08e00',
    'Poor': '#cc5400',
    'Very Poor': '#c9222b'
  };
  return hoverColorMap[rating] || '#4b5563'; // Default to darker gray if not found
};

