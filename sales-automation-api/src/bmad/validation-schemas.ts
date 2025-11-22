import { z } from 'zod';
import {
  EmailSchema,
  DomainSchema,
  NonNegativeIntegerSchema,
  SafeJSONBSchema
} from '../validators/complete-schemas.js';

// Reusable schemas
export const CompanySchema = z.object({
  name: z.string().min(1).max(200),
  domain: DomainSchema,
  industry: z.string().optional(),
  employee_count: NonNegativeIntegerSchema.optional(),
  revenue: z.number().optional(),
  headquarters: z.string().optional(),
  technologies: z.array(z.string()).optional()
});

export const ContactSchema = z.object({
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  email: EmailSchema,
  title: z.string().max(200).optional(),
  company: z.string().min(1).max(200),
  company_domain: DomainSchema.optional(),
  phone: z.string().optional(),
  linkedin_url: z.string().url().optional(),
  email_verified: z.boolean().optional(),
  icp_score: z.number().min(0).max(100).optional(),
  seniority: z.string().optional()
});

// Workflow action input schemas
export const CreateICPProfileInputSchema = z.object({
  market_segment: SafeJSONBSchema,
  signals: SafeJSONBSchema.optional()
});

export const ExecuteCompanySearchInputSchema = z.object({
  icp_profile: z.object({
    firmographic_criteria: SafeJSONBSchema.optional(),
    technographic_criteria: z.array(z.string()).optional(),
    behavioral_criteria: SafeJSONBSchema.optional()
  }),
  data_sources: z.array(z.string()).optional(),
  search_params: z.object({
    max_results: NonNegativeIntegerSchema.max(10000).default(50),
    exclude_existing_customers: z.boolean().optional()
  }).optional(),
  geography: z.string().optional()
});

export const ExtractContactsInputSchema = z.object({
  company_list: z.array(CompanySchema).min(1),
  contacts_per_company: NonNegativeIntegerSchema.max(50).optional()
});

export const EnrichContactsInputSchema = z.object({
  contact_list: z.array(ContactSchema).min(1).max(1000)
});

export const CalculateICPScoreInputSchema = z.object({
  enriched_contacts: z.array(ContactSchema).min(1)
});

export const SegmentProspectsInputSchema = z.object({
  scored_contacts: z.array(ContactSchema).min(1)
});

export const SetupLemlistCampaignInputSchema = z.object({
  campaign_name: z.string().min(1).max(200).optional(),
  auto_approve_list: z.array(ContactSchema).optional(),
  email_sequence: z.array(z.object({
    subject: z.string().min(1),
    body: z.string().min(1)
  })).optional()
});

export const SyncContactsToCRMInputSchema = z.object({
  auto_approve_list: z.array(ContactSchema).optional(),
  review_queue: z.array(ContactSchema).optional()
});

export const GeneratePersonalizedMessageInputSchema = z.object({
  contact_name: z.string().min(1).max(200),
  company_name: z.string().min(1).max(200),
  title: z.string().max(200).optional(),
  engagement_context: z.string().max(1000).optional()
});

export const SendOutreachEmailInputSchema = z.object({
  contact_email: EmailSchema,
  message: z.object({
    subject: z.string().min(1).max(200),
    body: z.string().min(1).max(5000)
  })
});

export const ScheduleFollowUpInputSchema = z.object({
  contact_id: z.string().min(1),
  contact_name: z.string().min(1).max(200),
  follow_up_reason: z.string().max(500).optional()
});

// Workflow-level schemas
export const ProspectDiscoveryWorkflowInputSchema = z.object({
  market_segment: SafeJSONBSchema,
  geography: z.string().optional(),
  signals: SafeJSONBSchema.optional()
});

export const ReEngagementWorkflowInputSchema = z.object({
  contact_ids: z.array(z.string().uuid()).min(1).max(100),
  engagement_window_days: NonNegativeIntegerSchema.min(1).max(365).default(30)
});
