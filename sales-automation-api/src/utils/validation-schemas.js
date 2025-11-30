/**
 * Validation Schemas - Sales Automation API
 *
 * Comprehensive Zod validation schemas for all API endpoints.
 * Implements RFC-compliant validation for emails, domains, and business logic.
 *
 * ARCH-008 NOTE: This file is maintained for backward compatibility.
 * For new code, prefer importing from '../validators/complete-schemas.js' which
 * includes XSS sanitization (DOMPurify) and prototype pollution protection.
 *
 * Base schemas (EmailSchema, DomainSchema, UUIDSchema, etc.) are duplicated
 * in complete-schemas.js with enhanced security features.
 */

import { z } from 'zod';

// ==========================================================================
// BASE SCHEMAS (Reusable primitives)
// ==========================================================================

export const EmailSchema = z
  .string()
  .email('Invalid email format')
  .max(254, 'Email too long (max 254 characters)')
  .transform(val => val.toLowerCase().trim());

export const DomainSchema = z
  .string()
  .regex(
    /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/i,
    'Invalid domain format'
  )
  .max(253, 'Domain too long (max 253 characters)')
  .transform(val => {
    let cleaned = val.toLowerCase().trim();
    // Remove protocol if present
    cleaned = cleaned.replace(/^https?:\/\//, '');
    // Remove www. prefix
    cleaned = cleaned.replace(/^www\./, '');
    // Remove trailing slash
    cleaned = cleaned.replace(/\/$/, '');
    return cleaned;
  });

export const UUIDSchema = z
  .string()
  .uuid('Invalid UUID format');

export const JobIdSchema = z
  .string()
  .regex(/^job_[0-9]+_[a-z0-9]+$/, 'Invalid job ID format');

export const ICPProfileNameSchema = z
  .string()
  .regex(/^icp_[a-z0-9_]+$/, 'Invalid ICP profile name (must start with icp_)');

export const URLSchema = z
  .string()
  .url('Invalid URL format')
  .max(2048, 'URL too long');

export const ScoreSchema = z
  .number()
  .min(0, 'Score must be >= 0')
  .max(1, 'Score must be <= 1');

export const PercentageSchema = z
  .number()
  .min(0, 'Percentage must be >= 0')
  .max(100, 'Percentage must be <= 100');

export const JobStatusSchema = z.enum([
  'pending',
  'processing',
  'completed',
  'failed',
  'cancelled'
]);

export const JobPrioritySchema = z.enum(['high', 'normal', 'low']);

export const JobTypeSchema = z.enum([
  'discover',
  'enrich',
  'sync',
  'outreach',
  'monitor',
  'import',
  'yolo'
]);

// ==========================================================================
// CONTACT & COMPANY SCHEMAS
// ==========================================================================

export const ContactSchema = z.object({
  email: EmailSchema,
  firstName: z.string().min(1, 'First name required').max(100).optional(),
  lastName: z.string().min(1, 'Last name required').max(100).optional(),
  title: z.string().max(200).optional(),
  phoneNumber: z.string().max(50).optional(),
  linkedinUrl: URLSchema.optional(),
  companyDomain: DomainSchema.optional(),
  companyName: z.string().max(200).optional(),
});

export const CompanySchema = z.object({
  domain: DomainSchema,
  name: z.string().min(1, 'Company name required').max(200),
  industry: z.string().max(100).optional(),
  employees: z.number().int().min(1).max(10000000).optional(),
  revenue: z.string().max(50).optional(),
  location: z.string().max(200).optional(),
});

// ==========================================================================
// DISCOVERY ENDPOINT SCHEMAS
// ==========================================================================

export const DiscoverByICPSchema = z.object({
  query: z.string().min(1).max(500).optional(),
  icpProfileName: ICPProfileNameSchema.optional(),
  count: z.number().int().min(1).max(1000).default(50),
  minScore: ScoreSchema.default(0.75),
  geography: z.string().max(100).optional(),
  excludeExisting: z.boolean().default(true),
}).refine(
  data => data.query || data.icpProfileName,
  {
    message: 'Either query or icpProfileName must be provided',
    path: ['query']
  }
);

export const DiscoverContactsSchema = z.object({
  companies: z.array(CompanySchema).min(1).max(100),
  titles: z.array(z.string().max(100)).optional(),
  departments: z.array(z.string().max(100)).optional(),
  seniority: z.array(z.enum(['C-Level', 'VP', 'Director', 'Manager', 'Individual Contributor'])).optional(),
  limit: z.number().int().min(1).max(1000).default(50),
});

// ==========================================================================
// ENRICHMENT ENDPOINT SCHEMAS
// ==========================================================================

export const EnrichContactSchema = z.object({
  email: EmailSchema,
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  companyDomain: DomainSchema.optional(),
});

export const EnrichContactsSchema = z.object({
  contacts: z.array(EnrichContactSchema).min(1, 'At least one contact required').max(100, 'Maximum 100 contacts per request'),
  sources: z.array(z.enum(['explorium', 'apollo', 'clearbit'])).optional(),
  cacheEnabled: z.boolean().default(true),
  minQuality: ScoreSchema.default(0.7),
  parallel: z.boolean().default(true),
  batchSize: z.number().int().min(1).max(50).default(10),
});

export const EnrichCompanySchema = z.object({
  domain: DomainSchema,
  name: z.string().min(1).max(200).optional(),
  cacheEnabled: z.boolean().default(true),
});

// ==========================================================================
// CRM SYNC ENDPOINT SCHEMAS
// ==========================================================================

export const SyncContactSchema = z.object({
  email: EmailSchema,
  firstName: z.string().min(1, 'First name required').max(100),
  lastName: z.string().min(1, 'Last name required').max(100),
  title: z.string().max(200).optional(),
  phoneNumber: z.string().max(50).optional(),
  linkedinUrl: URLSchema.optional(),
  companyName: z.string().max(200).optional(),
  companyDomain: DomainSchema.optional(),
  // Intelligence fields (optional)
  painPoints: z.string().max(1000).optional(),
  personalizationHooks: z.string().max(1000).optional(),
  whyNowTrigger: z.string().max(500).optional(),
  dataQualityScore: ScoreSchema.optional(),
});

export const SyncToHubSpotSchema = z.object({
  contacts: z.array(SyncContactSchema).min(1).max(100),
  deduplicate: z.boolean().default(true),
  updateIfExists: z.boolean().default(true),
  createIfNew: z.boolean().default(true),
  associateCompany: z.boolean().default(true),
  logActivity: z.boolean().default(true),
});

export const SyncCompanySchema = z.object({
  companies: z.array(CompanySchema).min(1).max(100),
  deduplicate: z.boolean().default(true),
  updateIfExists: z.boolean().default(true),
});

// ==========================================================================
// OUTREACH ENDPOINT SCHEMAS
// ==========================================================================

export const CreateCampaignSchema = z.object({
  name: z.string().min(1, 'Campaign name required').max(200),
  icpProfile: ICPProfileNameSchema,
  emailTemplate: z.string().min(1, 'Email template required').max(100),
  dailySendLimit: z.number().int().min(1).max(500).default(50),
  sequenceSteps: z.number().int().min(1).max(10).default(3),
  enableLinkedIn: z.boolean().default(false),
  linkedInDailyLimit: z.number().int().min(1).max(100).default(20),
});

export const EnrollLeadSchema = z.object({
  email: EmailSchema,
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  companyName: z.string().max(200).optional(),
  variables: z.record(z.string()).optional(),
});

export const EnrollInCampaignSchema = z.object({
  campaignId: z.string().min(1, 'Campaign ID required').max(100),
  leads: z.array(EnrollLeadSchema).min(1, 'At least one lead required').max(100, 'Maximum 100 leads per request'),
  skipUnsubscribed: z.boolean().default(true),
  skipBounced: z.boolean().default(true),
});

// ==========================================================================
// JOB ENDPOINT SCHEMAS
// ==========================================================================

export const CreateJobSchema = z.object({
  type: JobTypeSchema,
  parameters: z.record(z.any()),
  priority: JobPrioritySchema.default('normal'),
});

export const GetJobsSchema = z.object({
  status: JobStatusSchema.optional(),
  type: JobTypeSchema.optional(),
  priority: JobPrioritySchema.optional(),
  limit: z.number().int().min(1).max(1000).default(100),
  offset: z.number().int().min(0).default(0),
});

export const GetJobByIdSchema = z.object({
  jobId: JobIdSchema,
});

export const UpdateJobSchema = z.object({
  jobId: JobIdSchema,
  status: JobStatusSchema.optional(),
  progress: ScoreSchema.optional(),
  result: z.any().optional(),
  error: z.string().max(5000).optional(),
});

export const CancelJobSchema = z.object({
  jobId: JobIdSchema,
  reason: z.string().max(500).optional(),
});

// ==========================================================================
// IMPORT ENDPOINT SCHEMAS
// ==========================================================================

export const ImportContactsSchema = z.object({
  contacts: z.array(ContactSchema).min(1, 'At least one contact required').max(1000, 'Maximum 1000 contacts per import'),
  source: z.string().max(100).default('manual'),
  tags: z.array(z.string().max(50)).optional(),
  skipDuplicates: z.boolean().default(true),
});

// ==========================================================================
// YOLO MODE ENDPOINT SCHEMAS
// ==========================================================================

export const EnableYOLOSchema = z.object({
  dailyDiscoveryLimit: z.number().int().min(1).max(200).default(50),
  dailyEnrichmentLimit: z.number().int().min(1).max(100).default(50),
  dailyOutreachLimit: z.number().int().min(1).max(500).default(200),
  icpProfiles: z.array(ICPProfileNameSchema).min(1, 'At least one ICP profile required'),
  emailTemplates: z.array(z.string().max(100)).min(1, 'At least one email template required'),
  autoSync: z.boolean().default(true),
  requireApproval: z.boolean().default(false),
});

export const UpdateYOLOConfigSchema = z.object({
  dailyDiscoveryLimit: z.number().int().min(1).max(200).optional(),
  dailyEnrichmentLimit: z.number().int().min(1).max(100).optional(),
  dailyOutreachLimit: z.number().int().min(1).max(500).optional(),
  enabled: z.boolean().optional(),
});

// ==========================================================================
// MONITORING ENDPOINT SCHEMAS
// ==========================================================================

export const GetCampaignStatsSchema = z.object({
  campaignId: z.string().min(1).max(100),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const CheckRepliesSchema = z.object({
  campaignIds: z.array(z.string().max(100)).optional(),
  since: z.string().datetime().optional(),
});

// ==========================================================================
// QUERY PARAMETER SCHEMAS
// ==========================================================================

export const PaginationSchema = z.object({
  limit: z.number().int().min(1).max(1000).default(100),
  offset: z.number().int().min(0).default(0),
  sort: z.enum(['asc', 'desc']).default('desc'),
  sortBy: z.string().max(50).optional(),
});

export const DateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
}).refine(
  data => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate);
    }
    return true;
  },
  {
    message: 'startDate must be before or equal to endDate',
    path: ['startDate']
  }
);

// ==========================================================================
// WEBHOOK SCHEMAS (Future)
// ==========================================================================

export const WebhookSchema = z.object({
  url: URLSchema,
  events: z.array(z.enum([
    'job.completed',
    'job.failed',
    'campaign.created',
    'lead.enrolled',
    'reply.received',
    'yolo.activity'
  ])).min(1),
  secret: z.string().min(32).max(128).optional(),
  enabled: z.boolean().default(true),
});

// ==========================================================================
// EXPORTS
// ==========================================================================

export default {
  // Base
  EmailSchema,
  DomainSchema,
  UUIDSchema,
  JobIdSchema,
  ICPProfileNameSchema,
  URLSchema,
  ScoreSchema,

  // Discovery
  DiscoverByICPSchema,
  DiscoverContactsSchema,

  // Enrichment
  EnrichContactSchema,
  EnrichContactsSchema,
  EnrichCompanySchema,

  // CRM Sync
  SyncContactSchema,
  SyncToHubSpotSchema,
  SyncCompanySchema,

  // Outreach
  CreateCampaignSchema,
  EnrollLeadSchema,
  EnrollInCampaignSchema,

  // Jobs
  CreateJobSchema,
  GetJobsSchema,
  GetJobByIdSchema,
  UpdateJobSchema,
  CancelJobSchema,

  // Import
  ImportContactsSchema,

  // YOLO
  EnableYOLOSchema,
  UpdateYOLOConfigSchema,

  // Monitoring
  GetCampaignStatsSchema,
  CheckRepliesSchema,

  // Query
  PaginationSchema,
  DateRangeSchema,

  // Webhook
  WebhookSchema,
};
