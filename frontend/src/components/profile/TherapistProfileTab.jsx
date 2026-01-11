import React, { useState, useEffect } from 'react';
import { userAPI, reviewAPI } from '../../services/api';
import { User, Briefcase, Award, FileText, Languages, CreditCard, Calendar, Star, Send, MessageSquare, Edit, X } from 'lucide-react';
import { CurrencyIcon } from '../../utils/currencyIcon';
import { useAuth } from '../../context/AuthContext';

const TherapistProfileTab = ({ userId, partnerId = null }) => {
  const { user } = useAuth();
  const [therapist, setTherapist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [publishedReviews, setPublishedReviews] = useState([]);
  const [clientReview, setClientReview] = useState(null);
  const [loadingReviews, setLoadingReviews] = useState(false);
  
  // Feedback form state
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [isEditingFeedback, setIsEditingFeedback] = useState(false);

  useEffect(() => {
    loadTherapistProfile();
  }, [userId, partnerId]);

  useEffect(() => {
    if (therapist) {
      loadPublishedReviews();
      loadClientReview();
    }
  }, [therapist]);

  const loadTherapistProfile = async () => {
    try {
      setLoading(true);
      const response = await userAPI.getPartners(userId);
      const partners = response.data.partners || [];
      
      if (partners.length === 0) {
        setTherapist(null);
        return;
      }
      
      // If partnerId is provided, find that specific partner, otherwise use first partner
      if (partnerId) {
        const selectedPartner = partners.find(p => p.id === partnerId);
        if (selectedPartner) {
          setTherapist(selectedPartner);
        } else {
          // Partner not found in list, use first partner as fallback
          setTherapist(partners[0]);
        }
      } else {
        // No partnerId specified, use first partner
        setTherapist(partners[0]);
      }
    } catch (err) {
      console.error('Failed to load therapist profile:', err);
      setError('Failed to load therapist profile');
    } finally {
      setLoading(false);
    }
  };

  const loadPublishedReviews = async () => {
    if (!therapist) return;
    try {
      setLoadingReviews(true);
      const response = await reviewAPI.getPublishedReviews(therapist.id);
      setPublishedReviews(response.data.reviews || []);
    } catch (err) {
      console.error('Failed to load published reviews:', err);
    } finally {
      setLoadingReviews(false);
    }
  };

  const loadClientReview = async () => {
    if (!therapist) return;
    try {
      const response = await reviewAPI.getClientReview(therapist.id);
      if (response.data.review) {
        setClientReview(response.data.review);
        setRating(response.data.review.rating);
        setFeedbackText(response.data.review.feedback_text || '');
        setIsEditingFeedback(false); // Reset edit mode after loading
      } else {
        setIsEditingFeedback(true); // Show form if no review exists
      }
    } catch (err) {
      console.error('Failed to load client review:', err);
    }
  };

  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    if (!therapist || rating === 0) {
      alert('Please select a rating');
      return;
    }

    try {
      setSubmittingFeedback(true);
      await reviewAPI.createReview({
        therapist_id: therapist.id,
        rating,
        feedback_text: feedbackText.trim() || null
      });
      await loadClientReview();
      await loadPublishedReviews();
      setIsEditingFeedback(false); // Exit edit mode after successful submission
      alert(clientReview ? 'Feedback updated successfully!' : 'Thank you for your feedback!');
    } catch (err) {
      console.error('Failed to submit feedback:', err);
      alert(err.response?.data?.error || 'Failed to submit feedback. Please try again.');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const handleCancelEdit = () => {
    // Reset to saved values
    if (clientReview) {
      setRating(clientReview.rating);
      setFeedbackText(clientReview.feedback_text || '');
    } else {
      setRating(0);
      setFeedbackText('');
    }
    setIsEditingFeedback(false);
  };

  const handleStartEdit = () => {
    setIsEditingFeedback(true);
  };

  // Helper function to construct full image URL
  const getImageUrl = (photoUrl) => {
    if (!photoUrl) return null;

    // If it's already a full URL (Cloudinary or external), return as-is
    if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
      return photoUrl;
    }

    // If it's a relative path, prepend the backend server URL
    // Remove /api from API_URL to get base server URL
    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
    const BASE_URL = API_URL.replace('/api', '');

    // Ensure path starts with /
    const path = photoUrl.startsWith('/') ? photoUrl : `/${photoUrl}`;

    return `${BASE_URL}${path}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-dark-text-secondary">Loading therapist profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (!therapist) {
    return (
      <div className="bg-gray-50 dark:bg-dark-bg-secondary border border-gray-200 dark:border-dark-border rounded-lg p-8 text-center">
        <User className="h-16 w-16 text-gray-300 dark:text-dark-text-tertiary mx-auto mb-4" />
        <p className="text-gray-600 dark:text-dark-text-secondary">No therapist assigned yet.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
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
                  console.error('Failed to load therapist photo:', therapist.photo_url);
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
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
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">{therapist.name}</h2>
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
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  <CreditCard className="h-6 w-6 text-blue-600 dark:text-blue-400" />
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
      </div>

      {/* Work Experience - Full Width */}
      {therapist.work_experience && (
        <div className="bg-white dark:bg-dark-bg-tertiary rounded-lg shadow-md p-6 mt-6">
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

      {/* Other Practice Details - Full Width */}
      {therapist.other_practice_details && (
        <div className="bg-white dark:bg-dark-bg-tertiary rounded-lg shadow-md p-6 mt-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <div className="h-10 w-10 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center">
                <FileText className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
            <div className="ml-4 flex-1">
              <h3 className="text-sm font-medium text-gray-500 dark:text-dark-text-tertiary mb-2">Other Practice Details</h3>
              <p className="text-gray-900 dark:text-dark-text-primary whitespace-pre-wrap leading-relaxed">{therapist.other_practice_details}</p>
            </div>
          </div>
        </div>
      )}

      {/* Contact Information */}
      {(therapist.email || therapist.contact) && (
        <div className="bg-gray-50 dark:bg-dark-bg-secondary rounded-lg p-6 mt-6">
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

      {/* Client Feedback Section */}
      <div className="bg-white dark:bg-dark-bg-tertiary rounded-lg shadow-md p-6 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">Your Feedback</h3>
          {clientReview && !isEditingFeedback && (
            <button
              onClick={handleStartEdit}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <Edit className="h-4 w-4" />
              Edit
            </button>
          )}
        </div>

        {clientReview && !isEditingFeedback ? (
          /* Read-only view of submitted feedback */
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
                Your Rating
              </label>
              <div className="flex items-center space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-6 w-6 ${
                      star <= clientReview.rating
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-gray-300 dark:text-gray-600'
                    }`}
                  />
                ))}
                <span className="ml-2 text-sm text-gray-600 dark:text-dark-text-secondary">
                  {clientReview.rating} {clientReview.rating === 1 ? 'star' : 'stars'}
                </span>
              </div>
            </div>

            {clientReview.feedback_text && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
                  Your Feedback
                </label>
                <div className="px-3 py-2 bg-gray-50 dark:bg-dark-bg-secondary rounded-lg border border-gray-200 dark:border-dark-border">
                  <p className="text-gray-700 dark:text-dark-text-secondary whitespace-pre-wrap">
                    {clientReview.feedback_text}
                  </p>
                </div>
              </div>
            )}

            <div className="text-xs text-gray-500 dark:text-dark-text-tertiary">
              Submitted on {new Date(clientReview.created_at).toLocaleDateString()}
              {clientReview.updated_at !== clientReview.created_at && (
                <span> • Last updated on {new Date(clientReview.updated_at).toLocaleDateString()}</span>
              )}
            </div>
          </div>
        ) : (
          /* Editable form */
          <form onSubmit={handleSubmitFeedback} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
                Rating <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className="focus:outline-none transition-transform hover:scale-110"
                  >
                    <Star
                      className={`h-8 w-8 ${
                        star <= (hoveredRating || rating)
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-gray-300 dark:text-gray-600'
                      }`}
                    />
                  </button>
                ))}
                {rating > 0 && (
                  <span className="ml-2 text-sm text-gray-600 dark:text-dark-text-secondary">
                    {rating} {rating === 1 ? 'star' : 'stars'}
                  </span>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="feedback-text" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
                Your Feedback (Optional)
              </label>
              <textarea
                id="feedback-text"
                rows={4}
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Share your experience with this therapist..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-bg-secondary dark:text-dark-text-primary"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={submittingFeedback || rating === 0}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {submittingFeedback ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    {clientReview ? 'Update Feedback' : 'Submit Feedback'}
                  </>
                )}
              </button>
              {clientReview && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={submittingFeedback}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </button>
              )}
            </div>
          </form>
        )}
      </div>

      {/* Published Reviews Section */}
      <div className="bg-white dark:bg-dark-bg-tertiary rounded-lg shadow-md p-6 mt-6">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="h-5 w-5 text-primary-600 dark:text-primary-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">Client Feedback</h3>
        </div>
        
        {loadingReviews ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : publishedReviews.length > 0 ? (
          <div className="space-y-4">
            {publishedReviews.map((review) => (
              <div
                key={review.id}
                className="border border-gray-200 dark:border-dark-border rounded-lg p-4 hover:shadow-md transition-shadow"
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
                  <p className="text-gray-700 dark:text-dark-text-secondary mt-2 whitespace-pre-wrap">
                    {review.feedback_text}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-dark-text-tertiary">
            <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-dark-text-tertiary" />
            <p className="text-sm">No published reviews yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TherapistProfileTab;
