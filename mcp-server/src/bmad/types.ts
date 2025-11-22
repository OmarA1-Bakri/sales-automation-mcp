/**
 * TypeScript type definitions for B-mad workflow engine
 */

export interface WorkflowMetadata {
  name: string;
  title: string;
  description: string;
  version: string;
  execution_mode: 'sequential' | 'parallel';
}

export interface WorkflowStep {
  id: string;
  phase: string;
  agent: string;
  action: string;
  description: string;
  inputs?: Record<string, unknown>;
  required?: boolean;
}

export interface WorkflowDocument {
  workflow: {
    metadata: WorkflowMetadata;
    steps: WorkflowStep[];
  };
}

export interface WorkflowContext {
  [stepId: string]: unknown;
}

export type ToolFunction<TInput = unknown, TOutput = unknown> =
  (inputs: TInput) => Promise<TOutput>;

export interface WorkflowState {
  id: string;
  workflowName: string;
  status: 'running' | 'completed' | 'failed';
  context: WorkflowContext;
  currentStep: string | null;
  error: string | null;
  startedAt: Date;
  completedAt: Date | null;
}

export interface WorkflowFailure {
  id: number;
  workflowId: string;
  failedStep: string;
  errorMessage: string;
  context: WorkflowContext;
  createdAt: Date;
}

// API Client Response Types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface Company {
  name: string;
  domain: string;
  industry?: string;
  employee_count?: number;
  revenue?: number;
  headquarters?: string;
  technologies?: string[];
}

export interface Contact {
  first_name: string;
  last_name: string;
  email: string;
  title?: string;
  company: string;
  company_domain?: string;
  phone?: string;
  linkedin_url?: string;
  email_verified?: boolean;
  icp_score?: number;
  seniority?: string;
}

export interface ICPProfile {
  firmographic_criteria: Record<string, unknown>;
  technographic_criteria: string[];
  behavioral_criteria: Record<string, unknown>;
  scoring_weights: {
    firmographic: number;
    technographic: number;
    behavioral: number;
    intent: number;
  };
}

export interface QualityThresholds {
  auto_approve: number;
  review_queue: number;
  disqualify: number;
}

export interface SegmentedProspects {
  auto_approve_list: Contact[];
  review_queue: Contact[];
  disqualified: Contact[];
  segment_stats: {
    total_prospects: number;
    auto_approved: number;
    needs_review: number;
    disqualified: number;
  };
}

export interface CampaignResult {
  campaign_id: string;
  prospects_enrolled: number;
  campaign_start_date: string;
  estimated_completion_date: string;
}

export interface CRMSyncResult {
  contacts_synced: number;
  companies_created: number;
  tasks_created: number;
  sync_errors: string[];
}

export interface PersonalizedMessage {
  subject: string;
  body: string;
}

export interface EmailResult {
  status: 'sent' | 'failed';
  message_id: string;
}

export interface FollowUpResult {
  scheduled_at: string;
}
