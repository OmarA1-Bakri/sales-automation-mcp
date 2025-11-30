/**
 * API Response Normalizers
 * Transforms API responses to expected frontend format with safe defaults
 */

/**
 * Validate and log malformed data in development mode
 * @param {string} source - Component name for logging
 * @param {Object} data - Data to validate
 * @param {number} index - Item index
 * @param {Object} schema - Expected schema { field: 'expectedType' }
 */
export const validateData = (source, data, index, schema) => {
  if (process.env.NODE_ENV !== 'development') return;

  const warnings = [];

  Object.entries(schema).forEach(([field, expectedType]) => {
    if (data[field] && typeof data[field] !== expectedType) {
      warnings.push(`${field} is ${typeof data[field]}, expected ${expectedType}`);
    }
  });

  if (!data.id && !data._id) {
    warnings.push('missing id field');
  }

  if (warnings.length > 0) {
    console.warn(`[${source}] Item[${index}] malformed:`, warnings, data);
  }
};

/**
 * Normalize campaign data from API response
 * @param {Object} c - Raw campaign from API
 * @returns {Object} Normalized campaign
 */
export const normalizeCampaign = (c) => ({
  id: c._id || c.id,
  name: c.name || 'Untitled Campaign',
  status: c.status || 'draft',
  createdAt: c.createdAt || new Date().toISOString(),
  createdBy: c.createdBy || '',
  type: c.type || 'email',
  icpProfile: c.icpProfile || 'Default',
  performance: {
    enrolled: c.performance?.enrolled || 0,
    contacted: c.performance?.contacted || 0,
    opened: c.performance?.opened || 0,
    clicked: c.performance?.clicked || 0,
    replied: c.performance?.replied || 0,
    bounced: c.performance?.bounced || 0,
    unsubscribed: c.performance?.unsubscribed || 0,
    openRate: c.performance?.openRate || 0,
    clickRate: c.performance?.clickRate || 0,
    replyRate: c.performance?.replyRate || 0,
    bounceRate: c.performance?.bounceRate || 0,
    linkedinSent: c.performance?.linkedinSent || 0,
    linkedinAccepted: c.performance?.linkedinAccepted || 0,
    linkedinMessaged: c.performance?.linkedinMessaged || 0,
    linkedinReplied: c.performance?.linkedinReplied || 0,
    linkedinAcceptRate: c.performance?.linkedinAcceptRate || 0,
    linkedinReplyRate: c.performance?.linkedinReplyRate || 0,
  },
  sequence: {
    currentStep: c.sequence?.currentStep || 1,
    totalSteps: c.sequence?.totalSteps || 1,
  },
  nextAction: c.nextAction || 'No action scheduled',
  emailPerformance: c.emailPerformance || [],
  linkedinPerformance: c.linkedinPerformance || [],
});

/**
 * Schema for campaign validation
 */
export const campaignSchema = {
  performance: 'object',
  sequence: 'object',
};

/**
 * Normalize ICP profile data from API response
 * @param {Object} p - Raw profile from API
 * @returns {Object} Normalized profile
 */
export const normalizeICPProfile = (p) => ({
  id: p.id || p._id,
  name: p.name || 'Unnamed Profile',
  description: p.description || '',
  active: p.active ?? true,
  tier: p.tier || 'core',
  stats: {
    discovered: p.stats?.discovered || 0,
    enriched: p.stats?.enriched || 0,
    enrolled: p.stats?.enrolled || 0,
    avgScore: p.stats?.avgScore || 0,
  },
  firmographics: {
    companySize: {
      min: p.firmographics?.companySize?.min || 0,
      max: p.firmographics?.companySize?.max || 0,
    },
    revenue: {
      min: p.firmographics?.revenue?.min || 0,
      max: p.firmographics?.revenue?.max || 0,
    },
    industries: p.firmographics?.industries || [],
    geographies: p.firmographics?.geographies || [],
  },
  titles: {
    primary: p.titles?.primary || [],
    secondary: p.titles?.secondary || [],
  },
  scoring: {
    autoApprove: p.scoring?.autoApprove || 0.8,
    reviewRequired: p.scoring?.reviewRequired || 0.6,
    disqualify: p.scoring?.disqualify || 0.4,
  },
});

/**
 * Schema for ICP profile validation
 */
export const icpProfileSchema = {
  stats: 'object',
  firmographics: 'object',
  titles: 'object',
  scoring: 'object',
};

/**
 * Normalize workflow execution data from API response
 * @param {Object} w - Raw workflow from API
 * @returns {Object} Normalized workflow
 */
export const normalizeWorkflow = (w) => ({
  id: w._id || w.id || w.jobId,
  jobId: w.jobId || w._id || w.id,
  workflowName: w.workflowName || w.name || 'Unknown Workflow',
  status: w.status || 'pending',
  progress: w.progress || 0,
  startedAt: w.startedAt || w.createdAt,
  completedAt: w.completedAt || null,
  error: w.error || null,
  inputs: w.inputs || {},
  outputs: w.outputs || {},
  steps: w.steps || [],
});

/**
 * Schema for workflow validation
 */
export const workflowSchema = {
  inputs: 'object',
  outputs: 'object',
  steps: 'object',
};

/**
 * Normalize contact data from API response
 * @param {Object} c - Raw contact from API
 * @returns {Object} Normalized contact
 */
export const normalizeContact = (c) => ({
  id: c._id || c.id,
  email: c.email || '',
  firstName: c.firstName || '',
  lastName: c.lastName || '',
  company: c.company || c.companyName || '',
  companyDomain: c.companyDomain || '',
  title: c.title || c.jobTitle || '',
  linkedinUrl: c.linkedinUrl || '',
  phone: c.phone || '',
  source: c.source || 'unknown',
  importedAt: c.importedAt || c.createdAt || new Date().toISOString(),
  enriched: c.enriched || false,
  icpScore: c.icpScore || 0,
});
