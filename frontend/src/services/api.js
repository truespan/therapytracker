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
    console.log('[API Debug] Request to:', config.url, '| Token present:', !!token);
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
};

// Partner APIs
export const partnerAPI = {
  getById: (id) => api.get(`/partners/${id}`),
  update: (id, data) => api.put(`/partners/${id}`, data),
  getUsers: (id) => api.get(`/partners/${id}/users`),
};

// Organization APIs
export const organizationAPI = {
  getAll: () => api.get('/organizations'),
  getById: (id) => api.get(`/organizations/${id}`),
  update: (id, data) => api.put(`/organizations/${id}`, data),
  getPartners: (id) => api.get(`/organizations/${id}/partners`),
  getUsers: (id) => api.get(`/organizations/${id}/users`),
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
  getUpcoming: (partnerId, days = 7) => {
    return api.get(`/partners/${partnerId}/upcoming-appointments`, {
      params: { days }
    });
  },
  getByUser: (userId) => api.get(`/users/${userId}/appointments`),
  update: (id, data) => api.put(`/appointments/${id}`, data),
  delete: (id) => api.delete(`/appointments/${id}`)
};

// Chart APIs
export const chartAPI = {
  shareChart: (data) => api.post('/charts/share', data),
  shareQuestionnaireChart: (data) => api.post('/charts/share-questionnaire', data),
  getUserCharts: (userId) => api.get(`/charts/user/${userId}`),
  getPartnerUserCharts: (partnerId, userId) => api.get(`/charts/partner/${partnerId}/user/${userId}`),
  deleteChart: (id) => api.delete(`/charts/${id}`)
};

// Therapy Session APIs
export const therapySessionAPI = {
  create: (data) => api.post('/therapy-sessions', data),
  createStandalone: (data) => api.post('/therapy-sessions/standalone', data),
  getById: (id) => api.get(`/therapy-sessions/${id}`),
  getByPartner: (partnerId, startDate, endDate) => {
    const params = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    return api.get(`/partners/${partnerId}/therapy-sessions`, { params });
  },
  getByPartnerAndUser: (partnerId, userId) => api.get(`/partners/${partnerId}/users/${userId}/therapy-sessions`),
  getByUser: (userId) => api.get(`/users/${userId}/therapy-sessions`),
  update: (id, data) => api.put(`/therapy-sessions/${id}`, data),
  delete: (id) => api.delete(`/therapy-sessions/${id}`),

  // Session-questionnaire management
  assignQuestionnaire: (sessionId, data) => api.post(`/therapy-sessions/${sessionId}/assign-questionnaire`, data),
  getSessionQuestionnaires: (sessionId) => api.get(`/therapy-sessions/${sessionId}/questionnaires`),
  removeQuestionnaireFromSession: (sessionId, assignmentId) =>
    api.delete(`/therapy-sessions/${sessionId}/questionnaires/${assignmentId}`)
};

// Video Session APIs
export const videoSessionAPI = {
  create: (data) => api.post('/video-sessions', data),
  getById: (id) => api.get(`/video-sessions/${id}`),
  getByPartner: (partnerId, startDate, endDate) => {
    const params = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    return api.get(`/partners/${partnerId}/video-sessions`, { params });
  },
  getByUser: (userId) => api.get(`/users/${userId}/video-sessions`),
  update: (id, data) => api.put(`/video-sessions/${id}`, data),
  delete: (id) => api.delete(`/video-sessions/${id}`),
  verifyPassword: (id, password) => api.post(`/video-sessions/${id}/verify-password`, { password })
};

// Questionnaire APIs
export const questionnaireAPI = {
  // Questionnaire management
  create: (data) => api.post('/questionnaires', data),
  getByPartner: (partnerId) => api.get(`/questionnaires/partner/${partnerId}`),
  getById: (id) => api.get(`/questionnaires/${id}`),
  update: (id, data) => api.put(`/questionnaires/${id}`, data),
  delete: (id) => api.delete(`/questionnaires/${id}`),
  getStats: (id) => api.get(`/questionnaires/${id}/stats`),

  // Assignment management
  assign: (data) => api.post('/questionnaires/assign', data),
  getUserAssignments: (userId) => api.get(`/questionnaires/assignments/user/${userId}`),
  getPartnerAssignments: (partnerId) => api.get(`/questionnaires/assignments/partner/${partnerId}`),
  getAssignment: (id) => api.get(`/questionnaires/assignments/${id}`),
  deleteAssignment: (id) => api.delete(`/questionnaires/assignments/${id}`),

  // Response management
  saveResponses: (assignmentId, responses, sessionId = null, textResponse = null) =>
    api.post(`/questionnaires/assignments/${assignmentId}/responses`, {
      responses,
      session_id: sessionId,
      text_response: textResponse
    }),
  getResponses: (assignmentId) => api.get(`/questionnaires/assignments/${assignmentId}/responses`),
  getUserHistory: (userId, questionnaireId) => api.get(`/questionnaires/user/${userId}/history/${questionnaireId}`),
  getAggregatedResponses: (questionnaireId, userId) =>
    api.get(`/questionnaires/${questionnaireId}/user/${userId}/aggregated`),

  // Comparison chart helpers
  getCompletedByTypeForUser: (userId) => api.get(`/questionnaires/completed-by-type/user/${userId}`),
  getResponsesForComparison: (assignmentIds) => api.post('/questionnaires/responses-for-comparison', { assignmentIds })
};

export default api;

