import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { organizationAPI, partnerAPI, userAPI } from '../../services/api';
import RadarChartComponent from '../charts/RadarChart';
import SessionList from '../sessions/SessionList';
import { Building2, Users, UserCheck, Activity, TrendingUp } from 'lucide-react';

const OrganizationDashboard = () => {
  const { user } = useAuth();
  const [partners, setPartners] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [partnerUsers, setPartnerUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [userSessions, setUserSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPartners: 0,
    totalUsers: 0,
    totalSessions: 0
  });

  useEffect(() => {
    loadOrganizationData();
  }, [user.id]);

  const loadOrganizationData = async () => {
    try {
      const [partnersResponse, usersResponse] = await Promise.all([
        organizationAPI.getPartners(user.id),
        organizationAPI.getUsers(user.id)
      ]);

      const partnersData = partnersResponse.data.partners || [];
      const usersData = usersResponse.data.users || [];

      setPartners(partnersData);
      setAllUsers(usersData);

      // Calculate stats
      let totalSessions = 0;
      for (const u of usersData) {
        try {
          const sessionsResponse = await userAPI.getSessions(u.id);
          totalSessions += (sessionsResponse.data.sessions || []).length;
        } catch (err) {
          console.error(`Failed to load sessions for user ${u.id}:`, err);
        }
      }

      setStats({
        totalPartners: partnersData.length,
        totalUsers: usersData.length,
        totalSessions
      });

      setLoading(false);
    } catch (err) {
      console.error('Failed to load organization data:', err);
      setLoading(false);
    }
  };

  const handlePartnerSelect = async (partnerId) => {
    try {
      setLoading(true);
      const response = await partnerAPI.getUsers(partnerId);
      const partner = partners.find(p => p.id === partnerId);
      setSelectedPartner(partner);
      setPartnerUsers(response.data.users || []);
      setSelectedUser(null);
      setUserProfile(null);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load partner users:', err);
      setLoading(false);
    }
  };

  const handleUserSelect = async (userId) => {
    try {
      setLoading(true);
      const [profileResponse, sessionsResponse] = await Promise.all([
        userAPI.getProfile(userId),
        userAPI.getSessions(userId)
      ]);

      const userObj = allUsers.find(u => u.id === userId) || partnerUsers.find(u => u.id === userId);
      setSelectedUser(userObj);
      setUserProfile(profileResponse.data.profileHistory || []);
      setUserSessions(sessionsResponse.data.sessions || []);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load user data:', err);
      setLoading(false);
    }
  };

  if (loading && partners.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Activity className="h-12 w-12 text-primary-600 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Building2 className="h-8 w-8 mr-3" />
          {user.name}
        </h1>
        <p className="text-gray-600 mt-1">Organization Overview and Management</p>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Therapists</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalPartners}</p>
            </div>
            <UserCheck className="h-12 w-12 text-primary-600" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Clients</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalUsers}</p>
            </div>
            <Users className="h-12 w-12 text-primary-600" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Sessions</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalSessions}</p>
            </div>
            <TrendingUp className="h-12 w-12 text-primary-600" />
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Partners List */}
        <div className="lg:col-span-1">
          <div className="card sticky top-4">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <UserCheck className="h-5 w-5 mr-2" />
              Therapists
            </h2>
            
            {partners.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <UserCheck className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p>No therapists yet</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {partners.map((partner) => (
                  <button
                    key={partner.id}
                    onClick={() => handlePartnerSelect(partner.id)}
                    className={`w-full text-left p-3 rounded-lg border-2 transition ${
                      selectedPartner?.id === partner.id
                        ? 'border-primary-600 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="font-medium text-gray-900">{partner.name}</p>
                    {partner.partner_id && (
                      <p className="text-xs font-mono text-primary-600 font-semibold mt-1">
                        ID: {partner.partner_id}
                      </p>
                    )}
                    <p className="text-sm text-gray-600">{partner.email || partner.contact}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Partner's Users or Selected User Details */}
        <div className="lg:col-span-3">
          {selectedUser && userProfile ? (
            <div className="space-y-6">
              <div className="card">
                <button
                  onClick={() => setSelectedUser(null)}
                  className="text-primary-600 hover:text-primary-700 mb-4"
                >
                  ← Back to clients
                </button>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedUser.name}</h2>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span>{selectedUser.sex}, {selectedUser.age} years</span>
                  {selectedUser.email && <span>{selectedUser.email}</span>}
                </div>
              </div>

              <RadarChartComponent 
                profileHistory={userProfile}
                title={`${selectedUser.name}'s Progress`}
              />

              <div>
                <h3 className="text-lg font-semibold mb-4">Session History</h3>
                <SessionList sessions={userSessions} />
              </div>
            </div>
          ) : selectedPartner ? (
            <div className="card">
              <div className="mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  {selectedPartner.name}'s Clients ({partnerUsers.length})
                </h2>
                {selectedPartner.partner_id && (
                  <p className="text-sm text-gray-600 mt-1">
                    Partner ID: <span className="font-mono font-semibold text-primary-600">{selectedPartner.partner_id}</span>
                  </p>
                )}
              </div>
              
              {partnerUsers.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Users className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <p>No clients assigned to this therapist yet</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {partnerUsers.map((client) => (
                    <button
                      key={client.id}
                      onClick={() => handleUserSelect(client.id)}
                      className="p-4 border-2 border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition text-left"
                    >
                      <p className="font-medium text-gray-900">{client.name}</p>
                      <p className="text-sm text-gray-600">{client.sex}, {client.age} years</p>
                      {client.email && <p className="text-sm text-gray-600 mt-1">{client.email}</p>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="card text-center py-16">
              <UserCheck className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">Select a therapist to view their clients</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrganizationDashboard;

