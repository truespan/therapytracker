import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Video, MapPin, User, X, AlertCircle } from 'lucide-react';
import { formatTime } from '../../utils/dateUtils';
import { CurrencyIcon } from '../../utils/currencyIcon';
import { publicBookingAPI } from '../../services/api';
import { initializeRazorpayCheckout } from '../../utils/razorpayHelper';

const PublicBookingModal = ({ slot, partnerName, partnerId, feeSettings, onConfirm, onCancel, loading }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    sex: 'Male',
    location: '',
    contact: '',
    whatsapp_number: '',
    email: ''
  });
  const [errors, setErrors] = useState({});
  const [countryCode, setCountryCode] = useState('+91');
  const [whatsappCountryCode, setWhatsappCountryCode] = useState('+91');
  const [sameAsContact, setSameAsContact] = useState(false);
  const modalRef = useRef(null);
  const backdropRef = useRef(null);

  // Handle modal opening - ensure modal is visible and prevent body scroll
  useEffect(() => {
    if (slot) {
      // Prevent body scroll when modal is open
      const originalOverflow = document.body.style.overflow;
      const originalPosition = document.body.style.position;
      const scrollY = window.scrollY;
      
      document.body.style.overflow = 'hidden';
      // On mobile, prevent scroll jumping
      if (window.innerWidth <= 768) {
        document.body.style.position = 'fixed';
        document.body.style.top = `-${scrollY}px`;
        document.body.style.width = '100%';
      }
      
      // Ensure backdrop scrolls to top and modal is visible
      const timer = setTimeout(() => {
        if (backdropRef.current) {
          // Force backdrop to scroll to top
          backdropRef.current.scrollTop = 0;
          // Also scroll the backdrop element into view
          backdropRef.current.scrollTo({ top: 0, behavior: 'auto' });
        }
        // Scroll window to top to ensure modal is fully visible on desktop
        if (window.scrollY > 0 && window.innerWidth > 768) {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 10);

      return () => {
        clearTimeout(timer);
        // Restore body scroll when modal closes
        document.body.style.overflow = originalOverflow;
        if (window.innerWidth <= 768) {
          document.body.style.position = originalPosition;
          document.body.style.top = '';
          document.body.style.width = '';
          window.scrollTo(0, scrollY);
        }
      };
    }
  }, [slot]);

  if (!slot) return null;

  const formattedDate = new Date(slot.slot_date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  const isOnline = slot.location_type === 'online' || slot.status.includes('online');

  // Fee calculations - for public booking, we collect full session fee upfront
  const sessionFee = parseFloat(feeSettings?.session_fee) || 0;
  const currency = feeSettings?.fee_currency || 'INR';

  // Currency symbol helper
  const getCurrencySymbol = (curr) => {
    const symbols = {
      'INR': '₹',
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'AUD': 'A$',
      'CAD': 'C$'
    };
    return symbols[curr] || curr;
  };

  const currencySymbol = getCurrencySymbol(currency);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    
    // If contact number changes and "same as contact" is checked, update WhatsApp
    if (name === 'contact' && sameAsContact) {
      setFormData(prev => ({
        ...prev,
        whatsapp_number: value
      }));
      setWhatsappCountryCode(countryCode);
    }
  };

  const handleSameAsContactChange = (e) => {
    const checked = e.target.checked;
    setSameAsContact(checked);
    
    if (checked) {
      // Copy contact number to WhatsApp
      setFormData(prev => ({
        ...prev,
        whatsapp_number: prev.contact
      }));
      setWhatsappCountryCode(countryCode);
    } else {
      // Clear WhatsApp number
      setFormData(prev => ({
        ...prev,
        whatsapp_number: ''
      }));
    }
  };

  const handleCountryCodeChange = (e) => {
    const newCode = e.target.value;
    setCountryCode(newCode);
    
    // If "same as contact" is checked, update WhatsApp country code too
    if (sameAsContact) {
      setWhatsappCountryCode(newCode);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.age) {
      newErrors.age = 'Age is required';
    } else {
      const ageNum = parseInt(formData.age);
      if (isNaN(ageNum) || ageNum < 1 || ageNum > 150) {
        newErrors.age = 'Please enter a valid age (1-150)';
      }
    }

    if (!formData.contact.trim()) {
      newErrors.contact = 'Contact number is required';
    } else {
      // Validate phone number format (only digits, 7-15 digits)
      const phoneRegex = /^\d{7,15}$/;
      if (!phoneRegex.test(formData.contact.trim())) {
        newErrors.contact = 'Please enter a valid phone number (7-15 digits)';
      }
    }

    // WhatsApp number is optional, but validate format if provided
    if (formData.whatsapp_number.trim()) {
      // Validate phone number format (only digits, 7-15 digits)
      const phoneRegex = /^\d{7,15}$/;
      if (!phoneRegex.test(formData.whatsapp_number.trim())) {
        newErrors.whatsapp_number = 'Please enter a valid WhatsApp number (7-15 digits)';
      }
    }

    // Email is optional, but validate format if provided
    if (formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        newErrors.email = 'Please enter a valid email address';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    // Prepare client data with country codes
    const clientData = {
      name: formData.name.trim(),
      age: parseInt(formData.age),
      sex: formData.sex,
      location: formData.location.trim() || null,
      contact: `${countryCode}${formData.contact.trim()}`,
      whatsapp_number: formData.whatsapp_number.trim() ? `${whatsappCountryCode}${formData.whatsapp_number.trim()}` : null,
      email: formData.email.trim() || null
    };

    // If no session fee, call onConfirm directly (for free bookings)
    if (sessionFee <= 0) {
      onConfirm(clientData);
      return;
    }

    // For paid bookings, proceed with payment flow
    try {
      // Create Razorpay order
      const orderResponse = await publicBookingAPI.createBookingOrder(
        partnerId,
        slot.id,
        clientData
      );

      // Check if test mode - skip payment flow
      if (orderResponse.data.skip_payment || orderResponse.data.test_mode) {
        // Test mode: Skip payment and directly verify
        const verifyResponse = await publicBookingAPI.verifyBookingPayment({
          razorpay_order_id: null,
          razorpay_payment_id: null,
          razorpay_signature: null
        });

        if (verifyResponse.data.booking_confirmed) {
          onConfirm(null, true); // Pass true to indicate success
        } else {
          throw new Error('Booking verification failed');
        }
        return;
      }

      // Normal flow: Proceed with Razorpay payment
      const order = orderResponse.data.order;

      // Initialize Razorpay checkout with client details
      const paymentResult = await initializeRazorpayCheckout(order, {
        name: clientData.name,
        description: 'Session Fee Payment',
        prefill: {
          name: clientData.name,
          email: clientData.email || '',
          contact: clientData.contact
        }
      });

      // Verify payment
      const verifyResponse = await publicBookingAPI.verifyBookingPayment({
        razorpay_order_id: paymentResult.razorpay_order_id,
        razorpay_payment_id: paymentResult.razorpay_payment_id,
        razorpay_signature: paymentResult.razorpay_signature
      });

      if (verifyResponse.data.booking_confirmed) {
        // Navigate to payment success page with payment details
        navigate('/payment-success', {
          state: {
            payment: verifyResponse.data.payment,
            booking: verifyResponse.data.booking || {
              slot_id: slot.id,
              appointment_id: verifyResponse.data.booking?.appointment_id,
              is_public_booking: true
            }
          },
          replace: true
        });
      } else {
        throw new Error('Payment verification failed');
      }
    } catch (error) {
      if (error.message === 'Payment cancelled by user') {
        alert('Payment cancelled. Your booking was not completed.');
      } else {
        console.error('Booking error:', error);
        const errorMessage = error.response?.data?.error || 'Failed to process booking. Please try again.';
        alert(errorMessage);
      }
    }
  };

  return (
    <div 
      ref={backdropRef}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 pt-4 sm:pt-8 pb-4 sm:pb-8 overflow-y-auto"
    >
      <div 
        ref={modalRef}
        className="bg-white dark:bg-dark-bg-primary rounded-lg shadow-xl max-w-2xl w-full max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] flex flex-col"
      >
        {/* Header */}
        <div className="bg-primary-50 dark:bg-dark-bg-secondary border-b border-primary-200 dark:border-dark-border px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-primary-900 dark:text-dark-text-primary">
              Book Appointment
            </h3>
            <button
              onClick={onCancel}
              className="text-primary-600 dark:text-dark-primary-400 hover:text-primary-800 dark:hover:text-dark-primary-300 transition-colors"
              disabled={loading}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="px-6 py-5 space-y-6 overflow-y-auto flex-1">
            {/* Slot Information */}
            <div className="bg-blue-50 dark:bg-dark-bg-secondary border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-3">
              {/* Therapist */}
              <div className="flex items-center">
                <User className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-3 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-600 dark:text-dark-text-secondary">Therapist</p>
                  <p className="font-semibold text-gray-900 dark:text-dark-text-primary">{partnerName}</p>
                </div>
              </div>

              {/* Date */}
              <div className="flex items-center">
                <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-3 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-600 dark:text-dark-text-secondary">Date</p>
                  <p className="font-semibold text-gray-900 dark:text-dark-text-primary">{formattedDate}</p>
                </div>
              </div>

              {/* Time */}
              <div className="flex items-center">
                <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-3 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-600 dark:text-dark-text-secondary">Time</p>
                  <p className="font-semibold text-gray-900 dark:text-dark-text-primary">
                    {formatTime(slot.start_datetime)} - {formatTime(slot.end_datetime)}
                  </p>
                </div>
              </div>

              {/* Session Type */}
              <div className="flex items-center">
                {isOnline ? (
                  <Video className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-3 flex-shrink-0" />
                ) : (
                  <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-3 flex-shrink-0" />
                )}
                <div>
                  <p className="text-xs text-gray-600 dark:text-dark-text-secondary">Session Type</p>
                  <p className="font-semibold text-gray-900 dark:text-dark-text-primary">
                    {isOnline ? 'Online Session' : 'In-Person Session'}
                  </p>
                </div>
              </div>
            </div>

            {/* Client Information Form */}
            <div className="space-y-4">
              <h4 className="text-md font-semibold text-gray-900 dark:text-dark-text-primary">Your Information</h4>
              
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-dark-bg-secondary dark:text-dark-text-primary ${
                    errors.name ? 'border-red-500' : 'border-gray-300 dark:border-dark-border'
                  }`}
                  placeholder="Enter your full name"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {errors.name}
                  </p>
                )}
              </div>

              {/* Age and Sex */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                    Age <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="age"
                    value={formData.age}
                    onChange={handleChange}
                    min="1"
                    max="150"
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-dark-bg-secondary dark:text-dark-text-primary ${
                      errors.age ? 'border-red-500' : 'border-gray-300 dark:border-dark-border'
                    }`}
                    placeholder="Age"
                  />
                  {errors.age && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {errors.age}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                    Sex <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="sex"
                    value={formData.sex}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-dark-bg-secondary dark:text-dark-text-primary"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Others">Others</option>
                  </select>
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                  Location <span className="text-gray-500">(Optional)</span>
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-dark-bg-secondary dark:text-dark-text-primary"
                  placeholder="City, State"
                />
              </div>

              {/* Contact Number - First Field (Mandatory) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                  📞 Contact Number <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <select
                    value={countryCode}
                    onChange={handleCountryCodeChange}
                    className="px-3 py-2 border border-gray-300 dark:border-dark-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-dark-bg-secondary dark:text-dark-text-primary"
                  >
                    <option value="+91">+91 (IN)</option>
                    <option value="+1">+1 (US/CA)</option>
                    <option value="+44">+44 (UK)</option>
                    <option value="+61">+61 (AU)</option>
                  </select>
                  <input
                    type="tel"
                    name="contact"
                    value={formData.contact}
                    onChange={handleChange}
                    className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-dark-bg-secondary dark:text-dark-text-primary ${
                      errors.contact ? 'border-red-500' : 'border-gray-300 dark:border-dark-border'
                    }`}
                    placeholder="Phone number"
                    required
                  />
                </div>
                <p className="mt-1 text-xs text-gray-600 dark:text-dark-text-tertiary">
                  Required. We'll use this to reach you if needed.
                </p>
                {errors.contact && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {errors.contact}
                  </p>
                )}
              </div>

              {/* WhatsApp Number - Second Field (Optional with checkbox) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                  💬 WhatsApp Number <span className="text-gray-500"></span>
                </label>
                <div className="flex gap-2 mb-2">
                  <select
                    value={whatsappCountryCode}
                    onChange={(e) => setWhatsappCountryCode(e.target.value)}
                    disabled={sameAsContact}
                    className="px-3 py-2 border border-gray-300 dark:border-dark-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-dark-bg-secondary dark:text-dark-text-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="+91">+91 (IN)</option>
                    <option value="+1">+1 (US/CA)</option>
                    <option value="+44">+44 (UK)</option>
                    <option value="+61">+61 (AU)</option>
                  </select>
                  <input
                    type="tel"
                    name="whatsapp_number"
                    value={formData.whatsapp_number}
                    onChange={handleChange}
                    disabled={sameAsContact}
                    className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-dark-bg-secondary dark:text-dark-text-primary disabled:opacity-50 disabled:cursor-not-allowed ${
                      errors.whatsapp_number ? 'border-red-500' : 'border-gray-300 dark:border-dark-border'
                    }`}
                    placeholder="WhatsApp number"
                  />
                </div>
                <div className="flex items-center mb-2">
                  <input
                    type="checkbox"
                    id="sameAsContact"
                    checked={sameAsContact}
                    onChange={handleSameAsContactChange}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="sameAsContact" className="ml-2 text-sm text-gray-700 dark:text-dark-text-secondary">
                    ☑ Same as contact number
                  </label>
                </div>
                <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                  <p className="text-xs font-semibold text-blue-800 dark:text-blue-300">
                    💡 Used for bookings, appointments, updates, reminders and quick communication
                  </p>
                </div>
                {errors.whatsapp_number && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {errors.whatsapp_number}
                  </p>
                )}
              </div>

              {/* Email - Last Field (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                  📧 Email Address <span className="text-gray-500">(Optional)</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-dark-bg-secondary dark:text-dark-text-primary ${
                    errors.email ? 'border-red-500' : 'border-gray-300 dark:border-dark-border'
                  }`}
                  placeholder="your.email@example.com"
                />
                <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
                  <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                    💡 Used only for account access and rarely for important notifications
                  </p>
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {errors.email}
                  </p>
                )}
              </div>
            </div>

            {/* Login & Account Access Microcopy */}
            <div className="p-3 bg-blue-50 dark:bg-dark-bg-secondary border border-blue-200 dark:border-blue-800 rounded-md">
              <p className="text-xs text-blue-800 dark:text-blue-300">
                <strong>Login & Account Access</strong><br />
                We automatically create your login using Email → WhatsApp → Contact Number (in that order).
              </p>
            </div>

            {/* Fee Information */}
            {sessionFee > 0 && (
              <div className="bg-green-50 dark:bg-dark-bg-secondary border border-green-200 dark:border-green-800 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-green-900 dark:text-green-300 mb-3 flex items-center">
                  <CurrencyIcon className="h-4 w-4 mr-2" />
                  Session Fee
                </h4>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-700 dark:text-dark-text-secondary">Total Amount to Pay:</span>
                  <span className="text-lg font-bold text-green-700 dark:text-green-400">
                    {currencySymbol}{sessionFee.toFixed(2)}
                  </span>
                </div>
                <p className="text-xs text-gray-600 dark:text-dark-text-tertiary mt-2">
                  You will be redirected to secure payment gateway after submitting this form.
                </p>
              </div>
            )}

            <div className="p-3 bg-yellow-50 dark:bg-dark-bg-secondary border border-yellow-200 dark:border-yellow-800 rounded-md">
              <p className="text-sm text-yellow-800 dark:text-yellow-300">
                <strong>Note:</strong> After successful payment, your account will be automatically created and the appointment will be confirmed.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 dark:bg-dark-bg-secondary px-6 py-4 border-t border-gray-200 dark:border-dark-border flex-shrink-0">
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="px-4 py-2 border border-gray-300 dark:border-dark-border rounded-md text-gray-700 dark:text-dark-text-primary bg-white dark:bg-dark-bg-primary hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  loading ? 'cursor-wait' : ''
                }`}
              >
                {loading 
                  ? 'Processing...' 
                  : sessionFee > 0 ? 'Proceed to Payment' : 'Confirm Booking'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PublicBookingModal;
