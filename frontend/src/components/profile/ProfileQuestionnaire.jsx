import React, { useState, useEffect } from 'react';
import { profileAPI, sessionAPI } from '../../services/api';
import { getRatingOptions, getRatingColor, getHoverColor } from '../../utils/chartHelpers';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';

const ProfileQuestionnaire = ({ userId, sessionId, onComplete, showPreviousRatings = false }) => {
  const [fields, setFields] = useState([]);
  const [ratings, setRatings] = useState({});
  const [previousRatings, setPreviousRatings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadFields();
    if (showPreviousRatings) {
      loadPreviousRatings();
    }
  }, [userId, showPreviousRatings]);

  const loadFields = async () => {
    try {
      const response = await profileAPI.getAllFields();
      setFields(response.data.fields);
      
      // Initialize ratings with empty values
      const initialRatings = {};
      response.data.fields.forEach(field => {
        initialRatings[field.id] = '';
      });
      setRatings(initialRatings);
      setLoading(false);
    } catch (err) {
      setError('Failed to load profile fields');
      setLoading(false);
    }
  };

  const loadPreviousRatings = async () => {
    try {
      const response = await profileAPI.getUserProfileData(userId);
      const latest = response.data.latestProfile;
      
      if (latest && latest.length > 0) {
        const prevRatings = {};
        latest.forEach(item => {
          prevRatings[item.field_id] = {
            value: item.rating_value,
            session: item.session_number
          };
        });
        setPreviousRatings(prevRatings);
      }
    } catch (err) {
      console.error('Failed to load previous ratings:', err);
    }
  };

  const handleRatingChange = (fieldId, value) => {
    setRatings({
      ...ratings,
      [fieldId]: value
    });
    setError('');
    setSuccess(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Validate all fields are filled
    const emptyFields = fields.filter(field => !ratings[field.id]);
    if (emptyFields.length > 0) {
      setError('Please rate all fields before submitting');
      return;
    }

    setSaving(true);

    try {
      // Format ratings for API
      const ratingsArray = Object.entries(ratings).map(([fieldId, value]) => ({
        field_id: parseInt(fieldId),
        rating_value: value
      }));

      await sessionAPI.saveProfile(sessionId, ratingsArray);
      setSuccess(true);
      
      if (onComplete) {
        setTimeout(() => onComplete(), 1500);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const getCategoryLabel = (category) => {
    // New categories are already properly formatted, return as-is
    return category;
  };

  if (loading) {
    return <div className="text-center py-8">Loading questionnaire...</div>;
  }

  // Group fields by category
  const groupedFields = fields.reduce((acc, field) => {
    if (!acc[field.category]) {
      acc[field.category] = [];
    }
    acc[field.category].push(field);
    return acc;
  }, {});

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Mind-Body Profile Assessment</h2>
        <p className="text-gray-600">
          Rate yourself on the following aspects. Your responses will be used to create your personalized mind-body map.
        </p>
        {showPreviousRatings && Object.keys(previousRatings).length > 0 && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start space-x-2">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-blue-800">
              Your previous ratings are shown below for reference. Update them based on how you feel now.
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 text-red-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-2 text-green-700">
          <CheckCircle className="h-5 w-5 flex-shrink-0" />
          <span className="text-sm">Profile saved successfully!</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {Object.entries(groupedFields).map(([category, categoryFields]) => (
          <div key={category} className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">
              {getCategoryLabel(category)}
            </h3>
            <div className="space-y-4">
              {categoryFields.map((field) => {
                const options = getRatingOptions(field.field_type);
                const previousRating = previousRatings[field.id];
                
                return (
                  <div key={field.id} className="pb-4 border-b last:border-b-0 last:pb-0">
                    <label className="block mb-3">
                      <span className="text-gray-900 font-medium">{field.field_name}</span>
                      {previousRating && (
                        <span className="ml-2 text-sm text-gray-500">
                          (Previous: <span className="font-medium text-primary-600">{previousRating.value}</span>)
                        </span>
                      )}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {options.map((option) => {
                        const isSelected = ratings[field.id] === option;
                        const baseColor = getRatingColor(option);
                        const hoverColor = getHoverColor(option);
                        
                        return (
                          <button
                            key={option}
                            type="button"
                            onClick={() => handleRatingChange(field.id, option)}
                            style={{
                              backgroundColor: isSelected ? baseColor : 'transparent',
                              borderColor: isSelected ? baseColor : '#d1d5db',
                              color: isSelected ? 'white' : '#374151'
                            }}
                            className="px-4 py-2 rounded-lg border-2 font-medium transition"
                            onMouseEnter={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.backgroundColor = '#f3f4f6';
                                e.currentTarget.style.borderColor = '#9ca3af';
                              } else {
                                e.currentTarget.style.backgroundColor = hoverColor;
                                e.currentTarget.style.borderColor = hoverColor;
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.backgroundColor = 'transparent';
                                e.currentTarget.style.borderColor = '#d1d5db';
                              } else {
                                e.currentTarget.style.backgroundColor = baseColor;
                                e.currentTarget.style.borderColor = baseColor;
                              }
                            }}
                          >
                            {option}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div className="flex justify-end space-x-4">
          <button
            type="submit"
            disabled={saving}
            className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProfileQuestionnaire;

