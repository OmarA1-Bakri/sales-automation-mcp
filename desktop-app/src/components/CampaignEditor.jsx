import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import EmailSequenceEditor from './EmailSequenceEditor';
import LinkedInSequenceEditor from './LinkedInSequenceEditor';
import VideoSequenceEditor from './VideoSequenceEditor';
import CampaignSettings from './CampaignSettings';

// Default template for new campaigns
const newCampaignTemplate = {
  id: null,
  name: '',
  status: 'draft',
  type: 'email',
  icpProfile: '',
  emailPerformance: [],
  linkedinPerformance: [],
  videoSequence: [],
  sequence: { currentStep: 0, totalSteps: 0 },
  performance: {
    enrolled: 0,
    contacted: 0,
    opened: 0,
    clicked: 0,
    replied: 0,
    bounced: 0,
    unsubscribed: 0,
    openRate: 0,
    clickRate: 0,
    replyRate: 0,
    bounceRate: 0
  }
};

/**
 * Campaign Template Editor
 * Modal for creating/editing campaign templates, email sequences, LinkedIn sequences, and settings
 */
export default function CampaignEditor({ campaign, isOpen, onClose, onSave, mode = 'edit' }) {
  const [activeTab, setActiveTab] = useState('settings'); // Start with settings for new campaigns
  const [editedCampaign, setEditedCampaign] = useState(campaign || newCampaignTemplate);
  const [saving, setSaving] = useState(false);

  const isCreateMode = mode === 'create' || !campaign;

  // Sync state when campaign prop changes
  useEffect(() => {
    if (campaign) {
      setEditedCampaign(campaign);
      setActiveTab('email');
    } else if (isCreateMode) {
      setEditedCampaign({ ...newCampaignTemplate, id: `campaign-${Date.now()}` });
      setActiveTab('settings');
    }
  }, [campaign, isCreateMode]);

  if (!isOpen) return null;

  const tabs = [
    { id: 'email', name: 'Email Sequence', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
    { id: 'linkedin', name: 'LinkedIn Sequence', icon: 'M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z' },
    { id: 'video', name: 'Video Sequence', icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z', color: 'amber' },
    { id: 'settings', name: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' }
  ];

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(editedCampaign);
      setSaving(false);
      onClose();
    } catch (error) {
      console.error('Error saving campaign:', error);
      setSaving(false);
      // Don't close modal - let user retry
    }
  };

  const updateEmailSequence = (emailPerformance) => {
    setEditedCampaign({ ...editedCampaign, emailPerformance });
  };

  const updateLinkedInSequence = (linkedinPerformance) => {
    setEditedCampaign({ ...editedCampaign, linkedinPerformance });
  };

  const updateVideoSequence = (videoSequence) => {
    setEditedCampaign({ ...editedCampaign, videoSequence });
  };

  const updateSettings = (settings) => {
    setEditedCampaign({ ...editedCampaign, ...settings });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg w-full max-w-6xl max-h-[90vh] flex flex-col border border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div>
            <h2 className="text-2xl font-bold text-white">
              {isCreateMode ? 'Create New Campaign' : 'Edit Campaign'}
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              {isCreateMode ? 'Set up your campaign details and sequences' : editedCampaign.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-6 pt-4 border-b border-slate-700">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 rounded-t-lg font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <svg className="w-5 h-5" fill={tab.id === 'linkedin' ? 'currentColor' : 'none'} stroke={tab.id === 'linkedin' ? 'none' : 'currentColor'} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
              </svg>
              {tab.name}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'email' && (
            <EmailSequenceEditor
              emailSequence={editedCampaign.emailPerformance || []}
              onChange={updateEmailSequence}
            />
          )}
          {activeTab === 'linkedin' && (
            <LinkedInSequenceEditor
              linkedinSequence={editedCampaign.linkedinPerformance || []}
              onChange={updateLinkedInSequence}
            />
          )}
          {activeTab === 'video' && (
            <VideoSequenceEditor
              videoSequence={editedCampaign.videoSequence || []}
              onChange={updateVideoSequence}
            />
          )}
          {activeTab === 'settings' && (
            <CampaignSettings
              campaign={editedCampaign}
              onChange={updateSettings}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-slate-700">
          <button
            onClick={onClose}
            className="px-6 py-2 text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <div className="flex items-center gap-3">
            {!isCreateMode && (
              <button
                onClick={() => {
                  setEditedCampaign(campaign);
                }}
                className="px-6 py-2 text-slate-400 hover:text-white transition-colors"
              >
                Reset Changes
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving || (isCreateMode && !editedCampaign.name)}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : isCreateMode ? 'Create Campaign' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

CampaignEditor.propTypes = {
  campaign: PropTypes.object,
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  mode: PropTypes.oneOf(['create', 'edit'])
};
