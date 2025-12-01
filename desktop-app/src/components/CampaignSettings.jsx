import PropTypes from 'prop-types';

/**
 * Campaign Settings Editor
 * Allows editing campaign name, ICP profile, and other settings
 */
export default function CampaignSettings({ campaign, onChange }) {
  const handleChange = (field, value) => {
    onChange({ [field]: value });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Campaign Settings</h3>
        <p className="text-sm text-slate-400 mb-6">
          Configure campaign name, ICP profile, and automation settings
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Campaign Name
          </label>
          <input
            type="text"
            value={campaign.name || ''}
            onChange={(e) => handleChange('name', e.target.value)}
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., PSP Treasury Q1 2025"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Campaign Type
          </label>
          <select
            value={campaign.type || 'email'}
            onChange={(e) => handleChange('type', e.target.value)}
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="email">Email Only</option>
            <option value="multi-channel">Email + LinkedIn</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            ICP Profile
          </label>
          <input
            type="text"
            value={campaign.icpProfile || ''}
            onChange={(e) => handleChange('icpProfile', e.target.value)}
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., icp_rtgs_psp_treasury"
          />
          <p className="text-xs text-slate-500 mt-1">
            Target ICP profile for this campaign
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Status
          </label>
          <select
            value={campaign.status}
            onChange={(e) => handleChange('status', e.target.value)}
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      <div className="border-t border-slate-700 pt-6">
        <h4 className="text-md font-semibold text-white mb-4">Automation Settings</h4>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-slate-700 rounded-lg">
            <div>
              <div className="text-sm font-medium text-white">Auto-enroll new contacts</div>
              <div className="text-xs text-slate-400 mt-1">
                Automatically enroll contacts when they match ICP criteria
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={campaign.autoEnroll || false}
                onChange={(e) => handleChange('autoEnroll', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-700 rounded-lg">
            <div>
              <div className="text-sm font-medium text-white">Auto-respond to replies</div>
              <div className="text-xs text-slate-400 mt-1">
                Send automated responses based on reply sentiment
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={campaign.autoRespond || false}
                onChange={(e) => handleChange('autoRespond', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-700 rounded-lg">
            <div>
              <div className="text-sm font-medium text-white">Pause on high bounce rate</div>
              <div className="text-xs text-slate-400 mt-1">
                Automatically pause campaign if bounce rate exceeds 5%
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={campaign.autoPauseOnBounce || true}
                onChange={(e) => handleChange('autoPauseOnBounce', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-700 pt-6">
        <h4 className="text-md font-semibold text-white mb-4">Daily Limits</h4>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Max emails per day
            </label>
            <input
              type="number"
              min="0"
              max="500"
              value={campaign.maxEmailsPerDay || 100}
              onChange={(e) => handleChange('maxEmailsPerDay', parseInt(e.target.value) || 0)}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-slate-500 mt-1">
              Recommended: 100-200 for warm domains
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Max LinkedIn requests per day
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={campaign.maxLinkedInPerDay || 30}
              onChange={(e) => handleChange('maxLinkedInPerDay', parseInt(e.target.value) || 0)}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-slate-500 mt-1">
              Recommended: 20-30 to avoid restrictions
            </p>
          </div>
        </div>
      </div>

      <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="text-sm text-amber-300">
            <div className="font-medium mb-1">Important</div>
            <div className="text-amber-400 text-xs">
              Changes to campaign settings will take effect immediately. Active sequences may be affected. Consider pausing the campaign before making major changes.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

CampaignSettings.propTypes = {
  campaign: PropTypes.shape({
    name: PropTypes.string,
    type: PropTypes.string,
    icpProfile: PropTypes.string,
    status: PropTypes.string,
    autoEnroll: PropTypes.bool,
    autoRespond: PropTypes.bool,
    autoPauseOnBounce: PropTypes.bool,
    maxEmailsPerDay: PropTypes.number,
    maxLinkedInPerDay: PropTypes.number
  }).isRequired,
  onChange: PropTypes.func.isRequired
};
