import React, { useState, useEffect } from 'react';
import { therapySessionAPI, questionnaireAPI } from '../../services/api';
import { X, FileText, Send, AlertCircle, CheckSquare, Square } from 'lucide-react';

const AssignQuestionnaireToSessionModal = ({ session, partnerId, userId, onClose, onSuccess }) => {
  const [questionnaires, setQuestionnaires] = useState([]);
  const [selectedQuestionnaires, setSelectedQuestionnaires] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingQuestionnaires, setLoadingQuestionnaires] = useState(true);
  const [error, setError] = useState('');

  const MAX_SELECTIONS = 3;

  useEffect(() => {
    loadQuestionnaires();
  }, [partnerId]);

  const loadQuestionnaires = async () => {
    try {
      setLoadingQuestionnaires(true);
      const response = await questionnaireAPI.getByPartner(partnerId);
      console.log('Questionnaires response:', response.data);
      
      // Handle new response structure: { own: [], preset: [] }
      // Combine both own and preset questionnaires for assignment
      let questionnairesList = [];
      if (response.data) {
        if (Array.isArray(response.data)) {
          // Backward compatibility: if it's still an array
          questionnairesList = response.data;
        } else if (response.data.own || response.data.preset) {
          // New structure: combine own and preset
          questionnairesList = [
            ...(response.data.own || []),
            ...(response.data.preset || [])
          ];
        }
      }
      
      setQuestionnaires(questionnairesList);
    } catch (err) {
      console.error('Failed to load questionnaires:', err);
      setError('Failed to load questionnaires');
    } finally {
      setLoadingQuestionnaires(false);
    }
  };

  const handleToggleQuestionnaire = (questionnaireId) => {
    setSelectedQuestionnaires(prev => {
      if (prev.includes(questionnaireId)) {
        // Remove if already selected
        return prev.filter(id => id !== questionnaireId);
      } else {
        // Add if not at max limit
        if (prev.length < MAX_SELECTIONS) {
          return [...prev, questionnaireId];
        }
        return prev;
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (selectedQuestionnaires.length === 0) {
      setError('Please select at least one questionnaire');
      return;
    }

    setLoading(true);

    try {
      // Assign all selected questionnaires
      const assignmentPromises = selectedQuestionnaires.map(questionnaireId =>
        therapySessionAPI.assignQuestionnaire(session.id, {
          questionnaire_id: questionnaireId,
          user_id: userId,
          partner_id: partnerId
        })
      );

      await Promise.all(assignmentPromises);

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err) {
      console.error('Assign questionnaire error:', err);
      setError(err.response?.data?.error || 'Failed to assign questionnaires');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dark-bg-tertiary rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary-100 dark:bg-dark-bg-secondary rounded-lg">
                <Send className="h-6 w-6 text-primary-600 dark:text-dark-primary-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary">Assign Questionnaires</h2>
            </div>
            <button onClick={onClose} className="text-gray-400 dark:text-dark-text-tertiary hover:text-gray-600 dark:hover:text-dark-text-secondary">
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Session Info */}
          <div className="mb-4 p-3 bg-primary-50 border border-primary-200 rounded-lg">
            <p className="text-sm text-gray-700">
              <strong>Session:</strong> {session.session_title}
            </p>
            <p className="text-sm text-gray-700 mt-1">
              <strong>Date:</strong> {new Date(session.session_date).toLocaleString()}
            </p>
          </div>

          {/* Info Message */}
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start space-x-2">
            <AlertCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-green-800">
                Selected questionnaires will be automatically sent to the client.
              </p>
              <p className="text-sm text-green-700 mt-1">
                You can select up to {MAX_SELECTIONS} questionnaires at once.
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Selection Counter */}
            <div className="flex items-center justify-between pb-2 border-b border-gray-200">
              <label className="text-sm font-medium text-gray-700">
                <FileText className="inline h-4 w-4 mr-1" />
                Select Questionnaires ({selectedQuestionnaires.length}/{MAX_SELECTIONS})
              </label>
              {selectedQuestionnaires.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedQuestionnaires([])}
                  className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Questionnaire Selection */}
            {loadingQuestionnaires ? (
              <div className="text-center py-8 text-gray-500">
                Loading questionnaires...
              </div>
            ) : questionnaires.length === 0 ? (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                No questionnaires available. Please create a questionnaire first.
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {questionnaires.map(q => {
                  const isSelected = selectedQuestionnaires.includes(q.id);
                  const isDisabled = !isSelected && selectedQuestionnaires.length >= MAX_SELECTIONS;

                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => handleToggleQuestionnaire(q.id)}
                      disabled={isDisabled}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                        isSelected
                          ? 'border-primary-600 bg-primary-50'
                          : isDisabled
                          ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                          : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        {/* Checkbox Icon */}
                        <div className="mt-0.5">
                          {isSelected ? (
                            <CheckSquare className="h-5 w-5 text-primary-600" />
                          ) : (
                            <Square className="h-5 w-5 text-gray-400" />
                          )}
                        </div>

                        {/* Questionnaire Details */}
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{q.name}</p>
                          {q.description && (
                            <p className="text-sm text-gray-600 mt-1">{q.description}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            Type: <span className="capitalize">{q.type}</span>
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Selected Summary */}
            {selectedQuestionnaires.length > 0 && (
              <div className="p-3 bg-primary-50 border border-primary-200 rounded-lg">
                <p className="text-sm font-medium text-gray-900 mb-2">
                  Selected ({selectedQuestionnaires.length}):
                </p>
                <ul className="space-y-1">
                  {selectedQuestionnaires.map(id => {
                    const q = questionnaires.find(quest => quest.id === id);
                    return (
                      <li key={id} className="text-sm text-gray-700 flex items-center">
                        <CheckSquare className="h-3 w-3 text-primary-600 mr-2" />
                        {q?.name}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading || loadingQuestionnaires || questionnaires.length === 0 || selectedQuestionnaires.length === 0}
              >
                {loading
                  ? `Assigning ${selectedQuestionnaires.length} questionnaire${selectedQuestionnaires.length !== 1 ? 's' : ''}...`
                  : `Assign & Send ${selectedQuestionnaires.length > 0 ? `(${selectedQuestionnaires.length})` : ''}`
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AssignQuestionnaireToSessionModal;
