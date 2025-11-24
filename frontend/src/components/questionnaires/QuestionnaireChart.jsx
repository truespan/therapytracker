import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import { questionnaireAPI } from '../../services/api';

const QuestionnaireChart = ({ questionnaireId, userId, questionnaireName }) => {
  const [chartData, setChartData] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [selectedQuestion, setSelectedQuestion] = useState('all');
  const [chartType, setChartType] = useState('line');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadChartData();
  }, [questionnaireId, userId]);

  const loadChartData = async () => {
    try {
      setLoading(true);
      const response = await questionnaireAPI.getAggregatedResponses(questionnaireId, userId);
      const data = response.data;

      if (data.length === 0) {
        setError('No response data available yet');
        setLoading(false);
        return;
      }

      // Extract unique questions
      const uniqueQuestions = [...new Map(
        data.map(item => [item.question_id, {
          id: item.question_id,
          text: item.question_text,
          order: item.question_order
        }])
      ).values()].sort((a, b) => a.order - b.order);

      setQuestions(uniqueQuestions);

      // Group responses by date
      const responsesByDate = {};
      data.forEach(response => {
        const date = response.session_date 
          ? new Date(response.session_date).toLocaleDateString()
          : new Date(response.responded_at).toLocaleDateString();
        
        if (!responsesByDate[date]) {
          responsesByDate[date] = {
            date,
            timestamp: new Date(response.responded_at).getTime()
          };
        }
        
        responsesByDate[date][`q${response.question_id}`] = response.response_value;
        responsesByDate[date][`q${response.question_id}_text`] = response.option_text;
      });

      // Convert to array and sort by timestamp
      const chartDataArray = Object.values(responsesByDate).sort(
        (a, b) => a.timestamp - b.timestamp
      );

      setChartData(chartDataArray);
    } catch (err) {
      setError('Failed to load chart data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredData = () => {
    if (selectedQuestion === 'all') {
      return chartData;
    }
    
    return chartData.map(item => ({
      date: item.date,
      [`q${selectedQuestion}`]: item[`q${selectedQuestion}`],
      [`q${selectedQuestion}_text`]: item[`q${selectedQuestion}_text`]
    }));
  };

  const getLatestData = () => {
    if (chartData.length === 0) return [];
    
    const latestEntry = chartData[chartData.length - 1];
    return questions.map(q => ({
      question: q.text.length > 30 ? q.text.substring(0, 30) + '...' : q.text,
      value: latestEntry[`q${q.id}`] || 0,
      fullQuestion: q.text
    }));
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border border-gray-300 rounded shadow-lg">
          <p className="font-semibold text-gray-800 mb-2">{label}</p>
          {payload.map((entry, index) => {
            const questionId = entry.dataKey.replace('q', '');
            const question = questions.find(q => q.id === parseInt(questionId));
            const optionText = entry.payload[`${entry.dataKey}_text`];
            
            return (
              <div key={index} className="text-sm">
                <p className="text-gray-600">{question?.text || 'Question'}</p>
                <p className="font-medium" style={{ color: entry.color }}>
                  Value: {entry.value}
                  {optionText && ` (${optionText})`}
                </p>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  const colors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
    '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16'
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <div className="text-gray-500 mb-4">{error}</div>
        <p className="text-sm text-gray-400">
          Complete the questionnaire to see your progress charts
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">
          {questionnaireName || 'Questionnaire'} - Progress Chart
        </h3>

        {/* Controls */}
        <div className="flex flex-wrap gap-4 mb-4">
          {/* Chart Type Selector */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Chart Type
            </label>
            <select
              value={chartType}
              onChange={(e) => setChartType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="line">Line Chart</option>
              <option value="bar">Bar Chart</option>
              <option value="radar">Radar Chart (Latest)</option>
            </select>
          </div>

          {/* Question Filter */}
          {chartType !== 'radar' && (
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Question
              </label>
              <select
                value={selectedQuestion}
                onChange={(e) => setSelectedQuestion(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Questions</option>
                {questions.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.text.length > 50 ? q.text.substring(0, 50) + '...' : q.text}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Chart Display */}
      <div className="w-full" style={{ height: '400px' }}>
        {chartType === 'line' && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={getFilteredData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              {selectedQuestion === 'all' ? (
                questions.map((q, index) => (
                  <Line
                    key={q.id}
                    type="monotone"
                    dataKey={`q${q.id}`}
                    name={q.text.length > 30 ? q.text.substring(0, 30) + '...' : q.text}
                    stroke={colors[index % colors.length]}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                ))
              ) : (
                <Line
                  type="monotone"
                  dataKey={`q${selectedQuestion}`}
                  name={questions.find(q => q.id === parseInt(selectedQuestion))?.text || 'Question'}
                  stroke={colors[0]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        )}

        {chartType === 'bar' && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={getFilteredData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              {selectedQuestion === 'all' ? (
                questions.map((q, index) => (
                  <Bar
                    key={q.id}
                    dataKey={`q${q.id}`}
                    name={q.text.length > 30 ? q.text.substring(0, 30) + '...' : q.text}
                    fill={colors[index % colors.length]}
                  />
                ))
              ) : (
                <Bar
                  dataKey={`q${selectedQuestion}`}
                  name={questions.find(q => q.id === parseInt(selectedQuestion))?.text || 'Question'}
                  fill={colors[0]}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        )}

        {chartType === 'radar' && (
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={getLatestData()}>
              <PolarGrid />
              <PolarAngleAxis dataKey="question" />
              <PolarRadiusAxis />
              <Radar
                name="Latest Responses"
                dataKey="value"
                stroke={colors[0]}
                fill={colors[0]}
                fillOpacity={0.6}
              />
              <Tooltip />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-blue-50 rounded-lg">
          <div className="text-sm text-gray-600">Total Responses</div>
          <div className="text-2xl font-bold text-blue-600">{chartData.length}</div>
        </div>
        <div className="p-4 bg-green-50 rounded-lg">
          <div className="text-sm text-gray-600">Questions</div>
          <div className="text-2xl font-bold text-green-600">{questions.length}</div>
        </div>
        <div className="p-4 bg-purple-50 rounded-lg">
          <div className="text-sm text-gray-600">First Response</div>
          <div className="text-sm font-medium text-purple-600">
            {chartData.length > 0 ? chartData[0].date : 'N/A'}
          </div>
        </div>
        <div className="p-4 bg-orange-50 rounded-lg">
          <div className="text-sm text-gray-600">Latest Response</div>
          <div className="text-sm font-medium text-orange-600">
            {chartData.length > 0 ? chartData[chartData.length - 1].date : 'N/A'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestionnaireChart;





