import React from 'react';
import RadarChartComponent from './RadarChart';
import { Calendar, User } from 'lucide-react';

const SharedChartViewer = ({ charts, profileHistory }) => {
  if (!charts || charts.length === 0) {
    return (
      <div className="card text-center py-12 text-gray-500">
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

        return (
          <div key={chart.id} className="space-y-4">
            {/* Chart Info Header */}
            <div className="card bg-primary-50 border-l-4 border-l-primary-600">
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
                    {chart.chart_type === 'radar_default' ? 'Progress Overview' : 'Session Comparison'}
                  </span>
                </div>
              </div>
            </div>

            {/* Chart Display */}
            {chart.chart_type === 'radar_default' ? (
              <RadarChartComponent 
                profileHistory={profileHistory}
                title="Your Progress Overview"
              />
            ) : (
              <RadarChartComponent 
                profileHistory={profileHistory}
                selectedSessions={chart.selected_sessions}
                title="Session Comparison"
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default SharedChartViewer;

