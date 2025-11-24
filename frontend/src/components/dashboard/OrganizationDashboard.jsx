import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { organizationAPI, partnerAPI } from '../../services/api';
import { Building2, Users, UserCheck, Activity } from 'lucide-react';

const OrganizationDashboard = () => {
  const { user } = useAuth();
  const [partners, setPartners] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [partnerUsers, setPartnerUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPartners: 0,
    totalUsers: 0
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

      setStats({
        totalPartners: partnersData.length,
        totalUsers: usersData.length
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
      setLoading(false);
    } catch (err) {
      console.error('Failed to load partner users:', err);
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
      <div className="grid md:grid-cols-2 gap-6 mb-8">
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

        {/* Partner's Users */}
        <div className="lg:col-span-3">
          {selectedPartner ? (
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
                    <div
                      key={client.id}
                      className="p-4 border-2 border-gray-200 rounded-lg"
                    >
                      <p className="font-medium text-gray-900">{client.name}</p>
                      <p className="text-sm text-gray-600">{client.sex}, {client.age} years</p>
                      {client.email && <p className="text-sm text-gray-600 mt-1">{client.email}</p>}
                    </div>
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

