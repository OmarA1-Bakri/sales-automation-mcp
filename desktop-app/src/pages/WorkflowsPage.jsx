import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Play,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Pause,
  List,
  Activity,
  ArrowRight,
  Loader2,
  Search,
  Target,
} from 'lucide-react';
import useStore from '../store/useStore';
import api from '../services/api';
import toast from 'react-hot-toast';

/**
 * WorkflowsPage - B-MAD Workflow Management
 * Execute and monitor sales automation workflows
 */
function WorkflowsPage() {
  const { setCurrentView } = useStore();
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [workflows, setWorkflows] = useState([]);
  const [definitions, setDefinitions] = useState([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [workflowInputs, setWorkflowInputs] = useState({});
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Track mounted state to prevent memory leaks
  const isMountedRef = useRef(true);

  // Load data on mount with cleanup
  useEffect(() => {
    isMountedRef.current = true;
    loadData();

    // Poll for updates every 10 seconds
    const interval = setInterval(() => {
      if (isMountedRef.current) {
        loadWorkflowExecutions(true); // true = background refresh
      }
    }, 10000);

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
    };
  }, []);

  const loadData = async () => {
    if (!isMountedRef.current) return;
    setLoading(true);
    try {
      await Promise.all([
        loadWorkflowDefinitions(),
        loadWorkflowExecutions()
      ]);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const loadWorkflowDefinitions = async () => {
    if (!isMountedRef.current) return;
    try {
      const result = await api.getWorkflowDefinitions({ includeMetadata: true });
      if (!isMountedRef.current) return; // Check again after async

      // Handle various response formats
      if (result) {
        if (result.success && result.data) {
          setDefinitions(result.data);
        } else if (result.definitions) {
          setDefinitions(result.definitions);
        } else if (Array.isArray(result)) {
          setDefinitions(result);
        } else {
          // API might not have workflow definitions yet - use empty array
          setDefinitions([]);
        }
      } else {
        setDefinitions([]);
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to load workflow definitions:', error);
      }
      // Don't show error toast - just start with empty state
      if (isMountedRef.current) {
        setDefinitions([]);
      }
    }
  };

  const loadWorkflowExecutions = async (isBackgroundRefresh = false) => {
    if (!isMountedRef.current) return;

    // Show subtle refresh indicator for background polls
    if (isBackgroundRefresh && isMountedRef.current) {
      setIsRefreshing(true);
    }

    try {
      const result = await api.listWorkflows({ limit: 50 });
      if (!isMountedRef.current) return; // Check again after async

      // Handle various response formats
      if (result) {
        if (result.success && result.data) {
          setWorkflows(result.data);
        } else if (result.workflows) {
          setWorkflows(result.workflows);
        } else if (result.executions) {
          setWorkflows(result.executions);
        } else if (Array.isArray(result)) {
          setWorkflows(result);
        } else {
          setWorkflows([]);
        }
      } else {
        setWorkflows([]);
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to load workflow executions:', error);
      }
      // Don't show toast for polling failures to avoid spam
      if (isMountedRef.current) {
        setWorkflows([]);
      }
    } finally {
      if (isMountedRef.current && isBackgroundRefresh) {
        setIsRefreshing(false);
      }
    }
  };

  const handleExecuteWorkflow = async (workflowName) => {
    setExecuting(true);
    try {
      const result = await api.executeWorkflow({
        workflowName,
        inputs: workflowInputs[workflowName] || {},
        sync: false,
        priority: 'normal'
      });

      if (result.success) {
        toast.success(`Workflow "${workflowName}" started! Job ID: ${result.data.jobId}`);
        setSelectedWorkflow(null);
        setWorkflowInputs({});
        await loadWorkflowExecutions();
      } else {
        toast.error(result.message || 'Failed to start workflow');
      }
    } catch (error) {
      toast.error(error.message || 'Failed to execute workflow');
    } finally {
      setExecuting(false);
    }
  };

  const handleCancelWorkflow = async (jobId) => {
    try {
      const result = await api.cancelWorkflow(jobId);
      if (result.success) {
        toast.success('Workflow cancelled');
        await loadWorkflowExecutions();
      } else {
        toast.error(result.message || 'Failed to cancel workflow');
      }
    } catch (error) {
      toast.error(error.message || 'Cannot cancel this workflow');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={16} className="text-green-400" />;
      case 'failed':
        return <XCircle size={16} className="text-red-400" />;
      case 'running':
      case 'processing':
        return <Loader2 size={16} className="text-blue-400 animate-spin" />;
      case 'pending':
        return <Clock size={16} className="text-yellow-400" />;
      case 'cancelled':
        return <Pause size={16} className="text-slate-400" />;
      default:
        return <AlertCircle size={16} className="text-slate-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'failed':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'running':
      case 'processing':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'cancelled':
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  const filteredWorkflows = workflows.filter(wf => {
    if (statusFilter === 'all') return true;
    return wf.status === statusFilter;
  });

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="spinner w-12 h-12 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading workflows...</p>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="workflows-page" className="h-full overflow-y-auto custom-scrollbar bg-slate-900 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Workflows</h1>
            <p className="text-slate-400">
              Execute and monitor B-MAD sales automation workflows
            </p>
          </div>
          <button
            onClick={loadData}
            className="btn-secondary flex items-center space-x-2"
          >
            <RefreshCw size={16} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Available Workflows */}
        <div>
          <h2 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
            <Play size={20} className="text-rtgs-blue" />
            <span>Available Workflows</span>
          </h2>

          {definitions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {definitions.map((def) => (
                <WorkflowDefinitionCard
                  key={def.name}
                  definition={def}
                  onExecute={() => setSelectedWorkflow(def.name)}
                  isSelected={selectedWorkflow === def.name}
                />
              ))}
            </div>
          ) : (
            <div className="card text-center py-8">
              <Activity size={48} className="mx-auto mb-4 text-slate-500" />
              <p className="text-slate-400">No workflow definitions found</p>
              <p className="text-sm text-slate-500 mt-2">
                Add .workflow.yaml files to bmad-library/modules/sales/workflows/
              </p>
            </div>
          )}
        </div>

        {/* Execute Workflow Modal/Card */}
        {selectedWorkflow && (
          <div className="card bg-gradient-to-br from-rtgs-blue/20 to-cyan-500/20 border-rtgs-blue/30">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">
                Execute: {selectedWorkflow.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </h3>
              <button
                onClick={() => setSelectedWorkflow(null)}
                className="text-slate-400 hover:text-white"
              >
                <XCircle size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Input fields based on workflow type */}
              {selectedWorkflow === 'prospect-discovery' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">ICP Profile</label>
                    <input
                      type="text"
                      className="input-field w-full"
                      placeholder="Enter ICP profile name"
                      value={workflowInputs[selectedWorkflow]?.icpProfile || ''}
                      onChange={(e) => setWorkflowInputs({
                        ...workflowInputs,
                        [selectedWorkflow]: { ...workflowInputs[selectedWorkflow], icpProfile: e.target.value }
                      })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Lead Count (max)</label>
                    <input
                      type="number"
                      className="input-field w-full"
                      placeholder="50"
                      value={workflowInputs[selectedWorkflow]?.count || ''}
                      onChange={(e) => setWorkflowInputs({
                        ...workflowInputs,
                        [selectedWorkflow]: { ...workflowInputs[selectedWorkflow], count: parseInt(e.target.value) || 50 }
                      })}
                    />
                  </div>
                </div>
              )}

              {selectedWorkflow === 'dynamic-outreach' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Campaign ID</label>
                    <input
                      type="text"
                      className="input-field w-full"
                      placeholder="Enter lemlist campaign ID"
                      value={workflowInputs[selectedWorkflow]?.campaignId || ''}
                      onChange={(e) => setWorkflowInputs({
                        ...workflowInputs,
                        [selectedWorkflow]: { ...workflowInputs[selectedWorkflow], campaignId: e.target.value }
                      })}
                    />
                  </div>
                </div>
              )}

              {selectedWorkflow === 're-engagement' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Days Since Last Contact</label>
                    <input
                      type="number"
                      className="input-field w-full"
                      placeholder="30"
                      value={workflowInputs[selectedWorkflow]?.daysSinceContact || ''}
                      onChange={(e) => setWorkflowInputs({
                        ...workflowInputs,
                        [selectedWorkflow]: { ...workflowInputs[selectedWorkflow], daysSinceContact: parseInt(e.target.value) || 30 }
                      })}
                    />
                  </div>
                </div>
              )}

              <div className="flex space-x-3 pt-2">
                <button
                  onClick={() => handleExecuteWorkflow(selectedWorkflow)}
                  disabled={executing}
                  className="btn-primary flex items-center space-x-2"
                >
                  {executing ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Starting...</span>
                    </>
                  ) : (
                    <>
                      <Play size={16} />
                      <span>Execute Workflow</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => setSelectedWorkflow(null)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Workflow Executions */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white flex items-center space-x-2">
              <List size={20} className="text-rtgs-blue" />
              <span>Workflow Executions</span>
            </h2>

            {/* Status Filter */}
            <div className="flex items-center space-x-2" role="group" aria-label="Filter workflows by status">
              {['all', 'running', 'pending', 'completed', 'failed'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  aria-pressed={statusFilter === status}
                  aria-label={`Filter by ${status} status`}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                    statusFilter === status
                      ? 'bg-rtgs-blue text-white'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {filteredWorkflows.length > 0 ? (
            <div className="space-y-3">
              {filteredWorkflows.map((wf) => (
                <WorkflowExecutionCard
                  key={wf.jobId}
                  workflow={wf}
                  onCancel={() => handleCancelWorkflow(wf.jobId)}
                  onRefresh={loadWorkflowExecutions}
                  getStatusIcon={getStatusIcon}
                  getStatusColor={getStatusColor}
                />
              ))}
            </div>
          ) : (
            <div className="card text-center py-8">
              <Clock size={48} className="mx-auto mb-4 text-slate-500" />
              <p className="text-slate-400">No workflow executions found</p>
              <p className="text-sm text-slate-500 mt-2">
                Execute a workflow above to see it here
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Workflow Definition Card
 */
function WorkflowDefinitionCard({ definition, onExecute, isSelected }) {
  const getWorkflowIcon = (name) => {
    if (name.includes('discovery') || name.includes('prospect')) {
      return <Search size={24} className="text-blue-400" />;
    }
    if (name.includes('outreach')) {
      return <ArrowRight size={24} className="text-green-400" />;
    }
    if (name.includes('re-engagement') || name.includes('reengagement')) {
      return <RefreshCw size={24} className="text-purple-400" />;
    }
    return <Activity size={24} className="text-slate-400" />;
  };

  const displayName = definition.name
    .replace(/-/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());

  return (
    <div
      className={`card-hover cursor-pointer transition-all ${
        isSelected ? 'ring-2 ring-rtgs-blue' : ''
      }`}
      onClick={onExecute}
    >
      <div className="flex items-start space-x-4">
        <div className="p-3 bg-slate-800 rounded-lg">
          {getWorkflowIcon(definition.name)}
        </div>
        <div className="flex-1">
          <h4 className="text-lg font-semibold text-white mb-1">{displayName}</h4>
          {definition.metadata?.description && (
            <p className="text-sm text-slate-400 mb-2">
              {definition.metadata.description}
            </p>
          )}
          <div className="flex items-center space-x-4 text-xs text-slate-500">
            {definition.metadata?.version && (
              <span>v{definition.metadata.version}</span>
            )}
            {definition.metadata?.steps && (
              <span>{definition.metadata.steps} steps</span>
            )}
          </div>
        </div>
        <button className="btn-primary py-2 px-4">
          <Play size={14} />
        </button>
      </div>
    </div>
  );
}

/**
 * Workflow Execution Card
 */
function WorkflowExecutionCard({ workflow, onCancel, onRefresh, getStatusIcon, getStatusColor }) {
  const [expanded, setExpanded] = useState(false);

  const formatTime = (timestamp) => {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleString();
  };

  const displayName = workflow.workflowName
    ?.replace(/-/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown Workflow';

  const canCancel = workflow.status === 'pending';

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {getStatusIcon(workflow.status)}
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-white">{displayName}</span>
              <span className={`px-2 py-0.5 text-xs rounded-full border ${getStatusColor(workflow.status)}`}>
                {workflow.status}
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Job ID: {workflow.jobId}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {workflow.progress > 0 && workflow.progress < 1 && (
            <div className="w-24">
              <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-rtgs-blue transition-all"
                  style={{ width: `${workflow.progress * 100}%` }}
                />
              </div>
              <span className="text-xs text-slate-500">{Math.round(workflow.progress * 100)}%</span>
            </div>
          )}

          {canCancel && (
            <button
              onClick={onCancel}
              className="text-red-400 hover:text-red-300 text-sm"
            >
              Cancel
            </button>
          )}

          <button
            onClick={() => setExpanded(!expanded)}
            className="text-slate-400 hover:text-white text-sm"
          >
            {expanded ? 'Less' : 'More'}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-slate-700 grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-slate-500">Created:</span>
            <span className="text-slate-300 ml-2">{formatTime(workflow.createdAt)}</span>
          </div>
          <div>
            <span className="text-slate-500">Started:</span>
            <span className="text-slate-300 ml-2">{formatTime(workflow.startedAt)}</span>
          </div>
          <div>
            <span className="text-slate-500">Completed:</span>
            <span className="text-slate-300 ml-2">{formatTime(workflow.completedAt)}</span>
          </div>
          <div>
            <span className="text-slate-500">Priority:</span>
            <span className="text-slate-300 ml-2">{workflow.priority || 'normal'}</span>
          </div>
          {workflow.error && (
            <div className="col-span-2">
              <span className="text-red-400">Error:</span>
              <span className="text-red-300 ml-2">{workflow.error}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default WorkflowsPage;
