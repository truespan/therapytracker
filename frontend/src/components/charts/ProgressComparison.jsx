import React, { useState } from 'react';
import RadarChartComponent from './RadarChart';

const ProgressComparison = ({ profileHistory }) => {
  const [selectedSessions, setSelectedSessions] = useState([]);

  if (!profileHistory || profileHistory.length === 0) {
    return null;
  }

  const handleSessionToggle = (sessionNumber) => {
    if (selectedSessions.includes(sessionNumber)) {
      setSelectedSessions(selectedSessions.filter(s => s !== sessionNumber));
    } else {
      // Limit to 4 sessions for better visualization
      if (selectedSessions.length < 4) {
        setSelectedSessions([...selectedSessions, sessionNumber]);
      }
    }
  };

  const handleSelectAll = () => {
    if (selectedSessions.length === profileHistory.length) {
      setSelectedSessions([]);
    } else {
      setSelectedSessions(profileHistory.slice(0, 4).map(s => s.session_number));
    }
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Compare Sessions</h3>
        <p className="text-sm text-gray-600 mb-4">
          Select up to 4 sessions to compare (currently {selectedSessions.length} selected)
        </p>
        
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={handleSelectAll}
            className="btn btn-secondary text-sm"
          >
            {selectedSessions.length === profileHistory.length ? 'Deselect All' : 'Select Recent 4'}
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {profileHistory.map((session) => (
            <button
              key={session.session_number}
              onClick={() => handleSessionToggle(session.session_number)}
              disabled={!selectedSessions.includes(session.session_number) && selectedSessions.length >= 4}
              className={`p-3 rounded-lg border-2 text-sm font-medium transition ${
                selectedSessions.includes(session.session_number)
                  ? 'border-primary-600 bg-primary-50 text-primary-700'
                  : 'border-gray-300 hover:border-gray-400 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              Session {session.session_number}
            </button>
          ))}
        </div>
      </div>

      {selectedSessions.length > 0 ? (
        <RadarChartComponent 
          profileHistory={profileHistory}
          selectedSessions={selectedSessions}
          title="Session Comparison"
        />
      ) : (
        <div className="card text-center py-8 text-gray-500">
          <p>Select sessions above to compare your progress</p>
        </div>
      )}
    </div>
  );
};

export default ProgressComparison;

