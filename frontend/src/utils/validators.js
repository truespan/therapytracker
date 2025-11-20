export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const validatePhone = (phone) => {
  const re = /^[\d\s\-+()]+$/;
  return phone.length >= 10 && re.test(phone);
};

export const validatePassword = (password) => {
  return password.length >= 6;
};

export const validateAge = (age) => {
  return age > 0 && age < 150;
};

export const validateRequired = (value) => {
  return value && value.trim().length > 0;
};

export const validateForm = (fields, values) => {
  const errors = {};
  
  fields.forEach(field => {
    const value = values[field.name];
    
    if (field.required && !validateRequired(value)) {
      errors[field.name] = `${field.label} is required`;
    } else if (field.type === 'email' && value && !validateEmail(value)) {
      errors[field.name] = 'Invalid email address';
    } else if (field.type === 'phone' && value && !validatePhone(value)) {
      errors[field.name] = 'Invalid phone number';
    } else if (field.type === 'password' && value && !validatePassword(value)) {
      errors[field.name] = 'Password must be at least 6 characters';
    } else if (field.type === 'number' && field.name === 'age' && value && !validateAge(value)) {
      errors[field.name] = 'Invalid age';
    }
  });
  
  return errors;
};

