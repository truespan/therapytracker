import React from 'react';
import { X } from 'lucide-react';
import UserQuestionnaireView from './UserQuestionnaireView';

const QuestionnaireViewModal = ({ isOpen, onClose, assignmentId, questionnaireName }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dark-bg-tertiary rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-dark-bg-tertiary border-b border-gray-200 dark:border-dark-border px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary">
            {questionnaireName || 'View Questionnaire'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-dark-text-tertiary hover:text-gray-600 dark:hover:text-dark-text-secondary transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {assignmentId ? (
            <UserQuestionnaireView
              assignmentId={assignmentId}
              viewOnly={true}
              onCancel={onClose}
            />
          ) : (
            <div className="text-center py-8 text-gray-600">
              No questionnaire data available
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuestionnaireViewModal;
