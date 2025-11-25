import React, { useState, useEffect } from 'react';
import { questionnaireAPI, chartAPI } from '../../services/api';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, Bar, ResponsiveContainer
} from 'recharts';
import { Trash2, Send, CheckCircle, AlertCircle, Eye, X } from 'lucide-react';

const CHART_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

const QuestionnaireComparison = ({ userId, partnerId, userName, sentCharts = [], onChartSent, onChartDeleted }) => {
  const [questionnaireTypes, setQuestionnaireTypes] = useState([]);
  const [selectedType, setSelectedType] = useState(null);
  const [selectedAssignments, setSelectedAssignments] = useState([]);
  const [chartDisplayType, setChartDisplayType] = useState('radar');
  const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // State for chart popup
  const [viewingChart, setViewingChart] = useState(null);
  const [viewingChartData, setViewingChartData] = useState(null);
  const [viewingChartLoading, setViewingChartLoading] = useState(false);

  useEffect(() => {
    if (userId) {
      loadQuestionnaireTypes();
    }
  }, [userId]);

  useEffect(() => {
    if (selectedAssignments.length >= 2) {
      loadComparisonData();
    } else {
      setComparisonData(null);
    }
  }, [selectedAssignments]);

  const loadQuestionnaireTypes = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await questionnaireAPI.getCompletedByTypeForUser(userId);
      setQuestionnaireTypes(response.data.questionnaireTypes || []);
    } catch (err) {
      console.error('Error loading questionnaire types:', err);
      setError('Failed to load questionnaire data');
    } finally {
      setLoading(false);
    }
  };

  const loadComparisonData = async () => {
    try {
      setLoading(true);
      const response = await questionnaireAPI.getResponsesForComparison(selectedAssignments);
      const rawData = response.data.responses || [];

      // Transform data for charts
      const transformedData = transformDataForChart(rawData, selectedAssignments);
      setComparisonData(transformedData);
    } catch (err) {
      console.error('Error loading comparison data:', err);
      setError('Failed to load comparison data');
    } finally {
      setLoading(false);
    }
  };

  const transformDataForChart = (rawData, assignmentsToUse) => {
    // Ensure assignmentsToUse contains numbers for consistent comparison
    const normalizedAssignments = assignmentsToUse.map(id => Number(id));

    // Group by question
    const questionMap = new Map();
    const assignmentDates = new Map();

    rawData.forEach(row => {
      if (!questionMap.has(row.question_id)) {
        questionMap.set(row.question_id, {
          question_id: row.question_id,
          question_text: row.question_text,
          question_order: row.question_order,
          sub_heading: row.sub_heading,
          responses: {}
        });
      }

      const questionData = questionMap.get(row.question_id);
      // Store response with normalized assignment_id as key
      questionData.responses[Number(row.assignment_id)] = row.response_value;

      if (!assignmentDates.has(Number(row.assignment_id))) {
        assignmentDates.set(Number(row.assignment_id), new Date(row.completed_at));
      }
    });

    // Sort questions by order
    const sortedQuestions = Array.from(questionMap.values())
      .sort((a, b) => a.question_order - b.question_order);

    // Create chart-ready data
    const chartData = sortedQuestions.map(q => {
      const dataPoint = {
        question: q.question_text.length > 30
          ? q.question_text.substring(0, 30) + '...'
          : q.question_text,
        fullQuestion: q.question_text
      };

      normalizedAssignments.forEach((assignmentId, index) => {
        // Always use consistent label format
        const label = `Submission ${index + 1}`;
        dataPoint[label] = q.responses[assignmentId] || 0;
      });

      return dataPoint;
    });

    // Get assignment labels with dates
    const labels = normalizedAssignments.map((assignmentId, index) => {
      const date = assignmentDates.get(assignmentId);
      return {
        key: `Submission ${index + 1}`,
        date: date ? date.toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }) : 'Unknown'
      };
    });

    return { chartData, labels };
  };

  const handleTypeSelect = (type) => {
    setSelectedType(type);
    setSelectedAssignments([]);
    setComparisonData(null);
  };

  const handleAssignmentToggle = (assignmentId) => {
    setSelectedAssignments(prev => {
      if (prev.includes(assignmentId)) {
        return prev.filter(id => id !== assignmentId);
      } else if (prev.length < 4) {
        return [...prev, assignmentId];
      }
      return prev;
    });
  };

  const handleSendChart = async () => {
    if (!selectedType || selectedAssignments.length < 2) return;

    try {
      setSending(true);
      setError('');

      await chartAPI.shareQuestionnaireChart({
        user_id: userId,
        questionnaire_id: selectedType.questionnaire_id,
        selected_assignments: selectedAssignments,
        chart_display_type: chartDisplayType
      });

      if (onChartSent) {
        onChartSent();
      }

      // Reset selections
      setSelectedAssignments([]);
      setComparisonData(null);
    } catch (err) {
      console.error('Error sending chart:', err);
      setError('Failed to send chart to client');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteChart = async (chartId) => {
    try {
      await chartAPI.deleteChart(chartId);
      setDeleteConfirm(null);
      if (onChartDeleted) {
        onChartDeleted();
      }
    } catch (err) {
      console.error('Error deleting chart:', err);
      setError('Failed to delete chart');
    }
  };

  const handleShowChart = async (chart) => {
    setViewingChart(chart);
    setViewingChartLoading(true);
    setViewingChartData(null);

    try {
      const response = await questionnaireAPI.getResponsesForComparison(chart.selected_assignments);
      const rawData = response.data.responses || [];
      const transformedData = transformDataForChart(rawData, chart.selected_assignments);
      setViewingChartData(transformedData);
    } catch (err) {
      console.error('Error loading chart data:', err);
    } finally {
      setViewingChartLoading(false);
    }
  };

  const closeChartPopup = () => {
    setViewingChart(null);
    setViewingChartData(null);
  };

  const renderPopupChart = (chart, data) => {
    if (!data || !data.chartData.length) return null;

    const { chartData, labels } = data;
    const chartType = chart.chart_display_type || 'radar';

    if (chartType === 'radar') {
      return (
        <ResponsiveContainer width="100%" height={400}>
          <RadarChart data={chartData}>
            <PolarGrid />
            <PolarAngleAxis dataKey="question" tick={{ fontSize: 10 }} />
            <PolarRadiusAxis domain={[0, 'auto']} />
            {labels.map((label, index) => (
              <Radar
                key={label.key}
                name={`${label.key} (${label.date})`}
                dataKey={label.key}
                stroke={CHART_COLORS[index]}
                fill={CHART_COLORS[index]}
                fillOpacity={0.3}
              />
            ))}
            <Legend />
            <Tooltip />
          </RadarChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === 'line') {
      return (
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="question" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={100} />
            <YAxis />
            <Tooltip />
            <Legend />
            {labels.map((label, index) => (
              <Line
                key={label.key}
                type="monotone"
                dataKey={label.key}
                name={`${label.key} (${label.date})`}
                stroke={CHART_COLORS[index]}
                strokeWidth={2}
                dot={{ fill: CHART_COLORS[index] }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === 'bar') {
      return (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="question" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={100} />
            <YAxis />
            <Tooltip />
            <Legend />
            {labels.map((label, index) => (
              <Bar
                key={label.key}
                dataKey={label.key}
                name={`${label.key} (${label.date})`}
                fill={CHART_COLORS[index]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      );
    }

    return null;
  };

  const renderChart = () => {
    if (!comparisonData || !comparisonData.chartData.length) return null;

    const { chartData, labels } = comparisonData;

    if (chartDisplayType === 'radar') {
      return (
        <ResponsiveContainer width="100%" height={400}>
          <RadarChart data={chartData}>
            <PolarGrid />
            <PolarAngleAxis dataKey="question" tick={{ fontSize: 10 }} />
            <PolarRadiusAxis domain={[0, 'auto']} />
            {labels.map((label, index) => (
              <Radar
                key={label.key}
                name={`${label.key} (${label.date})`}
                dataKey={label.key}
                stroke={CHART_COLORS[index]}
                fill={CHART_COLORS[index]}
                fillOpacity={0.3}
              />
            ))}
            <Legend />
            <Tooltip />
          </RadarChart>
        </ResponsiveContainer>
      );
    }

    if (chartDisplayType === 'line') {
      return (
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="question" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={100} />
            <YAxis />
            <Tooltip />
            <Legend />
            {labels.map((label, index) => (
              <Line
                key={label.key}
                type="monotone"
                dataKey={label.key}
                name={`${label.key} (${label.date})`}
                stroke={CHART_COLORS[index]}
                strokeWidth={2}
                dot={{ fill: CHART_COLORS[index] }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (chartDisplayType === 'bar') {
      return (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="question" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={100} />
            <YAxis />
            <Tooltip />
            <Legend />
            {labels.map((label, index) => (
              <Bar
                key={label.key}
                dataKey={label.key}
                name={`${label.key} (${label.date})`}
                fill={CHART_COLORS[index]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      );
    }

    return null;
  };

  // Filter sent charts to show only questionnaire comparison charts
  const questionnaireCharts = sentCharts.filter(chart => chart.chart_type === 'questionnaire_comparison');

  if (loading && questionnaireTypes.length === 0) {
    return (
      <div className="card text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
        <p className="text-gray-500 mt-2">Loading questionnaire data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
          <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {/* Questionnaire Type Selection */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Compare Questionnaires for {userName}</h3>

        {questionnaireTypes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No completed questionnaires available for comparison.</p>
            <p className="text-sm mt-2">The client needs to complete questionnaires before charts can be created.</p>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Questionnaire Type
              </label>
              <select
                value={selectedType?.questionnaire_id || ''}
                onChange={(e) => {
                  const type = questionnaireTypes.find(t => t.questionnaire_id === parseInt(e.target.value));
                  handleTypeSelect(type);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">-- Select a questionnaire --</option>
                {questionnaireTypes.map(type => (
                  <option key={type.questionnaire_id} value={type.questionnaire_id}>
                    {type.questionnaire_name} ({type.completion_count} completion{type.completion_count !== 1 ? 's' : ''})
                  </option>
                ))}
              </select>
            </div>

            {/* Submissions Selection */}
            {selectedType && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Submissions to Compare (2-4 required)
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-md p-3">
                  {selectedType.completions.map(completion => (
                    <label
                      key={completion.assignment_id}
                      className={`flex items-center p-2 rounded cursor-pointer transition ${
                        selectedAssignments.includes(completion.assignment_id)
                          ? 'bg-primary-50 border border-primary-300'
                          : 'hover:bg-gray-50 border border-transparent'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedAssignments.includes(completion.assignment_id)}
                        onChange={() => handleAssignmentToggle(completion.assignment_id)}
                        disabled={!selectedAssignments.includes(completion.assignment_id) && selectedAssignments.length >= 4}
                        className="w-4 h-4 text-primary-600 rounded"
                      />
                      <span className="ml-3">
                        <span className="font-medium">Submission #{completion.submission_number}</span>
                        <span className="text-gray-500 text-sm ml-2">
                          ({new Date(completion.completed_at).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          })})
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
                {selectedType.completions.length < 2 && (
                  <p className="text-sm text-amber-600 mt-2">
                    At least 2 completed submissions are required for comparison.
                  </p>
                )}
              </div>
            )}

            {/* Chart Type Selection */}
            {selectedAssignments.length >= 2 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chart Type
                </label>
                <div className="flex gap-4">
                  {['radar', 'line', 'bar'].map(type => (
                    <label key={type} className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="chartType"
                        value={type}
                        checked={chartDisplayType === type}
                        onChange={() => setChartDisplayType(type)}
                        className="w-4 h-4 text-primary-600"
                      />
                      <span className="ml-2 capitalize">{type}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Chart Preview */}
      {comparisonData && (
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Chart Preview</h3>
            <button
              onClick={handleSendChart}
              disabled={sending}
              className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
            >
              <Send className="h-4 w-4 mr-2" />
              {sending ? 'Sending...' : 'Send Chart to Client'}
            </button>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            {renderChart()}
          </div>
        </div>
      )}

      {/* Sent Charts List */}
      {questionnaireCharts.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Charts Sent to {userName}</h3>
          <div className="space-y-3">
            {questionnaireCharts.map(chart => (
              <div
                key={chart.id}
                className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg"
              >
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">
                      {chart.questionnaire_name || 'Questionnaire Comparison'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {chart.chart_display_type?.charAt(0).toUpperCase() + chart.chart_display_type?.slice(1)} Chart
                      {' '}&bull;{' '}
                      {chart.selected_assignments?.length || 0} submissions compared
                      {' '}&bull;{' '}
                      Sent on {new Date(chart.sent_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleShowChart(chart)}
                    className="flex items-center px-3 py-1 text-primary-600 hover:bg-primary-50 rounded"
                    title="View chart"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Show
                  </button>

                  {deleteConfirm === chart.id ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDeleteChart(chart.id)}
                        className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(chart.id)}
                      className="flex items-center px-3 py-1 text-red-600 hover:bg-red-50 rounded"
                      title="Remove from client dashboard"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Unsend
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chart View Popup Modal */}
      {viewingChart && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200 flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {viewingChart.questionnaire_name || 'Questionnaire Comparison'}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {viewingChart.chart_display_type?.charAt(0).toUpperCase() + viewingChart.chart_display_type?.slice(1)} Chart
                  {' '}&bull;{' '}
                  {viewingChart.selected_assignments?.length || 0} submissions compared
                  {' '}&bull;{' '}
                  Sent on {new Date(viewingChart.sent_at).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                  })}
                </p>
              </div>
              <button
                onClick={closeChartPopup}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="bg-gray-50 rounded-lg p-4">
                {viewingChartLoading ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                    <span className="ml-3 text-gray-600">Loading chart...</span>
                  </div>
                ) : viewingChartData ? (
                  renderPopupChart(viewingChart, viewingChartData)
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>Failed to load chart data</p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={closeChartPopup}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionnaireComparison;
