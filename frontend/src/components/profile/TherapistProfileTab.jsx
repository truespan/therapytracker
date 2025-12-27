import React, { useState, useEffect } from 'react';
import { userAPI } from '../../services/api';
import { User, Briefcase, Award, FileText, Languages, CreditCard, Calendar } from 'lucide-react';
import { CurrencyIcon } from '../../utils/currencyIcon';

const TherapistProfileTab = ({ userId }) => {
  const [therapist, setTherapist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadTherapistProfile();
  }, [userId]);

  const loadTherapistProfile = async () => {
    try {
      setLoading(true);
      const response = await userAPI.getPartners(userId);
      // Get the first partner (therapist) assigned to this client
      const partners = response.data.partners || [];
      if (partners.length > 0) {
        setTherapist(partners[0]);
      }
    } catch (err) {
      console.error('Failed to load therapist profile:', err);
      setError('Failed to load therapist profile');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to construct full image URL
  const getImageUrl = (photoUrl) => {
    if (!photoUrl) return null;

    // If it's already a full URL (Cloudinary or external), return as-is
    if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
      return photoUrl;
    }

    // If it's a relative path, prepend the backend server URL
    // Remove /api from API_URL to get base server URL
    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
    const BASE_URL = API_URL.replace('/api', '');

    // Ensure path starts with /
    const path = photoUrl.startsWith('/') ? photoUrl : `/${photoUrl}`;

    return `${BASE_URL}${path}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-dark-text-secondary">Loading therapist profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (!therapist) {
    return (
      <div className="bg-gray-50 dark:bg-dark-bg-secondary border border-gray-200 dark:border-dark-border rounded-lg p-8 text-center">
        <User className="h-16 w-16 text-gray-300 dark:text-dark-text-tertiary mx-auto mb-4" />
        <p className="text-gray-600 dark:text-dark-text-secondary">No therapist assigned yet.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header Card with Photo and Basic Info */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg shadow-lg p-6 sm:p-8 mb-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Profile Photo */}
          <div className="flex-shrink-0">
            {therapist.photo_url ? (
              <img
                src={getImageUrl(therapist.photo_url)}
                alt={therapist.name}
                className="h-32 w-32 rounded-full border-4 border-white shadow-lg object-cover"
                onError={(e) => {
                  console.error('Failed to load therapist photo:', therapist.photo_url);
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <div
              className="h-32 w-32 rounded-full border-4 border-white shadow-lg bg-white flex items-center justify-center"
              style={{ display: therapist.photo_url ? 'none' : 'flex' }}
            >
              <User className="h-16 w-16 text-primary-600" />
            </div>
          </div>

          {/* Name and Basic Info */}
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">{therapist.name}</h2>
            <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
              {therapist.sex && (
                <span className="inline-flex items-center px-3 py-1 bg-white bg-opacity-20 text-white rounded-full text-sm">
                  <User className="h-4 w-4 mr-1" />
                  {therapist.sex}
                </span>
              )}
              {therapist.age && (
                <span className="inline-flex items-center px-3 py-1 bg-white bg-opacity-20 text-white rounded-full text-sm">
                  <Calendar className="h-4 w-4 mr-1" />
                  {therapist.age} years
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Qualification */}
        {therapist.qualification && (
          <div className="bg-white dark:bg-dark-bg-tertiary rounded-lg shadow-md p-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center">
                  <Award className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                </div>
              </div>
              <div className="ml-4 flex-1">
                <h3 className="text-sm font-medium text-gray-500 dark:text-dark-text-tertiary mb-1">Qualification</h3>
                <p className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">{therapist.qualification}</p>
              </div>
            </div>
          </div>
        )}

        {/* License ID */}
        {therapist.license_id && (
          <div className="bg-white dark:bg-dark-bg-tertiary rounded-lg shadow-md p-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                  <CreditCard className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="ml-4 flex-1">
                <h3 className="text-sm font-medium text-gray-500 dark:text-dark-text-tertiary mb-1">Practitioner License ID</h3>
                <p className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">{therapist.license_id}</p>
              </div>
            </div>
          </div>
        )}

        {/* Fees Range */}
        {(therapist.fee_min || therapist.fee_max) && (
          <div className="bg-white dark:bg-dark-bg-tertiary rounded-lg shadow-md p-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                  <CurrencyIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <div className="ml-4 flex-1">
                <h3 className="text-sm font-medium text-gray-500 dark:text-dark-text-tertiary mb-1">Fee Range</h3>
                <p className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">
                  {therapist.fee_currency || 'INR'} {therapist.fee_min || 0} - {therapist.fee_max || 0}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Language Preferences */}
        {therapist.language_preferences && (
          <div className="bg-white dark:bg-dark-bg-tertiary rounded-lg shadow-md p-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                  <Languages className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              <div className="ml-4 flex-1">
                <h3 className="text-sm font-medium text-gray-500 dark:text-dark-text-tertiary mb-1">Languages</h3>
                <p className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">{therapist.language_preferences}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Work Experience - Full Width */}
      {therapist.work_experience && (
        <div className="bg-white dark:bg-dark-bg-tertiary rounded-lg shadow-md p-6 mt-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <div className="h-10 w-10 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
                <Briefcase className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
            <div className="ml-4 flex-1">
              <h3 className="text-sm font-medium text-gray-500 dark:text-dark-text-tertiary mb-2">Work Experience</h3>
              <p className="text-gray-900 dark:text-dark-text-primary whitespace-pre-wrap leading-relaxed">{therapist.work_experience}</p>
            </div>
          </div>
        </div>
      )}

      {/* Other Practice Details - Full Width */}
      {therapist.other_practice_details && (
        <div className="bg-white dark:bg-dark-bg-tertiary rounded-lg shadow-md p-6 mt-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <div className="h-10 w-10 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center">
                <FileText className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
            <div className="ml-4 flex-1">
              <h3 className="text-sm font-medium text-gray-500 dark:text-dark-text-tertiary mb-2">Other Practice Details</h3>
              <p className="text-gray-900 dark:text-dark-text-primary whitespace-pre-wrap leading-relaxed">{therapist.other_practice_details}</p>
            </div>
          </div>
        </div>
      )}

      {/* Contact Information */}
      {(therapist.email || therapist.contact) && (
        <div className="bg-gray-50 dark:bg-dark-bg-secondary rounded-lg p-6 mt-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-4">Contact Information</h3>
          <div className="space-y-2">
            {therapist.email && (
              <div className="flex items-center text-gray-700 dark:text-dark-text-secondary">
                <span className="font-medium mr-2">Email:</span>
                <a href={`mailto:${therapist.email}`} className="text-primary-600 dark:text-dark-primary-500 hover:text-primary-700 dark:hover:text-dark-primary-400">
                  {therapist.email}
                </a>
              </div>
            )}
            {therapist.contact && (
              <div className="flex items-center text-gray-700 dark:text-dark-text-secondary">
                <span className="font-medium mr-2">Phone:</span>
                <a href={`tel:${therapist.contact}`} className="text-primary-600 dark:text-dark-primary-500 hover:text-primary-700 dark:hover:text-dark-primary-400">
                  {therapist.contact}
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TherapistProfileTab;
