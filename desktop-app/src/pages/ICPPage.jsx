import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import api from '../services/api';
import { mockICPProfiles } from '../mocks';

function ICPPage() {
  const [profiles, setProfiles] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    setLoading(true);
    try {
      // For now, using mock data until backend API is ready
      // TODO: Replace with api.getICPProfiles() when backend is implemented
      setProfiles(mockICPProfiles);
      if (mockICPProfiles.length > 0 && !selectedProfile) {
        setSelectedProfile(mockICPProfiles[0]);
      }
    } catch (error) {
      console.error('Failed to load ICP profiles:', error);
      toast.error('Failed to load ICP profiles');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (profileId) => {
    try {
      const updatedProfiles = profiles.map(p =>
        p.id === profileId ? { ...p, active: !p.active } : p
      );
      setProfiles(updatedProfiles);

      if (selectedProfile?.id === profileId) {
        setSelectedProfile({ ...selectedProfile, active: !selectedProfile.active });
      }

      toast.success(`Profile ${updatedProfiles.find(p => p.id === profileId).active ? 'activated' : 'deactivated'}`);

      // TODO: Call API to persist change
      // await api.updateICPProfile(profileId, { active: !profile.active });
    } catch (error) {
      toast.error('Failed to update profile');
    }
  };

  const handleTestScore = async (profile) => {
    try {
      toast.loading('Running ICP scoring test...', { id: 'test-score' });

      // TODO: Call actual API
      // const result = await api.testICPScore(profile.id);

      // Mock result
      setTimeout(() => {
        toast.success(
          `Test Score: 0.82 (Auto-approve threshold: ${profile.scoring.autoApprove})`,
          { id: 'test-score', duration: 5000 }
        );
      }, 1500);
    } catch (error) {
      toast.error('Test failed', { id: 'test-score' });
    }
  };

  const handleDiscoverLeads = async (profile) => {
    try {
      toast.loading(`Discovering leads for ${profile.name}...`, { id: 'discover' });

      // TODO: Call actual discovery API
      // const result = await api.discoverLeadsByICP(profile.id, { count: 50 });

      setTimeout(() => {
        toast.success('Found 23 new prospects matching ICP criteria', { id: 'discover', duration: 5000 });
      }, 2000);
    } catch (error) {
      toast.error('Discovery failed', { id: 'discover' });
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return `$${(num / 1000000).toFixed(0)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(0)}K`;
    return `$${num}`;
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-900">
        <div className="text-slate-400">Loading ICP profiles...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex bg-slate-900">
      {/* Profile List Sidebar */}
      <div className="w-80 border-r border-slate-700 overflow-y-auto">
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">ICP Profiles</h2>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg font-medium transition-colors"
            >
              + New
            </button>
          </div>
          <p className="text-sm text-slate-400">
            {profiles.filter(p => p.active).length} active of {profiles.length} total
          </p>
        </div>

        <div className="divide-y divide-slate-700">
          {profiles.map((profile) => (
            <div
              key={profile.id}
              onClick={() => setSelectedProfile(profile)}
              className={`p-4 cursor-pointer transition-colors ${
                selectedProfile?.id === profile.id
                  ? 'bg-slate-800 border-l-4 border-blue-500'
                  : 'hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-white mb-1">
                    {profile.name}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2">
                    {profile.description}
                  </p>
                </div>
                <span className={`ml-2 flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${
                  profile.active
                    ? 'bg-green-900/30 text-green-400'
                    : 'bg-slate-700 text-slate-400'
                }`}>
                  {profile.active ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="flex items-center gap-4 mt-3">
                <div className="text-xs">
                  <span className="text-slate-500">Discovered:</span>{' '}
                  <span className="text-white font-medium">{profile.stats.discovered}</span>
                </div>
                <div className="text-xs">
                  <span className="text-slate-500">Enrolled:</span>{' '}
                  <span className="text-white font-medium">{profile.stats.enrolled}</span>
                </div>
              </div>

              <div className="mt-2">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                  profile.tier === 'core'
                    ? 'bg-purple-900/30 text-purple-400'
                    : 'bg-blue-900/30 text-blue-400'
                }`}>
                  {profile.tier}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Profile Details */}
      {selectedProfile ? (
        <div className="flex-1 overflow-y-auto">
          <div className="p-8">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">
                    {selectedProfile.name}
                  </h1>
                  <p className="text-slate-400">{selectedProfile.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleTestScore(selectedProfile)}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                  >
                    Test Score
                  </button>
                  <button
                    onClick={() => handleDiscoverLeads(selectedProfile)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Discover Leads
                  </button>
                  <button
                    onClick={() => handleToggleActive(selectedProfile.id)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      selectedProfile.active
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                  >
                    {selectedProfile.active ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                  <div className="text-2xl font-bold text-white mb-1">
                    {selectedProfile.stats.discovered}
                  </div>
                  <div className="text-sm text-slate-400">Discovered</div>
                </div>
                <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                  <div className="text-2xl font-bold text-white mb-1">
                    {selectedProfile.stats.enriched}
                  </div>
                  <div className="text-sm text-slate-400">Enriched</div>
                </div>
                <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                  <div className="text-2xl font-bold text-white mb-1">
                    {selectedProfile.stats.enrolled}
                  </div>
                  <div className="text-sm text-slate-400">Enrolled</div>
                </div>
                <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                  <div className="text-2xl font-bold text-white mb-1">
                    {selectedProfile.stats.avgScore > 0
                      ? (selectedProfile.stats.avgScore * 100).toFixed(0) + '%'
                      : '-'}
                  </div>
                  <div className="text-sm text-slate-400">Avg Score</div>
                </div>
              </div>
            </div>

            {/* Profile Details */}
            <div className="space-y-6">
              {/* Firmographics */}
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <h3 className="text-lg font-semibold text-white mb-4">Firmographic Criteria</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">
                      Company Size
                    </label>
                    <div className="text-white">
                      {selectedProfile.firmographics.companySize.min.toLocaleString()} -{' '}
                      {selectedProfile.firmographics.companySize.max.toLocaleString()} employees
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">
                      Revenue Range
                    </label>
                    <div className="text-white">
                      {formatNumber(selectedProfile.firmographics.revenue.min)} -{' '}
                      {formatNumber(selectedProfile.firmographics.revenue.max)}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">
                      Target Industries
                    </label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedProfile.firmographics.industries.slice(0, 4).map((industry, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-blue-900/30 text-blue-400 rounded text-xs"
                        >
                          {industry}
                        </span>
                      ))}
                      {selectedProfile.firmographics.industries.length > 4 && (
                        <span className="px-2 py-1 bg-slate-700 text-slate-400 rounded text-xs">
                          +{selectedProfile.firmographics.industries.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">
                      Target Geographies
                    </label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedProfile.firmographics.geographies.slice(0, 3).map((geo, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-green-900/30 text-green-400 rounded text-xs"
                        >
                          {geo}
                        </span>
                      ))}
                      {selectedProfile.firmographics.geographies.length > 3 && (
                        <span className="px-2 py-1 bg-slate-700 text-slate-400 rounded text-xs">
                          +{selectedProfile.firmographics.geographies.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Target Titles */}
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <h3 className="text-lg font-semibold text-white mb-4">Target Titles</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">
                      Primary Titles
                    </label>
                    <div className="space-y-1">
                      {selectedProfile.titles.primary.map((title, idx) => (
                        <div key={idx} className="text-sm text-white">
                          • {title}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">
                      Secondary Titles
                    </label>
                    <div className="space-y-1">
                      {selectedProfile.titles.secondary.map((title, idx) => (
                        <div key={idx} className="text-sm text-slate-300">
                          • {title}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Scoring Thresholds */}
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <h3 className="text-lg font-semibold text-white mb-4">Scoring Thresholds</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-white">Auto-Approve</div>
                      <div className="text-xs text-slate-400">
                        Automatically enroll in outreach
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-green-400">
                      {(selectedProfile.scoring.autoApprove * 100).toFixed(0)}%
                    </div>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${selectedProfile.scoring.autoApprove * 100}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-white">Review Required</div>
                      <div className="text-xs text-slate-400">Queue for manual review</div>
                    </div>
                    <div className="text-2xl font-bold text-amber-400">
                      {(selectedProfile.scoring.reviewRequired * 100).toFixed(0)}%
                    </div>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div
                      className="bg-amber-500 h-2 rounded-full"
                      style={{ width: `${selectedProfile.scoring.reviewRequired * 100}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-white">Disqualify</div>
                      <div className="text-xs text-slate-400">Below this score = exclude</div>
                    </div>
                    <div className="text-2xl font-bold text-red-400">
                      {(selectedProfile.scoring.disqualify * 100).toFixed(0)}%
                    </div>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div
                      className="bg-red-500 h-2 rounded-full"
                      style={{ width: `${selectedProfile.scoring.disqualify * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Composite Scoring Formula */}
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <h3 className="text-lg font-semibold text-white mb-4">Scoring Algorithm</h3>
                <div className="bg-slate-900 rounded-lg p-4 font-mono text-sm text-slate-300">
                  Score = (Fit × 0.35) + (Intent × 0.35) + (Reachability × 0.20) + (Freshness × 0.10)
                </div>
                <div className="mt-4 grid grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400">35%</div>
                    <div className="text-xs text-slate-400 mt-1">Fit Score</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-400">35%</div>
                    <div className="text-xs text-slate-400 mt-1">Intent Score</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">20%</div>
                    <div className="text-xs text-slate-400 mt-1">Reachability</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-amber-400">10%</div>
                    <div className="text-xs text-slate-400 mt-1">Freshness</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <svg className="mx-auto h-12 w-12 text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="text-lg font-medium text-white mb-2">No profile selected</h3>
            <p className="text-slate-400">Select an ICP profile from the sidebar</p>
          </div>
        </div>
      )}

      {/* Create Profile Modal (Placeholder) */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 max-w-2xl w-full mx-4 border border-slate-700">
            <h2 className="text-2xl font-bold text-white mb-4">Create New ICP Profile</h2>
            <p className="text-slate-400 mb-6">
              ICP profile creation interface coming soon. For now, edit profiles in the YAML configuration file.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ICPPage;
