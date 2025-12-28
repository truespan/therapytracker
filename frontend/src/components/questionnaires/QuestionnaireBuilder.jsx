import React, { useState, useEffect, useRef, useCallback } from 'react';
import { questionnaireAPI } from '../../services/api';

const QuestionnaireBuilder = ({ questionnaireId, onSave, onCancel }) => {
  const [questionnaire, setQuestionnaire] = useState({
    name: '',
    description: '',
    has_text_field: false,
    text_field_label: '',
    text_field_placeholder: '',
    color_coding_scheme: null,
    questions: []
  });
  const [currentQuestionnaireId, setCurrentQuestionnaireId] = useState(questionnaireId || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showColorCodingWarning, setShowColorCodingWarning] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState(''); // 'saving', 'saved', 'error'
  const autosaveTimeoutRef = useRef(null);
  const hasInitialLoad = useRef(false);
  const questionnaireRef = useRef(questionnaire);
  const currentQuestionnaireIdRef = useRef(currentQuestionnaireId);

  useEffect(() => {
    if (questionnaireId) {
      loadQuestionnaire();
      setCurrentQuestionnaireId(questionnaireId);
    }
  }, [questionnaireId]);

  // Autosave effect - debounced
  useEffect(() => {
    // Don't autosave on initial load - mark as loaded and skip this run
    if (!hasInitialLoad.current) {
      hasInitialLoad.current = true;
      return;
    }

    // Don't autosave if questionnaire name is empty (required field)
    if (!questionnaire.name.trim()) {
      // Show indicator that auto-save is waiting for name
      if (questionnaire.questions.length > 0 || questionnaire.description) {
        setAutosaveStatus('waiting');
      } else {
        setAutosaveStatus('');
      }
      return;
    }

    // Clear existing timeout
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }

    // Set new timeout for autosave (2 seconds after last change)
    autosaveTimeoutRef.current = setTimeout(() => {
      performAutosave();
    }, 2000);

    // Cleanup function
    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionnaire]);

  const loadQuestionnaire = async () => {
    try {
      setLoading(true);
      hasInitialLoad.current = false; // Reset to prevent autosave on load
      const response = await questionnaireAPI.getById(questionnaireId);
      const loadedQuestionnaire = response.data;
      setQuestionnaire(loadedQuestionnaire);
      questionnaireRef.current = loadedQuestionnaire;
      // Set hasInitialLoad after state update completes
      // This ensures the next user change will trigger autosave
      setTimeout(() => {
        hasInitialLoad.current = true;
      }, 500);
    } catch (err) {
      setError('Failed to load questionnaire');
      console.error(err);
      hasInitialLoad.current = true; // Allow autosave even if load fails
    } finally {
      setLoading(false);
    }
  };

  // Update refs when state changes
  useEffect(() => {
    questionnaireRef.current = questionnaire;
  }, [questionnaire]);

  useEffect(() => {
    currentQuestionnaireIdRef.current = currentQuestionnaireId;
  }, [currentQuestionnaireId]);

  const performAutosave = useCallback(async () => {
    try {
      setAutosaveStatus('saving');
      const currentQuestionnaire = questionnaireRef.current;
      const currentId = currentQuestionnaireIdRef.current;
      
      if (currentId) {
        // Update existing questionnaire
        await questionnaireAPI.update(currentId, currentQuestionnaire);
        setAutosaveStatus('saved');
        setTimeout(() => setAutosaveStatus(''), 2000);
      } else {
        // Create new questionnaire if name is provided
        if (currentQuestionnaire.name.trim()) {
          const response = await questionnaireAPI.create(currentQuestionnaire);
          const newId = response.data.id || response.data.questionnaire?.id;
          if (newId) {
            setCurrentQuestionnaireId(newId);
            currentQuestionnaireIdRef.current = newId;
            setAutosaveStatus('saved');
            setTimeout(() => setAutosaveStatus(''), 2000);
          }
        }
      }
    } catch (err) {
      console.error('Autosave failed:', err);
      setAutosaveStatus('error');
      setTimeout(() => setAutosaveStatus(''), 3000);
    }
  }, []);

  const handleAddQuestion = () => {
    const colorCoding = questionnaire.color_coding_scheme;
    let initialValue;

    // Set initial value based on color coding
    if (colorCoding === '4_point') {
      initialValue = 4; // First option gets highest value
    } else if (colorCoding === '5_point') {
      initialValue = 5; // First option gets highest value
    } else {
      initialValue = 1; // No color coding: start at 1
    }

    setQuestionnaire({
      ...questionnaire,
      questions: [
        ...questionnaire.questions,
        {
          question_text: '',
          sub_heading: '',
          options: [
            { option_text: '', option_value: initialValue, option_order: 0 }
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

    // Check color coding limits
    const colorCoding = questionnaire.color_coding_scheme;
    if (colorCoding === '4_point' && currentOptions.length >= 4) {
      setError('Cannot add more than 4 options for 4-point color coding');
      setTimeout(() => setError(''), 3000);
      return;
    }
    if (colorCoding === '5_point' && currentOptions.length >= 5) {
      setError('Cannot add more than 5 options for 5-point color coding');
      setTimeout(() => setError(''), 3000);
      return;
    }

    // Determine option value based on color coding
    let nextValue;
    if (colorCoding === '4_point') {
      // Values should be: 4, 3, 2, 1
      nextValue = 4 - currentOptions.length;
    } else if (colorCoding === '5_point') {
      // Values should be: 5, 4, 3, 2, 1
      nextValue = 5 - currentOptions.length;
    } else {
      // No color coding: use sequential values 1, 2, 3, ...
      nextValue = currentOptions.length + 1;
    }

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

    const colorCoding = questionnaire.color_coding_scheme;

    // Reorder remaining options and recalculate values
    newQuestions[questionIndex].options.forEach((option, index) => {
      option.option_order = index;

      // Recalculate option_value based on color coding
      if (colorCoding === '4_point') {
        option.option_value = 4 - index; // 4, 3, 2, 1
      } else if (colorCoding === '5_point') {
        option.option_value = 5 - index; // 5, 4, 3, 2, 1
      } else {
        option.option_value = index + 1; // 1, 2, 3, ...
      }
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

  // Get the most common number of options across all questions
  const getMostCommonOptionCount = () => {
    if (questionnaire.questions.length === 0) return 0;

    const optionCounts = questionnaire.questions.map(q => q.options.length);
    const countMap = {};

    optionCounts.forEach(count => {
      countMap[count] = (countMap[count] || 0) + 1;
    });

    let maxCount = 0;
    let mostCommon = 0;

    Object.keys(countMap).forEach(count => {
      if (countMap[count] > maxCount) {
        maxCount = countMap[count];
        mostCommon = parseInt(count);
      }
    });

    return mostCommon;
  };

  // Check if option ordering seems incorrect for color coding
  const checkColorCodingOrder = () => {
    // Keywords that indicate severity (lower index = better/less severe)
    const positiveKeywords = ['excellent', 'very good', 'good', 'great', 'always', 'never', 'not at all', 'rarely', 'none', 'no'];
    const negativeKeywords = ['poor', 'very poor', 'bad', 'terrible', 'severe', 'extremely', 'very much', 'all the time', 'constantly'];

    for (const question of questionnaire.questions) {
      if (question.options.length < 2) continue;

      const firstOption = question.options[0].option_text.toLowerCase();
      const lastOption = question.options[question.options.length - 1].option_text.toLowerCase();

      // Check if first option contains negative keywords (wrong order)
      const firstIsNegative = negativeKeywords.some(keyword => firstOption.includes(keyword));
      // Check if last option contains positive keywords (wrong order)
      const lastIsPositive = positiveKeywords.some(keyword => lastOption.includes(keyword));

      // Also check point values - first should have higher points than last
      const firstValue = question.options[0].option_value;
      const lastValue = question.options[question.options.length - 1].option_value;

      if (firstIsNegative || lastIsPositive || firstValue < lastValue) {
        return false; // Order seems incorrect
      }
    }

    return true; // Order seems correct
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

    // Validate color coding scheme consistency
    if (questionnaire.color_coding_scheme) {
      const targetCount = questionnaire.color_coding_scheme === '5-point' ? 5 : 4;
      const mismatchedQuestions = questionnaire.questions.filter(
        q => q.options.length !== targetCount
      );

      if (mismatchedQuestions.length > 0) {
        setError(`Color coding requires all questions to have exactly ${targetCount} options. ${mismatchedQuestions.length} question(s) don't match. Please adjust the number of options or disable color coding.`);
        return false;
      }

      // Check if option ordering seems incorrect for color coding
      if (!checkColorCodingOrder()) {
        setShowColorCodingWarning(true);
        return false;
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
      
      if (currentQuestionnaireId) {
        await questionnaireAPI.update(currentQuestionnaireId, questionnaire);
        setSuccess('Questionnaire updated successfully');
      } else {
        const response = await questionnaireAPI.create(questionnaire);
        const newId = response.data.id || response.data.questionnaire?.id;
        if (newId) {
          setCurrentQuestionnaireId(newId);
        }
        setSuccess('Questionnaire created successfully');
      }

      setAutosaveStatus('saved');
      setTimeout(() => {
        setAutosaveStatus('');
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-dark-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white dark:bg-dark-bg-tertiary rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary">
          {currentQuestionnaireId ? 'Edit Questionnaire' : 'Create New Questionnaire'}
        </h2>
        {autosaveStatus && (
          <div className={`text-sm px-3 py-1 rounded ${
            autosaveStatus === 'saving'
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
              : autosaveStatus === 'saved'
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
              : autosaveStatus === 'waiting'
              ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
          }`}>
            {autosaveStatus === 'saving' && '💾 Saving...'}
            {autosaveStatus === 'saved' && '✓ Saved'}
            {autosaveStatus === 'waiting' && '⏳ Enter name to auto-save'}
            {autosaveStatus === 'error' && '✗ Save failed'}
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-200 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-100 dark:bg-green-900/20 border border-green-400 dark:border-green-800 text-green-700 dark:text-green-200 rounded">
          {success}
        </div>
      )}

      {/* Basic Information */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
          Questionnaire Name *
        </label>
        <input
          type="text"
          value={questionnaire.name}
          onChange={(e) => setQuestionnaire({ ...questionnaire, name: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-dark-primary-500 bg-white dark:bg-dark-bg-primary text-gray-900 dark:text-dark-text-primary dark:placeholder-dark-text-tertiary"
          placeholder="Enter questionnaire name"
        />
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
          Description
        </label>
        <textarea
          value={questionnaire.description || ''}
          onChange={(e) => setQuestionnaire({ ...questionnaire, description: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-dark-primary-500 bg-white dark:bg-dark-bg-primary text-gray-900 dark:text-dark-text-primary dark:placeholder-dark-text-tertiary"
          rows="3"
          placeholder="Enter questionnaire description (optional)"
        />
      </div>

      {/* Text Field Option */}
      <div className="mb-6 p-4 border border-gray-200 dark:border-dark-border rounded-lg bg-gray-50 dark:bg-dark-bg-secondary">
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
            className="w-4 h-4 text-primary-700 dark:text-dark-primary-500 rounded focus:ring-2 focus:ring-primary-500 dark:focus:ring-dark-primary-500"
          />
          <label htmlFor="has_text_field" className="ml-2 text-sm font-medium text-gray-700 dark:text-dark-text-secondary">
            Add a text box at the top (max 200 words)
          </label>
        </div>

        {questionnaire.has_text_field && (
          <div className="space-y-3 mt-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                Text Box Label
              </label>
              <input
                type="text"
                value={questionnaire.text_field_label}
                onChange={(e) => setQuestionnaire({ ...questionnaire, text_field_label: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-dark-primary-500 bg-white dark:bg-dark-bg-primary text-gray-900 dark:text-dark-text-primary dark:placeholder-dark-text-tertiary"
                placeholder="e.g., Please describe your key issue(s) briefly here."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                Placeholder Text
              </label>
              <input
                type="text"
                value={questionnaire.text_field_placeholder}
                onChange={(e) => setQuestionnaire({ ...questionnaire, text_field_placeholder: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-dark-primary-500 bg-white dark:bg-dark-bg-primary text-gray-900 dark:text-dark-text-primary dark:placeholder-dark-text-tertiary"
                placeholder="e.g., Share what brings you to therapy or what you'd like to work on..."
              />
            </div>
          </div>
        )}
      </div>

      {/* Color Coding Option */}
      <div className="mb-6 p-4 border border-gray-200 dark:border-dark-border rounded-lg bg-gradient-to-r from-green-50 to-red-50 dark:from-green-900/20 dark:to-red-900/20">
        <label className="block text-sm font-semibold text-gray-800 dark:text-dark-text-primary mb-3">
          🎨 Color Coding for Answer Options (Optional)
        </label>
        <p className="text-xs text-gray-600 dark:text-dark-text-secondary mb-4">
          Color code answer options from green (best) to red (worst) to help visualize responses. All questions must have the same number of options when color coding is enabled.
        </p>
        <div className="space-y-2">
          <label className="flex items-center p-3 border-2 dark:border-dark-border rounded-md cursor-pointer transition-colors bg-white dark:bg-dark-bg-secondary hover:bg-gray-50 dark:hover:bg-dark-bg-primary">
            <input
              type="radio"
              name="color_coding"
              checked={!questionnaire.color_coding_scheme}
              onChange={() => setQuestionnaire({ ...questionnaire, color_coding_scheme: null })}
              className="w-4 h-4 text-primary-700 dark:text-dark-primary-500 focus:ring-2 focus:ring-primary-500 dark:focus:ring-dark-primary-500"
            />
            <span className="ml-3 text-sm font-medium text-gray-700 dark:text-dark-text-secondary">No Color Coding</span>
          </label>

          <label className={`flex items-center p-3 border-2 dark:border-dark-border rounded-md transition-colors ${
            getMostCommonOptionCount() === 4 || getMostCommonOptionCount() === 0
              ? 'cursor-pointer bg-white dark:bg-dark-bg-secondary hover:bg-gray-50 dark:hover:bg-dark-bg-primary'
              : 'cursor-not-allowed bg-gray-100 dark:bg-dark-bg-primary opacity-50'
          }`}>
            <input
              type="radio"
              name="color_coding"
              checked={questionnaire.color_coding_scheme === '4-point'}
              onChange={() => setQuestionnaire({ ...questionnaire, color_coding_scheme: '4-point' })}
              disabled={getMostCommonOptionCount() !== 4 && getMostCommonOptionCount() !== 0}
              className="w-4 h-4 text-primary-700 dark:text-dark-primary-500 focus:ring-2 focus:ring-primary-500 dark:focus:ring-dark-primary-500 disabled:opacity-50"
            />
            <div className="ml-3 flex-1">
              <span className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary block">4-Point Color Scale</span>
              <div className="flex gap-1 mt-2">
                <div className="w-12 h-6 rounded-full" style={{ backgroundColor: '#00c951' }}></div>
                <div className="w-12 h-6 rounded-full" style={{ backgroundColor: '#7ccf00' }}></div>
                <div className="w-12 h-6 rounded-full" style={{ backgroundColor: '#ff6900' }}></div>
                <div className="w-12 h-6 rounded-full" style={{ backgroundColor: '#fb2c36' }}></div>
              </div>
              <span className="text-xs text-gray-500 dark:text-dark-text-tertiary mt-1 block">
                For questions with 4 answer options
                {getMostCommonOptionCount() !== 4 && getMostCommonOptionCount() !== 0 &&
                  ` (Currently ${getMostCommonOptionCount()} options)`
                }
              </span>
            </div>
          </label>

          <label className={`flex items-center p-3 border-2 dark:border-dark-border rounded-md transition-colors ${
            getMostCommonOptionCount() === 5 || getMostCommonOptionCount() === 0
              ? 'cursor-pointer bg-white dark:bg-dark-bg-secondary hover:bg-gray-50 dark:hover:bg-dark-bg-primary'
              : 'cursor-not-allowed bg-gray-100 dark:bg-dark-bg-primary opacity-50'
          }`}>
            <input
              type="radio"
              name="color_coding"
              checked={questionnaire.color_coding_scheme === '5-point'}
              onChange={() => setQuestionnaire({ ...questionnaire, color_coding_scheme: '5-point' })}
              disabled={getMostCommonOptionCount() !== 5 && getMostCommonOptionCount() !== 0}
              className="w-4 h-4 text-primary-700 dark:text-dark-primary-500 focus:ring-2 focus:ring-primary-500 dark:focus:ring-dark-primary-500 disabled:opacity-50"
            />
            <div className="ml-3 flex-1">
              <span className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary block">5-Point Color Scale</span>
              <div className="flex gap-1 mt-2">
                <div className="w-10 h-6 rounded-full" style={{ backgroundColor: '#00c951' }}></div>
                <div className="w-10 h-6 rounded-full" style={{ backgroundColor: '#7ccf00' }}></div>
                <div className="w-10 h-6 rounded-full" style={{ backgroundColor: '#f0b100' }}></div>
                <div className="w-10 h-6 rounded-full" style={{ backgroundColor: '#ff6900' }}></div>
                <div className="w-10 h-6 rounded-full" style={{ backgroundColor: '#fb2c36' }}></div>
              </div>
              <span className="text-xs text-gray-500 dark:text-dark-text-tertiary mt-1 block">
                For questions with 5 answer options
                {getMostCommonOptionCount() !== 5 && getMostCommonOptionCount() !== 0 &&
                  ` (Currently ${getMostCommonOptionCount()} options)`
                }
              </span>
            </div>
          </label>
        </div>
      </div>

      {/* Questions */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">Questions</h3>
          <button
            onClick={handleAddQuestion}
            className="px-4 py-2 bg-primary-600 dark:bg-dark-primary-600 text-white rounded-md hover:bg-primary-700 dark:hover:bg-dark-primary-700 transition-colors"
          >
            + Add Question
          </button>
        </div>

        {questionnaire.questions.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-dark-text-tertiary border-2 border-dashed border-gray-300 dark:border-dark-border rounded-lg">
            No questions yet. Click "Add Question" to get started.
          </div>
        ) : (
          <div className="space-y-6">
            {questionnaire.questions.map((question, questionIndex) => (
              <div key={questionIndex} className="p-4 border border-gray-300 dark:border-dark-border rounded-lg bg-gray-50 dark:bg-dark-bg-secondary">
                <div className="flex justify-between items-start mb-3">
                  <h4 className="font-medium text-gray-700 dark:text-dark-text-primary">Question {questionIndex + 1}</h4>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleMoveQuestion(questionIndex, 'up')}
                      disabled={questionIndex === 0}
                      className="px-2 py-1 text-sm bg-gray-200 dark:bg-dark-bg-primary text-gray-700 dark:text-dark-text-primary rounded hover:bg-gray-300 dark:hover:bg-dark-bg-tertiary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => handleMoveQuestion(questionIndex, 'down')}
                      disabled={questionIndex === questionnaire.questions.length - 1}
                      className="px-2 py-1 text-sm bg-gray-200 dark:bg-dark-bg-primary text-gray-700 dark:text-dark-text-primary rounded hover:bg-gray-300 dark:hover:bg-dark-bg-tertiary disabled:opacity-50 disabled:cursor-not-allowed"
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
                  <label className="block text-xs font-medium text-gray-600 dark:text-dark-text-secondary mb-1">
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
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-dark-primary-500 bg-primary-50 dark:bg-dark-bg-primary text-gray-900 dark:text-dark-text-primary dark:placeholder-dark-text-tertiary"
                    placeholder="e.g., Emotional Well-being, Physical Health, etc."
                  />
                </div>

                <input
                  type="text"
                  value={question.question_text}
                  onChange={(e) => handleQuestionChange(questionIndex, e.target.value)}
                  className="w-full px-3 py-2 mb-3 border border-gray-300 dark:border-dark-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-dark-primary-500 bg-white dark:bg-dark-bg-primary text-gray-900 dark:text-dark-text-primary dark:placeholder-dark-text-tertiary"
                  placeholder="Enter question text"
                />

                <div className="ml-4">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-gray-600 dark:text-dark-text-secondary">Answer Options</label>
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
                        <span className="text-sm text-gray-600 dark:text-dark-text-secondary w-8">{optionIndex + 1}.</span>
                        <input
                          type="text"
                          value={option.option_text}
                          onChange={(e) => handleOptionChange(questionIndex, optionIndex, 'option_text', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-dark-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-dark-primary-500 bg-white dark:bg-dark-bg-primary text-gray-900 dark:text-dark-text-primary dark:placeholder-dark-text-tertiary"
                          placeholder="Enter option text"
                        />
                        <input
                          type="number"
                          value={option.option_value}
                          onChange={(e) => handleOptionChange(questionIndex, optionIndex, 'option_value', parseInt(e.target.value))}
                          className="w-20 px-3 py-2 border border-gray-300 dark:border-dark-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-dark-primary-500 bg-white dark:bg-dark-bg-primary text-gray-900 dark:text-dark-text-primary dark:placeholder-dark-text-tertiary"
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
          className="px-6 py-2 border border-gray-300 dark:border-dark-border text-gray-700 dark:text-dark-text-primary rounded-md hover:bg-gray-50 dark:hover:bg-dark-bg-primary transition-colors"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="px-6 py-2 bg-primary-600 dark:bg-dark-primary-600 text-white rounded-md hover:bg-primary-700 dark:hover:bg-dark-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save Questionnaire'}
        </button>
      </div>

      {/* Color Coding Warning Dialog */}
      {showColorCodingWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-bg-tertiary rounded-lg shadow-xl max-w-2xl w-full p-6">
            <div className="mb-4">
              <h3 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">
                ⚠️ Color Coding Order Warning
              </h3>
              <div className="text-gray-700 dark:text-dark-text-primary space-y-3">
                <p>
                  Please check whether the order of the answer options matches the color coding pattern as well as the points assigned to them.
                </p>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <p className="font-semibold mb-2 text-gray-900 dark:text-dark-text-primary">Important Guidelines:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-dark-text-secondary">
                    <li>Color coding starts from <span className="text-green-600 dark:text-green-400 font-semibold">Green</span> and ends with <span className="text-red-600 dark:text-red-400 font-semibold">Red</span></li>
                    <li>Users selecting <span className="text-green-600 dark:text-green-400 font-semibold">Green</span> options means they are healthier</li>
                    <li>Users selecting <span className="text-red-600 dark:text-red-400 font-semibold">Red</span> options means they have severe issues</li>
                    <li>Positive answers (e.g., "Excellent", "Good", "Fair") should be listed first</li>
                    <li>Negative answers (e.g., "Poor", "Very Poor") should be listed last</li>
                    <li>Higher points should be assigned to healthier/positive options</li>
                  </ul>
                </div>
                <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
                  <strong>Example:</strong> If options are "Excellent", "Good", "Fair", "Poor", "Very Poor" - they are correctly ordered because "Excellent" (healthiest) is first and "Very Poor" (most severe) is last.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowColorCodingWarning(false);
                  setQuestionnaire({ ...questionnaire, color_coding_scheme: null });
                }}
                className="px-6 py-2 border border-gray-300 dark:border-dark-border text-gray-700 dark:text-dark-text-primary rounded-md hover:bg-gray-50 dark:hover:bg-dark-bg-primary transition-colors"
              >
                Disable Color Coding
              </button>
              <button
                onClick={() => setShowColorCodingWarning(false)}
                className="px-6 py-2 bg-primary-600 dark:bg-dark-primary-600 text-white rounded-md hover:bg-primary-700 dark:hover:bg-dark-primary-700 transition-colors"
              >
                I'll Fix the Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionnaireBuilder;

