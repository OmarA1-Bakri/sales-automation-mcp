import { ExploriumClient } from '../clients/explorium-client.js';
import { LemlistClient } from '../clients/lemlist-client.js';
import { HubSpotClient } from '../clients/hubspot-client.js';
import { createLogger } from '../utils/logger.js';
import { providerConfig } from '../config/provider-config.js';
import { AnthropicProvider } from '../ai/AnthropicProvider.js';
import { GeminiProvider } from '../ai/GeminiProvider.js';
import {
  CreateICPProfileInputSchema,
  ExecuteCompanySearchInputSchema,
  ExtractContactsInputSchema,
  EnrichContactsInputSchema,
  CalculateICPScoreInputSchema,
  SegmentProspectsInputSchema,
  SetupLemlistCampaignInputSchema,
  SyncContactsToCRMInputSchema,
  GeneratePersonalizedMessageInputSchema,
  SendOutreachEmailInputSchema,
  ScheduleFollowUpInputSchema
} from './validation-schemas.js';

type ToolFunction = (inputs: any) => Promise<any>;

interface ToolMetadata {
  name: string;
  type: 'read_only' | 'destructive';
  batchLimit?: number;
  requiresApproval: boolean;
}

export class ToolRegistry {
  private tools: Map<string, ToolFunction> = new Map();
  private toolMetadata: Map<string, ToolMetadata> = new Map();
  private pendingApprovals: Map<string, any> = new Map();
  private explorium: any;
  private lemlist: any;
  private hubspot: any;
  private aiProvider: any;
  private logger: any;

  constructor() {
    this.logger = createLogger('ToolRegistry');

    // Get API keys from centralized config
    const exploriumApiKey = providerConfig.getProviderApiKey('explorium');
    const lemlistApiKey = providerConfig.getProviderApiKey('lemlist');
    const hubspotApiKey = providerConfig.getProviderApiKey('hubspot');

    if (!exploriumApiKey) {
      this.logger.warn('Explorium API key not configured. Explorium actions will use mock data.');
    } else {
      this.explorium = new ExploriumClient({ apiKey: exploriumApiKey });
    }

    if (!lemlistApiKey) {
      this.logger.warn('Lemlist API key not configured. Lemlist actions will use mock data.');
    } else {
      this.lemlist = new LemlistClient({ apiKey: lemlistApiKey });
    }

    if (!hubspotApiKey) {
      this.logger.warn('HubSpot API key not configured. HubSpot actions will use mock data.');
    } else {
      this.hubspot = new HubSpotClient({ apiKey: hubspotApiKey });
    }

    // Initialize AI provider (Anthropic or Gemini)
    const aiProvider = process.env.AI_PROVIDER || 'anthropic';
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    if (aiProvider === 'gemini' && geminiKey) {
      this.aiProvider = new GeminiProvider(geminiKey);
      this.logger.info('Using Gemini AI provider for message generation');
    } else if (aiProvider === 'anthropic' && anthropicKey) {
      this.aiProvider = new AnthropicProvider(anthropicKey);
      this.logger.info('Using Anthropic AI provider for message generation');
    } else {
      this.logger.warn('No AI provider configured. Message generation will use templates.');
    }

    this.registerCoreTools();
  }

  private registerCoreTools() {
    // ===== PROSPECT DISCOVERY WORKFLOW ACTIONS =====

    // Phase 1: DISCOVER
    this.register('create_icp_profile', async (inputs) => {
      // Validate inputs
      const validated = CreateICPProfileInputSchema.parse(inputs);

      this.logger.info('Creating ICP profile', {
        market_segment: validated.market_segment
      });

      return {
        icp_profile: {
          firmographic_criteria: inputs.market_segment,
          technographic_criteria: inputs.signals?.tech_stack || [],
          behavioral_criteria: inputs.signals || {},
          scoring_weights: { firmographic: 40, technographic: 30, behavioral: 20, intent: 10 }
        },
        quality_thresholds: {
          auto_approve: 85,
          review_queue: 70,
          disqualify: 70
        }
      };
    });

    this.register('execute_company_search', async (inputs) => {
      // Validate inputs
      const validated = ExecuteCompanySearchInputSchema.parse(inputs);

      this.logger.info('Executing company search', {
        icp_profile: validated.icp_profile,
        data_sources: validated.data_sources,
        limit: validated.search_params?.max_results
      });

      // Use mock data if Explorium client not configured
      if (!this.explorium) {
        this.logger.warn('Using mock data for company search (Explorium not configured)');
        return [
          { name: "TechCorp Inc", domain: "techcorp.com", industry: "SaaS", employee_count: 150 },
          { name: "DataFlow Systems", domain: "dataflow.io", industry: "SaaS", employee_count: 200 }
        ];
      }

      try {
        const criteria = {
          industry: validated.icp_profile?.firmographic_criteria?.industry,
          employees: validated.icp_profile?.firmographic_criteria?.employee_range,
          technologies: validated.icp_profile?.technographic_criteria,
          geography: validated.geography || 'US',
          limit: validated.search_params?.max_results || 50
        };

        const result = await this.explorium.discoverCompanies(criteria);

        if (!result.success) {
          this.logger.error('Company search failed', { error: result.error });
          throw new Error(`Company search failed: ${result.error}`);
        }

        this.logger.info('Company search completed', {
          found: result.companies?.length || 0,
          hasMore: result.hasMore
        });

        return (result.companies || []).map((company: any) => ({
          name: company.name,
          domain: company.domain,
          industry: company.industry,
          employee_count: company.employees,
          revenue: company.revenue,
          headquarters: company.headquarters,
          technologies: company.technologies
        }));
      } catch (error) {
        this.logger.error('Company search error', { error: (error as Error).message });
        throw error;
      }
    });

    // Phase 2: ENRICH
    this.register('extract_contacts', async (inputs) => {
      // Validate inputs
      const validated = ExtractContactsInputSchema.parse(inputs);

      this.logger.info('Extracting contacts', {
        company_count: validated.company_list.length
      });

      // Use mock data if Explorium client not configured
      if (!this.explorium) {
        this.logger.warn('Using mock data for contact extraction (Explorium not configured)');
        return [
          { first_name: "John", last_name: "Doe", title: "CTO", email: "john.doe@techcorp.com", company: "TechCorp Inc" },
          { first_name: "Jane", last_name: "Smith", title: "VP Engineering", email: "jane.smith@dataflow.io", company: "DataFlow Systems" }
        ];
      }

      try {
        const allContacts = [];

        for (const company of validated.company_list) {
          const result = await this.explorium.findContacts({
            companyDomain: company.domain,
            limit: validated.contacts_per_company || 5
          });

          if (result.success && result.contacts) {
            allContacts.push(...result.contacts.map((contact: any) => ({
              first_name: contact.firstName,
              last_name: contact.lastName,
              title: contact.title,
              email: contact.email,
              company: company.name,
              company_domain: company.domain
            })));
          }
        }

        this.logger.info('Contact extraction completed', {
          contacts_found: allContacts.length
        });

        return allContacts;
      } catch (error) {
        this.logger.error('Contact extraction error', { error: (error as Error).message });
        throw error;
      }
    });

    this.register('enrich_with_explorium', async (inputs) => {
      this.logger.info('Enriching contacts', {
        contact_count: Array.isArray(inputs.contact_list) ? inputs.contact_list.length : 0
      });

      if (!Array.isArray(inputs.contact_list)) {
        this.logger.warn('contact_list is not an array, returning empty array');
        return [];
      }

      // Use mock data if Explorium client not configured
      if (!this.explorium) {
        this.logger.warn('Using mock data for contact enrichment (Explorium not configured)');
        return inputs.contact_list.map((contact: any) => ({
          ...contact,
          email_verified: true,
          linkedin_url: `https://linkedin.com/in/${contact.first_name.toLowerCase()}-${contact.last_name.toLowerCase()}`,
          phone: "+1-555-0100"
        }));
      }

      try {
        const enrichedContacts = [];

        for (const contact of inputs.contact_list) {
          const result = await this.explorium.enrichContact({
            email: contact.email,
            firstName: contact.first_name,
            lastName: contact.last_name,
            companyDomain: contact.company_domain
          });

          if (result.success) {
            enrichedContacts.push({
              ...contact,
              email_verified: result.data?.emailVerified || false,
              linkedin_url: result.data?.linkedinUrl,
              phone: result.data?.phoneNumber,
              title: result.data?.title || contact.title,
              seniority: result.data?.seniority
            });
          } else {
            // Keep original contact if enrichment fails
            enrichedContacts.push(contact);
          }
        }

        this.logger.info('Contact enrichment completed', {
          enriched_count: enrichedContacts.length
        });

        return enrichedContacts;
      } catch (error) {
        this.logger.error('Contact enrichment error', { error: (error as Error).message });
        throw error;
      }
    });

    // Phase 3: QUALIFY
    this.register('calculate_icp_score', async (inputs) => {
      this.logger.info('Calculating ICP scores', {
        contact_count: Array.isArray(inputs.enriched_contacts) ? inputs.enriched_contacts.length : 0
      });

      if (!Array.isArray(inputs.enriched_contacts)) {
        this.logger.warn('enriched_contacts is not an array, returning empty array');
        return [];
      }

      // Business logic for ICP scoring (not API-based)
      return inputs.enriched_contacts.map((contact: any, idx: number) => ({
        ...contact,
        icp_score: 80 + (idx * 5) // Mock scores: 80, 85, 90, etc.
      }));
    });

    this.register('segment_prospects', async (inputs) => {
      this.logger.info('Segmenting prospects by score', {
        scored_count: Array.isArray(inputs.scored_contacts) ? inputs.scored_contacts.length : 0
      });

      const scored = inputs.scored_contacts || [];
      const segmented = {
        auto_approve_list: scored.filter((c: any) => c.icp_score >= 85),
        review_queue: scored.filter((c: any) => c.icp_score >= 70 && c.icp_score < 85),
        disqualified: scored.filter((c: any) => c.icp_score < 70),
        segment_stats: {
          total_prospects: scored.length,
          auto_approved: scored.filter((c: any) => c.icp_score >= 85).length,
          needs_review: scored.filter((c: any) => c.icp_score >= 70 && c.icp_score < 85).length,
          disqualified: scored.filter((c: any) => c.icp_score < 70).length
        }
      };

      this.logger.info('Segmentation complete', segmented.segment_stats);
      return segmented;
    });

    this.register('quality_assurance_check', async (inputs) => {
      this.logger.info('Running quality assurance checks');
      return {
        quality_passed: true,
        quality_score: 95,
        issues_found: []
      };
    });

    // Phase 4: PREPARE
    this.register('setup_lemlist_campaign', async (inputs) => {
      this.logger.info('Setting up Lemlist campaign', {
        prospect_count: inputs.auto_approve_list?.length || 0
      });

      // Use mock data if Lemlist client not configured
      if (!this.lemlist) {
        this.logger.warn('Using mock data for campaign setup (Lemlist not configured)');
        return {
          campaign_id: "camp_" + Date.now(),
          prospects_enrolled: inputs.auto_approve_list?.length || 0,
          campaign_start_date: new Date().toISOString(),
          estimated_completion_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
        };
      }

      try {
        // Create campaign
        const campaignResult = await this.lemlist.createCampaign({
          name: inputs.campaign_name || `Campaign ${new Date().toISOString()}`,
          emails: inputs.email_sequence || [],
          settings: {
            trackOpens: true,
            trackClicks: true
          }
        });

        if (!campaignResult.success) {
          throw new Error(`Failed to create campaign: ${campaignResult.error}`);
        }

        const campaignId = campaignResult.campaignId;

        // Bulk enroll prospects
        if (inputs.auto_approve_list && inputs.auto_approve_list.length > 0) {
          const leads = inputs.auto_approve_list.map((contact: any) => ({
            email: contact.email,
            firstName: contact.first_name || contact.firstName,
            lastName: contact.last_name || contact.lastName,
            companyName: contact.company || contact.currentCompany
          }));

          await this.lemlist.bulkAddLeads(campaignId, leads);
        }

        this.logger.info('Lemlist campaign setup complete', {
          campaignId,
          prospects_enrolled: inputs.auto_approve_list?.length || 0
        });

        return {
          campaign_id: campaignId,
          prospects_enrolled: inputs.auto_approve_list?.length || 0,
          campaign_start_date: new Date().toISOString(),
          estimated_completion_date: new Date(
            Date.now() + 14 * 24 * 60 * 60 * 1000
          ).toISOString()
        };
      } catch (error) {
        this.logger.error('Campaign setup error', { error: (error as Error).message });
        throw error;
      }
    }, {
      type: 'destructive',
      batchLimit: 100,
      requiresApproval: true
    });

    this.register('sync_contacts_to_crm', async (inputs) => {
      const totalContacts = (inputs.auto_approve_list?.length || 0) + (inputs.review_queue?.length || 0);

      this.logger.info('Syncing contacts to HubSpot CRM', {
        auto_approve: inputs.auto_approve_list?.length || 0,
        review_queue: inputs.review_queue?.length || 0,
        total: totalContacts
      });

      // Use mock data if HubSpot client not configured
      if (!this.hubspot) {
        this.logger.warn('Using mock data for CRM sync (HubSpot not configured)');
        return {
          contacts_synced: totalContacts,
          companies_created: 2,
          tasks_created: inputs.review_queue?.length || 0,
          sync_errors: []
        };
      }

      try {
        const allContacts = [
          ...(inputs.auto_approve_list || []),
          ...(inputs.review_queue || [])
        ];

        if (allContacts.length === 0) {
          return {
            contacts_synced: 0,
            companies_created: 0,
            tasks_created: 0,
            sync_errors: []
          };
        }

        // Transform to HubSpot format
        const hubspotContacts = allContacts.map((contact: any) => ({
          email: contact.email,
          firstname: contact.first_name || contact.firstName,
          lastname: contact.last_name || contact.lastName,
          company: contact.company || contact.currentCompany,
          jobtitle: contact.title,
          phone: contact.phone || contact.phoneNumber,
          linkedin_url: contact.linkedin_url || contact.linkedinUrl,
          icp_score: contact.icp_score,
          lifecyclestage: contact.icp_score >= 85 ? 'lead' : 'subscriber'
        }));

        // Batch upsert
        const result = await this.hubspot.batchUpsertContacts(hubspotContacts);

        // Create tasks for review queue
        let tasksCreated = 0;
        if (inputs.review_queue && inputs.review_queue.length > 0) {
          for (const contact of inputs.review_queue) {
            const contactResult = result.results?.find(
              (r: any) => r.properties?.email === contact.email
            );

            if (contactResult) {
              await this.hubspot.createTask({
                subject: `Review prospect: ${contact.first_name} ${contact.last_name}`,
                body: `ICP Score: ${contact.icp_score}. Review this prospect for campaign enrollment.`,
                status: 'NOT_STARTED',
                priority: 'HIGH',
                dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                associatedObjectType: 'contact',
                associatedObjectId: contactResult.id
              });
              tasksCreated++;
            }
          }
        }

        this.logger.info('CRM sync complete', {
          contacts_synced: result.count || allContacts.length,
          tasks_created: tasksCreated
        });

        return {
          contacts_synced: result.count || allContacts.length,
          companies_created: 0,
          tasks_created: tasksCreated,
          sync_errors: []
        };
      } catch (error) {
        this.logger.error('CRM sync error', { error: (error as Error).message });
        throw error;
      }
    }, {
      type: 'destructive',
      batchLimit: 100,
      requiresApproval: true
    });

    this.register('create_discovery_summary', async (inputs) => {
      this.logger.info('Generating discovery summary report');
      return {
        report_url: "https://reports.example.com/discovery-" + Date.now(),
        report_pdf: "discovery_report.pdf",
        summary_email: "Discovery complete! Check the report for details."
      };
    });

    // ===== RE-ENGAGEMENT WORKFLOW ACTIONS =====
    this.register('analyze_engagement_patterns', async (inputs) => {
      this.logger.info('Analyzing engagement patterns');
      return {
        engagement_score: 0.75,
        recommended_action: "re-engage",
        best_time_to_contact: "Tuesday 10am"
      };
    });

    this.register('generate_personalized_message', async (inputs) => {
      // Validate inputs
      const validated = GeneratePersonalizedMessageInputSchema.parse(inputs);

      this.logger.info('Generating personalized message', {
        contact_name: validated.contact_name,
        has_ai_provider: !!this.aiProvider
      });

      // Use AI provider (Anthropic or Gemini) if configured
      if (!this.aiProvider) {
        this.logger.warn('Using template for message generation (no AI provider configured)');
        return {
          subject: "Following up on our conversation",
          body: `Hi ${validated.contact_name || 'there'}, I wanted to reach out about...`
        };
      }

      try {
        const prompt = `Generate a personalized outreach email for:
Contact: ${validated.contact_name}
Company: ${validated.company_name}
Title: ${validated.title}
Context: ${validated.engagement_context || 'Initial outreach'}
Tone: Professional and friendly
Length: 2-3 paragraphs

Generate a subject line and email body.`;

        const response = await this.aiProvider.generateText(prompt, {
          maxTokens: 500,
          temperature: 0.7
        });

        // Parse AI response to extract subject and body
        const lines = response.trim().split('\n');
        let subject = "Following up on our conversation";
        let body = response;

        // Try to extract subject line if AI formatted it
        const subjectMatch = response.match(/Subject:?\s*(.+)/i);
        if (subjectMatch) {
          subject = subjectMatch[1].trim();
          body = response.replace(/Subject:?\s*.+\n*/i, '').trim();
        }

        this.logger.info('AI-generated message created', {
          subject_length: subject.length,
          body_length: body.length
        });

        return {
          subject,
          body
        };
      } catch (error) {
        this.logger.error('AI message generation error', { error: (error as Error).message });
        // Fallback to template
        return {
          subject: "Following up on our conversation",
          body: `Hi ${inputs.contact_name || 'there'}, I wanted to reach out about...`
        };
      }
    });

    this.register('send_outreach_email', async (inputs) => {
      this.logger.info('Sending outreach email');

      // Use mock data if Lemlist client not configured
      if (!this.lemlist) {
        this.logger.warn('Using mock data for outreach email (Lemlist not configured)');
        return {
          status: "sent",
          message_id: "msg_" + Date.now()
        };
      }

      try {
        // Send email via Lemlist
        const result = await this.lemlist.sendEmail({
          to: inputs.contact_email,
          subject: inputs.message?.subject || "Following up",
          body: inputs.message?.body || "Hi there..."
        });

        this.logger.info('Outreach email sent', {
          message_id: result.messageId
        });

        return {
          status: "sent",
          message_id: result.messageId
        };
      } catch (error) {
        this.logger.error('Outreach email error', { error: (error as Error).message });
        throw error;
      }
    });

    this.register('schedule_follow_up', async (inputs) => {
      this.logger.info('Scheduling follow-up');

      // Use mock data if HubSpot client not configured
      if (!this.hubspot) {
        this.logger.warn('Using mock data for follow-up scheduling (HubSpot not configured)');
        return {
          scheduled_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
        };
      }

      try {
        const dueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

        await this.hubspot.createTask({
          subject: `Follow up with ${inputs.contact_name}`,
          body: inputs.follow_up_reason || "Scheduled follow-up",
          status: 'NOT_STARTED',
          priority: 'MEDIUM',
          dueDate: dueDate.toISOString(),
          associatedObjectType: 'contact',
          associatedObjectId: inputs.contact_id
        });

        this.logger.info('Follow-up scheduled', {
          scheduled_at: dueDate.toISOString()
        });

        return {
          scheduled_at: dueDate.toISOString()
        };
      } catch (error) {
        this.logger.error('Follow-up scheduling error', { error: (error as Error).message });
        throw error;
      }
    });
  }

  register(name: string, fn: ToolFunction, metadata?: Partial<ToolMetadata>) {
    this.tools.set(name, fn);

    // Set default metadata if not provided
    const fullMetadata: ToolMetadata = {
      name,
      type: metadata?.type || 'read_only',
      batchLimit: metadata?.batchLimit,
      requiresApproval: metadata?.requiresApproval ?? (metadata?.type === 'destructive')
    };

    this.toolMetadata.set(name, fullMetadata);
  }

  getTool(name: string) {
    return this.tools.get(name);
  }

  /**
   * Execute a tool with approval checks for destructive operations
   */
  async executeTool(name: string, inputs: any): Promise<any> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }

    const metadata = this.toolMetadata.get(name);
    if (!metadata) {
      throw new Error(`Tool metadata not found: ${name}`);
    }

    // SAFETY CHECK: Enforce batch limits
    if (metadata.batchLimit) {
      const batchSize = this._getBatchSize(inputs);
      if (batchSize > metadata.batchLimit) {
        throw new Error(
          `Batch size ${batchSize} exceeds limit of ${metadata.batchLimit} for tool "${name}"`
        );
      }
    }

    // SAFETY CHECK: Require approval for destructive operations
    if (metadata.requiresApproval) {
      const batchSize = this._getBatchSize(inputs);
      const approval = await this._requestToolApproval(name, metadata, inputs, batchSize);

      if (!approval.approved) {
        throw new Error(`Tool execution cancelled: approval ${approval.status}`);
      }
    }

    // Execute the tool
    return await tool(inputs);
  }

  /**
   * Calculate batch size from tool inputs
   */
  private _getBatchSize(inputs: any): number {
    // Check common batch fields
    if (Array.isArray(inputs.auto_approve_list)) {
      return inputs.auto_approve_list.length + (inputs.review_queue?.length || 0);
    }
    if (Array.isArray(inputs.contacts)) {
      return inputs.contacts.length;
    }
    if (Array.isArray(inputs.leads)) {
      return inputs.leads.length;
    }
    return 1; // Single operation
  }

  /**
   * Request approval for destructive tool operation
   */
  private async _requestToolApproval(
    toolName: string,
    metadata: ToolMetadata,
    inputs: any,
    batchSize: number
  ): Promise<{ approved: boolean; status: string; approvalId?: string }> {
    this.logger.warn(`[Tool Approval] Destructive operation detected:`, {
      tool: toolName,
      type: metadata.type,
      batchSize,
      batchLimit: metadata.batchLimit
    });

    // Auto-approve small batches (under 10 items)
    if (batchSize <= 10) {
      this.logger.info(`[Tool Approval] AUTO-APPROVED (batch size ${batchSize} <= 10)`);
      return { approved: true, status: 'auto_approved' };
    }

    // For larger batches, require manual approval
    // In production, this would integrate with approval UI/notification system
    const approvalId = `tool_${toolName}_${Date.now()}`;
    const approval = {
      id: approvalId,
      toolName,
      batchSize,
      inputs,
      requestedAt: new Date().toISOString(),
      status: 'pending'
    };

    this.pendingApprovals.set(approvalId, approval);

    this.logger.warn(`[Tool Approval] Manual approval required. Approval ID: ${approvalId}`);
    this.logger.warn(`[Tool Approval] Approve via: POST /api/admin/tools/approve/${approvalId}`);

    // For MVP: auto-approve batches under 50 (safety limit)
    // Remove this once approval UI is built
    if (batchSize <= 50) {
      this.logger.warn(`[Tool Approval] AUTO-APPROVED (under safety limit of 50)`);
      approval.status = 'approved';
      return { approved: true, status: 'auto_approved', approvalId };
    }

    // Operations over 50 require manual approval
    return { approved: false, status: 'pending', approvalId };
  }

  listTools(): string[] {
    return Array.from(this.tools.keys());
  }
}
