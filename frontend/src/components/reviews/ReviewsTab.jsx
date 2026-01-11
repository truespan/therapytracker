import React, { useState, useEffect } from 'react';
import { reviewAPI } from '../../services/api';
import { Star, MessageSquare, Eye, EyeOff, Calendar, User } from 'lucide-react';
import { format } from 'date-fns';

const ReviewsTab = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await reviewAPI.getTherapistReviews();
      setReviews(response.data.reviews || []);
    } catch (err) {
      console.error('Failed to load reviews:', err);
      setError('Failed to load reviews. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePublish = async (reviewId) => {
    try {
      setUpdatingId(reviewId);
      await reviewAPI.togglePublishStatus(reviewId);
      // Reload reviews to get updated status
      await loadReviews();
    } catch (err) {
      console.error('Failed to toggle publish status:', err);
      alert(err.response?.data?.error || 'Failed to update review status. Please try again.');
    } finally {
      setUpdatingId(null);
    }
  };

  // Calculate average rating
  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)
    : 0;

  // Count published and unpublished reviews
  const publishedCount = reviews.filter(r => r.is_published).length;
  const unpublishedCount = reviews.filter(r => !r.is_published).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-dark-text-secondary">Loading reviews...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
        <p className="text-red-600 dark:text-red-400">{error}</p>
        <button
          onClick={loadReviews}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-dark-bg-tertiary rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-dark-text-tertiary">Total Reviews</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary mt-1">
                {reviews.length}
              </p>
            </div>
            <MessageSquare className="h-10 w-10 text-primary-600 dark:text-primary-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-dark-bg-tertiary rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-dark-text-tertiary">Average Rating</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary">
                  {averageRating}
                </p>
                {averageRating > 0 && (
                  <div className="flex items-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-4 w-4 ${
                          star <= Math.round(parseFloat(averageRating))
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-gray-300 dark:text-gray-600'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
            <Star className="h-10 w-10 text-yellow-400 fill-yellow-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-dark-bg-tertiary rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-dark-text-tertiary">Published</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary mt-1">
                {publishedCount} / {reviews.length}
              </p>
              <p className="text-xs text-gray-500 dark:text-dark-text-tertiary mt-1">
                {unpublishedCount} unpublished
              </p>
            </div>
            <Eye className="h-10 w-10 text-green-600 dark:text-green-400" />
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div className="bg-white dark:bg-dark-bg-tertiary rounded-lg shadow-md">
        <div className="p-6 border-b border-gray-200 dark:border-dark-border">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary">
            All Reviews
          </h2>
          <p className="text-sm text-gray-500 dark:text-dark-text-tertiary mt-1">
            Manage which reviews are displayed on your profile
          </p>
        </div>

        {reviews.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="h-16 w-16 text-gray-300 dark:text-dark-text-tertiary mx-auto mb-4" />
            <p className="text-gray-600 dark:text-dark-text-secondary text-lg">
              No reviews yet
            </p>
            <p className="text-gray-500 dark:text-dark-text-tertiary text-sm mt-2">
              Reviews will appear here when clients submit feedback
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-dark-border">
            {reviews.map((review) => (
              <div
                key={review.id}
                className={`p-6 hover:bg-gray-50 dark:hover:bg-dark-bg-secondary transition-colors ${
                  review.is_published ? 'bg-green-50 dark:bg-green-900/10' : ''
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1">
                    {/* Client Info and Rating */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                          <User className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-dark-text-primary">
                            {review.client_name || 'Anonymous Client'}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-dark-text-tertiary">
                            {review.client_email || 'No email'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-5 w-5 ${
                              star <= review.rating
                                ? 'text-yellow-400 fill-yellow-400'
                                : 'text-gray-300 dark:text-gray-600'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Feedback Text */}
                    {review.feedback_text && (
                      <div className="mb-3">
                        <p className="text-gray-700 dark:text-dark-text-secondary whitespace-pre-wrap">
                          {review.feedback_text}
                        </p>
                      </div>
                    )}

                    {/* Date */}
                    <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-dark-text-tertiary">
                      <Calendar className="h-4 w-4" />
                      <span>
                        Submitted on {format(new Date(review.created_at), 'MMM dd, yyyy')}
                      </span>
                      {review.updated_at !== review.created_at && (
                        <span className="ml-2">
                          (Updated on {format(new Date(review.updated_at), 'MMM dd, yyyy')})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Publish Toggle */}
                  <div className="flex items-center gap-3">
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                      review.is_published
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                    }`}>
                      {review.is_published ? 'Published' : 'Not Published'}
                    </div>
                    <button
                      onClick={() => handleTogglePublish(review.id)}
                      disabled={updatingId === review.id}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                        review.is_published
                          ? 'bg-gray-600 text-white hover:bg-gray-700'
                          : 'bg-primary-600 text-white hover:bg-primary-700'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                      title={review.is_published ? 'Unpublish this review' : 'Publish this review'}
                    >
                      {updatingId === review.id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Updating...
                        </>
                      ) : review.is_published ? (
                        <>
                          <EyeOff className="h-4 w-4" />
                          Unpublish
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4" />
                          Publish
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewsTab;
