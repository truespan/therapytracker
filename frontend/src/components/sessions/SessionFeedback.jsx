import React, { useState } from 'react';
import { sessionAPI } from '../../services/api';
import { Star, AlertCircle, CheckCircle } from 'lucide-react';

const SessionFeedback = ({ sessionId, initialFeedback = '', initialRating = null, onSaved }) => {
  const [feedback, setFeedback] = useState(initialFeedback);
  const [rating, setRating] = useState(initialRating);
  const [hoveredRating, setHoveredRating] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!rating) {
      setError('Please provide a rating');
      return;
    }

    setSaving(true);

    try {
      await sessionAPI.update(sessionId, {
        feedback_text: feedback,
        rating: rating
      });
      
      setSuccess(true);
      
      if (onSaved) {
        setTimeout(() => onSaved(), 1500);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save feedback');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4">Session Feedback</h3>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 text-red-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-2 text-green-700">
          <CheckCircle className="h-5 w-5 flex-shrink-0" />
          <span className="text-sm">Feedback saved successfully!</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">How would you rate this session?</label>
          <div className="flex space-x-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(null)}
                className="transition transform hover:scale-110"
              >
                <Star
                  className={`h-8 w-8 ${
                    star <= (hoveredRating || rating)
                      ? 'text-yellow-400 fill-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              </button>
            ))}
          </div>
          <p className="text-sm text-gray-600 mt-2">
            {rating ? `${rating} star${rating > 1 ? 's' : ''}` : 'Click to rate'}
          </p>
        </div>

        <div>
          <label className="label">Session Notes (Optional)</label>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            className="input"
            rows="4"
            placeholder="Share your thoughts about this session..."
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Feedback'}
        </button>
      </form>
    </div>
  );
};

export default SessionFeedback;

