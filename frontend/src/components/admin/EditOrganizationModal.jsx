import React, { useState, useEffect } from 'react';
import { X, Building2, Mail, Phone, MapPin, FileText, Users, Shield, MessageCircle, Edit2, Check, CreditCard } from 'lucide-react';
import ImageUpload from '../common/ImageUpload';

const EditOrganizationModal = ({ isOpen, onClose, onSubmit, isLoading, organization }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    contact: '',
    address: '',
    gst_no: '',
    video_sessions_enabled: true,
    theraptrack_controlled: false,
    query_resolver: false,
    for_new_therapists: false,
    number_of_therapists: '',
    photo_url: '',
    referral_code: '',
    referral_code_discount: '',
    referral_code_discount_type: 'percentage',
    hide_therapists_tab: false,
    hide_questionnaires_tab: false,
    disable_therapist_plan_change: false,
    show_therapist_client_details: true,
  });

  const [errors, setErrors] = useState({});
  const [isEditingDiscount, setIsEditingDiscount] = useState(false);
  const [discountEditData, setDiscountEditData] = useState({
    referral_code_discount: '',
    referral_code_discount_type: 'percentage',
  });

  useEffect(() => {
    if (organization) {
      // Check if organization has an existing referral code (from database)
      const referralCode = organization.referral_code;
      const hasExistingCode = referralCode && 
                              typeof referralCode === 'string' && 
                              referralCode.trim() !== '' && 
                              referralCode.trim().toUpperCase() !== 'NULL';
      
      // Handle show_therapist_client_details: explicitly check for false (including string "false"), otherwise default to true
      // This handles cases where the value might be false, "false", null, undefined, or not present
      const showTherapistClientDetailsValue = organization.show_therapist_client_details;
      const showTherapistClientDetails = showTherapistClientDetailsValue === false || 
                                         showTherapistClientDetailsValue === 'false' ||
                                         showTherapistClientDetailsValue === 0
        ? false 
        : true;
      
      setFormData({
        name: organization.name || '',
        email: organization.email || '',
        contact: organization.contact || '',
        address: organization.address || '',
        gst_no: organization.gst_no || '',
        video_sessions_enabled: organization.video_sessions_enabled ?? true,
        theraptrack_controlled: organization.theraptrack_controlled ?? false,
        query_resolver: organization.query_resolver ?? false,
        for_new_therapists: organization.for_new_therapists ?? false,
        number_of_therapists: organization.number_of_therapists != null ? organization.number_of_therapists : '',
        photo_url: organization.photo_url || '',
        referral_code: referralCode || '',
        referral_code_discount: organization.referral_code_discount != null ? organization.referral_code_discount : '',
        referral_code_discount_type: organization.referral_code_discount_type || 'percentage',
        hide_therapists_tab: organization.hide_therapists_tab ?? false,
        hide_questionnaires_tab: organization.hide_questionnaires_tab ?? false,
        disable_therapist_plan_change: organization.disable_therapist_plan_change ?? false,
        show_therapist_client_details: showTherapistClientDetails,
      });
      
      // Initialize discount edit data
      setDiscountEditData({
        referral_code_discount: organization.referral_code_discount != null ? organization.referral_code_discount : '',
        referral_code_discount_type: organization.referral_code_discount_type || 'percentage',
      });
      setIsEditingDiscount(false);
      
      // Debug log to help troubleshoot
      if (hasExistingCode) {
        console.log('[EditOrganizationModal] Organization has existing referral code:', referralCode);
      }
    }
  }, [organization]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Prevent changes to referral_code if organization already has one set
    if (name === 'referral_code') {
      const hasExistingCode = organization?.referral_code && 
                              typeof organization.referral_code === 'string' && 
                              organization.referral_code.trim() !== '' && 
                              organization.referral_code.trim().toUpperCase() !== 'NULL';
      if (hasExistingCode) {
        return;
      }
    }
    
    // Handle for_new_therapists with warning
    if (name === 'for_new_therapists' && checked && !formData.for_new_therapists) {
      const confirmed = window.confirm(
        '⚠️ Warning: Setting this organization as the default for new therapist signups will automatically remove this designation from any other organization that currently has it.\n\n' +
        'Are you sure you want to proceed?'
      );
      if (!confirmed) {
        return;
      }
    }
    
    // Handle discount fields separately when in edit mode
    if ((name === 'referral_code_discount' || name === 'referral_code_discount_type') && isEditingDiscount) {
      setDiscountEditData((prev) => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      }));
      return;
    }
    
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };
  
  const handleEditDiscount = () => {
    setIsEditingDiscount(true);
    setDiscountEditData({
      referral_code_discount: formData.referral_code_discount,
      referral_code_discount_type: formData.referral_code_discount_type,
    });
  };
  
  const handleSaveDiscount = () => {
    setFormData((prev) => ({
      ...prev,
      referral_code_discount: discountEditData.referral_code_discount,
      referral_code_discount_type: discountEditData.referral_code_discount_type,
    }));
    setIsEditingDiscount(false);
  };
  
  const handleCancelDiscount = () => {
    setIsEditingDiscount(false);
    setDiscountEditData({
      referral_code_discount: formData.referral_code_discount,
      referral_code_discount_type: formData.referral_code_discount_type,
    });
  };


  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Organization name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.contact.trim()) {
      newErrors.contact = 'Contact number is required';
    } else if (!/^\d{10}$/.test(formData.contact.replace(/\D/g, ''))) {
      newErrors.contact = 'Contact number must be 10 digits';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      // Convert empty strings to null for optional numeric fields
      const submitData = {
        ...formData,
        number_of_therapists: formData.number_of_therapists === '' ? null : (formData.number_of_therapists ? parseInt(formData.number_of_therapists, 10) : null),
        gst_no: formData.gst_no === '' ? null : formData.gst_no,
        referral_code: formData.referral_code === '' ? null : formData.referral_code,
        referral_code_discount: formData.referral_code_discount === '' ? null : parseFloat(formData.referral_code_discount),
        referral_code_discount_type: formData.referral_code_discount === '' ? null : formData.referral_code_discount_type,
      };
      onSubmit(submitData);
    }
  };

  const handleClose = () => {
    setErrors({});
    setIsEditingDiscount(false);
    onClose();
  };

  if (!isOpen || !organization) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dark-bg-tertiary rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-dark-bg-tertiary border-b border-gray-200 dark:border-dark-border px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary flex items-center">
            <Building2 className="h-6 w-6 mr-2 text-primary-700" />
            Edit Organization
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 dark:text-dark-text-tertiary hover:text-gray-600 dark:hover:text-dark-text-secondary transition-colors"
            disabled={isLoading}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Organization Logo Upload */}
          {organization && organization.id && (
            <ImageUpload
              currentImageUrl={formData.photo_url}
              onUpload={(photoUrl) => {
                setFormData(prev => ({ ...prev, photo_url: photoUrl }));
              }}
              onDelete={() => {
                setFormData(prev => ({ ...prev, photo_url: null }));
              }}
              label="Organization Logo"
              userType="organization"
              userId={organization.id}
              disabled={isLoading}
            />
          )}

          {/* Organization Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Organization Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter organization name"
                disabled={isLoading}
              />
            </div>
            {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="organization@example.com"
                disabled={isLoading}
              />
            </div>
            {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
          </div>

          {/* Contact Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact Number <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="tel"
                name="contact"
                value={formData.contact}
                onChange={handleChange}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                  errors.contact ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="1234567890"
                disabled={isLoading}
              />
            </div>
            {errors.contact && <p className="mt-1 text-sm text-red-500">{errors.contact}</p>}
            <p className="mt-1 text-xs text-gray-500 dark:text-dark-text-tertiary">
            Use your WhatsApp number so you can receive client bookings, appointments, updates and reminders.
            </p>
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                rows="3"
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                  errors.address ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter full address"
                disabled={isLoading}
              />
            </div>
            {errors.address && <p className="mt-1 text-sm text-red-500">{errors.address}</p>}
          </div>

          {/* GST Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              GST Number (Optional)
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                name="gst_no"
                value={formData.gst_no}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="GST registration number"
                disabled={isLoading}
              />
            </div>
          </div>


          {/* Video Sessions Toggle */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <label className="flex items-start space-x-3 cursor-pointer">
              <div className="flex items-center h-5">
                <input
                  type="checkbox"
                  name="video_sessions_enabled"
                  checked={formData.video_sessions_enabled}
                  onChange={handleChange}
                  className="w-4 h-4 text-primary-700 bg-white border-gray-300 rounded focus:ring-primary-500 focus:ring-2"
                  disabled={isLoading}
                />
              </div>
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-900">
                  Enable Video Sessions
                </span>
                <p className="text-xs text-gray-600 mt-1">
                  Allow partners in this organization to create and manage video sessions with their clients.
                  When disabled, existing sessions remain accessible via direct link but cannot be managed.
                </p>
              </div>
            </label>
          </div>

          {/* TheraPTrack Controlled */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <label className="flex items-start space-x-3 cursor-pointer">
              <div className="flex items-center h-5">
                <input
                  type="checkbox"
                  name="theraptrack_controlled"
                  checked={formData.theraptrack_controlled}
                  onChange={(e) => {
                    handleChange(e);
                    // If unchecking TheraPTrack Controlled, also uncheck query_resolver
                    if (!e.target.checked) {
                      setFormData(prev => ({ ...prev, query_resolver: false }));
                    }
                  }}
                  className="w-4 h-4 text-primary-700 bg-white border-gray-300 rounded focus:ring-primary-500 focus:ring-2"
                  disabled={isLoading}
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center">
                  <Shield className="h-4 w-4 text-primary-700 mr-2" />
                  <span className="text-sm font-medium text-gray-900">
                    TheraPTrack Controlled
                  </span>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  If enabled, therapists in this organization can view subscription details in their settings.
                  If disabled, only organization users can see subscription information.
                </p>
              </div>
            </label>
          </div>

          {/* Query Resolver - Only shown if TheraPTrack Controlled is enabled */}
          {formData.theraptrack_controlled && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <label className="flex items-start space-x-3 cursor-pointer">
                <div className="flex items-center h-5">
                  <input
                    type="checkbox"
                    name="query_resolver"
                    checked={formData.query_resolver}
                    onChange={handleChange}
                    className="w-4 h-4 text-primary-700 bg-white border-gray-300 rounded focus:ring-primary-500 focus:ring-2"
                    disabled={isLoading}
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center">
                    <MessageCircle className="h-4 w-4 text-primary-700 mr-2" />
                    <span className="text-sm font-medium text-gray-900">
                      Query Resolver (Support Team Member)
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    Enable this organization to respond to support chat queries from users. 
                    Only available for TheraPTrack controlled organizations.
                  </p>
                </div>
              </label>
            </div>
          )}

          {/* For New Therapists - Only shown if TheraPTrack Controlled is enabled */}
          {formData.theraptrack_controlled && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <label className="flex items-start space-x-3 cursor-pointer">
                <div className="flex items-center h-5">
                  <input
                    type="checkbox"
                    name="for_new_therapists"
                    checked={formData.for_new_therapists}
                    onChange={handleChange}
                    className="w-4 h-4 text-primary-700 bg-white border-gray-300 rounded focus:ring-primary-500 focus:ring-2"
                    disabled={isLoading}
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center">
                    <Shield className="h-4 w-4 text-amber-700 mr-2" />
                    <span className="text-sm font-medium text-gray-900">
                      Default for New Therapist Signups
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    When enabled, this organization will be used as the default for new therapist signups from the homepage. 
                    Only one organization can have this setting enabled at a time. Enabling this will automatically disable it for other organizations.
                  </p>
                  {formData.for_new_therapists && (
                    <p className="text-xs text-amber-700 mt-2 font-medium">
                      ⚠️ Warning: This organization is currently set as the default for new therapist signups.
                    </p>
                  )}
                </div>
              </label>
            </div>
          )}

          {/* Tab Visibility Settings - Only shown if TheraPTrack Controlled is enabled */}
          {formData.theraptrack_controlled && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center mb-2">
                <Users className="h-4 w-4 text-purple-700 mr-2" />
                <span className="text-sm font-medium text-gray-900">
                  Tab Visibility Settings
                </span>
              </div>
              <p className="text-xs text-gray-600 mb-3">
                Control which tabs are visible in the organization dashboard. When checked, the selected tabs will be hidden from navigation.
              </p>
              
              <div className="space-y-2">
                <label className="flex items-start space-x-3 cursor-pointer">
                  <div className="flex items-center h-5">
                    <input
                      type="checkbox"
                      name="hide_therapists_tab"
                      checked={formData.hide_therapists_tab}
                      onChange={handleChange}
                      className="w-4 h-4 text-primary-700 bg-white border-gray-300 rounded focus:ring-primary-500 focus:ring-2"
                      disabled={isLoading}
                    />
                  </div>
                  <div className="flex-1">
                    <span className="text-xs font-medium text-gray-900">
                      Hide Therapists Management Tab
                    </span>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Hide the Therapists Management tab from the organization dashboard navigation.
                    </p>
                  </div>
                </label>

                <label className="flex items-start space-x-3 cursor-pointer">
                  <div className="flex items-center h-5">
                    <input
                      type="checkbox"
                      name="hide_questionnaires_tab"
                      checked={formData.hide_questionnaires_tab}
                      onChange={handleChange}
                      className="w-4 h-4 text-primary-700 bg-white border-gray-300 rounded focus:ring-primary-500 focus:ring-2"
                      disabled={isLoading}
                    />
                  </div>
                  <div className="flex-1">
                    <span className="text-xs font-medium text-gray-900">
                      Hide Questionnaires Tab
                    </span>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Hide the Questionnaires tab from the organization dashboard navigation.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Disable Therapist Plan Change - Only shown if TheraPTrack Controlled is enabled */}
          {formData.theraptrack_controlled && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <label className="flex items-start space-x-3 cursor-pointer">
                <div className="flex items-center h-5">
                  <input
                    type="checkbox"
                    name="disable_therapist_plan_change"
                    checked={formData.disable_therapist_plan_change}
                    onChange={handleChange}
                    className="w-4 h-4 text-primary-700 bg-white border-gray-300 rounded focus:ring-primary-500 focus:ring-2"
                    disabled={isLoading}
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center">
                    <CreditCard className="h-4 w-4 text-blue-700 mr-2" />
                    <span className="text-xs font-medium text-gray-900">
                      Disable Therapist Plan Change
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5">
                    When checked, therapists in this organization will not be able to change their subscription plans from the Subscription Management tab.
                  </p>
                </div>
              </label>
            </div>
          )}

          {/* Show Therapist Client Details - Only shown if TheraPTrack Controlled is enabled */}
          {formData.theraptrack_controlled && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
              <label className="flex items-start space-x-3 cursor-pointer">
                <div className="flex items-center h-5">
                  <input
                    type="checkbox"
                    name="show_therapist_client_details"
                    checked={formData.show_therapist_client_details}
                    onChange={handleChange}
                    className="w-4 h-4 text-primary-700 bg-white border-gray-300 rounded focus:ring-primary-500 focus:ring-2"
                    disabled={isLoading}
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center">
                    <Users className="h-4 w-4 text-indigo-700 mr-2" />
                    <span className="text-xs font-medium text-gray-900">
                      Show Therapist Client Details
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5">
                    When checked, organization admins can see client names and details when a therapist is selected in the Therapists Management tab. When unchecked, client information will be hidden.
                  </p>
                </div>
              </label>
            </div>
          )}

          {/* Referral Code (Only for TheraPTrack Controlled) */}
          {formData.theraptrack_controlled && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Referral Code (Optional)
                </label>
                {(() => {
                  const hasExistingCode = organization?.referral_code && 
                                          typeof organization.referral_code === 'string' && 
                                          organization.referral_code.trim() !== '' && 
                                          organization.referral_code.trim().toUpperCase() !== 'NULL';
                  return (
                    <>
                      <input
                        type="text"
                        name="referral_code"
                        value={formData.referral_code}
                        onChange={handleChange}
                        readOnly={hasExistingCode}
                        className={`w-full px-4 py-2 border rounded-lg uppercase ${
                          hasExistingCode
                            ? 'bg-gray-100 border-gray-300 text-gray-700 cursor-not-allowed'
                            : 'border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent'
                        }`}
                        placeholder="e.g., WELCOME2024"
                        disabled={isLoading || hasExistingCode}
                      />
                      <p className="text-xs text-gray-600 mt-1">
                        {hasExistingCode 
                          ? '✓ Referral code is set. This code cannot be edited.'
                          : 'Enter a referral code for therapists to use when joining your organization during signup.'}
                      </p>
                    </>
                  );
                })()}
              </div>

              {/* Discount Fields (Only show if referral code is entered) */}
              {formData.referral_code && (
                <div className="space-y-3 pl-4 border-l-2 border-green-300">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-700">Discount Settings</h4>
                    {!isEditingDiscount ? (
                      <button
                        type="button"
                        onClick={handleEditDiscount}
                        className="flex items-center gap-1 px-3 py-1 text-sm text-primary-700 hover:text-primary-800 hover:bg-primary-50 rounded-lg transition-colors"
                        disabled={isLoading}
                      >
                        <Edit2 className="h-4 w-4" />
                        Edit
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleSaveDiscount}
                          className="flex items-center gap-1 px-3 py-1 text-sm text-green-700 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors"
                          disabled={isLoading}
                        >
                          <Check className="h-4 w-4" />
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelDiscount}
                          className="flex items-center gap-1 px-3 py-1 text-sm text-gray-700 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors"
                          disabled={isLoading}
                        >
                          <X className="h-4 w-4" />
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Discount Amount
                      </label>
                      <input
                        type="number"
                        name="referral_code_discount"
                        value={isEditingDiscount ? discountEditData.referral_code_discount : formData.referral_code_discount}
                        onChange={handleChange}
                        min="0"
                        step="0.01"
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                          isEditingDiscount 
                            ? 'border-gray-300' 
                            : 'bg-gray-100 border-gray-300 text-gray-700 cursor-not-allowed'
                        }`}
                        placeholder="0"
                        disabled={isLoading || !isEditingDiscount}
                        readOnly={!isEditingDiscount}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Discount Type
                      </label>
                      <select
                        name="referral_code_discount_type"
                        value={isEditingDiscount ? discountEditData.referral_code_discount_type : formData.referral_code_discount_type}
                        onChange={handleChange}
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                          isEditingDiscount 
                            ? 'border-gray-300' 
                            : 'bg-gray-100 border-gray-300 text-gray-700 cursor-not-allowed'
                        }`}
                        disabled={isLoading || !isEditingDiscount}
                      >
                        <option value="percentage">Percentage (%)</option>
                        <option value="fixed">Fixed Amount (₹)</option>
                      </select>
                    </div>
                  </div>
                  {(isEditingDiscount ? discountEditData.referral_code_discount : formData.referral_code_discount) && (
                    <div className="bg-white rounded p-2 text-sm">
                      <span className="font-medium text-green-700">
                        Discount Preview: {' '}
                        {(isEditingDiscount ? discountEditData.referral_code_discount_type : formData.referral_code_discount_type) === 'percentage'
                          ? `${isEditingDiscount ? discountEditData.referral_code_discount : formData.referral_code_discount}% off`
                          : `₹${isEditingDiscount ? discountEditData.referral_code_discount : formData.referral_code_discount} off`}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Number of Therapists */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Number of Therapists (Optional)
            </label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="number"
                name="number_of_therapists"
                value={formData.number_of_therapists}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Enter number of therapists"
                min="1"
                disabled={isLoading}
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              This will be used to calculate subscription pricing
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
            <p className="text-sm text-primary-900">
              <strong>Note:</strong> Changes to email will require the organization to use the new email for login.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-primary-700 text-white rounded-lg hover:bg-primary-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? 'Updating...' : 'Update Organization'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditOrganizationModal;

