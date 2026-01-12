import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { publicPartnerAPI } from '../services/api';
import { User, Briefcase, Award, Languages, Calendar, Star, MessageSquare, Clock, MapPin } from 'lucide-react';
import { CurrencyIcon } from '../utils/currencyIcon';
import { formatTime } from '../utils/dateUtils';
import AvailabilityCalendar from '../components/availability/AvailabilityCalendar';
import PublicBookingModal from '../components/availability/PublicBookingModal';

const PublicTherapistProfile = () => {
  const { partner_id } = useParams();
  const [therapist, setTherapist] = useState(null);
  const [availability, setAvailability] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [feeSettings, setFeeSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);

  useEffect(() => {
    loadTherapistData();
  }, [partner_id]);

  const loadTherapistData = async () => {
    try {
      setLoading(true);
      setError('');

      const [profileResponse, availabilityResponse, reviewsResponse, feeSettingsResponse] = await Promise.all([
        publicPartnerAPI.getProfileByPartnerId(partner_id),
        publicPartnerAPI.getAvailabilityByPartnerId(partner_id),
        publicPartnerAPI.getReviewsByPartnerId(partner_id),
        publicPartnerAPI.getFeeSettingsByPartnerId(partner_id).catch(() => ({ data: { feeSettings: null } }))
      ]);

      setTherapist(profileResponse.data.partner);
      setAvailability(availabilityResponse.data.slots || []);
      setReviews(reviewsResponse.data.reviews || []);
      setFeeSettings(feeSettingsResponse.data.feeSettings);
    } catch (err) {
      console.error('Failed to load therapist data:', err);
      setError(err.response?.data?.error || 'Failed to load therapist profile. Please check the link.');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to construct full image URL
  const getImageUrl = (photoUrl) => {
    if (!photoUrl) return null;
    if (photoUrl.startsWith('http')) return photoUrl;

    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
    const BASE_URL = API_URL.replace('/api', '');
    const path = photoUrl.startsWith('/') ? photoUrl : `/${photoUrl}`;
    return `${BASE_URL}${path}`;
  };

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Handle booking slot click
  const handleBookSlot = (slot) => {
    setSelectedSlot(slot);
    setShowBookingModal(true);
  };

  // Handle booking confirmation callback
  const handleBookingConfirm = async (clientData, success = false) => {
    if (success) {
      // Booking was successful (payment completed)
      setShowBookingModal(false);
      setSelectedSlot(null);
      setBookingLoading(false);
      alert('Booking confirmed successfully! Your appointment has been scheduled.');
      // Reload availability to show updated slots
      loadTherapistData();
    }
  };

  // Handle booking modal cancel
  const handleBookingCancel = () => {
    setShowBookingModal(false);
    setSelectedSlot(null);
    setBookingLoading(false);
  };

  // Filter available slots for calendar display
  const getAvailableSlotsForCalendar = () => {
    return availability.filter(slot => 
      slot.is_available && slot.is_published && 
      (slot.status === 'available_online' || slot.status === 'available_offline')
    );
  };

  // Calculate average rating
  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-bg-primary flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-dark-text-secondary">Loading therapist profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-bg-primary flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white dark:bg-dark-bg-secondary rounded-lg shadow-md p-6 text-center">
          <div className="text-red-600 dark:text-red-400 mb-4">
            <User className="h-16 w-16 mx-auto" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-dark-text-primary mb-2">Therapist Not Found</h2>
          <p className="text-gray-600 dark:text-dark-text-secondary">{error}</p>
        </div>
      </div>
    );
  }

  if (!therapist) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg-primary">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Card with Photo and Basic Info */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg shadow-lg p-6 sm:p-8 mb-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Profile Photo */}
            <div className="flex-shrink-0">
              {therapist.photo_url ? (
                <img
                  src={getImageUrl(therapist.photo_url)}
                  alt={therapist.name}
                  className="h-32 w-32 rounded-full border-4 border-white shadow-lg object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    if (e.target.nextSibling) {
                      e.target.nextSibling.style.display = 'flex';
                    }
                  }}
                />
              ) : null}
              <div
                className="h-32 w-32 rounded-full border-4 border-white shadow-lg bg-white flex items-center justify-center"
                style={{ display: therapist.photo_url ? 'none' : 'flex' }}
              >
                <User className="h-16 w-16 text-primary-600" />
              </div>
            </div>

            {/* Name and Basic Info */}
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">{therapist.name}</h1>
              {therapist.qualification && (
                <p className="text-xl text-white mb-4">{therapist.qualification}</p>
              )}
              <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
                {therapist.sex && (
                  <span className="inline-flex items-center px-3 py-1 bg-white bg-opacity-20 text-white rounded-full text-sm">
                    <User className="h-4 w-4 mr-1" />
                    {therapist.sex}
                  </span>
                )}
                {therapist.age && (
                  <span className="inline-flex items-center px-3 py-1 bg-white bg-opacity-20 text-white rounded-full text-sm">
                    <Calendar className="h-4 w-4 mr-1" />
                    {therapist.age} years
                  </span>
                )}
                {averageRating > 0 && (
                  <span className="inline-flex items-center px-3 py-1 bg-white bg-opacity-20 text-white rounded-full text-sm">
                    <Star className="h-4 w-4 mr-1 fill-white" />
                    {averageRating} ({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Profile Details Section */}
        <div className="space-y-6 mb-6">
            {/* Qualification */}
            {therapist.qualification && (
              <div className="bg-white dark:bg-dark-bg-tertiary rounded-lg shadow-md p-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center">
                      <Award className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-dark-text-tertiary mb-1">Qualification</h3>
                    <p className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">{therapist.qualification}</p>
                    {therapist.qualification_degree && (
                      <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">{therapist.qualification_degree}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* License ID */}
            {therapist.license_id && (
              <div className="bg-white dark:bg-dark-bg-tertiary rounded-lg shadow-md p-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                      <Award className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-dark-text-tertiary mb-1">Practitioner License ID</h3>
                    <p className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">{therapist.license_id}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Fees Range */}
            {(therapist.fee_min || therapist.fee_max) && (
              <div className="bg-white dark:bg-dark-bg-tertiary rounded-lg shadow-md p-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                      <CurrencyIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-dark-text-tertiary mb-1">Fee Range</h3>
                    <p className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">
                      {therapist.fee_currency || 'INR'} {therapist.fee_min || 0} - {therapist.fee_max || 0}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Language Preferences */}
            {therapist.language_preferences && (
              <div className="bg-white dark:bg-dark-bg-tertiary rounded-lg shadow-md p-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                      <Languages className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-dark-text-tertiary mb-1">Languages</h3>
                    <p className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">{therapist.language_preferences}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Work Experience */}
            {therapist.work_experience && (
              <div className="bg-white dark:bg-dark-bg-tertiary rounded-lg shadow-md p-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
                      <Briefcase className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-dark-text-tertiary mb-2">Work Experience</h3>
                    <p className="text-gray-900 dark:text-dark-text-primary whitespace-pre-wrap leading-relaxed">{therapist.work_experience}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Other Practice Details */}
            {therapist.other_practice_details && (
              <div className="bg-white dark:bg-dark-bg-tertiary rounded-lg shadow-md p-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center">
                      <Briefcase className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-dark-text-tertiary mb-2">Practice Details</h3>
                    <p className="text-gray-900 dark:text-dark-text-primary whitespace-pre-wrap leading-relaxed">{therapist.other_practice_details}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Contact Information */}
            {(therapist.email || therapist.contact) && (
              <div className="bg-white dark:bg-dark-bg-tertiary rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-4">Contact Information</h3>
                <div className="space-y-2">
                  {therapist.email && (
                    <div className="flex items-center text-gray-700 dark:text-dark-text-secondary">
                      <span className="font-medium mr-2">Email:</span>
                      <a href={`mailto:${therapist.email}`} className="text-primary-600 dark:text-dark-primary-500 hover:text-primary-700 dark:hover:text-dark-primary-400">
                        {therapist.email}
                      </a>
                    </div>
                  )}
                  {therapist.contact && (
                    <div className="flex items-center text-gray-700 dark:text-dark-text-secondary">
                      <span className="font-medium mr-2">Phone:</span>
                      <a href={`tel:${therapist.contact}`} className="text-primary-600 dark:text-dark-primary-500 hover:text-primary-700 dark:hover:text-dark-primary-400">
                        {therapist.contact}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
        </div>

        {/* Availability Section */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">Book an Appointment</h3>
          </div>
          <AvailabilityCalendar
            slots={getAvailableSlotsForCalendar()}
            onBook={handleBookSlot}
            viewMode="client"
          />
        </div>

        {/* Reviews Section */}
        <div className="bg-white dark:bg-dark-bg-tertiary rounded-lg shadow-md p-6">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">Client Reviews</h3>
          </div>
          
          {averageRating > 0 && (
            <div className="mb-4 pb-4 border-b border-gray-200 dark:border-dark-border">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary">{averageRating}</span>
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-5 w-5 ${
                        star <= Math.round(parseFloat(averageRating))
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-gray-300 dark:text-gray-600'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm text-gray-600 dark:text-dark-text-secondary">
                  ({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})
                </span>
              </div>
            </div>
          )}

          {reviews.length > 0 ? (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className="border border-gray-200 dark:border-dark-border rounded-lg p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-4 w-4 ${
                              star <= review.rating
                                ? 'text-yellow-400 fill-yellow-400'
                                : 'text-gray-300 dark:text-gray-600'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-dark-text-primary">
                        {review.client_name || 'Anonymous'}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-dark-text-tertiary">
                      {new Date(review.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {review.feedback_text && (
                    <p className="text-gray-700 dark:text-dark-text-secondary mt-2 whitespace-pre-wrap text-sm">
                      {review.feedback_text}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-dark-text-tertiary text-sm">No reviews yet</p>
          )}
        </div>
      </div>

      {/* Booking Modal */}
      {showBookingModal && selectedSlot && (
        <PublicBookingModal
          slot={selectedSlot}
          partnerName={therapist.name}
          partnerId={therapist.partner_id}
          feeSettings={feeSettings}
          onConfirm={handleBookingConfirm}
          onCancel={handleBookingCancel}
          loading={bookingLoading}
        />
      )}
    </div>
  );
};

export default PublicTherapistProfile;
