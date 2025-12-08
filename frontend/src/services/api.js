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
    console.log('[API Debug] Full URL:', config.baseURL + config.url);
    console.log('[API Debug] Method:', config.method);
    console.log('[API Debug] Params:', config.params);

    // Don't add auth token for public endpoints like email verification
    const isPublicEndpoint = config.url.includes('/auth/verify-email') ||
                             config.url.includes('/auth/signup') ||
                             config.url.includes('/auth/login') ||
                             config.url.includes('/auth/forgot-password') ||
                             config.url.includes('/auth/reset-password') ||
                             config.url.includes('/google-calendar/callback');

    if (token && !isPublicEndpoint) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('[API Debug] Request error:', error);
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => {
    console.log('[API Debug] Response success:', response.config.url, '| Status:', response.status);
    return response;
  },
  (error) => {
    console.error('[API Debug] Response error:', error.config?.url);
    console.error('[API Debug] Error status:', error.response?.status);
    console.error('[API Debug] Error data:', error.response?.data);
    console.error('[API Debug] Error message:', error.message);

    // Don't auto-redirect to login for public endpoints
    const isPublicEndpoint = error.config?.url?.includes('/auth/verify-email') ||
                             error.config?.url?.includes('/auth/signup') ||
                             error.config?.url?.includes('/auth/login') ||
                             error.config?.url?.includes('/auth/forgot-password') ||
                             error.config?.url?.includes('/auth/reset-password') ||
                             error.config?.url?.includes('/google-calendar/callback');

    if (error.response?.status === 401 && !isPublicEndpoint) {
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
  verifyEmail: (token, type) => api.get('/auth/verify-email', { params: { token, type } }),
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

  // Partner management
  createPartner: (organizationId, data) => api.post(`/organizations/${organizationId}/partners`, data),
  updatePartner: (organizationId, partnerId, data) => api.put(`/organizations/${organizationId}/partners/${partnerId}`, data),
  deactivatePartner: (organizationId, partnerId, data) => api.post(`/organizations/${organizationId}/partners/${partnerId}/deactivate`, data),
  activatePartner: (organizationId, partnerId) => api.post(`/organizations/${organizationId}/partners/${partnerId}/activate`),
  deletePartner: (organizationId, partnerId) => api.delete(`/organizations/${organizationId}/partners/${partnerId}`),
  resendVerificationEmail: (organizationId, partnerId) => api.post(`/organizations/${organizationId}/partners/${partnerId}/resend-verification`),
  getPartnerClients: (organizationId, partnerId) => api.get(`/organizations/${organizationId}/partners/${partnerId}/clients`),
  reassignClients: (organizationId, data) => api.post(`/organizations/${organizationId}/reassign-clients`, data),

  // Client management
  deleteClient: (organizationId, clientId) => api.delete(`/organizations/${organizationId}/clients/${clientId}`),
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
  getLatestUserChart: (userId) => api.get(`/charts/user/${userId}/latest`),
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

// Google Calendar APIs
export const googleCalendarAPI = {
  initiateAuth: () => api.get('/google-calendar/auth'),
  getStatus: () => api.get('/google-calendar/status'),
  disconnect: () => api.post('/google-calendar/disconnect'),
  toggleSync: (enabled) => api.post('/google-calendar/toggle-sync', { enabled }),
  resyncEvent: (eventType, eventId) => api.post(`/google-calendar/resync/${eventType}/${eventId}`)
};

// Case History APIs
export const caseHistoryAPI = {
  get: (userId) => api.get(`/users/${userId}/case-history`),
  save: (userId, data) => api.post(`/users/${userId}/case-history`, data)
};

// Mental Status Examination APIs
export const mentalStatusAPI = {
  get: (userId) => api.get(`/users/${userId}/mental-status`),
  save: (userId, data) => api.post(`/users/${userId}/mental-status`, data)
};

export default api;

