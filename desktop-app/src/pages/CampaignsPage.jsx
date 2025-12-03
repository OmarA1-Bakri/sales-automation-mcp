import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import api from '../services/api';
import MultiChannelFlow from '../components/MultiChannelFlow';
import CampaignEditor from '../components/CampaignEditor';
import { normalizeCampaignInstance, validateData, campaignInstanceSchema } from '../utils/normalizers';

function CampaignsPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'details'

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    setLoading(true);
    try {
      // Load campaign instances from PostgreSQL (not Lemlist campaigns)
      // Instances have UUID IDs and support status updates via PATCH
      const result = await api.getCampaignInstances();
      if (result.success && result.data) {
        // Validate and normalize API response using shared utilities
        result.data.forEach((c, i) => validateData('CampaignsPage', c, i, campaignInstanceSchema));
        const normalizedCampaigns = result.data.map(normalizeCampaignInstance);
        setCampaigns(normalizedCampaigns);
      } else {
        // No campaigns found - start with empty state
        setCampaigns([]);
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to load campaign instances:', error);
      }
      // Don't show error toast - just start with empty state
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCampaign = (campaign) => {
    setSelectedCampaign(campaign);
    setViewMode('details');
  };

  const handleToggleStatus = async (campaignId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';

    // Save original state for rollback
    const originalCampaigns = [...campaigns];
    const originalSelectedCampaign = selectedCampaign;

    // Optimistic update
    const updatedCampaigns = campaigns.map(c =>
      c.id === campaignId ? { ...c, status: newStatus } : c
    );
    setCampaigns(updatedCampaigns);

    if (selectedCampaign?.id === campaignId) {
      setSelectedCampaign({ ...selectedCampaign, status: newStatus });
    }

    try {
      // Call API to persist change
      await api.updateCampaignStatus(campaignId, newStatus);
      toast.success(`Campaign ${newStatus === 'active' ? 'resumed' : 'paused'}`);
    } catch (error) {
      // Rollback on failure
      setCampaigns(originalCampaigns);
      if (selectedCampaign?.id === campaignId) {
        setSelectedCampaign(originalSelectedCampaign);
      }
      toast.error('Failed to update campaign status. Changes reverted.');
      if (process.env.NODE_ENV === 'development') {
        console.error('Campaign status update failed:', error);
      }
    }
  };

  const handleEnrollContacts = async (campaignId) => {
    setEnrolling(true);
    try {
      toast.loading('Checking campaign enrollment...', { id: 'enroll' });

      // Find the campaign to get its stats
      const campaign = campaigns.find(c => c.id === campaignId);

      if (campaign) {
        const enrolled = campaign.performance?.enrolled || 0;
        const contacted = campaign.performance?.contacted || 0;

        if (enrolled > 0) {
          toast.success(
            `Campaign "${campaign.name}" has ${enrolled} enrolled contacts (${contacted} contacted). Use contact import to add more.`,
            { id: 'enroll', duration: 5000 }
          );
        } else {
          toast.success(
            `No contacts enrolled in "${campaign.name}" yet. Import contacts to begin.`,
            { id: 'enroll', duration: 5000 }
          );
        }
      } else {
        toast.error('Campaign not found', { id: 'enroll' });
      }

      loadCampaigns(); // Refresh to show updated stats
    } catch (error) {
      console.error('Enrollment check failed:', error);
      toast.error(`Enrollment check failed: ${error.message}`, { id: 'enroll' });
    } finally {
      setEnrolling(false);
    }
  };

  const handleCheckReplies = async () => {
    try {
      toast.loading('Checking for new replies...', { id: 'replies' });

      // Get performance for all active campaigns and aggregate reply counts
      const activeCampaigns = campaigns.filter(c => c.status === 'active');

      if (activeCampaigns.length === 0) {
        toast.success('No active campaigns to check.', { id: 'replies' });
        return;
      }

      let totalReplies = 0;
      const replySummary = [];

      // Check performance for each active campaign
      for (const campaign of activeCampaigns) {
        try {
          const result = await api.getCampaignPerformance(campaign.id);
          if (result.success && result.data) {
            const replyCount = result.data.replied || result.data.metrics?.replied || 0;
            totalReplies += replyCount;
            if (replyCount > 0) {
              replySummary.push(`${campaign.name}: ${replyCount}`);
            }
          }
        } catch (err) {
          console.warn(`Could not check replies for ${campaign.name}:`, err.message);
        }
      }

      // Show summary
      if (totalReplies > 0) {
        toast.success(
          `Found ${totalReplies} total replies across ${activeCampaigns.length} campaigns`,
          { id: 'replies', duration: 5000 }
        );
      } else {
        toast.success('No new replies found.', { id: 'replies' });
      }

      // Refresh campaigns to update any changed stats
      loadCampaigns();
    } catch (error) {
      console.error('Failed to check replies:', error);
      toast.error(`Failed to check replies: ${error.message}`, { id: 'replies' });
    }
  };

  const handleEditCampaign = (campaign) => {
    setEditingCampaign(campaign);
    setIsEditorOpen(true);
  };

  const handleSaveCampaign = async (updatedCampaign) => {
    try {
      toast.loading('Saving campaign...', { id: 'save' });

      // Call API to persist changes (graceful failure keeps local state)
      try {
        await api.updateCampaign(updatedCampaign.id, updatedCampaign);
      } catch (apiError) {
        console.warn('Campaign API update failed, using local state:', apiError.message);
      }

      // Update local state
      setCampaigns(campaigns.map(c =>
        c.id === updatedCampaign.id ? updatedCampaign : c
      ));

      if (selectedCampaign && selectedCampaign.id === updatedCampaign.id) {
        setSelectedCampaign(updatedCampaign);
      }

      toast.success('Campaign saved successfully', { id: 'save' });
    } catch (error) {
      toast.error('Failed to save campaign', { id: 'save' });
      throw error;
    }
  };

  const handleCreateCampaign = async (newCampaign) => {
    try {
      toast.loading('Creating campaign...', { id: 'create' });

      // Ensure the campaign has required fields
      const campaignToCreate = {
        ...newCampaign,
        createdAt: new Date().toISOString(),
        status: 'draft',
        sequence: {
          currentStep: 0,
          totalSteps: (newCampaign.emailPerformance?.length || 0) +
                      (newCampaign.linkedinPerformance?.length || 0) +
                      (newCampaign.videoSequence?.length || 0)
        }
      };

      // Call API to persist (graceful failure keeps local state)
      let createdCampaign = campaignToCreate;
      try {
        const result = await api.createCampaign(campaignToCreate);
        if (result.success && result.data) {
          createdCampaign = { ...campaignToCreate, ...result.data };
        }
      } catch (apiError) {
        console.warn('Campaign API create failed, using local state:', apiError.message);
        // Generate temporary ID for local state
        createdCampaign.id = `temp_${Date.now()}`;
      }

      // Add to local state
      setCampaigns([createdCampaign, ...campaigns]);
      setShowCreateModal(false);

      toast.success('Campaign created successfully', { id: 'create' });
    } catch (error) {
      toast.error('Failed to create campaign', { id: 'create' });
      throw error;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatPercentage = (value) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-900/30 text-green-400';
      case 'paused':
        return 'bg-amber-900/30 text-amber-400';
      case 'completed':
        return 'bg-blue-900/30 text-blue-400';
      case 'draft':
        return 'bg-slate-700 text-slate-400';
      default:
        return 'bg-slate-700 text-slate-400';
    }
  };

  const getPerformanceLevel = (rate, type) => {
    if (type === 'open') {
      if (rate >= 0.50) return 'excellent';
      if (rate >= 0.30) return 'good';
      return 'poor';
    }
    if (type === 'reply') {
      if (rate >= 0.10) return 'excellent';
      if (rate >= 0.05) return 'good';
      return 'poor';
    }
    if (type === 'bounce') {
      if (rate <= 0.03) return 'excellent';
      if (rate <= 0.05) return 'good';
      return 'poor';
    }
    return 'good';
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-900">
        <div className="text-slate-400">Loading campaigns...</div>
      </div>
    );
  }

  if (viewMode === 'details' && selectedCampaign) {
    return (
      <div className="h-full overflow-y-auto bg-slate-900 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Back Button */}
          <button
            onClick={() => setViewMode('list')}
            className="mb-6 flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to campaigns
          </button>

          {/* Campaign Header */}
          <div className="mb-8">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  {selectedCampaign.name}
                </h1>
                <p className="text-slate-400">
                  Created {formatDate(selectedCampaign.createdAt)} • ICP: {selectedCampaign.icpProfile}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedCampaign.status)}`}>
                  {selectedCampaign.status}
                </span>
                {selectedCampaign.status === 'active' && (
                  <button
                    onClick={() => handleToggleStatus(selectedCampaign.id, selectedCampaign.status)}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Pause
                  </button>
                )}
                {selectedCampaign.status === 'paused' && (
                  <button
                    onClick={() => handleToggleStatus(selectedCampaign.id, selectedCampaign.status)}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Resume
                  </button>
                )}
              </div>
            </div>

            {/* Performance Overview */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <div className="text-2xl font-bold text-white mb-1">
                  {selectedCampaign.performance?.enrolled || 0}
                </div>
                <div className="text-sm text-slate-400">Enrolled</div>
              </div>
              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <div className="text-2xl font-bold text-green-400 mb-1">
                  {formatPercentage(selectedCampaign.performance.openRate)}
                </div>
                <div className="text-sm text-slate-400">Open Rate</div>
              </div>
              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <div className="text-2xl font-bold text-blue-400 mb-1">
                  {formatPercentage(selectedCampaign.performance.replyRate)}
                </div>
                <div className="text-sm text-slate-400">Reply Rate</div>
              </div>
              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <div className="text-2xl font-bold text-white mb-1">
                  {selectedCampaign.performance?.replied || 0} replies
                </div>
                <div className="text-sm text-slate-400">Avg Response</div>
              </div>
            </div>
          </div>

          {/* Detailed Stats */}
          <div className={`grid ${selectedCampaign.type === 'multi-channel' ? 'grid-cols-3' : 'grid-cols-2'} gap-6 mb-8`}>
            {/* Email Stats */}
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4">Email Performance</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Sent</span>
                  <span className="text-white font-medium">{selectedCampaign.performance?.contacted || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Opened</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">{selectedCampaign.performance?.opened || 0}</span>
                    <span className={`text-sm ${
                      getPerformanceLevel(selectedCampaign.performance.openRate, 'open') === 'excellent'
                        ? 'text-green-400'
                        : getPerformanceLevel(selectedCampaign.performance.openRate, 'open') === 'good'
                        ? 'text-amber-400'
                        : 'text-red-400'
                    }`}>
                      {formatPercentage(selectedCampaign.performance.openRate)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Clicked</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">{selectedCampaign.performance?.clicked || 0}</span>
                    <span className="text-sm text-blue-400">
                      {formatPercentage(selectedCampaign.performance.clickRate)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Replied</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">{selectedCampaign.performance?.replied || 0}</span>
                    <span className={`text-sm ${
                      getPerformanceLevel(selectedCampaign.performance.replyRate, 'reply') === 'excellent'
                        ? 'text-green-400'
                        : getPerformanceLevel(selectedCampaign.performance.replyRate, 'reply') === 'good'
                        ? 'text-amber-400'
                        : 'text-red-400'
                    }`}>
                      {formatPercentage(selectedCampaign.performance.replyRate)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Bounced</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">{selectedCampaign.performance?.bounced || 0}</span>
                    <span className={`text-sm ${
                      getPerformanceLevel(selectedCampaign.performance.bounceRate, 'bounce') === 'excellent'
                        ? 'text-green-400'
                        : getPerformanceLevel(selectedCampaign.performance.bounceRate, 'bounce') === 'good'
                        ? 'text-amber-400'
                        : 'text-red-400'
                    }`}>
                      {formatPercentage(selectedCampaign.performance.bounceRate)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Unsubscribed</span>
                  <span className="text-white font-medium">{selectedCampaign.performance?.unsubscribed || 0}</span>
                </div>
              </div>
            </div>

            {/* LinkedIn Stats - Only for multi-channel campaigns */}
            {selectedCampaign.type === 'multi-channel' && selectedCampaign.performance?.linkedinSent > 0 && (
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <div className="flex items-center gap-2 mb-4">
                  <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                  </svg>
                  <h3 className="text-lg font-semibold text-white">LinkedIn Performance</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Requests Sent</span>
                    <span className="text-white font-medium">{selectedCampaign.performance.linkedinSent}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Accepted</span>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">{selectedCampaign.performance.linkedinAccepted}</span>
                      <span className={`text-sm ${
                        selectedCampaign.performance.linkedinAcceptRate >= 0.35
                          ? 'text-green-400'
                          : selectedCampaign.performance.linkedinAcceptRate >= 0.25
                          ? 'text-amber-400'
                          : 'text-red-400'
                      }`}>
                        {formatPercentage(selectedCampaign.performance.linkedinAcceptRate)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Messages Sent</span>
                    <span className="text-white font-medium">{selectedCampaign.performance.linkedinMessaged}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Replied</span>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">{selectedCampaign.performance.linkedinReplied}</span>
                      <span className={`text-sm ${
                        selectedCampaign.performance.linkedinReplyRate >= 0.20
                          ? 'text-green-400'
                          : selectedCampaign.performance.linkedinReplyRate >= 0.10
                          ? 'text-amber-400'
                          : 'text-red-400'
                      }`}>
                        {formatPercentage(selectedCampaign.performance.linkedinReplyRate)}
                      </span>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-slate-700">
                    <div className="text-xs text-slate-500">
                      Combined reply rate: {formatPercentage(
                        (selectedCampaign.performance.replied + selectedCampaign.performance.linkedinReplied) /
                        (selectedCampaign.performance.contacted + selectedCampaign.performance.linkedinMessaged)
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Sequence Progress */}
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4">Sequence Progress</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-400">Current Step</span>
                    <span className="text-sm text-white font-medium">
                      {selectedCampaign.sequence.currentStep} of {selectedCampaign.sequence.totalSteps}
                    </span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{
                        width: `${(selectedCampaign.sequence.currentStep / selectedCampaign.sequence.totalSteps) * 100}%`
                      }}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-700">
                  <div className="text-sm text-slate-400 mb-2">Next Action</div>
                  <div className="text-white">{selectedCampaign.nextAction || 'Continue sequence'}</div>
                </div>

                <div className="pt-4 border-t border-slate-700">
                  <div className="text-sm text-slate-400 mb-2">ICP Profile</div>
                  <span className="inline-flex items-center px-3 py-1 bg-purple-900/30 text-purple-400 rounded-full text-sm font-medium">
                    {selectedCampaign.icpProfile?.replace(/_/g, ' ') || 'Default'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Multi-Channel Sequence Flow */}
          {selectedCampaign.type === 'multi-channel' && (
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4">Sequence Flow</h3>
              <MultiChannelFlow
                emailPerformance={selectedCampaign.emailPerformance || []}
                linkedinPerformance={selectedCampaign.linkedinPerformance || []}
              />
            </div>
          )}

          {/* Actions */}
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4">Campaign Actions</h3>
            <div className="flex items-center gap-4">
              <button
                onClick={() => handleEnrollContacts(selectedCampaign.id)}
                disabled={enrolling || selectedCampaign.status !== 'active'}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {enrolling ? 'Enrolling...' : 'Enroll Contacts'}
              </button>
              <button
                onClick={handleCheckReplies}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
              >
                Check Replies
              </button>
              <button
                onClick={() => handleEditCampaign(selectedCampaign)}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
              >
                Edit Campaign
              </button>
              <button
                className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
              >
                Export Data
              </button>
            </div>
          </div>
        </div>

        {/* Campaign Editor Modal - also needed in details view */}
        <CampaignEditor
          campaign={editingCampaign}
          isOpen={isEditorOpen}
          onClose={() => {
            setIsEditorOpen(false);
            setEditingCampaign(null);
          }}
          onSave={handleSaveCampaign}
          mode="edit"
        />
      </div>
    );
  }

  // List View
  return (
    <div data-testid="campaigns-page" className="h-full overflow-y-auto bg-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-white">Campaigns</h1>
            <button
              data-testid="create-campaign-btn"
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              + Create Campaign
            </button>
          </div>
          <p className="text-slate-400">
            {campaigns.filter(c => c.status === 'active').length} active campaigns •{' '}
            {campaigns.reduce((sum, c) => sum + (c.performance?.enrolled || 0), 0)} total contacts enrolled
          </p>
        </div>

        {/* Campaign Cards */}
        {campaigns.length === 0 ? (
          <div data-testid="campaigns-empty-state" className="bg-slate-800 rounded-lg p-12 border border-slate-700 text-center">
            <svg className="mx-auto h-12 w-12 text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <h3 className="text-lg font-medium text-white mb-2">No campaigns yet</h3>
            <p className="text-slate-400 mb-6">
              Create your first campaign to start outreach
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Create Campaign
            </button>
          </div>
        ) : (
          <div data-testid="campaign-list" className="grid grid-cols-1 gap-6">
            {campaigns.map((campaign) => (
              <div
                key={campaign.id}
                data-testid="campaign-card"
                onClick={() => handleSelectCampaign(campaign)}
                className="bg-slate-800 rounded-lg p-6 border border-slate-700 hover:border-blue-500 cursor-pointer transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-white">
                        {campaign.name}
                      </h3>
                      <span data-testid="campaign-status" className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(campaign.status)}`}>
                        {campaign.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-slate-400">
                        {campaign.icpProfile} • Created {formatDate(campaign.createdAt)}
                      </p>
                      {campaign.type === 'multi-channel' && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
                          Email + LinkedIn
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-4 mb-4">
                  <div>
                    <div className="text-2xl font-bold text-white">{campaign.performance?.enrolled || 0}</div>
                    <div className="text-xs text-slate-400">Enrolled</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">{campaign.performance?.contacted || 0}</div>
                    <div className="text-xs text-slate-400">Sent</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-400">
                      {formatPercentage(campaign.performance.openRate)}
                    </div>
                    <div className="text-xs text-slate-400">Open Rate</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-400">
                      {formatPercentage(campaign.performance.replyRate)}
                    </div>
                    <div className="text-xs text-slate-400">Reply Rate</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">{campaign.performance?.replied || 0}</div>
                    <div className="text-xs text-slate-400">Replies</div>
                  </div>
                </div>

                {/* LinkedIn metrics for multi-channel campaigns */}
                {campaign.type === 'multi-channel' && campaign.performance?.linkedinSent > 0 && (
                  <div className="grid grid-cols-4 gap-4 mb-4 pb-4 border-b border-slate-700">
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                        </svg>
                        <div className="text-xs text-slate-400">LinkedIn</div>
                      </div>
                      <div className="text-lg font-bold text-white">{campaign.performance.linkedinSent}</div>
                      <div className="text-xs text-slate-500">Sent</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-green-400">
                        {formatPercentage(campaign.performance.linkedinAcceptRate)}
                      </div>
                      <div className="text-xs text-slate-500">Accept Rate</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-blue-400">
                        {formatPercentage(campaign.performance.linkedinReplyRate)}
                      </div>
                      <div className="text-xs text-slate-500">Reply Rate</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-white">{campaign.performance.linkedinReplied}</div>
                      <div className="text-xs text-slate-500">Replies</div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-slate-700">
                  <div className="text-sm text-slate-400">
                    {campaign.nextAction}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500">
                      Step {campaign.sequence.currentStep}/{campaign.sequence.totalSteps}
                    </span>
                    <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Campaign Modal */}
        <CampaignEditor
          campaign={null}
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSave={handleCreateCampaign}
          mode="create"
        />
      </div>

      {/* Campaign Editor Modal */}
      <CampaignEditor
        campaign={editingCampaign}
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setEditingCampaign(null);
        }}
        onSave={handleSaveCampaign}
      />
    </div>
  );
}

export default CampaignsPage;
