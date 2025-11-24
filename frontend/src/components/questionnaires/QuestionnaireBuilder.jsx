import React, { useState, useEffect } from 'react';
import { questionnaireAPI } from '../../services/api';

const QuestionnaireBuilder = ({ questionnaireId, onSave, onCancel }) => {
  const [questionnaire, setQuestionnaire] = useState({
    name: '',
    description: '',
    has_text_field: false,
    text_field_label: '',
    text_field_placeholder: '',
    questions: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (questionnaireId) {
      loadQuestionnaire();
    }
  }, [questionnaireId]);

  const loadQuestionnaire = async () => {
    try {
      setLoading(true);
      const response = await questionnaireAPI.getById(questionnaireId);
      setQuestionnaire(response.data);
    } catch (err) {
      setError('Failed to load questionnaire');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestion = () => {
    setQuestionnaire({
      ...questionnaire,
      questions: [
        ...questionnaire.questions,
        {
          question_text: '',
          sub_heading: '',
          options: [
            { option_text: '', option_value: 1, option_order: 0 }
          ]
        }
      ]
    });
  };

  const handleRemoveQuestion = (questionIndex) => {
    const newQuestions = questionnaire.questions.filter((_, index) => index !== questionIndex);
    setQuestionnaire({ ...questionnaire, questions: newQuestions });
  };

  const handleQuestionChange = (questionIndex, value) => {
    const newQuestions = [...questionnaire.questions];
    newQuestions[questionIndex].question_text = value;
    setQuestionnaire({ ...questionnaire, questions: newQuestions });
  };

  const handleAddOption = (questionIndex) => {
    const newQuestions = [...questionnaire.questions];
    const currentOptions = newQuestions[questionIndex].options;
    const nextValue = currentOptions.length + 1;
    
    newQuestions[questionIndex].options.push({
      option_text: '',
      option_value: nextValue,
      option_order: currentOptions.length
    });
    
    setQuestionnaire({ ...questionnaire, questions: newQuestions });
  };

  const handleRemoveOption = (questionIndex, optionIndex) => {
    const newQuestions = [...questionnaire.questions];
    newQuestions[questionIndex].options = newQuestions[questionIndex].options.filter(
      (_, index) => index !== optionIndex
    );
    // Reorder remaining options
    newQuestions[questionIndex].options.forEach((option, index) => {
      option.option_order = index;
      option.option_value = index + 1;
    });
    setQuestionnaire({ ...questionnaire, questions: newQuestions });
  };

  const handleOptionChange = (questionIndex, optionIndex, field, value) => {
    const newQuestions = [...questionnaire.questions];
    newQuestions[questionIndex].options[optionIndex][field] = value;
    setQuestionnaire({ ...questionnaire, questions: newQuestions });
  };

  const handleMoveQuestion = (questionIndex, direction) => {
    const newQuestions = [...questionnaire.questions];
    const targetIndex = direction === 'up' ? questionIndex - 1 : questionIndex + 1;
    
    if (targetIndex < 0 || targetIndex >= newQuestions.length) return;
    
    [newQuestions[questionIndex], newQuestions[targetIndex]] = 
      [newQuestions[targetIndex], newQuestions[questionIndex]];
    
    setQuestionnaire({ ...questionnaire, questions: newQuestions });
  };

  const validateQuestionnaire = () => {
    if (!questionnaire.name.trim()) {
      setError('Questionnaire name is required');
      return false;
    }

    if (questionnaire.questions.length === 0) {
      setError('At least one question is required');
      return false;
    }

    for (let i = 0; i < questionnaire.questions.length; i++) {
      const question = questionnaire.questions[i];
      
      if (!question.question_text.trim()) {
        setError(`Question ${i + 1} text is required`);
        return false;
      }

      if (!question.options || question.options.length === 0) {
        setError(`Question ${i + 1} must have at least one answer option`);
        return false;
      }

      for (let j = 0; j < question.options.length; j++) {
        if (!question.options[j].option_text.trim()) {
          setError(`Question ${i + 1}, Option ${j + 1} text is required`);
          return false;
        }
      }
    }

    return true;
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');

    if (!validateQuestionnaire()) {
      return;
    }

    try {
      setLoading(true);
      
      if (questionnaireId) {
        await questionnaireAPI.update(questionnaireId, questionnaire);
        setSuccess('Questionnaire updated successfully');
      } else {
        await questionnaireAPI.create(questionnaire);
        setSuccess('Questionnaire created successfully');
      }

      setTimeout(() => {
        if (onSave) onSave();
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save questionnaire');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && questionnaireId) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">
        {questionnaireId ? 'Edit Questionnaire' : 'Create New Questionnaire'}
      </h2>

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

      {/* Basic Information */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Questionnaire Name *
        </label>
        <input
          type="text"
          value={questionnaire.name}
          onChange={(e) => setQuestionnaire({ ...questionnaire, name: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter questionnaire name"
        />
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <textarea
          value={questionnaire.description || ''}
          onChange={(e) => setQuestionnaire({ ...questionnaire, description: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows="3"
          placeholder="Enter questionnaire description (optional)"
        />
      </div>

      {/* Text Field Option */}
      <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
        <div className="flex items-center mb-3">
          <input
            type="checkbox"
            id="has_text_field"
            checked={questionnaire.has_text_field}
            onChange={(e) => setQuestionnaire({ 
              ...questionnaire, 
              has_text_field: e.target.checked,
              text_field_label: e.target.checked ? questionnaire.text_field_label : '',
              text_field_placeholder: e.target.checked ? questionnaire.text_field_placeholder : ''
            })}
            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
          />
          <label htmlFor="has_text_field" className="ml-2 text-sm font-medium text-gray-700">
            Add a text box at the top (max 200 words)
          </label>
        </div>

        {questionnaire.has_text_field && (
          <div className="space-y-3 mt-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Text Box Label
              </label>
              <input
                type="text"
                value={questionnaire.text_field_label}
                onChange={(e) => setQuestionnaire({ ...questionnaire, text_field_label: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Please describe your key issue(s) briefly here."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Placeholder Text
              </label>
              <input
                type="text"
                value={questionnaire.text_field_placeholder}
                onChange={(e) => setQuestionnaire({ ...questionnaire, text_field_placeholder: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Share what brings you to therapy or what you'd like to work on..."
              />
            </div>
          </div>
        )}
      </div>

      {/* Questions */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Questions</h3>
          <button
            onClick={handleAddQuestion}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            + Add Question
          </button>
        </div>

        {questionnaire.questions.length === 0 ? (
          <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
            No questions yet. Click "Add Question" to get started.
          </div>
        ) : (
          <div className="space-y-6">
            {questionnaire.questions.map((question, questionIndex) => (
              <div key={questionIndex} className="p-4 border border-gray-300 rounded-lg bg-gray-50">
                <div className="flex justify-between items-start mb-3">
                  <h4 className="font-medium text-gray-700">Question {questionIndex + 1}</h4>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleMoveQuestion(questionIndex, 'up')}
                      disabled={questionIndex === 0}
                      className="px-2 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => handleMoveQuestion(questionIndex, 'down')}
                      disabled={questionIndex === questionnaire.questions.length - 1}
                      className="px-2 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ↓
                    </button>
                    <button
                      onClick={() => handleRemoveQuestion(questionIndex)}
                      className="px-2 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                {/* Sub-heading (optional) */}
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Sub-heading (optional) - Group questions under a heading
                  </label>
                  <input
                    type="text"
                    value={question.sub_heading || ''}
                    onChange={(e) => {
                      const newQuestions = [...questionnaire.questions];
                      newQuestions[questionIndex].sub_heading = e.target.value;
                      setQuestionnaire({ ...questionnaire, questions: newQuestions });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50"
                    placeholder="e.g., Emotional Well-being, Physical Health, etc."
                  />
                </div>

                <input
                  type="text"
                  value={question.question_text}
                  onChange={(e) => handleQuestionChange(questionIndex, e.target.value)}
                  className="w-full px-3 py-2 mb-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter question text"
                />

                <div className="ml-4">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-gray-600">Answer Options</label>
                    <button
                      onClick={() => handleAddOption(questionIndex)}
                      className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      + Add Option
                    </button>
                  </div>

                  <div className="space-y-2">
                    {question.options.map((option, optionIndex) => (
                      <div key={optionIndex} className="flex gap-2 items-center">
                        <span className="text-sm text-gray-600 w-8">{optionIndex + 1}.</span>
                        <input
                          type="text"
                          value={option.option_text}
                          onChange={(e) => handleOptionChange(questionIndex, optionIndex, 'option_text', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter option text"
                        />
                        <input
                          type="number"
                          value={option.option_value}
                          onChange={(e) => handleOptionChange(questionIndex, optionIndex, 'option_value', parseInt(e.target.value))}
                          className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Value"
                        />
                        {question.options.length > 1 && (
                          <button
                            onClick={() => handleRemoveOption(questionIndex, optionIndex)}
                            className="px-2 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        <button
          onClick={onCancel}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save Questionnaire'}
        </button>
      </div>
    </div>
  );
};

export default QuestionnaireBuilder;

