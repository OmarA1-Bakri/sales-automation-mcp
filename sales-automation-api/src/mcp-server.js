#!/usr/bin/env node

/**
 * Sales Automation MCP Server
 *
 * Orchestrates background jobs for:
 * - Lead discovery and sourcing
 * - Multi-source data enrichment (Explorium, Apollo, LinkedIn)
 * - HubSpot CRM synchronization
 * - lemlist outreach campaign management
 * - Job queue management and status tracking
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { JobQueue } from './utils/job-queue.js';
import { RateLimiter } from './utils/rate-limiter.js';
import { Database } from './utils/database.js';

// Import API clients
import { HubSpotClient } from './clients/hubspot-client.js';
import { ExploriumClient } from './clients/explorium-client.js';
import { LemlistClient } from './clients/lemlist-client.js';
import { ApolloClient } from './clients/apollo-client.js';
import { LinkedInClient } from './clients/linkedin-client.js';

// Import workers
import { EnrichmentWorker } from './workers/enrichment-worker.js';
import { CRMSyncWorker } from './workers/crm-sync-worker.js';
import { OutreachWorker } from './workers/outreach-worker.js';
import { LeadDiscoveryWorker } from './workers/lead-discovery-worker.js';
import { ImportWorker } from './workers/import-worker.js';

// Import YOLO Manager
import { YoloManager } from './utils/yolo-manager.js';

class SalesAutomationMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'sales-automation-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Initialize components
    this.jobQueue = new JobQueue();
    this.database = new Database();
    this.rateLimiter = new RateLimiter();

    // Initialize API clients
    this.clients = {
      hubspot: new HubSpotClient(process.env.HUBSPOT_API_KEY),
      explorium: new ExploriumClient(process.env.EXPLORIUM_API_KEY),
      lemlist: new LemlistClient(process.env.LEMLIST_API_KEY),
      apollo: new ApolloClient(process.env.APOLLO_API_KEY),
      linkedin: new LinkedInClient(process.env.LINKEDIN_SESSION_COOKIE),
    };

    // Initialize workers
    this.workers = {
      enrichment: new EnrichmentWorker(this.clients, this.database),
      crmSync: new CRMSyncWorker(this.clients.hubspot, this.database),
      outreach: new OutreachWorker(this.clients.lemlist, this.database),
      leadDiscovery: new LeadDiscoveryWorker(this.clients, this.database),
      import: new ImportWorker(this.clients, this.database),
    };

    // Initialize YOLO Manager
    this.yoloManager = new YoloManager(this.workers, this.database);

    this.setupHandlers();
    this.startBackgroundWorkers();
  }

  setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        // Lead Discovery Tools
        {
          name: 'discover_leads_icp',
          description: 'Search for leads matching ICP profile from multiple sources',
          inputSchema: {
            type: 'object',
            properties: {
              icp_profile_id: {
                type: 'string',
                description: 'ICP profile identifier (e.g., icp_fintech_vp_finance)',
              },
              sources: {
                type: 'array',
                items: { type: 'string', enum: ['linkedin', 'apollo', 'intent'] },
                description: 'Data sources to search',
                default: ['apollo', 'linkedin'],
              },
              limit: {
                type: 'number',
                description: 'Maximum number of leads to return',
                default: 100,
              },
              min_score: {
                type: 'number',
                description: 'Minimum composite score threshold (0.0-1.0)',
                default: 0.70,
              },
            },
            required: ['icp_profile_id'],
          },
        },
        {
          name: 'discover_leads_account',
          description: 'Find contacts at specific target companies',
          inputSchema: {
            type: 'object',
            properties: {
              company_name: { type: 'string' },
              company_domain: { type: 'string' },
              target_titles: {
                type: 'array',
                items: { type: 'string' },
                description: 'Target job titles to find',
              },
              include_hierarchy: {
                type: 'boolean',
                description: 'Include org chart hierarchy',
                default: false,
              },
            },
            required: ['company_domain'],
          },
        },
        {
          name: 'discover_leads_intent',
          description: 'Find leads showing recent buying intent signals',
          inputSchema: {
            type: 'object',
            properties: {
              signals: {
                type: 'array',
                items: { type: 'string', enum: ['funding', 'hiring', 'tech_adoption'] },
                description: 'Intent signal types to search for',
              },
              timeframe_days: {
                type: 'number',
                description: 'Look back period in days',
                default: 30,
              },
              min_signal_strength: {
                type: 'number',
                description: 'Minimum signal strength (0.0-1.0)',
                default: 0.6,
              },
            },
            required: ['signals'],
          },
        },

        // Enrichment Tools
        {
          name: 'enrich_contact',
          description: 'Enrich a single contact with multi-source data and intelligence',
          inputSchema: {
            type: 'object',
            properties: {
              email: { type: 'string' },
              first_name: { type: 'string' },
              last_name: { type: 'string' },
              company_domain: { type: 'string' },
              linkedin_url: { type: 'string' },
              sources: {
                type: 'array',
                items: { type: 'string', enum: ['explorium', 'apollo', 'linkedin', 'clearbit'] },
                default: ['explorium', 'apollo'],
              },
              generate_intelligence: {
                type: 'boolean',
                description: 'Generate pain hypothesis, hooks, and why-now',
                default: true,
              },
            },
            required: ['email'],
          },
        },
        {
          name: 'enrich_company',
          description: 'Enrich company with firmographic and technographic data',
          inputSchema: {
            type: 'object',
            properties: {
              domain: { type: 'string', description: 'Company domain' },
              fields: {
                type: 'array',
                items: { type: 'string' },
                description: 'Specific fields to enrich',
              },
              include_confidence: {
                type: 'boolean',
                default: true,
              },
            },
            required: ['domain'],
          },
        },
        {
          name: 'enrich_batch',
          description: 'Submit batch enrichment job (background processing)',
          inputSchema: {
            type: 'object',
            properties: {
              contacts: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    email: { type: 'string' },
                    first_name: { type: 'string' },
                    last_name: { type: 'string' },
                    company_domain: { type: 'string' },
                  },
                },
                description: 'List of contacts to enrich (max 500)',
              },
              sources: {
                type: 'array',
                items: { type: 'string' },
                default: ['explorium', 'apollo'],
              },
              priority: {
                type: 'string',
                enum: ['low', 'normal', 'high'],
                default: 'normal',
              },
            },
            required: ['contacts'],
          },
        },
        {
          name: 'verify_email',
          description: 'Verify email deliverability',
          inputSchema: {
            type: 'object',
            properties: {
              email: { type: 'string' },
            },
            required: ['email'],
          },
        },

        // HubSpot CRM Tools
        {
          name: 'hubspot_create_contact',
          description: 'Create contact in HubSpot',
          inputSchema: {
            type: 'object',
            properties: {
              properties: {
                type: 'object',
                description: 'Contact properties',
              },
            },
            required: ['properties'],
          },
        },
        {
          name: 'hubspot_update_contact',
          description: 'Update existing HubSpot contact',
          inputSchema: {
            type: 'object',
            properties: {
              contact_id: { type: 'string' },
              email: { type: 'string' },
              properties: { type: 'object' },
            },
          },
        },
        {
          name: 'hubspot_search',
          description: 'Search HubSpot contacts/companies',
          inputSchema: {
            type: 'object',
            properties: {
              object_type: {
                type: 'string',
                enum: ['contact', 'company'],
                default: 'contact',
              },
              filter_groups: {
                type: 'array',
                items: { type: 'object' },
              },
              query: { type: 'string' },
              limit: { type: 'number', default: 10 },
            },
          },
        },
        {
          name: 'hubspot_create_company',
          description: 'Create company in HubSpot',
          inputSchema: {
            type: 'object',
            properties: {
              properties: { type: 'object' },
            },
            required: ['properties'],
          },
        },
        {
          name: 'hubspot_associate',
          description: 'Create association between HubSpot objects',
          inputSchema: {
            type: 'object',
            properties: {
              from_object: { type: 'string' },
              from_id: { type: 'string' },
              to_object: { type: 'string' },
              to_id: { type: 'string' },
              association_type: { type: 'string' },
            },
            required: ['from_object', 'from_id', 'to_object', 'to_id'],
          },
        },
        {
          name: 'hubspot_create_deal',
          description: 'Create deal in HubSpot',
          inputSchema: {
            type: 'object',
            properties: {
              email: { type: 'string' },
              deal_name: { type: 'string' },
              stage: { type: 'string' },
              amount: { type: 'number' },
            },
            required: ['deal_name'],
          },
        },
        {
          name: 'hubspot_create_task',
          description: 'Create task in HubSpot',
          inputSchema: {
            type: 'object',
            properties: {
              email: { type: 'string' },
              contact_id: { type: 'string' },
              task_type: { type: 'string' },
              due_date: { type: 'string' },
              priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
            },
          },
        },
        {
          name: 'hubspot_create_note',
          description: 'Create note on HubSpot contact',
          inputSchema: {
            type: 'object',
            properties: {
              contact_id: { type: 'string' },
              note_body: { type: 'string' },
            },
            required: ['contact_id', 'note_body'],
          },
        },
        {
          name: 'hubspot_log_email',
          description: 'Log email activity in HubSpot',
          inputSchema: {
            type: 'object',
            properties: {
              email: { type: 'string' },
              direction: { type: 'string', enum: ['inbound', 'outbound'] },
              subject: { type: 'string' },
              body: { type: 'string' },
            },
            required: ['email', 'direction', 'subject'],
          },
        },
        {
          name: 'hubspot_create_timeline_event',
          description: 'Create custom timeline event',
          inputSchema: {
            type: 'object',
            properties: {
              contact_id: { type: 'string' },
              event_type: { type: 'string' },
              properties: { type: 'object' },
            },
            required: ['contact_id', 'event_type'],
          },
        },

        // lemlist Tools
        {
          name: 'lemlist_create_campaign',
          description: 'Create lemlist outreach campaign',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              settings: { type: 'object' },
            },
            required: ['name'],
          },
        },
        {
          name: 'lemlist_add_lead',
          description: 'Add lead to lemlist campaign',
          inputSchema: {
            type: 'object',
            properties: {
              campaign_id: { type: 'string' },
              email: { type: 'string' },
              firstName: { type: 'string' },
              lastName: { type: 'string' },
              companyName: { type: 'string' },
              customFields: { type: 'object' },
              tags: { type: 'array', items: { type: 'string' } },
            },
            required: ['campaign_id', 'email'],
          },
        },
        {
          name: 'lemlist_get_stats',
          description: 'Get campaign performance statistics',
          inputSchema: {
            type: 'object',
            properties: {
              campaign_id: { type: 'string' },
              since: { type: 'string' },
              metrics: { type: 'array', items: { type: 'string' } },
            },
            required: ['campaign_id'],
          },
        },
        {
          name: 'lemlist_pause_campaign',
          description: 'Pause campaign for specific contact',
          inputSchema: {
            type: 'object',
            properties: {
              email: { type: 'string' },
              campaign_id: { type: 'string' },
              reason: { type: 'string' },
            },
            required: ['email', 'campaign_id'],
          },
        },

        // Job Management Tools
        {
          name: 'submit_job',
          description: 'Submit background job to queue',
          inputSchema: {
            type: 'object',
            properties: {
              job_type: {
                type: 'string',
                enum: ['enrich_batch', 'discover_leads', 'sync_crm', 'launch_outreach'],
              },
              parameters: { type: 'object' },
              priority: { type: 'string', enum: ['low', 'normal', 'high'] },
            },
            required: ['job_type', 'parameters'],
          },
        },
        {
          name: 'get_job_status',
          description: 'Check status of background job',
          inputSchema: {
            type: 'object',
            properties: {
              job_id: { type: 'string' },
            },
            required: ['job_id'],
          },
        },
        {
          name: 'list_jobs',
          description: 'List all jobs with optional filters',
          inputSchema: {
            type: 'object',
            properties: {
              status: {
                type: 'string',
                enum: ['pending', 'processing', 'completed', 'failed'],
              },
              limit: { type: 'number', default: 50 },
            },
          },
        },
        {
          name: 'cancel_job',
          description: 'Cancel a pending or running job',
          inputSchema: {
            type: 'object',
            properties: {
              job_id: { type: 'string' },
            },
            required: ['job_id'],
          },
        },

        // YOLO Mode Tools (Autonomous Operation)
        {
          name: 'yolo_enable',
          description: 'Enable YOLO mode for fully autonomous sales automation',
          inputSchema: {
            type: 'object',
            properties: {
              config_path: {
                type: 'string',
                description: 'Path to YOLO config file',
                default: '.sales-automation/yolo-config.yaml',
              },
              test_mode: {
                type: 'boolean',
                description: 'Run in test mode (no actual outreach)',
                default: false,
              },
            },
          },
        },
        {
          name: 'yolo_disable',
          description: 'Disable YOLO mode and stop autonomous operation',
          inputSchema: {
            type: 'object',
            properties: {
              immediate: {
                type: 'boolean',
                description: 'Stop immediately (true) or finish current cycle (false)',
                default: false,
              },
            },
          },
        },
        {
          name: 'yolo_status',
          description: 'Get YOLO mode status and activity summary',
          inputSchema: {
            type: 'object',
            properties: {
              detailed: {
                type: 'boolean',
                description: 'Include detailed breakdown of activities',
                default: true,
              },
            },
          },
        },
        {
          name: 'yolo_pause',
          description: 'Temporarily pause YOLO mode (can be resumed)',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'yolo_resume',
          description: 'Resume YOLO mode after pause',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'yolo_emergency_stop',
          description: 'Emergency stop: immediately halt all YOLO activities and pause campaigns',
          inputSchema: {
            type: 'object',
            properties: {
              reason: {
                type: 'string',
                description: 'Reason for emergency stop',
              },
            },
          },
        },
        {
          name: 'yolo_trigger_cycle',
          description: 'Manually trigger a YOLO cycle (discovery → enrich → sync → outreach)',
          inputSchema: {
            type: 'object',
            properties: {
              skip_steps: {
                type: 'array',
                items: {
                  type: 'string',
                  enum: ['discovery', 'enrichment', 'sync', 'outreach'],
                },
                description: 'Steps to skip in this cycle',
              },
            },
          },
        },
        {
          name: 'yolo_get_config',
          description: 'Get current YOLO mode configuration',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'yolo_update_config',
          description: 'Update YOLO mode configuration',
          inputSchema: {
            type: 'object',
            properties: {
              config: {
                type: 'object',
                description: 'Configuration updates to apply',
              },
              restart: {
                type: 'boolean',
                description: 'Restart YOLO mode with new config',
                default: false,
              },
            },
            required: ['config'],
          },
        },
        {
          name: 'yolo_get_activity',
          description: 'Get YOLO mode activity log for specified date range',
          inputSchema: {
            type: 'object',
            properties: {
              from_date: {
                type: 'string',
                description: 'Start date (ISO format)',
              },
              to_date: {
                type: 'string',
                description: 'End date (ISO format)',
              },
              limit: {
                type: 'number',
                default: 100,
              },
            },
          },
        },
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        let result;

        switch (name) {
          // Lead Discovery
          case 'discover_leads_icp':
            result = await this.workers.leadDiscovery.discoverByICP(args);
            break;
          case 'discover_leads_account':
            result = await this.workers.leadDiscovery.discoverByAccount(args);
            break;
          case 'discover_leads_intent':
            result = await this.workers.leadDiscovery.discoverByIntent(args);
            break;

          // Enrichment
          case 'enrich_contact':
            result = await this.workers.enrichment.enrichContact(args);
            break;
          case 'enrich_company':
            result = await this.workers.enrichment.enrichCompany(args);
            break;
          case 'enrich_batch':
            result = await this.submitBatchJob('enrich_batch', args);
            break;
          case 'verify_email':
            result = await this.workers.enrichment.verifyEmail(args.email);
            break;

          // HubSpot
          case 'hubspot_create_contact':
            result = await this.clients.hubspot.createContact(args.properties);
            break;
          case 'hubspot_update_contact':
            result = await this.clients.hubspot.updateContact(args);
            break;
          case 'hubspot_search':
            result = await this.clients.hubspot.search(args);
            break;
          case 'hubspot_create_company':
            result = await this.clients.hubspot.createCompany(args.properties);
            break;
          case 'hubspot_associate':
            result = await this.clients.hubspot.associate(args);
            break;
          case 'hubspot_create_deal':
            result = await this.clients.hubspot.createDeal(args);
            break;
          case 'hubspot_create_task':
            result = await this.clients.hubspot.createTask(args);
            break;
          case 'hubspot_create_note':
            result = await this.clients.hubspot.createNote(args);
            break;
          case 'hubspot_log_email':
            result = await this.clients.hubspot.logEmail(args);
            break;
          case 'hubspot_create_timeline_event':
            result = await this.clients.hubspot.createTimelineEvent(args);
            break;

          // lemlist
          case 'lemlist_create_campaign':
            result = await this.clients.lemlist.createCampaign(args);
            break;
          case 'lemlist_add_lead':
            result = await this.clients.lemlist.addLead(args);
            break;
          case 'lemlist_get_stats':
            result = await this.clients.lemlist.getStats(args);
            break;
          case 'lemlist_pause_campaign':
            result = await this.clients.lemlist.pauseCampaign(args);
            break;

          // Job Management
          case 'submit_job':
            result = await this.submitJob(args);
            break;
          case 'get_job_status':
            result = await this.getJobStatus(args.job_id);
            break;
          case 'list_jobs':
            result = await this.listJobs(args);
            break;
          case 'cancel_job':
            result = await this.cancelJob(args.job_id);
            break;

          // YOLO Mode
          case 'yolo_enable':
            result = await this.yoloEnable(args);
            break;
          case 'yolo_disable':
            result = await this.yoloDisable(args);
            break;
          case 'yolo_status':
            result = await this.yoloGetStatus(args);
            break;
          case 'yolo_pause':
            result = await this.yoloPause();
            break;
          case 'yolo_resume':
            result = await this.yoloResume();
            break;
          case 'yolo_emergency_stop':
            result = await this.yoloEmergencyStop(args);
            break;
          case 'yolo_trigger_cycle':
            result = await this.yoloTriggerCycle(args);
            break;
          case 'yolo_get_config':
            result = await this.yoloGetConfig();
            break;
          case 'yolo_update_config':
            result = await this.yoloUpdateConfig(args);
            break;
          case 'yolo_get_activity':
            result = await this.yoloGetActivity(args);
            break;

          default:
            throw new Error(`Unknown tool: ${name}`);
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: error.message,
                tool: name,
                arguments: args,
              }, null, 2),
            },
          ],
          isError: true,
        };
      }
    });
  }

  async submitJob(args) {
    const job = await this.jobQueue.enqueue(args.job_type, args.parameters, args.priority);
    return {
      job_id: job.id,
      status: 'queued',
      message: 'Job submitted successfully',
    };
  }

  async submitBatchJob(type, args) {
    const job = await this.jobQueue.enqueue(type, args, 'normal');
    return {
      job_id: job.id,
      status: 'queued',
      total_items: args.contacts?.length || 0,
      estimated_time_minutes: Math.ceil((args.contacts?.length || 0) / 10),
    };
  }

  async getJobStatus(jobId) {
    return await this.jobQueue.getStatus(jobId);
  }

  async listJobs(filters) {
    return await this.jobQueue.list(filters);
  }

  async cancelJob(jobId) {
    return await this.jobQueue.cancel(jobId);
  }

  // ==========================================================================
  // YOLO MODE METHODS
  // ==========================================================================

  async yoloEnable(args) {
    return await this.yoloManager.enable(args);
  }

  async yoloDisable(args) {
    return await this.yoloManager.disable(args);
  }

  async yoloGetStatus(args) {
    return await this.yoloManager.getStatus(args);
  }

  async yoloPause() {
    return await this.yoloManager.pause();
  }

  async yoloResume() {
    return await this.yoloManager.resume();
  }

  async yoloEmergencyStop(args) {
    return await this.yoloManager.emergencyStop(args);
  }

  async yoloTriggerCycle(args) {
    return await this.yoloManager.triggerCycle(args);
  }

  async yoloGetConfig() {
    return await this.yoloManager.getConfig();
  }

  async yoloUpdateConfig(args) {
    return await this.yoloManager.updateConfig(args);
  }

  async yoloGetActivity(args) {
    return await this.yoloManager.getActivity(args);
  }

  // ==========================================================================
  // BACKGROUND WORKERS
  // ==========================================================================

  startBackgroundWorkers() {
    // Poll job queue every 10 seconds
    setInterval(async () => {
      try {
        const job = await this.jobQueue.dequeue();
        if (job) {
          await this.processJob(job);
        }
      } catch (error) {
        console.error('Background worker error:', error);
      }
    }, 10000);
  }

  async processJob(job) {
    try {
      await this.jobQueue.updateStatus(job.id, 'processing');

      let result;
      switch (job.type) {
        case 'enrich_batch':
          result = await this.workers.enrichment.processBatch(job.parameters);
          break;
        case 'discover_leads':
          result = await this.workers.leadDiscovery.processJob(job.parameters);
          break;
        case 'sync_crm':
          result = await this.workers.crmSync.syncBatch(job.parameters);
          break;
        case 'launch_outreach':
          result = await this.workers.outreach.launchCampaign(job.parameters);
          break;
        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }

      await this.jobQueue.updateStatus(job.id, 'completed', result);
    } catch (error) {
      await this.jobQueue.updateStatus(job.id, 'failed', { error: error.message });
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Sales Automation MCP Server running on stdio');
  }
}

// Start the server
const server = new SalesAutomationMCPServer();
server.run().catch(console.error);
