import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  signup: (userData) => api.post('/auth/signup', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  getCurrentUser: () => api.get('/auth/me'),
  forgotPassword: (identifier) => api.post('/auth/forgot-password', { identifier }),
  resetPassword: (token, newPassword) => api.post('/auth/reset-password', { token, newPassword }),
};

// User APIs
export const userAPI = {
  getById: (id) => api.get(`/users/${id}`),
  update: (id, data) => api.put(`/users/${id}`, data),
  getProfile: (id) => api.get(`/users/${id}/profile`),
  getPartners: (id) => api.get(`/users/${id}/partners`),
  assignToPartner: (userId, partnerId) => api.post('/users/assign-partner', { userId, partnerId }),
  getSessions: (userId) => api.get(`/users/${userId}/sessions`),
};

// Partner APIs
export const partnerAPI = {
  getById: (id) => api.get(`/partners/${id}`),
  update: (id, data) => api.put(`/partners/${id}`, data),
  getUsers: (id) => api.get(`/partners/${id}/users`),
  getUserProfile: (partnerId, userId) => api.get(`/partners/${partnerId}/users/${userId}/profile`),
};

// Organization APIs
export const organizationAPI = {
  getAll: () => api.get('/organizations'),
  getById: (id) => api.get(`/organizations/${id}`),
  update: (id, data) => api.put(`/organizations/${id}`, data),
  getPartners: (id) => api.get(`/organizations/${id}/partners`),
  getUsers: (id) => api.get(`/organizations/${id}/users`),
};

// Session APIs
export const sessionAPI = {
  create: (data) => api.post('/sessions', data),
  getById: (id) => api.get(`/sessions/${id}`),
  update: (id, data) => api.put(`/sessions/${id}`, data),
  delete: (id) => api.delete(`/sessions/${id}`),
  saveProfile: (sessionId, ratings) => api.post(`/sessions/${sessionId}/profile`, { ratings }),
};

// Profile APIs
export const profileAPI = {
  getAllFields: (sessionId = null) => {
    const params = sessionId ? { params: { session_id: sessionId } } : {};
    return api.get('/profile-fields', params);
  },
  createField: (data) => api.post('/profile-fields', data),
  getUserProfileData: (userId) => api.get(`/profile-data/users/${userId}`),
};

// Admin APIs
export const adminAPI = {
  getAllOrganizations: () => api.get('/admin/organizations'),
  createOrganization: (data) => api.post('/admin/organizations', data),
  updateOrganization: (id, data) => api.put(`/admin/organizations/${id}`, data),
  deactivateOrganization: (id) => api.post(`/admin/organizations/${id}/deactivate`),
  activateOrganization: (id) => api.post(`/admin/organizations/${id}/activate`),
  deleteOrganization: (id) => api.delete(`/admin/organizations/${id}`),
  getOrganizationMetrics: (id) => api.get(`/admin/organizations/${id}/metrics`),
  getDashboardStats: () => api.get('/admin/dashboard/stats'),
};

// Appointment APIs
export const appointmentAPI = {
  create: (data) => api.post('/appointments', data),
  getById: (id) => api.get(`/appointments/${id}`),
  getByPartner: (partnerId, startDate, endDate) => {
    const params = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    return api.get(`/partners/${partnerId}/appointments`, { params });
  },
  getByUser: (userId) => api.get(`/users/${userId}/appointments`),
  update: (id, data) => api.put(`/appointments/${id}`, data),
  delete: (id) => api.delete(`/appointments/${id}`)
};

export default api;

