/**
 * Scoring Configuration
 * Centralized configuration for all quality scoring and analytics services
 *
 * This module consolidates scoring constants, thresholds, and weights
 * used across QualityScorer, TemplateRanker, and DataQualityService.
 *
 * Benefits:
 * - Single source of truth for scoring parameters
 * - Easy A/B testing of different thresholds
 * - Environment-based overrides for different deployments
 */

// Quality Gates - determines send/warn/block decisions
export const QUALITY_THRESHOLDS = {
  ALLOW: parseInt(process.env.QUALITY_THRESHOLD_ALLOW, 10) || 70,
  WARN: parseInt(process.env.QUALITY_THRESHOLD_WARN, 10) || 50,
  BLOCK: parseInt(process.env.QUALITY_THRESHOLD_BLOCK, 10) || 50
};

// Component weights for overall quality score
export const QUALITY_WEIGHTS = {
  data: parseFloat(process.env.QUALITY_WEIGHT_DATA) || 0.40,
  message: parseFloat(process.env.QUALITY_WEIGHT_MESSAGE) || 0.40,
  timing: parseFloat(process.env.QUALITY_WEIGHT_TIMING) || 0.20
};

// Template ranking weights (for composite score)
export const TEMPLATE_WEIGHTS = {
  meeting_rate: 0.50,  // Meetings are the ultimate goal
  reply_rate: 0.35,    // Replies indicate engagement
  open_rate: 0.15      // Opens are top of funnel
};

// Minimum samples for confidence levels in analytics
export const CONFIDENCE_SAMPLES = {
  high: parseInt(process.env.CONFIDENCE_SAMPLES_HIGH, 10) || 50,
  medium: parseInt(process.env.CONFIDENCE_SAMPLES_MEDIUM, 10) || 20,
  low: parseInt(process.env.CONFIDENCE_SAMPLES_LOW, 10) || 5
};

// Message length scoring thresholds
export const MESSAGE_LENGTH = {
  min: 50,        // Below this: penalize heavily
  ideal_min: 80,  // Optimal range start
  ideal_max: 200, // Optimal range end
  max: 300        // Above this: penalize
};

// Spam trigger words - avoid these in outreach
export const SPAM_TRIGGERS = [
  'act now', 'limited time', 'exclusive deal', 'free', 'guarantee',
  'no obligation', 'urgent', 'winner', 'congratulations', 'click here',
  'buy now', 'order now', 'subscribe', 'unsubscribe', 'remove me',
  '100%', 'amazing', 'incredible', 'lowest price', 'best price'
];

// Role-based email prefixes to block
export const ROLE_BASED_PREFIXES = [
  'info', 'support', 'sales', 'contact', 'admin', 'help',
  'noreply', 'no-reply', 'marketing', 'team', 'hello',
  'general', 'office', 'enquiries', 'inquiries', 'hr',
  'careers', 'jobs', 'press', 'media', 'billing', 'accounts'
];

// Common disposable email domains
export const DISPOSABLE_DOMAINS = [
  'mailinator.com', 'tempmail.com', 'guerrillamail.com',
  '10minutemail.com', 'throwaway.email', 'fakeinbox.com',
  'temp-mail.org', 'getnada.com', 'mohmal.com', 'maildrop.cc',
  'yopmail.com', 'trashmail.com', 'sharklasers.com'
];

// ICP (Ideal Customer Profile) title matching patterns
export const ICP_TITLE_PATTERNS = {
  high: [
    /head of (treasury|payments|partnerships|finance)/i,
    /chief (payments|financial|treasury) officer/i,
    /(vp|vice president).*(treasury|payments|finance|partnerships)/i,
    /\b(cfo|cpo|treasurer)\b/i,
    /group treasurer/i
  ],
  medium: [
    /director.*(treasury|payments|finance|partnerships)/i,
    /manager.*(treasury|payments|finance)/i,
    /head of (operations|business development)/i,
    /senior.*(treasury|payments|finance)/i
  ],
  low: [
    /analyst|specialist/i,
    /coordinator|assistant/i,
    /associate/i
  ]
};

// ICP title scores by match level
export const ICP_TITLE_SCORES = {
  high: 90,
  medium: 60,
  low: 30,
  none_with_title: 20,
  none_without_title: 0
};

// Data completeness weights for contact scoring
export const DATA_COMPLETENESS_WEIGHTS = {
  email: 25,
  first_name: 15,
  last_name: 10,
  company: 20,
  title: 15,
  linkedin_url: 5,
  phone: 5,
  company_size: 3,
  industry: 2
};

// Data completeness grade thresholds
export const COMPLETENESS_GRADES = {
  excellent: 90,
  good: 75,
  acceptable: 60,
  poor: 40
  // Below poor = 'insufficient'
};

// Cache TTL settings (in seconds)
export const CACHE_TTL = {
  templates: parseInt(process.env.CACHE_TTL_TEMPLATES, 10) || 300,    // 5 minutes
  outcomes: parseInt(process.env.CACHE_TTL_OUTCOMES, 10) || 120,      // 2 minutes
  personas: parseInt(process.env.CACHE_TTL_PERSONAS, 10) || 300,      // 5 minutes
  subjects: parseInt(process.env.CACHE_TTL_SUBJECTS, 10) || 300,      // 5 minutes
  summary: parseInt(process.env.CACHE_TTL_SUMMARY, 10) || 60          // 1 minute
};

// Default export for convenience
export default {
  QUALITY_THRESHOLDS,
  QUALITY_WEIGHTS,
  TEMPLATE_WEIGHTS,
  CONFIDENCE_SAMPLES,
  MESSAGE_LENGTH,
  SPAM_TRIGGERS,
  ROLE_BASED_PREFIXES,
  DISPOSABLE_DOMAINS,
  ICP_TITLE_PATTERNS,
  ICP_TITLE_SCORES,
  DATA_COMPLETENESS_WEIGHTS,
  COMPLETENESS_GRADES,
  CACHE_TTL
};
