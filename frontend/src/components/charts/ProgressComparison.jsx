import React, { useState } from 'react';
import RadarChartComponent from './RadarChart';
import { Send } from 'lucide-react';

const ProgressComparison = ({ profileHistory, onSendChart, showSendButton = false }) => {
  const [selectedSessions, setSelectedSessions] = useState([]);
  const [sendingChart, setSendingChart] = useState(false);

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

  const handleSendDefaultChart = async () => {
    if (onSendChart) {
      setSendingChart(true);
      await onSendChart('radar_default', null);
      setSendingChart(false);
    }
  };

  const handleSendComparisonChart = async () => {
    if (onSendChart && selectedSessions.length > 0) {
      setSendingChart(true);
      await onSendChart('comparison', selectedSessions);
      setSendingChart(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold">Compare Sessions</h3>
            <p className="text-sm text-gray-600 mt-1">
              Select up to 4 sessions to compare (currently {selectedSessions.length} selected)
            </p>
          </div>
          {showSendButton && (
            <button
              onClick={handleSendDefaultChart}
              disabled={sendingChart}
              className="btn btn-primary flex items-center space-x-2"
            >
              <Send className="h-4 w-4" />
              <span>{sendingChart ? 'Sending...' : 'Send Default Chart'}</span>
            </button>
          )}
        </div>
        
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
        <div className="space-y-4">
          <RadarChartComponent 
            profileHistory={profileHistory}
            selectedSessions={selectedSessions}
            title="Session Comparison"
          />
          {showSendButton && (
            <div className="flex justify-center">
              <button
                onClick={handleSendComparisonChart}
                disabled={sendingChart}
                className="btn btn-primary flex items-center space-x-2"
              >
                <Send className="h-4 w-4" />
                <span>{sendingChart ? 'Sending...' : 'Send This Comparison'}</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="card text-center py-8 text-gray-500">
          <p>Select sessions above to compare your progress</p>
        </div>
      )}
    </div>
  );
};

export default ProgressComparison;

