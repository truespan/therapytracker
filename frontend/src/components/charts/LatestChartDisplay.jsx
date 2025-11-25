import React, { useState, useEffect } from 'react';
import { questionnaireAPI } from '../../services/api';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, Bar, ResponsiveContainer
} from 'recharts';
import { BarChart3, Calendar, CheckCircle } from 'lucide-react';

const CHART_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

const LatestChartDisplay = ({ sentCharts, userName }) => {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Get the latest questionnaire comparison chart
  const latestChart = sentCharts
    ?.filter(chart => chart.chart_type === 'questionnaire_comparison')
    .sort((a, b) => new Date(b.sent_at) - new Date(a.sent_at))[0];

  useEffect(() => {
    if (latestChart?.selected_assignments) {
      loadChartData();
    }
  }, [latestChart?.id]);

  const loadChartData = async () => {
    if (!latestChart?.selected_assignments) return;

    setLoading(true);
    setError(null);

    try {
      const response = await questionnaireAPI.getResponsesForComparison(latestChart.selected_assignments);
      const rawData = response.data.responses || [];
      const transformedData = transformDataForChart(rawData, latestChart.selected_assignments);
      setChartData(transformedData);
    } catch (err) {
      console.error('Error loading chart data:', err);
      setError('Failed to load chart data');
    } finally {
      setLoading(false);
    }
  };

  const transformDataForChart = (rawData, selectedAssignments) => {
    // Ensure selectedAssignments contains numbers for consistent comparison
    const normalizedAssignments = selectedAssignments.map(id => Number(id));

    const questionMap = new Map();
    const assignmentDates = new Map();

    rawData.forEach(row => {
      if (!questionMap.has(row.question_id)) {
        questionMap.set(row.question_id, {
          question_id: row.question_id,
          question_text: row.question_text,
          question_order: row.question_order,
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

    const sortedQuestions = Array.from(questionMap.values())
      .sort((a, b) => a.question_order - b.question_order);

    const chartDataPoints = sortedQuestions.map(q => {
      const dataPoint = {
        question: q.question_text.length > 25
          ? q.question_text.substring(0, 25) + '...'
          : q.question_text,
        fullQuestion: q.question_text
      };

      normalizedAssignments.forEach((assignmentId, index) => {
        const label = `Submission ${index + 1}`;
        dataPoint[label] = q.responses[assignmentId] || 0;
      });

      return dataPoint;
    });

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

    return { chartData: chartDataPoints, labels };
  };

  const renderChart = () => {
    if (!chartData || !chartData.chartData.length) return null;

    const { chartData: data, labels } = chartData;
    const chartType = latestChart.chart_display_type || 'radar';

    if (chartType === 'radar') {
      return (
        <ResponsiveContainer width="100%" height={350}>
          <RadarChart data={data}>
            <PolarGrid />
            <PolarAngleAxis dataKey="question" tick={{ fontSize: 9 }} />
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
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="question" tick={{ fontSize: 9 }} angle={-45} textAnchor="end" height={80} />
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
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="question" tick={{ fontSize: 9 }} angle={-45} textAnchor="end" height={80} />
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

  if (!latestChart) {
    return (
      <div className="card text-center py-12">
        <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 font-medium">No Charts Sent Yet</p>
        <p className="text-sm text-gray-500 mt-2">
          Go to "Charts & Insights" tab to create and send comparison charts to {userName}
        </p>
      </div>
    );
  }

  const chartDate = new Date(latestChart.sent_at).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Latest Chart</h3>
          <p className="text-sm text-gray-600">
            {latestChart.questionnaire_name || 'Questionnaire Comparison'}
          </p>
        </div>
        <div className="flex items-center text-sm text-gray-500">
          <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
          <Calendar className="h-4 w-4 mr-1 ml-2" />
          <span>Sent on {chartDate}</span>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <span className="ml-3 text-gray-600">Loading chart...</span>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-500">
            <p>{error}</p>
          </div>
        ) : chartData ? (
          renderChart()
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>Loading chart data...</p>
          </div>
        )}
      </div>

      <div className="mt-3 text-sm text-gray-500">
        <span className="capitalize">{latestChart.chart_display_type || 'Radar'} chart</span>
        {' '}&bull;{' '}
        <span>{latestChart.selected_assignments?.length || 0} submissions compared</span>
      </div>
    </div>
  );
};

export default LatestChartDisplay;
