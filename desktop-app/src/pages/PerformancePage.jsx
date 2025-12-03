import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  Mail,
  MessageSquare,
  Calendar,
  Target,
  CheckCircle,
  AlertTriangle,
  XCircle,
  BarChart2,
  Users,
  Activity,
  RefreshCw,
  Award,
  Zap,
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

/**
 * Performance Dashboard
 * Shows AI agent performance, template rankings, outreach quality metrics
 * Designed for sales team visibility into what's working
 */
function PerformancePage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState(null);
  const [templateRankings, setTemplateRankings] = useState([]);
  const [agentMetrics, setAgentMetrics] = useState([]);
  const [qualityStats, setQualityStats] = useState(null);

  useEffect(() => {
    loadPerformanceData();
  }, []);

  const loadPerformanceData = async () => {
    try {
      // Load all performance data in parallel
      const [summaryRes, templatesRes, agentsRes, qualityRes] = await Promise.all([
        api.call('/api/performance/summary', 'GET').catch(() => null),
        api.call('/api/performance/templates', 'GET').catch(() => null),
        api.call('/api/performance/agents', 'GET').catch(() => null),
        api.call('/api/performance/quality', 'GET').catch(() => null),
      ]);

      // Set real data from API responses
      if (summaryRes?.success) {
        setSummary(summaryRes.data.metrics);
      } else {
        console.warn('Failed to load summary data');
      }

      if (templatesRes?.success) {
        setTemplateRankings(templatesRes.data.templates || []);
      } else {
        console.warn('Failed to load template rankings');
      }

      if (agentsRes?.success) {
        setAgentMetrics(agentsRes.data.agents || []);
      } else {
        console.warn('Failed to load agent metrics');
      }

      if (qualityRes?.success) {
        setQualityStats(qualityRes.data.metrics || {});
      } else {
        console.warn('Failed to load quality stats');
      }

    } catch (error) {
      console.error('Failed to load performance data:', error);
      toast.error('Failed to load performance data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadPerformanceData();
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="spinner w-12 h-12 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading performance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="performance-page" className="h-full overflow-y-auto custom-scrollbar bg-slate-900 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <BarChart2 className="text-rtgs-blue" />
              Performance Dashboard
            </h1>
            <p className="text-slate-400 mt-1">
              AI agent metrics, template rankings, and outreach quality
            </p>
          </div>
          <button
            data-testid="refresh-performance-btn"
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn btn-secondary flex items-center gap-2"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Summary Stats */}
        <div data-testid="performance-stats" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            icon={<Mail className="text-blue-400" />}
            label="Emails Sent"
            value={summary?.total_sent || 0}
            subValue={`Last ${summary?.period_days || 7} days`}
          />
          <StatCard
            icon={<Target className="text-green-400" />}
            label="Open Rate"
            value={`${summary?.open_rate || 0}%`}
            subValue={`${summary?.total_opened || 0} opens`}
            trend={parseFloat(summary?.open_rate || 0) > 50 ? 'up' : 'down'}
          />
          <StatCard
            icon={<MessageSquare className="text-purple-400" />}
            label="Reply Rate"
            value={`${summary?.reply_rate || 0}%`}
            subValue={`${summary?.total_replied || 0} replies`}
            trend={parseFloat(summary?.reply_rate || 0) > 10 ? 'up' : 'down'}
          />
          <StatCard
            icon={<Calendar className="text-yellow-400" />}
            label="Meeting Rate"
            value={`${summary?.meeting_rate || 0}%`}
            subValue={`${summary?.total_meetings || 0} meetings`}
            trend={parseFloat(summary?.meeting_rate || 0) > 2 ? 'up' : 'down'}
          />
        </div>

        {/* Agent Performance */}
        <div data-testid="agent-performance-card" className="card bg-slate-800 border-slate-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Zap className="text-yellow-400" />
              AI Agent Performance
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-slate-400 text-sm border-b border-slate-700">
                  <th className="pb-3 pr-4">Agent</th>
                  <th className="pb-3 pr-4 text-right">Success Rate</th>
                  <th className="pb-3 pr-4 text-right">Avg Time</th>
                  <th className="pb-3 text-right">Executions</th>
                </tr>
              </thead>
              <tbody>
                {agentMetrics.map((agent, idx) => (
                  <tr key={idx} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                    <td className="py-4 pr-4">
                      <span className="text-white font-medium">{formatAgentName(agent.name)}</span>
                    </td>
                    <td className="py-4 pr-4 text-right">
                      <span className={`font-semibold ${agent.success_rate >= 95 ? 'text-green-400' : agent.success_rate >= 90 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {agent.success_rate}%
                      </span>
                    </td>
                    <td className="py-4 pr-4 text-right text-slate-300">
                      {(agent.avg_time_ms / 1000).toFixed(1)}s
                    </td>
                    <td className="py-4 text-right text-slate-400">
                      {agent.executions}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Template Rankings */}
        <div className="card bg-slate-800 border-slate-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Award className="text-rtgs-blue" />
              Template Performance Rankings
            </h2>
            <span className="text-sm text-slate-400">Last 30 days</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-slate-400 text-sm border-b border-slate-700">
                  <th className="pb-3 pr-4 w-12">#</th>
                  <th className="pb-3 pr-4">Template</th>
                  <th className="pb-3 pr-4 text-right">Sent</th>
                  <th className="pb-3 pr-4 text-right">Reply Rate</th>
                  <th className="pb-3 pr-4 text-right">Meeting Rate</th>
                  <th className="pb-3 text-right">Score</th>
                </tr>
              </thead>
              <tbody>
                {templateRankings.map((template, idx) => (
                  <tr key={idx} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                    <td className="py-4 pr-4">
                      <span className={`w-6 h-6 rounded-full inline-flex items-center justify-center text-sm font-bold ${
                        idx === 0 ? 'bg-yellow-400/20 text-yellow-400' :
                        idx === 1 ? 'bg-slate-400/20 text-slate-300' :
                        idx === 2 ? 'bg-orange-400/20 text-orange-400' :
                        'bg-slate-700 text-slate-400'
                      }`}>
                        {template.rank}
                      </span>
                    </td>
                    <td className="py-4 pr-4">
                      <span className="text-white font-medium">{formatTemplateName(template.template)}</span>
                      <span className={`ml-2 text-xs px-2 py-0.5 rounded ${
                        template.confidence === 'high' ? 'bg-green-400/20 text-green-400' :
                        template.confidence === 'medium' ? 'bg-yellow-400/20 text-yellow-400' :
                        'bg-slate-600 text-slate-400'
                      }`}>
                        {template.confidence}
                      </span>
                    </td>
                    <td className="py-4 pr-4 text-right text-slate-300">
                      {template.sent}
                    </td>
                    <td className="py-4 pr-4 text-right">
                      <span className={`font-semibold ${parseFloat(template.reply_rate) >= 10 ? 'text-green-400' : 'text-slate-300'}`}>
                        {template.reply_rate}%
                      </span>
                    </td>
                    <td className="py-4 pr-4 text-right">
                      <span className={`font-semibold ${parseFloat(template.meeting_rate) >= 3 ? 'text-green-400' : 'text-slate-300'}`}>
                        {template.meeting_rate}%
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      <span className="text-rtgs-blue font-semibold">{template.composite_score}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quality Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Quality Score */}
          <div className="card bg-slate-800 border-slate-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Activity className="text-cyan-400" />
              Outreach Quality
            </h3>
            <div className="flex items-center justify-center py-4">
              <div className="relative w-32 h-32">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    className="stroke-slate-700"
                    strokeWidth="12"
                    fill="none"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    className={`${(qualityStats?.avg_score || 0) >= 80 ? 'stroke-green-400' : (qualityStats?.avg_score || 0) >= 60 ? 'stroke-yellow-400' : 'stroke-red-400'}`}
                    strokeWidth="12"
                    fill="none"
                    strokeDasharray={`${((qualityStats?.avg_score || 0) / 100) * 352} 352`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-white">{qualityStats?.avg_score || 0}</span>
                  <span className="text-sm text-slate-400">Avg Score</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-700">
              <div className="text-center">
                <CheckCircle className="w-5 h-5 text-green-400 mx-auto mb-1" />
                <div className="text-lg font-semibold text-white">{qualityStats?.allowed_count || 0}</div>
                <div className="text-xs text-slate-400">Allowed</div>
              </div>
              <div className="text-center">
                <AlertTriangle className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
                <div className="text-lg font-semibold text-white">{qualityStats?.warned_count || 0}</div>
                <div className="text-xs text-slate-400">Warned</div>
              </div>
              <div className="text-center">
                <XCircle className="w-5 h-5 text-red-400 mx-auto mb-1" />
                <div className="text-lg font-semibold text-white">{qualityStats?.blocked_count || 0}</div>
                <div className="text-xs text-slate-400">Blocked</div>
              </div>
            </div>
          </div>

          {/* Quick Insights */}
          <div className="card bg-slate-800 border-slate-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="text-green-400" />
              Quick Insights
            </h3>
            <div className="space-y-4">
              {templateRankings[0] && (
                <InsightItem
                  type="success"
                  title="Top Template"
                  message={`${formatTemplateName(templateRankings[0].template)} is leading with ${templateRankings[0].reply_rate}% reply rate`}
                />
              )}
              {parseFloat(summary?.reply_rate || 0) > 10 ? (
                <InsightItem
                  type="success"
                  title="Strong Reply Rate"
                  message={`${summary.reply_rate}% reply rate is above target (10%)`}
                />
              ) : (
                <InsightItem
                  type="warning"
                  title="Reply Rate Below Target"
                  message={`${summary?.reply_rate || 0}% reply rate - consider testing new messaging`}
                />
              )}
              {parseFloat(summary?.bounce_rate || 0) > 3 ? (
                <InsightItem
                  type="error"
                  title="High Bounce Rate"
                  message={`${summary?.bounce_rate}% bounces - improve data quality checks`}
                />
              ) : (
                <InsightItem
                  type="success"
                  title="Healthy Deliverability"
                  message={`Only ${summary?.bounce_rate || 0}% bounce rate`}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper Components

function StatCard({ icon, label, value, subValue, trend }) {
  return (
    <div className="card bg-slate-800 border-slate-700 p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-400 text-sm mb-1">{label}</p>
          <p className="text-3xl font-bold text-white">{value}</p>
          <p className="text-sm text-slate-500 mt-1">{subValue}</p>
        </div>
        <div className="p-3 bg-slate-700/50 rounded-lg">
          {icon}
        </div>
      </div>
      {trend && (
        <div className={`mt-3 text-sm ${trend === 'up' ? 'text-green-400' : 'text-yellow-400'}`}>
          {trend === 'up' ? '↑ Above target' : '↓ Below target'}
        </div>
      )}
    </div>
  );
}

function InsightItem({ type, title, message }) {
  const colors = {
    success: 'text-green-400 bg-green-400/10',
    warning: 'text-yellow-400 bg-yellow-400/10',
    error: 'text-red-400 bg-red-400/10',
  };

  const icons = {
    success: <CheckCircle className="w-5 h-5" />,
    warning: <AlertTriangle className="w-5 h-5" />,
    error: <XCircle className="w-5 h-5" />,
  };

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg ${colors[type]}`}>
      {icons[type]}
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-sm opacity-80">{message}</p>
      </div>
    </div>
  );
}

// Helper functions

function formatAgentName(name) {
  return name
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatTemplateName(name) {
  return name
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default PerformancePage;
