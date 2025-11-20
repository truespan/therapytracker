import React from 'react';
import { Radar, RadarChart as RechartsRadar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { transformMultipleSessionsForRadar, getSessionColor, formatDate } from '../../utils/chartHelpers';
import { Download } from 'lucide-react';

const RadarChartComponent = ({ profileHistory, selectedSessions = null, title = 'Mind-Body Profile' }) => {
  if (!profileHistory || profileHistory.length === 0) {
    return (
      <div className="card text-center py-12 text-gray-500">
        <p>No profile data available yet</p>
        <p className="text-sm mt-2">Complete your first assessment to see your mind-body map</p>
      </div>
    );
  }

  // Filter sessions if specific ones are selected
  const sessionsToShow = selectedSessions 
    ? profileHistory.filter(s => selectedSessions.includes(s.session_number))
    : profileHistory.slice(-3); // Show last 3 sessions by default

  const { fields, sessions } = transformMultipleSessionsForRadar(sessionsToShow);

  if (fields.length === 0 || sessions.length === 0) {
    return (
      <div className="card text-center py-12 text-gray-500">
        <p>No complete profile data available</p>
      </div>
    );
  }

  // Transform data for recharts radar format
  const radarData = fields.map(field => {
    const dataPoint = { field };
    sessions.forEach(session => {
      dataPoint[`Session ${session.session_number}`] = session[field] || 0;
    });
    return dataPoint;
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-600 mt-1">
            Showing {sessions.length} session{sessions.length > 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={handlePrint}
          className="btn btn-secondary flex items-center space-x-2"
        >
          <Download className="h-4 w-4" />
          <span>Print</span>
        </button>
      </div>

      <ResponsiveContainer width="100%" height={500}>
        <RechartsRadar data={radarData}>
          <PolarGrid stroke="#e5e7eb" />
          <PolarAngleAxis 
            dataKey="field" 
            tick={{ fill: '#374151', fontSize: 12 }}
            tickLine={false}
          />
          <PolarRadiusAxis 
            angle={90} 
            domain={[0, 5]} 
            tick={{ fill: '#6b7280', fontSize: 10 }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'white', 
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '12px'
            }}
          />
          {sessions.map((session, index) => (
            <Radar
              key={session.session_number}
              name={`Session ${session.session_number}`}
              dataKey={`Session ${session.session_number}`}
              stroke={getSessionColor(index)}
              fill={getSessionColor(index)}
              fillOpacity={0.3}
              strokeWidth={2}
            />
          ))}
          <Legend 
            wrapperStyle={{ paddingTop: '20px' }}
            formatter={(value, entry, index) => {
              const sessionNum = parseInt(value.replace('Session ', ''));
              const session = sessionsToShow.find(s => s.session_number === sessionNum);
              return session ? `${value} (${formatDate(session.session_date)})` : value;
            }}
          />
        </RechartsRadar>
      </ResponsiveContainer>

      <div className="mt-6 text-center text-sm text-gray-600">
        <p>Each axis represents a different aspect of your well-being.</p>
        <p>Higher values indicate better ratings.</p>
      </div>
    </div>
  );
};

export default RadarChartComponent;

