import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import api from '../../services/api';

/**
 * Video Quota Display Component
 * Shows HeyGen video credits usage and remaining quota
 */
export default function VideoQuotaDisplay({ refreshInterval = 300000 }) {
  const [quota, setQuota] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load quota on mount and optionally refresh
  useEffect(() => {
    loadQuota();

    // Set up auto-refresh if interval > 0
    if (refreshInterval > 0) {
      const interval = setInterval(loadQuota, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval]);

  const loadQuota = async () => {
    try {
      setError(null);
      const response = await api.getHeyGenQuota();
      setQuota(response.data || response);
    } catch (err) {
      console.error('Failed to load HeyGen quota:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Calculate usage percentage
  const getUsagePercentage = () => {
    if (!quota || quota.total <= 0) return 0;
    return Math.round((quota.used / quota.total) * 100);
  };

  // Get color based on usage
  const getUsageColor = () => {
    const percentage = getUsagePercentage();
    if (percentage >= 90) return 'red';
    if (percentage >= 70) return 'amber';
    return 'green';
  };

  // Format reset date
  const formatResetDate = (dateStr) => {
    if (!dateStr) return 'Unknown';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-400 text-sm">
        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-amber-500"></div>
        Loading quota...
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center gap-2 text-red-400 text-sm">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        Failed to load quota
        <button
          onClick={loadQuota}
          className="text-amber-400 hover:text-amber-300 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  // Unknown quota state (API doesn't return quota info)
  if (!quota || quota.remaining === -1) {
    return (
      <div className="flex items-center gap-2 text-slate-400 text-sm">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Quota info unavailable
      </div>
    );
  }

  const usagePercentage = getUsagePercentage();
  const usageColor = getUsageColor();

  const colorClasses = {
    green: {
      text: 'text-green-400',
      bg: 'bg-green-500',
      bgLight: 'bg-green-500/20'
    },
    amber: {
      text: 'text-amber-400',
      bg: 'bg-amber-500',
      bgLight: 'bg-amber-500/20'
    },
    red: {
      text: 'text-red-400',
      bg: 'bg-red-500',
      bgLight: 'bg-red-500/20'
    }
  };

  const colors = colorClasses[usageColor];

  return (
    <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <span className="text-sm font-medium text-white">HeyGen Video Credits</span>
        </div>
        <button
          onClick={loadQuota}
          className="p-1 text-slate-400 hover:text-white transition-colors"
          title="Refresh quota"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Progress bar */}
      <div className={`h-2 rounded-full ${colors.bgLight} mb-2`}>
        <div
          className={`h-full rounded-full ${colors.bg} transition-all duration-300`}
          style={{ width: `${usagePercentage}%` }}
        />
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-sm">
        <div className="text-slate-400">
          <span className={colors.text}>{quota.used}</span>
          <span> / {quota.total} used</span>
        </div>
        <div className="text-slate-500">
          {quota.remaining} remaining
        </div>
      </div>

      {/* Reset date */}
      {quota.resetsAt && (
        <div className="mt-2 text-xs text-slate-500">
          Resets: {formatResetDate(quota.resetsAt)}
        </div>
      )}

      {/* Warning for low quota */}
      {usagePercentage >= 90 && (
        <div className="mt-3 p-2 bg-red-900/20 border border-red-500/30 rounded text-xs text-red-400">
          <div className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="font-medium">Low credits!</span>
          </div>
          <span className="ml-5">Consider upgrading your HeyGen plan to continue generating videos.</span>
        </div>
      )}
    </div>
  );
}

VideoQuotaDisplay.propTypes = {
  refreshInterval: PropTypes.number // Refresh interval in ms, 0 to disable
};
