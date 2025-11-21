import React, { useState, useEffect } from 'react';
import { profileAPI, sessionAPI } from '../../services/api';
import { ChevronDown, ChevronRight, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { getRatingColor, getHoverColor } from '../../utils/chartHelpers';

const AssessmentQuestionnaire = ({ userId, sessionId, onComplete, viewOnly = false, sessionNumber, onFieldAdded }) => {
  const [fields, setFields] = useState([]);
  const [responses, setResponses] = useState({});
  const [previousResponses, setPreviousResponses] = useState({});
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [mainIssue, setMainIssue] = useState('');
  const [wordCount, setWordCount] = useState(0);

  const ratingOptions = ['Excellent', 'Good', 'Fair', 'Poor', 'Very Poor'];
  const MAX_WORDS = 200;

  useEffect(() => {
    loadData();
  }, [userId, sessionId]);

  // Expose refreshFields method to parent via callback
  useEffect(() => {
    if (onFieldAdded && typeof onFieldAdded === 'function') {
      // onFieldAdded is a function that will be called with refreshFields
      const refreshFn = () => {
        loadData();
      };
      onFieldAdded(refreshFn);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onFieldAdded]);

  const loadData = async () => {
    try {
      // Validate sessionId is present for proper field filtering
      if (!sessionId) {
        console.warn('[AssessmentQuestionnaire] No sessionId provided, fields may not be filtered correctly');
      }

      // Fetch fields filtered by session_id - this ensures only session-specific custom fields are loaded
      const [fieldsResponse, previousResponse] = await Promise.all([
        profileAPI.getAllFields(sessionId || null),
        profileAPI.getUserProfileData(userId).catch(() => ({ data: { latestProfile: [] } }))
      ]);

      console.log(`[AssessmentQuestionnaire] Loaded ${fieldsResponse.data.fields.length} fields for session ${sessionId}`);
      setFields(fieldsResponse.data.fields);

      // Initialize responses with empty values
      const initialResponses = {};
      fieldsResponse.data.fields.forEach(field => {
        initialResponses[field.id] = '';
      });

      // Set previous responses if available (for reference only, not for current session)
      if (previousResponse.data.latestProfile && previousResponse.data.latestProfile.length > 0) {
        const prevResponses = {};
        previousResponse.data.latestProfile.forEach(item => {
          prevResponses[item.field_id] = {
            value: item.rating_value,
            sessionNumber: item.session_number
          };
        });
        setPreviousResponses(prevResponses);
      }

      // Load responses for current session
      if (sessionId) {
        try {
          const sessionResponse = await sessionAPI.getById(sessionId);
          
          // Load main issue if it exists
          if (sessionResponse.data.session && sessionResponse.data.session.main_issue) {
            setMainIssue(sessionResponse.data.session.main_issue);
            // Calculate word count
            const words = sessionResponse.data.session.main_issue.trim().split(/\s+/).filter(w => w.length > 0);
            setWordCount(words.length);
          }
          
          if (sessionResponse.data.profileData && sessionResponse.data.profileData.length > 0) {
            const sessionResponses = {};
            sessionResponse.data.profileData.forEach(item => {
              sessionResponses[item.field_id] = item.rating_value;
            });
            setResponses(sessionResponses);
          } else {
            setResponses(initialResponses);
          }
        } catch (err) {
          console.error('Failed to load session responses:', err);
          setResponses(initialResponses);
        }
      } else {
        setResponses(initialResponses);
      }

      setLoading(false);
    } catch (err) {
      console.error('Failed to load assessment data:', err);
      setError('Failed to load assessment questions');
      setLoading(false);
    }
  };

  const handleRatingSelect = (fieldId, value) => {
    if (viewOnly) return; // Don't allow changes in view-only mode
    
    setResponses({
      ...responses,
      [fieldId]: value
    });
    setError('');
    setSuccess(false);
  };

  const handleMainIssueChange = (e) => {
    if (viewOnly) return;
    
    const text = e.target.value;
    const words = text.trim().split(/\s+/).filter(w => w.length > 0);
    const count = words.length;
    
    // Only update if within word limit
    if (count <= MAX_WORDS) {
      setMainIssue(text);
      setWordCount(count);
      setError('');
      setSuccess(false);
    }
  };

  const toggleCategory = (category) => {
    setExpandedCategory(expandedCategory === category ? null : category);
  };

  // Group fields by category
  const groupedFields = fields.reduce((acc, field) => {
    if (!acc[field.category]) {
      acc[field.category] = [];
    }
    acc[field.category].push(field);
    return acc;
  }, {});

  // Calculate progress
  const calculateProgress = () => {
    const totalQuestions = fields.length;
    const answeredQuestions = Object.values(responses).filter(r => r !== '').length;
    return { answered: answeredQuestions, total: totalQuestions };
  };

  // Calculate category progress
  const getCategoryProgress = (categoryFields) => {
    const total = categoryFields.length;
    const answered = categoryFields.filter(field => responses[field.id] !== '').length;
    return { answered, total };
  };

  // Check if all questions are answered
  const isAllAnswered = () => {
    return fields.every(field => responses[field.id] !== '');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!isAllAnswered()) {
      setError('Please answer all questions before submitting');
      return;
    }

    // Check if we have a session ID
    if (!sessionId) {
      setError('No active session. Please contact your therapist.');
      return;
    }

    setSaving(true);

    try {
      // Save main issue first
      if (mainIssue.trim()) {
        await sessionAPI.update(sessionId, {
          main_issue: mainIssue.trim()
        });
      }

      // Format ratings for API
      const ratingsArray = Object.entries(responses)
        .filter(([_, value]) => value !== '')
        .map(([fieldId, value]) => ({
          field_id: parseInt(fieldId),
          rating_value: value
        }));

      await sessionAPI.saveProfile(sessionId, ratingsArray);
      setSuccess(true);

      if (onComplete) {
        setTimeout(() => onComplete(), 1500);
      }
    } catch (err) {
      console.error('Failed to save assessment:', err);
      setError(err.response?.data?.error || 'Failed to save assessment');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <div className="animate-pulse text-gray-600">Loading assessment...</div>
        </div>
      </div>
    );
  }

  if (fields.length === 0) {
    return (
      <div className="card">
        <div className="text-center py-8 text-gray-600">
          <p>No assessment questions available. Please contact your therapist.</p>
        </div>
      </div>
    );
  }

  const progress = calculateProgress();
  const progressPercentage = progress.total > 0 ? Math.round((progress.answered / progress.total) * 100) : 0;

  // Filter out "Others" category if it has no fields
  const categoriesToShow = Object.keys(groupedFields).filter(category => {
    if (category === 'Others') {
      return groupedFields[category].length > 0;
    }
    return true;
  });

  const hasPreviousResponses = Object.keys(previousResponses).length > 0;

  return (
    <div className="card">
      {/* 1. Header */}
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          {viewOnly ? `Session ${sessionNumber} - Assessment Responses` : 'Mind & Body Assessment Questionnaire'}
        </h3>
        <p className="text-sm text-gray-600">
          {viewOnly 
            ? 'Your submitted responses for this session are shown below.' 
            : 'Please rate each question based on your current experience. Your responses will help us provide better support.'
          }
        </p>
      </div>

      {/* 2. Main Issue Text Area */}
      {!viewOnly && (
        <div className="mb-6">
          <label className="block mb-2">
            <span className="text-gray-900 font-semibold">Please describe your key issue(s) briefly here.</span>
          </label>
          <textarea
            value={mainIssue}
            onChange={handleMainIssueChange}
            placeholder="Share what brings you to therapy or what you'd like to work on..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
            rows="5"
            disabled={viewOnly}
          />
          <div className="flex justify-end mt-2">
            <span className={`text-sm ${wordCount > MAX_WORDS ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
              {wordCount}/{MAX_WORDS} words
            </span>
          </div>
        </div>
      )}

      {/* View Only - Show Main Issue */}
      {viewOnly && mainIssue && (
        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h4 className="text-gray-900 font-semibold mb-2">Key Issues Described:</h4>
          <p className="text-gray-700 whitespace-pre-wrap">{mainIssue}</p>
        </div>
      )}

      {/* 3. Previous Ratings Info Box */}
      {viewOnly && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start space-x-2">
          <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-blue-800">
            These responses have been submitted. You can update them when your therapist starts a new session.
          </p>
        </div>
      )}

      {!viewOnly && hasPreviousResponses && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start space-x-2">
          <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-blue-800">
            Your previous ratings are shown below for reference. Update them based on how you feel now.
          </p>
        </div>
      )}

      {/* 4. Progress Bar - Only show for editable mode */}
      {!viewOnly && (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">
              Progress: {progress.answered} of {progress.total} questions answered
            </span>
            <span className="text-sm font-medium text-primary-600">
              {progressPercentage}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      )}

      {/* 5. Error/Success Messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 text-red-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-2 text-green-700">
          <CheckCircle className="h-5 w-5 flex-shrink-0" />
          <span className="text-sm">Assessment saved successfully!</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        {categoriesToShow.map((category) => {
          const categoryFields = groupedFields[category];
          const categoryProgress = getCategoryProgress(categoryFields);
          const isExpanded = expandedCategory === category;

          return (
            <div key={category} className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Collapsible Header */}
              <button
                type="button"
                onClick={() => toggleCategory(category)}
                className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition flex items-center justify-between"
              >
                <div className="flex items-center space-x-2">
                  {isExpanded ? (
                    <ChevronDown className="h-5 w-5 text-gray-600" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-gray-600" />
                  )}
                  <span className="font-semibold text-gray-900">{category}</span>
                </div>
                <span className="text-sm text-gray-600">
                  {categoryProgress.answered}/{categoryProgress.total} completed
                </span>
              </button>

              {/* Collapsible Content */}
              {isExpanded && (
                <div className="p-4 space-y-6 bg-white">
                  {categoryFields.map((field) => {
                    const previousResponse = previousResponses[field.id];

                    return (
                      <div key={field.id} className="pb-4 border-b last:border-b-0 last:pb-0">
                        <label className="block mb-3">
                          <span className="text-gray-900 font-medium">{field.field_name}</span>
                          {previousResponse && (
                            <div className="mt-1">
                              <span className="text-sm text-gray-500">
                                Previous: <span className="font-medium text-gray-700">{previousResponse.value}</span>
                                {previousResponse.sessionNumber && (
                                  <span className="text-gray-400"> (Session {previousResponse.sessionNumber})</span>
                                )}
                              </span>
                            </div>
                          )}
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {ratingOptions.map((option) => {
                            const isSelected = responses[field.id] === option;
                            const baseColor = getRatingColor(option);
                            const hoverColor = getHoverColor(option);
                            
                            if (viewOnly && !isSelected) {
                              return null; // Hide unselected options in view-only mode
                            }
                            
                            return (
                              <button
                                key={option}
                                type="button"
                                onClick={() => handleRatingSelect(field.id, option)}
                                disabled={viewOnly}
                                style={{
                                  backgroundColor: isSelected ? baseColor : 'transparent',
                                  borderColor: isSelected ? baseColor : '#d1d5db',
                                  color: isSelected ? 'white' : '#374151'
                                }}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-all border-2 ${
                                  viewOnly ? 'cursor-default' : ''
                                }`}
                                onMouseEnter={(e) => {
                                  if (!viewOnly && !isSelected) {
                                    e.currentTarget.style.backgroundColor = hoverColor;
                                    e.currentTarget.style.borderColor = hoverColor;
                                    e.currentTarget.style.color = 'white';
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!viewOnly && !isSelected) {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                    e.currentTarget.style.borderColor = '#d1d5db';
                                    e.currentTarget.style.color = '#374151';
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
              )}
            </div>
          );
        })}

        {!viewOnly && (
          <div className="pt-4">
            <button
              type="submit"
              disabled={!isAllAnswered() || saving}
              className={`w-full py-3 px-4 rounded-lg font-medium transition ${
                isAllAnswered() && !saving
                  ? 'bg-primary-600 text-white hover:bg-primary-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {saving ? 'Submitting...' : 'Submit Assessment'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

export default AssessmentQuestionnaire;

