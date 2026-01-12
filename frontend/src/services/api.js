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
    // Note: /blogs/my/blogs requires authentication, so exclude it from public endpoints
    const isPublicEndpoint = config.url.includes('/auth/verify-email') ||
                             config.url.includes('/auth/signup') ||
                             config.url.includes('/auth/login') ||
                             config.url.includes('/auth/forgot-password') ||
                             config.url.includes('/auth/reset-password') ||
                             config.url.includes('/google-calendar/callback') ||
                             config.url.includes('/contact') ||
                             config.url.includes('/public/partners') ||
                             config.url.includes('/public/razorpay') ||
                             (config.url.includes('/blogs') && config.method === 'get' && !config.url.includes('/blogs/my/blogs'));

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
    // Note: /blogs/my/blogs requires authentication, so exclude it from public endpoints
    const isPublicEndpoint = error.config?.url?.includes('/auth/verify-email') ||
                             error.config?.url?.includes('/auth/signup') ||
                             error.config?.url?.includes('/auth/login') ||
                             error.config?.url?.includes('/auth/forgot-password') ||
                             error.config?.url?.includes('/auth/reset-password') ||
                             error.config?.url?.includes('/google-calendar/callback') ||
                             error.config?.url?.includes('/contact') ||
                             error.config?.url?.includes('/public/partners') ||
                             error.config?.url?.includes('/public/razorpay') ||
                             (error.config?.url?.includes('/blogs') && error.config?.method === 'get' && !error.config?.url?.includes('/blogs/my/blogs'));

    if (error.response?.status === 401 && !isPublicEndpoint) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Only redirect if not already on login page to prevent full page reload
      const currentPath = window.location.pathname;
      if (currentPath !== '/login' && currentPath !== '/signup' && currentPath !== '/forgot-password') {
        // Dispatch a custom event instead of using window.location to avoid page reload
        window.dispatchEvent(new CustomEvent('unauthorized'));
      }
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  signup: (userData) => api.post('/auth/signup', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  googleAuth: (token) => api.post('/auth/google', { token }),
  googleCompleteSignup: (data) => api.post('/auth/google/complete-signup', data),
  getCurrentUser: () => api.get('/auth/me'),
  forgotPassword: (identifier) => api.post('/auth/forgot-password', { identifier }),
  resetPassword: (token, newPassword) => api.post('/auth/reset-password', { token, newPassword }),
  changePassword: (currentPassword, newPassword) => api.post('/auth/change-password', { currentPassword, newPassword }),
  verifyEmail: (token, type) => api.get('/auth/verify-email', { params: { token, type } }),
  acceptTerms: () => api.post('/auth/accept-terms'),
};

// User APIs
export const userAPI = {
  getById: (id) => api.get(`/users/${id}`),
  update: (id, data) => api.put(`/users/${id}`, data),
  getProfile: (id) => api.get(`/users/${id}/profile`),
  getPartners: (id) => api.get(`/users/${id}/partners`),
  assignToPartner: (userId, partnerId) => api.post('/users/assign-partner', { userId, partnerId }),
  linkToTherapist: (partnerId) => api.post('/users/link-therapist', { partner_id: partnerId }),
};

// Partner APIs
export const partnerAPI = {
  getById: (id) => api.get(`/partners/${id}`),
  update: (id, data) => api.put(`/partners/${id}`, data),
  getUsers: (id) => api.get(`/partners/${id}/users`),
  setDefaultReportTemplate: (id, templateId) => api.post(`/partners/${id}/default-report-template`, { template_id: templateId }),
  getDefaultReportTemplate: (id) => api.get(`/partners/${id}/default-report-template`),
  selectSubscription: (data) => api.post('/partners/subscription/select', data),
  cancelSubscription: () => api.post('/partners/subscription/cancel'),
  updateFeeSettings: (id, data) => api.post(`/partners/${id}/fee-settings`, data),
  getFeeSettings: (id) => api.get(`/partners/${id}/fee-settings`),
};

// Organization APIs
export const organizationAPI = {
  getAll: () => api.get('/organizations'),
  getById: (id) => api.get(`/organizations/${id}`),
  getSubscriptionDetails: (id) => api.get(`/organizations/${id}/subscription`),
  updateSubscription: (id, data) => api.put(`/organizations/${id}/subscription`, data),
  calculateSubscriptionPrice: (id, data) => api.post(`/organizations/${id}/subscription/calculate-price`, data),
  update: (id, data) => api.put(`/organizations/${id}`, data),
  getPartners: (id) => api.get(`/organizations/${id}/partners`),
  getUsers: (id) => api.get(`/organizations/${id}/users`),
  cancelSubscription: () => api.post('/organizations/subscription/cancel'),
  
  // Partner subscription management (available for all organizations)
  getPartnerSubscriptions: (id) => api.get(`/organizations/${id}/partner-subscriptions`),
  assignPartnerSubscriptions: (id, data) => api.post(`/organizations/${id}/partner-subscriptions/assign`, data),
  assignPartnerSubscriptionsToAll: (id, data) => api.post(`/organizations/${id}/partner-subscriptions/assign-all`, data),
  updatePartnerSubscription: (id, subscriptionId, data) => api.put(`/organizations/${id}/partner-subscriptions/${subscriptionId}`, data),
  removePartnerSubscriptions: (id, data) => api.post(`/organizations/${id}/partner-subscriptions/remove`, data),
  
  // Trial plan assignment (TheraPTrack controlled orgs only)
  assignTrialPlan: (orgId, partnerId, planId, billingPeriod) =>
    api.post(`/partner-subscriptions/organizations/${orgId}/assign-trial`, {
      partner_id: partnerId,
      subscription_plan_id: planId,
      billing_period: billingPeriod
    }),

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

  // Therapist signup URL management
  getTherapistSignupToken: (organizationId) => api.get(`/organizations/${organizationId}/therapist-signup-token`),
  
  // Referral code verification (public endpoint)
  verifyReferralCode: (code) => api.get(`/organizations/verify-referral-code/${code}`),

  // Therapist video session management (for theraptrack-controlled organizations)
  getTherapistsVideoSettings: (organizationId) => api.get(`/organizations/${organizationId}/therapists/video-settings`),
  updateTherapistVideoSettings: (organizationId, therapistId, video_sessions_enabled) =>
    api.put(`/organizations/${organizationId}/therapists/${therapistId}/video-settings`, { video_sessions_enabled }),
  bulkUpdateTherapistVideoSettings: (organizationId, therapistIds, video_sessions_enabled) =>
    api.put(`/organizations/${organizationId}/therapists/video-settings/bulk`, { therapistIds, video_sessions_enabled }),

  // Therapist blog permission management (for theraptrack-controlled organizations)
  getTherapistsBlogPermissions: (organizationId) => api.get(`/organizations/${organizationId}/therapists/blog-permissions`),
  grantBlogPermission: (organizationId, partnerId) => api.post(`/organizations/${organizationId}/therapists/${partnerId}/blog-permission/grant`),
  revokeBlogPermission: (organizationId, partnerId) => api.post(`/organizations/${organizationId}/therapists/${partnerId}/blog-permission/revoke`),
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
  checkAndCreateEarnings: (data) => api.post('/admin/earnings/check-and-create', data),
  backfillOrderNotes: () => api.post('/admin/earnings/backfill-order-notes'),
  getAllPartners: () => api.get('/admin/partners'),
  updatePartner: (id, data) => api.put(`/admin/partners/${id}`, data),
  setForNewTherapists: (id, value) => api.put(`/admin/organizations/${id}/for-new-therapists`, { value }),
  // Report Templates
  getAllTemplates: () => api.get('/admin/report-templates'),
  getTemplateCount: () => api.get('/admin/report-templates/count'),
  uploadTemplate: (formData) => api.post('/admin/report-templates', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  updateTemplate: (id, data) => api.put(`/admin/report-templates/${id}`, data),
  deleteTemplate: (id) => api.delete(`/admin/report-templates/${id}`),
  downloadTemplate: (id) => api.get(`/admin/report-templates/${id}/download`, {
    responseType: 'blob'
  }),
  // Payouts
  getPayoutCandidates: () => api.get('/admin/payouts/candidates'),
  createPayout: (data) => api.post('/admin/payouts/create', data),
  getPayoutHistory: (filters) => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.start_date) params.append('start_date', filters.start_date);
    if (filters?.end_date) params.append('end_date', filters.end_date);
    if (filters?.limit) params.append('limit', filters.limit);
    return api.get(`/admin/payouts?${params.toString()}`);
  },
};

// Subscription Plan APIs
export const subscriptionPlanAPI = {
  getAll: (locale, countryCode) => {
    const params = {};
    if (locale) params.locale = locale;
    if (countryCode) params.country_code = countryCode;
    return api.get('/subscription-plans', { params });
  },
  getActive: (locale, countryCode) => {
    const params = {};
    if (locale) params.locale = locale;
    if (countryCode) params.country_code = countryCode;
    return api.get('/subscription-plans/active', { params });
  },
  getById: (id) => api.get(`/subscription-plans/${id}`),
  create: (data) => api.post('/subscription-plans', data),
  update: (id, data) => api.put(`/subscription-plans/${id}`, data),
  delete: (id) => api.delete(`/subscription-plans/${id}`),
  calculatePrice: (data) => api.post('/subscription-plans/calculate', data),
  getIndividualPlansForSelection: (locale, countryCode) => {
    const params = {};
    if (locale) params.locale = locale;
    if (countryCode) params.country_code = countryCode;
    return api.get('/subscription-plans/individual/selection', { params });
  },
  getOrganizationPlansForSelection: (therapistCount, locale, countryCode) => {
    const params = { therapist_count: therapistCount };
    if (locale) params.locale = locale;
    if (countryCode) params.country_code = countryCode;
    return api.get('/subscription-plans/organization/selection', { params });
  },
  logEvent: (data) => api.post('/subscription-plans/log-event', data),
  checkFirstLogin: () => api.get('/subscription-plans/check-first-login'),
  getDefaultPlan: () => api.get('/admin/default-subscription-plan'),
  setDefaultPlan: (planId) => api.post('/admin/default-subscription-plan', { plan_id: planId }),
  // Locale pricing management
  getPlanLocales: (planId) => api.get(`/subscription-plans/${planId}/locales`),
  upsertPlanLocale: (planId, data) => api.post(`/subscription-plans/${planId}/locales`, data),
  deletePlanLocale: (planId, localeId) => api.delete(`/subscription-plans/${planId}/locales/${localeId}`),
  getAvailableLocales: () => api.get('/subscription-plans/locales/available')
};

// Report Template APIs (for partners)
export const reportTemplateAPI = {
  getAll: () => api.get('/report-templates'),
  download: (id) => api.get(`/report-templates/${id}/download`, {
    responseType: 'blob'
  }),
};

// Generated Report APIs
export const generatedReportAPI = {
  // Partner APIs
  create: (data) => api.post('/reports', data),
  getAll: () => api.get('/reports'),
  getByClient: (userId) => api.get(`/reports/client/${userId}`),
  getById: (id) => api.get(`/reports/${id}`),
  download: (id) => api.get(`/reports/${id}/download`, {
    responseType: 'blob'
  }),
  downloadDocx: (id) => api.get(`/reports/${id}/download-docx`, {
    responseType: 'blob'
  }),
  update: (id, data) => api.put(`/reports/${id}`, data),
  share: (id) => api.post(`/reports/${id}/share`),
  unshare: (id) => api.post(`/reports/${id}/unshare`),
  delete: (id) => api.delete(`/reports/${id}`),
  // User APIs
  getUserSharedReports: () => api.get('/user/reports'),
  getUnreadCount: () => api.get('/user/reports/unread-count'),
  markAsViewed: (id) => api.post(`/user/reports/${id}/mark-viewed`),
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
  getCurrentMonthCount: (partnerId) => api.get(`/partners/${partnerId}/appointments/current-month-count`),
  getByUser: (userId, partnerId = null) => {
    const params = {};
    if (partnerId) params.partnerId = partnerId;
    return api.get(`/users/${userId}/appointments`, { params });
  },
  update: (id, data) => api.put(`/appointments/${id}`, data),
  delete: (id) => api.delete(`/appointments/${id}`),
  checkConflicts: (partnerId, appointmentDate, endDate, excludeId = null) => {
    const params = {
      partner_id: partnerId,
      appointment_date: appointmentDate,
      end_date: endDate
    };
    if (excludeId) {
      params.exclude_id = excludeId;
    }
    return api.get('/appointments/check-conflicts', { params });
  }
};

// Availability Slot APIs
export const availabilityAPI = {
  // Partner methods
  createSlot: (slotData) => api.post('/availability-slots', slotData),
  getPartnerSlots: (partnerId, startDate, endDate) => {
    const params = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    return api.get(`/partners/${partnerId}/availability-slots`, { params });
  },
  updateSlot: (slotId, slotData) => api.put(`/availability-slots/${slotId}`, slotData),
  deleteSlot: (slotId) => api.delete(`/availability-slots/${slotId}`),
  publishSlots: (partnerId) => api.post(`/partners/${partnerId}/availability-slots/publish`),
  cancelBooking: (slotId) => api.post(`/availability-slots/${slotId}/cancel-booking`),
  getPaymentInfo: (slotId) => api.get(`/availability-slots/${slotId}/payment-info`),

  // Client methods
  getClientSlots: (partnerId) => api.get(`/partners/${partnerId}/availability-slots/client-view`),
  bookSlot: (slotId) => api.post(`/availability-slots/${slotId}/book`),
};

// Chart APIs
export const chartAPI = {
  shareChart: (data) => api.post('/charts/share', data),
  shareQuestionnaireChart: (data) => api.post('/charts/share-questionnaire', data),
  getUserCharts: (userId, partnerId = null) => {
    const params = {};
    if (partnerId) params.partnerId = partnerId;
    return api.get(`/charts/user/${userId}`, { params });
  },
  getLatestUserChart: (userId, partnerId = null) => {
    const params = {};
    if (partnerId) params.partnerId = partnerId;
    return api.get(`/charts/user/${userId}/latest`, { params });
  },
  getPartnerUserCharts: (partnerId, userId) => api.get(`/charts/partner/${partnerId}/user/${userId}`),
  deleteChart: (id) => api.delete(`/charts/${id}`)
};

// Therapy Session APIs
export const therapySessionAPI = {
  create: (data) => api.post('/therapy-sessions', data),
  createStandalone: (data) => api.post('/therapy-sessions/standalone', data),
  createFromVideoSession: (videoSessionId) => api.post(`/therapy-sessions/from-video/${videoSessionId}`),
  checkAutoComplete: (partnerId) => api.get(`/therapy-sessions/check-auto-complete/${partnerId}`),
  getSessionUsage: (partnerId) => api.get(`/partners/${partnerId}/session-usage`),
  getById: (id) => api.get(`/therapy-sessions/${id}`),
  getByPartner: (partnerId, startDate, endDate) => {
    const params = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    return api.get(`/partners/${partnerId}/therapy-sessions`, { params });
  },
  getByPartnerAndUser: (partnerId, userId) => api.get(`/partners/${partnerId}/users/${userId}/therapy-sessions`),
  getByUser: (userId, partnerId = null) => {
    const params = {};
    if (partnerId) params.partnerId = partnerId;
    return api.get(`/users/${userId}/therapy-sessions`, { params });
  },
  update: (id, data) => api.put(`/therapy-sessions/${id}`, data),
  // delete method removed - therapy sessions cannot be deleted to maintain historical records

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
  getByUser: (userId, partnerId = null) => {
    const params = {};
    if (partnerId) params.partnerId = partnerId;
    return api.get(`/users/${userId}/video-sessions`, { params });
  },
  update: (id, data) => api.put(`/video-sessions/${id}`, data),
  updateStatus: (id, status) => api.put(`/video-sessions/${id}`, { status }),
  updateStatus: (id, status) => api.put(`/video-sessions/${id}`, { status }),
  delete: (id) => api.delete(`/video-sessions/${id}`),
  verifyPassword: (id, password) => api.post(`/video-sessions/${id}/verify-password`, { password }),
  checkGoogleCalendarStatus: () => api.get('/google-calendar/status')
};

// Questionnaire APIs
export const questionnaireAPI = {
  // Questionnaire management
  create: (data) => api.post('/questionnaires', data),
  getByAdmin: (adminId) => api.get(`/questionnaires/admin/${adminId}`),
  getByOrganization: (organizationId) => api.get(`/questionnaires/organization/${organizationId}`),
  getByPartner: (partnerId) => api.get(`/questionnaires/partner/${partnerId}`),
  getById: (id) => api.get(`/questionnaires/${id}`),
  update: (id, data) => api.put(`/questionnaires/${id}`, data),
  delete: (id) => api.delete(`/questionnaires/${id}`),
  getStats: (id) => api.get(`/questionnaires/${id}/stats`),

  // Sharing management
  shareWithOrganizations: (questionnaireId, organizationIds) =>
    api.post(`/questionnaires/${questionnaireId}/share-organizations`, { organization_ids: organizationIds }),
  shareWithPartners: (questionnaireId, partnerIds) =>
    api.post(`/questionnaires/${questionnaireId}/share-partners`, { partner_ids: partnerIds }),
  unshareFromOrganizations: (questionnaireId, organizationIds) =>
    api.post(`/questionnaires/${questionnaireId}/unshare-organizations`, { organization_ids: organizationIds }),
  unshareFromPartners: (questionnaireId, partnerIds) =>
    api.post(`/questionnaires/${questionnaireId}/unshare-partners`, { partner_ids: partnerIds }),
  copyQuestionnaire: (questionnaireId) => api.post(`/questionnaires/${questionnaireId}/copy`),
  getSharedOrganizations: (questionnaireId) => api.get(`/questionnaires/${questionnaireId}/shared-organizations`),
  getSharedPartners: (questionnaireId) => api.get(`/questionnaires/${questionnaireId}/shared-partners`),

  // Assignment management
  assign: (data) => api.post('/questionnaires/assign', data),
  getUserAssignments: (userId, partnerId = null) => {
    const params = {};
    if (partnerId) params.partnerId = partnerId;
    return api.get(`/questionnaires/assignments/user/${userId}`, { params });
  },
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

// Plan of Assessment APIs
export const planOfAssessmentAPI = {
  get: (userId) => api.get(`/users/${userId}/plan-of-assessment`),
  save: (userId, data) => api.post(`/users/${userId}/plan-of-assessment`, data)
};

// Background Image APIs
export const backgroundAPI = {
  // Get all available background images
  getAvailable: () => api.get('/backgrounds/available'),

  // Get background image preview URL
  getPreviewUrl: (filename) => `/api/backgrounds/preview/${filename}`,

  // Set partner's default background
  setDefault: (partnerId, backgroundFilename) =>
    api.post(`/partners/${partnerId}/default-report-background`, {
      background_filename: backgroundFilename
    }),

  // Get partner's default background
  getDefault: (partnerId) =>
    api.get(`/partners/${partnerId}/default-report-background`),
};

// Contact API
export const contactAPI = {
  submit: (formData) => api.post('/contact', formData),
};

// Blog API
export const blogAPI = {
  getAll: (published = true) => {
    const params = published === false ? { published: 'false' } : {};
    return api.get('/blogs', { params });
  },
  getById: (id) => api.get(`/blogs/${id}`),
  getMyBlogs: () => api.get('/blogs/my/blogs'),
  create: (data) => api.post('/blogs', data),
  update: (id, data) => api.put(`/blogs/${id}`, data),
  delete: (id) => api.delete(`/blogs/${id}`)
};

// Event API
export const eventAPI = {
  // User routes (clients)
  getUserEvents: (partnerId = null) => {
    const params = {};
    if (partnerId) params.partnerId = partnerId;
    return api.get('/user/events', { params });
  },
  getEventById: (id) => api.get(`/events/${id}`),
  enrollInEvent: (eventId) => api.post(`/events/${eventId}/enroll`),
  // Partner routes (therapists)
  getPartnerEvents: () => api.get('/partner/events'),
  createEvent: (data) => api.post('/events', data),
  updateEvent: (id, data) => api.put(`/events/${id}`, data),
  deleteEvent: (id) => api.delete(`/events/${id}`),
  getEventEnrollments: (eventId) => api.get(`/events/${eventId}/enrollments`),
  // Check if partner has events
  checkPartnerHasEvents: (partnerId) => api.get(`/partners/${partnerId}/has-events`)
};

// Review API
export const reviewAPI = {
  // Client routes
  createReview: (data) => api.post('/reviews', data),
  getClientReview: (therapistId) => api.get(`/reviews/client/${therapistId}`),
  getPublishedReviews: (therapistId) => api.get(`/reviews/published/${therapistId}`),
  // Therapist routes
  getTherapistReviews: () => api.get('/reviews'),
  togglePublishStatus: (reviewId) => api.put(`/reviews/${reviewId}/publish`)
};

// Razorpay Payment APIs
export const razorpayAPI = {
  createOrder: (data) => api.post('/razorpay/create-order', data),
  verifyPayment: (data) => api.post('/razorpay/verify-payment', data),
  createBookingOrder: (data) => api.post('/razorpay/create-booking-order', data),
  verifyBookingPayment: (data) => api.post('/razorpay/verify-booking-payment', data),
  createRemainingPaymentOrder: (data) => api.post('/razorpay/create-remaining-payment-order', data),
  verifyRemainingPayment: (data) => api.post('/razorpay/verify-remaining-payment', data),
  getPaymentHistory: () => api.get('/razorpay/payment-history'),
  pauseSubscription: () => api.post('/razorpay/subscription/pause'),
  resumeSubscription: () => api.post('/razorpay/subscription/resume'),
};

// Earnings APIs
export const earningsAPI = {
  getSummary: () => api.get('/earnings/summary'),
  getEarnings: (params) => api.get('/earnings', { params }),
};

// Bank Account APIs
// Support Chat APIs
export const supportAPI = {
  // App user routes
  getOrCreateConversation: () => api.post('/support/conversations'),
  getConversations: (status) => {
    const params = status ? { status } : {};
    return api.get('/support/conversations', { params });
  },
  getConversationById: (id) => api.get(`/support/conversations/${id}`),
  getConversationMessages: (id) => api.get(`/support/conversations/${id}/messages`),
  sendMessage: (id, message) => api.post(`/support/conversations/${id}/messages`, { message }),
  markMessagesAsRead: (id) => api.put(`/support/conversations/${id}/messages/read`),
  getSupportTeamMembers: () => api.get('/support/team'),
  
  // Support team routes
  closeConversation: (id) => api.put(`/support/conversations/${id}/close`),
};

export const bankAccountAPI = {
  updatePartner: (data) => api.put('/partner/bank-account', data),
  getPartner: () => api.get('/partner/bank-account'),
  updateOrganization: (data) => api.put('/organization/bank-account', data),
  getOrganization: () => api.get('/organization/bank-account'),
  verifyBankAccount: (recipientType, recipientId, verified = true) => 
    api.put(`/admin/bank-account/verify/${recipientType}/${recipientId}`, { verified }),
  getAllBankAccounts: () => api.get('/admin/bank-accounts'),
};

// WhatsApp APIs
export const whatsappAPI = {
  getStatus: () => api.get('/whatsapp/status'),
  testIntegration: (phoneNumber) => api.post('/whatsapp/test', { phoneNumber }),
  getLogs: (params) => api.get('/whatsapp/logs', { params }),
  getLogById: (id) => api.get(`/whatsapp/logs/${id}`),
  resendNotification: (id) => api.post(`/whatsapp/logs/${id}/resend`),
  getStatistics: (days = 30) => api.get('/whatsapp/statistics', { params: { days } }),
};

// Public Partner APIs (no authentication required)
export const publicPartnerAPI = {
  getProfileByPartnerId: (partnerId) => api.get(`/public/partners/${partnerId}`),
  getAvailabilityByPartnerId: (partnerId) => api.get(`/public/partners/${partnerId}/availability`),
  getReviewsByPartnerId: (partnerId) => api.get(`/public/partners/${partnerId}/reviews`),
  getFeeSettingsByPartnerId: (partnerId) => api.get(`/public/partners/${partnerId}/fee-settings`),
};

// Public Booking APIs (no authentication required)
export const publicBookingAPI = {
  createBookingOrder: (partnerId, slotId, clientData) => api.post('/public/razorpay/create-booking-order', {
    partner_id: partnerId,
    slot_id: slotId,
    clientData
  }),
  verifyBookingPayment: (paymentData) => api.post('/public/razorpay/verify-booking-payment', paymentData),
};

export default api;

