import React, { useState, useEffect } from 'react';
import { questionnaireAPI } from '../../services/api';

const UserQuestionnaireView = ({ assignmentId, viewOnly = false, onComplete, onCancel }) => {
  const [assignment, setAssignment] = useState(null);
  const [responses, setResponses] = useState({});
  const [textResponse, setTextResponse] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [previousResponses, setPreviousResponses] = useState([]);
  const [showPrevious, setShowPrevious] = useState(viewOnly); // Auto-show if view only

  useEffect(() => {
    const loadData = async () => {
      await loadAssignment();
      await loadPreviousResponses();
    };
    loadData();
  }, [assignmentId]);

  const loadAssignment = async () => {
    try {
      setLoading(true);
      const response = await questionnaireAPI.getAssignment(assignmentId);
      setAssignment(response.data);
      
      // Initialize responses object - but don't set it yet if viewOnly
      // (it will be set by loadPreviousResponses)
      if (!viewOnly) {
        const initialResponses = {};
        if (response.data.questionnaire && response.data.questionnaire.questions) {
          response.data.questionnaire.questions.forEach(question => {
            initialResponses[question.id] = null;
          });
        }
        setResponses(initialResponses);
      }
    } catch (err) {
      setError('Failed to load questionnaire');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadPreviousResponses = async () => {
    try {
      const response = await questionnaireAPI.getResponses(assignmentId);
      const previousData = response.data?.responses || response.data || [];
      const textData = response.data?.text_response || '';
      
      setPreviousResponses(previousData);
      setTextResponse(textData);
      
      console.log('Loading previous responses:', {
        viewOnly,
        responseCount: previousData.length,
        responses: previousData,
        textResponse: textData
      });
      
      // If viewOnly mode, populate responses from previous data
      if (viewOnly && previousData.length > 0) {
        const loadedResponses = {};
        previousData.forEach(resp => {
          console.log('Loading response:', resp);
          loadedResponses[resp.question_id] = {
            question_id: resp.question_id,
            answer_option_id: resp.answer_option_id,
            response_value: resp.response_value
          };
        });
        console.log('Setting responses:', loadedResponses);
        setResponses(loadedResponses);
      }
    } catch (err) {
      console.error('Failed to load previous responses:', err);
    }
  };

  const handleResponseChange = (questionId, optionId, optionValue) => {
    setResponses({
      ...responses,
      [questionId]: {
        question_id: questionId,
        answer_option_id: optionId,
        response_value: optionValue
      }
    });
  };

  const validateResponses = () => {
    const questions = assignment.questionnaire.questions;
    for (const question of questions) {
      if (!responses[question.id]) {
        setError(`Please answer: ${question.question_text}`);
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    setError('');
    setSuccess('');

    if (!validateResponses()) {
      return;
    }

    // Validate text response if text field is required
    if (assignment.questionnaire.has_text_field && !textResponse.trim()) {
      setError('Please fill in the text box');
      return;
    }

    // Validate word count (max 200 words)
    if (textResponse.trim()) {
      const wordCount = textResponse.trim().split(/\s+/).length;
      if (wordCount > 200) {
        setError(`Text box exceeds 200 words (current: ${wordCount} words)`);
        return;
      }
    }

    try {
      setSubmitting(true);
      
      const responseArray = Object.values(responses).filter(r => r !== null);
      await questionnaireAPI.saveResponses(assignmentId, responseArray, null, textResponse);
      
      setSuccess('Questionnaire submitted successfully!');
      
      setTimeout(() => {
        if (onComplete) {
          onComplete();
        }
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit questionnaire');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const getAnsweredCount = () => {
    return Object.values(responses).filter(r => r !== null).length;
  };

  const getTotalQuestions = () => {
    return assignment?.questionnaire?.questions?.length || 0;
  };

  const getProgressPercentage = () => {
    const total = getTotalQuestions();
    if (total === 0) return 0;
    return Math.round((getAnsweredCount() / total) * 100);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!assignment || !assignment.questionnaire) {
    return (
      <div className="p-6 text-center text-red-600">
        Failed to load questionnaire. Please try again.
      </div>
    );
  }

  const { questionnaire } = assignment;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">{questionnaire.name}</h2>
          {questionnaire.description && (
            <p className="text-gray-600">{questionnaire.description}</p>
          )}
          
          {/* Status Badge */}
          <div className="mt-3">
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
              assignment.status === 'completed' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {assignment.status === 'completed' ? 'Completed' : 'Pending'}
            </span>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
            {success}
          </div>
        )}

        {/* Progress Bar - Only show if not viewOnly */}
        {!viewOnly && (
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Progress</span>
              <span className="font-medium text-gray-800">
                {getAnsweredCount()} / {getTotalQuestions()} answered
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${getProgressPercentage()}%` }}
              ></div>
            </div>
          </div>
        )}
        
        {/* View Only Notice */}
        {viewOnly && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
            <p className="text-blue-800 font-medium">
              📋 Viewing Previous Responses (Read-Only)
            </p>
            <p className="text-sm text-blue-600 mt-1">
              This questionnaire has been completed. To answer again, your therapist needs to assign it to you again.
            </p>
          </div>
        )}

        {/* Previous Responses Toggle - Only show if not in viewOnly mode */}
        {!viewOnly && previousResponses.length > 0 && (
          <div className="mb-6">
            <button
              onClick={() => setShowPrevious(!showPrevious)}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              {showPrevious ? '− Hide' : '+ Show'} Previous Responses
            </button>
            
            {showPrevious && (
              <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded">
                <h4 className="font-medium text-gray-800 mb-2">Previous Responses:</h4>
                <div className="space-y-2 text-sm">
                  {previousResponses.map((resp, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span className="text-gray-700">{resp.question_text}</span>
                      <span className="font-medium text-gray-800">{resp.option_text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Text Field (if enabled) */}
        {questionnaire.has_text_field && (
          <div className="mb-6 p-6 border-2 border-gray-200 rounded-lg bg-white shadow-sm">
            <label className="block text-base font-semibold text-gray-800 mb-2">
              {questionnaire.text_field_label || 'Please describe your key issue(s) briefly here.'}
              {!viewOnly && <span className="text-red-500 ml-1">*</span>}
            </label>
            <textarea
              value={textResponse}
              onChange={(e) => !viewOnly && setTextResponse(e.target.value)}
              disabled={viewOnly}
              placeholder={questionnaire.text_field_placeholder || 'Share what brings you to therapy or what you\'d like to work on...'}
              className={`w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
                viewOnly ? 'bg-gray-50 cursor-not-allowed' : ''
              }`}
              rows="6"
              maxLength="2000"
            />
            <div className="flex justify-between mt-2 text-sm">
              <span className="text-gray-500">
                {textResponse.trim().split(/\s+/).filter(w => w).length} / 200 words
              </span>
              <span className={`${
                textResponse.trim().split(/\s+/).filter(w => w).length > 200 
                  ? 'text-red-600 font-medium' 
                  : 'text-gray-400'
              }`}>
                {textResponse.length} characters
              </span>
            </div>
          </div>
        )}

        {/* Questions */}
        <div className="space-y-6 mb-6">
          {(() => {
            // Group questions by sub-heading
            const groupedQuestions = [];
            let currentGroup = { sub_heading: null, questions: [] };
            
            questionnaire.questions.forEach((question, index) => {
              if (question.sub_heading && question.sub_heading !== currentGroup.sub_heading) {
                if (currentGroup.questions.length > 0) {
                  groupedQuestions.push(currentGroup);
                }
                currentGroup = { sub_heading: question.sub_heading, questions: [] };
              }
              currentGroup.questions.push({ ...question, originalIndex: index });
            });
            
            if (currentGroup.questions.length > 0) {
              groupedQuestions.push(currentGroup);
            }
            
            return groupedQuestions.map((group, groupIndex) => (
              <div key={groupIndex}>
                {/* Sub-heading */}
                {group.sub_heading && (
                  <div className="mb-4 pb-2 border-b-2 border-blue-500">
                    <h2 className="text-lg font-bold text-blue-700">
                      {group.sub_heading}
                    </h2>
                  </div>
                )}
                
                {/* Questions in this group */}
                <div className="space-y-4">
                  {group.questions.map((question) => (
                    <div key={question.id} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                      <h3 className="font-medium text-gray-800 mb-3">
                        {question.originalIndex + 1}. {question.question_text}
                        {!viewOnly && <span className="text-red-500 ml-1">*</span>}
                      </h3>
              
              <div className="space-y-2">
                {question.options.map((option) => (
                  <label
                    key={option.id}
                    className={`flex items-center p-3 border rounded-md transition-colors ${
                      responses[question.id]?.answer_option_id === option.id
                        ? 'bg-blue-50 border-blue-500'
                        : 'bg-white border-gray-300'
                    } ${viewOnly ? 'cursor-default' : 'cursor-pointer hover:bg-gray-50'}`}
                  >
                    <input
                      type="radio"
                      name={`question-${question.id}`}
                      value={option.id}
                      checked={responses[question.id]?.answer_option_id === option.id}
                      onChange={() => !viewOnly && handleResponseChange(question.id, option.id, option.option_value)}
                      disabled={viewOnly}
                      className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <span className={`ml-3 ${viewOnly ? 'text-gray-600' : 'text-gray-700'}`}>
                      {option.option_text}
                    </span>
                    <span className="ml-auto text-sm text-gray-500">
                      (Value: {option.option_value})
                    </span>
                  </label>
                ))}
              </div>
                    </div>
                  ))}
                </div>
              </div>
            ));
          })()}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          {viewOnly ? (
            <button
              onClick={onCancel}
              className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          ) : (
            <>
              {onCancel && (
                <button
                  onClick={onCancel}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                  disabled={submitting}
                >
                  Cancel
                </button>
              )}
              <button
                onClick={handleSubmit}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={submitting || getAnsweredCount() !== getTotalQuestions()}
              >
                {submitting ? 'Submitting...' : 'Submit Questionnaire'}
              </button>
            </>
          )}
        </div>

        {/* Help Text */}
        {!viewOnly && (
          <div className="mt-4 text-sm text-gray-500 text-center">
            Please answer all questions before submitting
          </div>
        )}
      </div>
    </div>
  );
};

export default UserQuestionnaireView;

