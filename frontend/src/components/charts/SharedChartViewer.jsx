import React, { useState, useEffect } from 'react';
import { questionnaireAPI } from '../../services/api';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, Bar, ResponsiveContainer
} from 'recharts';
import { Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip as ChartTooltip,
  Legend as ChartLegend
} from 'chart.js';
import { Calendar, User, BarChart3 } from 'lucide-react';

// Register Chart.js components
ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  ChartTooltip,
  ChartLegend
);

// Highly contrasting colors with maximum visibility
const CHART_COLORS = [
  '#0000FF', // Pure Blue - Submission 1
  '#FF0000', // Pure Red - Submission 2
  '#00FF00', // Pure Green - Submission 3
  '#FF8800'  // Pure Orange - Submission 4
];

const SharedChartViewer = ({ charts }) => {
  const [chartDataMap, setChartDataMap] = useState({});
  const [loadingCharts, setLoadingCharts] = useState({});

  useEffect(() => {
    // Load data for each questionnaire comparison chart
    charts.forEach(chart => {
      if (chart.chart_type === 'questionnaire_comparison' && chart.selected_assignments) {
        loadChartData(chart);
      }
    });
  }, [charts]);

  const loadChartData = async (chart) => {
    if (chartDataMap[chart.id] || loadingCharts[chart.id]) return;

    setLoadingCharts(prev => ({ ...prev, [chart.id]: true }));

    try {
      const response = await questionnaireAPI.getResponsesForComparison(chart.selected_assignments);
      const rawData = response.data.responses || [];
      const transformedData = transformDataForChart(rawData, chart.selected_assignments);

      setChartDataMap(prev => ({ ...prev, [chart.id]: transformedData }));
    } catch (err) {
      console.error('Error loading chart data:', err);
      setChartDataMap(prev => ({ ...prev, [chart.id]: { error: true } }));
    } finally {
      setLoadingCharts(prev => ({ ...prev, [chart.id]: false }));
    }
  };

  const transformDataForChart = (rawData, selectedAssignments) => {
    // Ensure selectedAssignments contains numbers for consistent comparison
    const normalizedAssignments = selectedAssignments.map(id => Number(id));

    // Group by question
    const questionMap = new Map();
    const assignmentDates = new Map();
    const submissionNumbers = new Map();

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

      // Store submission number from API response
      if (!submissionNumbers.has(Number(row.assignment_id)) && row.submission_number) {
        submissionNumbers.set(Number(row.assignment_id), row.submission_number);
      }
    });

    // Sort questions by order
    const sortedQuestions = Array.from(questionMap.values())
      .sort((a, b) => a.question_order - b.question_order);

    // Create chart-ready data
    const chartData = sortedQuestions.map(q => {
      const dataPoint = {
        question: q.question_text.length > 25
          ? q.question_text.substring(0, 25) + '...'
          : q.question_text,
        fullQuestion: q.question_text
      };

      normalizedAssignments.forEach((assignmentId, index) => {
        // Use actual submission number from API if available, otherwise fall back to index + 1
        const submissionNum = submissionNumbers.get(assignmentId) || (index + 1);
        const label = `Submission #${submissionNum}`;
        const value = q.responses[assignmentId];
        // Ensure numeric value
        dataPoint[label] = value !== undefined && value !== null ? Number(value) : 0;
      });

      return dataPoint;
    });

    // Get assignment labels with dates
    const labels = normalizedAssignments.map((assignmentId, index) => {
      const date = assignmentDates.get(assignmentId);
      // Use actual submission number from API if available, otherwise fall back to index + 1
      const submissionNum = submissionNumbers.get(assignmentId) || (index + 1);
      return {
        key: `Submission #${submissionNum}`,
        date: date ? date.toLocaleDateString() : 'Unknown'
      };
    });

    return { chartData, labels };
  };

  const renderQuestionnaireChart = (chart, data) => {
    if (!data || !data.chartData || data.chartData.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <p>No chart data available</p>
        </div>
      );
    }

    const { chartData, labels } = data;
    const chartType = chart.chart_display_type || 'radar';

    // Debug logging - Check actual data values
    console.log('SharedChartViewer - Chart Type:', chartType);
    console.log('SharedChartViewer - Chart Data:', chartData);
    console.log('SharedChartViewer - Labels:', labels);
    console.log('SharedChartViewer - Colors:', CHART_COLORS);

    // Calculate max value from data for proper domain
    let maxDataValue = 0;
    chartData.forEach(point => {
      labels.forEach(label => {
        const value = point[label.key];
        if (value > maxDataValue) maxDataValue = value;
      });
    });
    console.log('SharedChartViewer - Max Data Value:', maxDataValue);

    // Set domain based on data - use actual max value, not forced to 10
    // This matches the dynamic scale used in partner dashboard
    const domainMax = Math.ceil(maxDataValue);
    console.log('SharedChartViewer - Domain Max:', domainMax);

    if (chartType === 'radar') {
      // Prepare data for Chart.js
      const radarLabels = chartData.map(d => d.question);
      const datasets = labels.map((label, index) => ({
        label: `${label.key} (${label.date})`,
        data: chartData.map(d => d[label.key]),
        backgroundColor: `${CHART_COLORS[index]}40`, // 25% opacity
        borderColor: CHART_COLORS[index],
        borderWidth: 3,
        pointBackgroundColor: CHART_COLORS[index],
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: CHART_COLORS[index],
        pointRadius: 5,
        pointHoverRadius: 7
      }));

      const radarData = {
        labels: radarLabels,
        datasets: datasets
      };

      const radarOptions = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            beginAtZero: true,
            max: domainMax,
            ticks: {
              stepSize: 1,
              font: { size: window.innerWidth < 640 ? 8 : 10 }
            },
            pointLabels: {
              font: { size: window.innerWidth < 640 ? 8 : 10 }
            }
          }
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: window.innerWidth < 640 ? 8 : 15,
              font: { size: window.innerWidth < 640 ? 9 : 12 },
              boxWidth: window.innerWidth < 640 ? 10 : 15
            }
          },
          tooltip: {
            titleFont: { size: window.innerWidth < 640 ? 10 : 12 },
            bodyFont: { size: window.innerWidth < 640 ? 9 : 11 },
            callbacks: {
              label: function(context) {
                return `${context.dataset.label}: ${context.parsed.r}`;
              }
            }
          }
        }
      };

      return (
        <div className="h-[300px] sm:h-[400px] lg:h-[500px] w-full">
          <Radar data={radarData} options={radarOptions} />
        </div>
      );
    }

    if (chartType === 'line') {
      const isMobile = window.innerWidth < 640;
      return (
        <ResponsiveContainer width="100%" height={isMobile ? 300 : 400} className="sm:!h-[350px] lg:!h-[400px]">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="question"
              tick={{ fontSize: isMobile ? 8 : 10 }}
              angle={-45}
              textAnchor="end"
              height={isMobile ? 80 : 100}
              interval={isMobile ? 'preserveStartEnd' : 0}
            />
            <YAxis tick={{ fontSize: isMobile ? 8 : 10 }} />
            <Tooltip contentStyle={{ fontSize: '0.75rem' }} />
            <Legend wrapperStyle={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }} />
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
      const isMobile = window.innerWidth < 640;
      return (
        <ResponsiveContainer width="100%" height={isMobile ? 300 : 400} className="sm:!h-[350px] lg:!h-[400px]">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="question"
              tick={{ fontSize: isMobile ? 8 : 10 }}
              angle={-45}
              textAnchor="end"
              height={isMobile ? 80 : 100}
              interval={isMobile ? 'preserveStartEnd' : 0}
            />
            <YAxis tick={{ fontSize: isMobile ? 8 : 10 }} />
            <Tooltip contentStyle={{ fontSize: '0.75rem' }} />
            <Legend wrapperStyle={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }} />
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

  if (!charts || charts.length === 0) {
    return (
      <div className="card text-center py-12 text-gray-500">
        <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <p>No charts shared with you yet</p>
        <p className="text-sm mt-2">Your therapist will share progress charts with you</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {charts.map((chart) => {
        const chartDate = new Date(chart.sent_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        const isQuestionnaireChart = chart.chart_type === 'questionnaire_comparison';
        const chartData = chartDataMap[chart.id];
        const isLoading = loadingCharts[chart.id];

        return (
          <div key={chart.id} className="card">
            {/* Chart Info Header */}
            <div className="bg-primary-50 border-l-4 border-l-primary-600 p-4 rounded-lg mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <User className="h-5 w-5 text-primary-600" />
                  <div>
                    <p className="font-medium text-gray-900">
                      Chart from {chart.partner_name}
                    </p>
                    <p className="text-sm text-gray-600 flex items-center mt-1">
                      <Calendar className="h-4 w-4 mr-1" />
                      Sent on {chartDate}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                    {isQuestionnaireChart
                      ? `${chart.questionnaire_name || 'Questionnaire'} Comparison`
                      : chart.chart_type === 'radar_default'
                        ? 'Progress Overview'
                        : 'Session Comparison'
                    }
                  </span>
                  {isQuestionnaireChart && chart.chart_display_type && (
                    <p className="text-xs text-gray-500 mt-1 capitalize">
                      {chart.chart_display_type} Chart
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Chart Display */}
            <div className="bg-gray-50 rounded-lg p-4">
              {isQuestionnaireChart ? (
                isLoading ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                    <span className="ml-3 text-gray-600">Loading chart...</span>
                  </div>
                ) : chartData?.error ? (
                  <div className="text-center py-8 text-red-500">
                    <p>Failed to load chart data</p>
                  </div>
                ) : chartData ? (
                  renderQuestionnaireChart(chart, chartData)
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>Loading chart data...</p>
                  </div>
                )
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>Legacy chart type - display not available</p>
                </div>
              )}
            </div>

            {/* Submission Info */}
            {isQuestionnaireChart && chart.selected_assignments && (
              <div className="mt-4 text-sm text-gray-600">
                <p>Comparing {chart.selected_assignments.length} submissions</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default SharedChartViewer;
