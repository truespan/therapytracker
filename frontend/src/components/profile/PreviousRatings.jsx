import React from 'react';
import { formatDate } from '../../utils/chartHelpers';
import { Calendar } from 'lucide-react';

const PreviousRatings = ({ profileHistory }) => {
  if (!profileHistory || profileHistory.length === 0) {
    return (
      <div className="card text-center py-8 text-gray-500">
        <p>No previous ratings available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Rating History</h3>
      
      <div className="space-y-3">
        {profileHistory.map((session) => (
          <div key={session.session_id} className="card">
            <div className="flex items-center justify-between mb-3 pb-2 border-b">
              <div>
                <h4 className="font-semibold text-gray-900">
                  Session {session.session_number}
                </h4>
                <div className="flex items-center text-sm text-gray-600 mt-1">
                  <Calendar className="h-4 w-4 mr-1" />
                  {formatDate(session.session_date)}
                </div>
              </div>
            </div>
            
            {session.ratings && session.ratings.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {session.ratings.map((rating) => (
                  <div key={rating.field_id} className="flex justify-between items-center text-sm">
                    <span className="text-gray-700">{rating.field_name}:</span>
                    <span className="font-medium text-primary-600">{rating.rating_value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No ratings recorded for this session</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PreviousRatings;

