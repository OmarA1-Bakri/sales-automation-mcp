import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  Users,
  Mail,
  CheckCircle,
  Zap,
  Play,
  Pause,
  AlertTriangle,
  Activity,
} from 'lucide-react';
import useStore from '../store/useStore';
import { api } from '../services/api';
import toast from 'react-hot-toast';

/**
 * Dashboard - Main overview page
 * Shows key metrics, YOLO mode status, recent activity
 * Designed for non-technical users with visual cards and clear CTAs
 */
function Dashboard() {
  const { yoloMode, updateYoloMode, setCurrentView } = useStore();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalContacts: 0,
    activeCampaigns: 0,
    emailsSent: 0,
    positiveReplies: 0,
  });
  const [recentJobs, setRecentJobs] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Load YOLO status, system stats, and recent jobs
      const [yoloStatus, systemStats, jobsData] = await Promise.all([
        api.getYOLOStatusDirect().catch(() => ({ success: false, enabled: false })),
        api.getStats().catch(() => null),
        api.getJobsDirect().catch(() => ({ success: false, jobs: [] }))
      ]);

      // Update YOLO mode state
      if (yoloStatus.success) {
        updateYoloMode({
          enabled: yoloStatus.enabled,
          nextRun: yoloStatus.nextRun || null,
          stats: yoloStatus.stats || {}
        });
      }

      // Update stats from API or use defaults
      if (systemStats && systemStats.success) {
        setStats({
          totalContacts: systemStats.jobs?.completed || 0,
          activeCampaigns: systemStats.campaigns || 0,
          emailsSent: systemStats.jobs?.total || 0,
          positiveReplies: 0, // To be implemented
        });
      } else {
        // Defaults if API fails
        setStats({
          totalContacts: 0,
          activeCampaigns: 0,
          emailsSent: 0,
          positiveReplies: 0,
        });
      }

      // Update recent jobs (take last 4 for display)
      if (jobsData && jobsData.success && jobsData.jobs) {
        setRecentJobs(jobsData.jobs.slice(0, 4));
      }
    } catch (error) {
      console.error('Failed to load dashboard:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleYOLO = async () => {
    try {
      if (yoloMode.enabled) {
        // Disable YOLO mode
        await api.call('/api/yolo/disable', 'POST');
        toast.success('YOLO mode disabled');
      } else {
        // Enable YOLO mode (requires configuration)
        // For now, show a message to go to settings
        toast.error('Please configure YOLO mode in Settings first');
        setCurrentView('settings');
        return;
      }
      await loadDashboardData();
    } catch (error) {
      toast.error(error.message || 'Failed to toggle YOLO mode');
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="spinner w-12 h-12 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto custom-scrollbar bg-slate-900 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome to RTGS Sales Automation
          </h1>
          <p className="text-slate-400">
            Your intelligent sales automation platform - running 24/7 to find and engage prospects
          </p>
        </div>

        {/* YOLO Mode Card - Primary CTA */}
        <div className="card bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 p-8">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-4">
                <Zap
                  size={32}
                  className={yoloMode.enabled ? 'text-green-400 animate-pulse' : 'text-slate-400'}
                />
                <div>
                  <h2 className="text-2xl font-bold text-white">YOLO Mode</h2>
                  <p className="text-slate-400">Fully automated sales prospecting</p>
                </div>
              </div>

              {yoloMode.enabled ? (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-green-400 font-medium">
                      {yoloMode.paused ? 'Paused' : 'Active and Running'}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-4 mt-6">
                    <StatMini
                      label="Cycles Run"
                      value={yoloMode.stats?.cyclesRun || 0}
                      icon={Activity}
                    />
                    <StatMini
                      label="Discovered"
                      value={yoloMode.stats?.discovered || 0}
                      icon={Users}
                    />
                    <StatMini
                      label="Enriched"
                      value={yoloMode.stats?.enriched || 0}
                      icon={CheckCircle}
                    />
                    <StatMini
                      label="Enrolled"
                      value={yoloMode.stats?.enrolled || 0}
                      icon={Mail}
                    />
                  </div>

                  {yoloMode.nextRun && (
                    <p className="text-sm text-slate-400 mt-4">
                      Next run: {yoloMode.nextRun}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-slate-300">
                    YOLO mode automates your entire sales process:
                  </p>
                  <ul className="space-y-2 text-slate-400">
                    <li className="flex items-center space-x-2">
                      <CheckCircle size={16} className="text-green-400" />
                      <span>Discover leads matching your ICP</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle size={16} className="text-green-400" />
                      <span>Enrich with company data</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle size={16} className="text-green-400" />
                      <span>Sync to HubSpot CRM</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle size={16} className="text-green-400" />
                      <span>Enroll in email campaigns</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle size={16} className="text-green-400" />
                      <span>Monitor and handle replies</span>
                    </li>
                  </ul>
                </div>
              )}
            </div>

            <div className="flex flex-col space-y-2">
              <button onClick={handleToggleYOLO} className="btn-primary flex items-center space-x-2">
                {yoloMode.enabled ? (
                  <>
                    <Pause size={16} />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play size={16} />
                    <span>Enable YOLO</span>
                  </>
                )}
              </button>
              {yoloMode.enabled && (
                <button
                  onClick={() => setCurrentView('settings')}
                  className="btn-secondary text-sm"
                >
                  Configure
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-6">
          <StatCard
            label="Total Contacts"
            value={stats.totalContacts}
            icon={Users}
            color="blue"
            trend="+12%"
          />
          <StatCard
            label="Active Campaigns"
            value={stats.activeCampaigns}
            icon={Megaphone}
            color="purple"
          />
          <StatCard
            label="Emails Sent"
            value={stats.emailsSent}
            icon={Mail}
            color="green"
            trend="+8%"
          />
          <StatCard
            label="Positive Replies"
            value={stats.positiveReplies}
            icon={CheckCircle}
            color="emerald"
            trend="+15%"
          />
        </div>

        {/* Quick Actions */}
        <div>
          <h3 className="text-xl font-bold text-white mb-4">Quick Actions</h3>
          <div className="grid grid-cols-3 gap-4">
            <QuickActionCard
              title="Chat with AI"
              description="Get help setting up campaigns"
              icon={MessageSquare}
              onClick={() => setCurrentView('chat')}
              color="blue"
            />
            <QuickActionCard
              title="Import Contacts"
              description="Upload CSV or sync from CRM"
              icon={FileUp}
              onClick={() => setCurrentView('import')}
              color="purple"
            />
            <QuickActionCard
              title="Configure ICP"
              description="Define your ideal customer"
              icon={Target}
              onClick={() => setCurrentView('icp')}
              color="green"
            />
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <h3 className="text-xl font-bold text-white mb-4">Recent Activity</h3>
          <div className="card space-y-3">
            {recentJobs.length > 0 ? (
              recentJobs.map((job) => {
                const icon = job.type === 'discover' ? Users : job.type === 'enrich' ? CheckCircle : job.type === 'outreach' ? Mail : Activity;
                const color = job.status === 'completed' ? 'green' : job.status === 'failed' ? 'red' : 'blue';
                const timeAgo = job.completed_at
                  ? new Date(job.completed_at).toLocaleString()
                  : new Date(job.created_at).toLocaleString();

                return (
                  <ActivityItem
                    key={job.id}
                    icon={icon}
                    title={`${job.type} job - ${job.status}`}
                    time={timeAgo}
                    color={color}
                  />
                );
              })
            ) : (
              <div className="text-center py-8 text-slate-400">
                <Activity size={32} className="mx-auto mb-2 opacity-50" />
                <p>No recent activity</p>
                <p className="text-sm">Jobs will appear here once you start using the system</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper components
function StatCard({ label, value, icon: Icon, color, trend }) {
  const colorClasses = {
    blue: 'from-blue-500/20 to-blue-600/20 border-blue-500/30',
    purple: 'from-purple-500/20 to-purple-600/20 border-purple-500/30',
    green: 'from-green-500/20 to-green-600/20 border-green-500/30',
    emerald: 'from-emerald-500/20 to-emerald-600/20 border-emerald-500/30',
  };

  return (
    <div className={`card bg-gradient-to-br ${colorClasses[color]}`}>
      <div className="flex items-center justify-between mb-4">
        <Icon size={24} className={`text-${color}-400`} />
        {trend && (
          <span className="text-sm text-green-400 font-medium">{trend}</span>
        )}
      </div>
      <div className="stat-value">{value.toLocaleString()}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function StatMini({ label, value, icon: Icon }) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center mb-2">
        <Icon size={16} className="text-slate-400" />
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-slate-400">{label}</div>
    </div>
  );
}

function QuickActionCard({ title, description, icon: Icon, onClick, color }) {
  const colorClasses = {
    blue: 'group-hover:text-blue-400',
    purple: 'group-hover:text-purple-400',
    green: 'group-hover:text-green-400',
  };

  return (
    <button onClick={onClick} className="card-hover text-left group">
      <Icon size={32} className={`text-slate-400 mb-4 transition-colors ${colorClasses[color]}`} />
      <h4 className="text-lg font-semibold text-white mb-2">{title}</h4>
      <p className="text-sm text-slate-400">{description}</p>
    </button>
  );
}

function ActivityItem({ icon: Icon, title, time, color }) {
  const colorClasses = {
    blue: 'text-blue-400 bg-blue-500/20',
    green: 'text-green-400 bg-green-500/20',
    purple: 'text-purple-400 bg-purple-500/20',
    emerald: 'text-emerald-400 bg-emerald-500/20',
    red: 'text-red-400 bg-red-500/20',
  };

  return (
    <div className="flex items-center space-x-4 py-2">
      <div className={`w-10 h-10 rounded-lg ${colorClasses[color] || colorClasses.blue} flex items-center justify-center`}>
        <Icon size={20} className={(colorClasses[color] || colorClasses.blue).split(' ')[0]} />
      </div>
      <div className="flex-1">
        <div className="text-sm font-medium text-white">{title}</div>
        <div className="text-xs text-slate-400">{time}</div>
      </div>
    </div>
  );
}

// Import missing icons
import { Megaphone, MessageSquare, FileUp, Target } from 'lucide-react';

export default Dashboard;
