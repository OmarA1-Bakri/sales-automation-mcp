#!/usr/bin/env node

/**
 * MCP Server for Lemlist.com Integration
 * Provides comprehensive Lemlist API access through Model Context Protocol
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import express from 'express';
import dotenv from 'dotenv';
import { LemlistClient } from './lemlist-client.js';

dotenv.config();

class LemlistMCPServer {
  constructor() {
    this.server = new Server({
      name: 'lemlist-mcp-server',
      version: '1.0.0',
    }, {
      capabilities: {
        tools: {},
      },
    });

    // Initialize with placeholder client - will be replaced per request in HTTP mode
    this.lemlistClient = new LemlistClient({
      apiKey: process.env.LEMLIST_API_KEY || 'placeholder',
    });

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  async getToolsList() {
    return {
      tools: [
          // === CAMPAIGN MANAGEMENT ===
          {
            name: 'get_campaigns',
            description: 'Retrieve all campaigns from Lemlist',
            inputSchema: {
              type: 'object',
              properties: {
                limit: {
                  type: 'number',
                  description: 'Limit number of campaigns returned',
                  default: 100
                },
                offset: {
                  type: 'number', 
                  description: 'Offset for pagination',
                  default: 0
                }
              }
            }
          },
          {
            name: 'get_campaign',
            description: 'Get details of a specific campaign',
            inputSchema: {
              type: 'object',
              properties: {
                campaignId: {
                  type: 'string',
                  description: 'Campaign ID',
                  required: true
                }
              },
              required: ['campaignId']
            }
          },
          {
            name: 'create_campaign',
            description: 'Create a new email campaign',
            inputSchema: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  description: 'Campaign name',
                  required: true
                },
                emails: {
                  type: 'array',
                  description: 'Array of email templates',
                  items: {
                    type: 'object',
                    properties: {
                      subject: { type: 'string' },
                      body: { type: 'string' },
                      delay: { type: 'number' }
                    }
                  }
                },
                settings: {
                  type: 'object',
                  description: 'Campaign settings',
                  properties: {
                    trackOpens: { type: 'boolean', default: true },
                    trackClicks: { type: 'boolean', default: true }
                  }
                }
              },
              required: ['name']
            }
          },
          {
            name: 'update_campaign',
            description: 'Update an existing campaign',
            inputSchema: {
              type: 'object',
              properties: {
                campaignId: {
                  type: 'string',
                  description: 'Campaign ID',
                  required: true
                },
                name: { type: 'string' },
                emails: { type: 'array' },
                settings: { type: 'object' }
              },
              required: ['campaignId']
            }
          },
          {
            name: 'delete_campaign',
            description: 'Delete a campaign',
            inputSchema: {
              type: 'object',
              properties: {
                campaignId: {
                  type: 'string',
                  description: 'Campaign ID',
                  required: true
                }
              },
              required: ['campaignId']
            }
          },

          // === LEAD MANAGEMENT ===
          {
            name: 'get_leads',
            description: 'Retrieve all leads',
            inputSchema: {
              type: 'object',
              properties: {
                campaignId: {
                  type: 'string',
                  description: 'Filter by campaign ID'
                },
                limit: {
                  type: 'number',
                  default: 100
                },
                offset: {
                  type: 'number',
                  default: 0
                }
              }
            }
          },
          {
            name: 'add_lead',
            description: 'Add a lead to a campaign',
            inputSchema: {
              type: 'object',
              properties: {
                campaignId: {
                  type: 'string',
                  description: 'Campaign ID',
                  required: true
                },
                email: {
                  type: 'string',
                  description: 'Lead email address',
                  required: true
                },
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                companyName: { type: 'string' },
                customFields: { type: 'object' }
              },
              required: ['campaignId', 'email']
            }
          },
          {
            name: 'bulk_add_leads',
            description: 'Add multiple leads to a campaign',
            inputSchema: {
              type: 'object',
              properties: {
                campaignId: {
                  type: 'string',
                  description: 'Campaign ID',
                  required: true
                },
                leads: {
                  type: 'array',
                  description: 'Array of leads',
                  items: {
                    type: 'object',
                    properties: {
                      email: { type: 'string', required: true },
                      firstName: { type: 'string' },
                      lastName: { type: 'string' },
                      companyName: { type: 'string' },
                      customFields: { type: 'object' }
                    }
                  }
                }
              },
              required: ['campaignId', 'leads']
            }
          },
          {
            name: 'update_lead',
            description: 'Update lead information',
            inputSchema: {
              type: 'object',
              properties: {
                leadId: {
                  type: 'string',
                  description: 'Lead ID',
                  required: true
                },
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                companyName: { type: 'string' },
                customFields: { type: 'object' }
              },
              required: ['leadId']
            }
          },
          {
            name: 'delete_lead',
            description: 'Remove a lead from campaign',
            inputSchema: {
              type: 'object',
              properties: {
                leadId: {
                  type: 'string',
                  description: 'Lead ID',
                  required: true
                }
              },
              required: ['leadId']
            }
          },

          // === ACTIVITY & ANALYTICS ===
          {
            name: 'get_activities',
            description: 'Get campaign activities and statistics',
            inputSchema: {
              type: 'object',
              properties: {
                campaignId: {
                  type: 'string',
                  description: 'Campaign ID'
                },
                leadId: {
                  type: 'string',
                  description: 'Lead ID'
                },
                type: {
                  type: 'string',
                  enum: ['emailsSent', 'emailsOpened', 'emailsClicked', 'emailsReplied', 'emailsBounced'],
                  description: 'Activity type filter'
                },
                limit: {
                  type: 'number',
                  default: 100
                }
              }
            }
          },
          {
            name: 'get_campaign_stats',
            description: 'Get detailed campaign statistics',
            inputSchema: {
              type: 'object',
              properties: {
                campaignId: {
                  type: 'string',
                  description: 'Campaign ID',
                  required: true
                }
              },
              required: ['campaignId']
            }
          },

          // === TEAM & ACCOUNT MANAGEMENT ===
          {
            name: 'get_team_members',
            description: 'Get all team members',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          },
          {
            name: 'get_account_info',
            description: 'Get account information and limits',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          },

          // === TEMPLATES ===
          {
            name: 'get_templates',
            description: 'Get all email templates',
            inputSchema: {
              type: 'object',
              properties: {
                limit: {
                  type: 'number',
                  default: 100
                }
              }
            }
          },
          {
            name: 'create_template',
            description: 'Create a new email template',
            inputSchema: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  description: 'Template name',
                  required: true
                },
                subject: {
                  type: 'string',
                  description: 'Email subject template',
                  required: true
                },
                body: {
                  type: 'string',
                  description: 'Email body template',
                  required: true
                },
                variables: {
                  type: 'array',
                  description: 'Available template variables'
                }
              },
              required: ['name', 'subject', 'body']
            }
          },

          // === HIGH-LEVEL WORKFLOW TOOLS ===
          {
            name: 'create_complete_campaign',
            description: 'Create a complete campaign with leads in one operation',
            inputSchema: {
              type: 'object',
              properties: {
                campaignName: {
                  type: 'string',
                  required: true
                },
                emailSequence: {
                  type: 'array',
                  description: 'Array of emails in sequence',
                  items: {
                    type: 'object',
                    properties: {
                      subject: { type: 'string' },
                      body: { type: 'string' },
                      delay: { type: 'number' }
                    }
                  }
                },
                leads: {
                  type: 'array',
                  description: 'Initial leads to add'
                },
                settings: { type: 'object' }
              },
              required: ['campaignName', 'emailSequence']
            }
          },

          // === UNSUBSCRIBE MANAGEMENT ===
          {
            name: 'get_unsubscribes',
            description: 'Get all unsubscribed leads',
            inputSchema: {
              type: 'object',
              properties: {
                limit: { type: 'number', default: 100 },
                offset: { type: 'number', default: 0 }
              }
            }
          },
          {
            name: 'add_to_unsubscribes',
            description: 'Add email to unsubscribed list',
            inputSchema: {
              type: 'object',
              properties: {
                email: {
                  type: 'string',
                  description: 'Email address to unsubscribe',
                  required: true
                }
              },
              required: ['email']
            }
          },
          {
            name: 'remove_from_unsubscribes',
            description: 'Remove email from unsubscribed list',
            inputSchema: {
              type: 'object',
              properties: {
                email: {
                  type: 'string',
                  description: 'Email address to resubscribe',
                  required: true
                }
              },
              required: ['email']
            }
          },
          {
            name: 'unsubscribe_from_campaign',
            description: 'Unsubscribe lead from specific campaign',
            inputSchema: {
              type: 'object',
              properties: {
                campaignId: {
                  type: 'string',
                  description: 'Campaign ID',
                  required: true
                },
                leadId: {
                  type: 'string',
                  description: 'Lead ID',
                  required: true
                }
              },
              required: ['campaignId', 'leadId']
            }
          },

          // === ADVANCED ACTIVITIES ===
          {
            name: 'get_activities_with_filters',
            description: 'Get activities with advanced filtering options',
            inputSchema: {
              type: 'object',
              properties: {
                campaignId: { type: 'string' },
                leadId: { type: 'string' },
                type: { type: 'string' },
                dateFrom: { type: 'string', description: 'Start date (ISO format)' },
                dateTo: { type: 'string', description: 'End date (ISO format)' },
                limit: { type: 'number', default: 100 },
                offset: { type: 'number', default: 0 },
                grouped: { type: 'boolean', default: false }
              }
            }
          },
          {
            name: 'get_activity_types',
            description: 'Get all available activity types',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          },
          {
            name: 'get_grouped_activities',
            description: 'Get campaign activities grouped by type',
            inputSchema: {
              type: 'object',
              properties: {
                campaignId: {
                  type: 'string',
                  description: 'Campaign ID',
                  required: true
                },
                groupBy: {
                  type: 'string',
                  enum: ['type', 'date', 'lead'],
                  default: 'type'
                }
              },
              required: ['campaignId']
            }
          },

          // === WEBHOOKS ===
          {
            name: 'create_webhook',
            description: 'Create a webhook for real-time events',
            inputSchema: {
              type: 'object',
              properties: {
                url: {
                  type: 'string',
                  description: 'Webhook URL',
                  required: true
                },
                events: {
                  type: 'array',
                  description: 'Events to subscribe to',
                  items: {
                    type: 'string',
                    enum: ['lead.added', 'email.sent', 'email.opened', 'email.clicked', 'email.replied', 'lead.unsubscribed']
                  }
                },
                active: { type: 'boolean', default: true }
              },
              required: ['url', 'events']
            }
          },
          {
            name: 'get_webhooks',
            description: 'Get all configured webhooks',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          },
          {
            name: 'update_webhook',
            description: 'Update an existing webhook',
            inputSchema: {
              type: 'object',
              properties: {
                webhookId: {
                  type: 'string',
                  description: 'Webhook ID',
                  required: true
                },
                url: { type: 'string' },
                events: { type: 'array' },
                active: { type: 'boolean' }
              },
              required: ['webhookId']
            }
          },
          {
            name: 'delete_webhook',
            description: 'Delete a webhook',
            inputSchema: {
              type: 'object',
              properties: {
                webhookId: {
                  type: 'string',
                  description: 'Webhook ID',
                  required: true
                }
              },
              required: ['webhookId']
            }
          },

          // === ADVANCED SEARCH ===
          {
            name: 'search_leads_advanced',
            description: 'Advanced lead search with multiple filters',
            inputSchema: {
              type: 'object',
              properties: {
                email: { type: 'string' },
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                companyName: { type: 'string' },
                campaignId: { type: 'string' },
                status: { type: 'string' },
                dateFrom: { type: 'string' },
                dateTo: { type: 'string' },
                customFields: { type: 'object' },
                limit: { type: 'number', default: 100 },
                offset: { type: 'number', default: 0 }
              }
            }
          },
          {
            name: 'search_campaigns',
            description: 'Search campaigns by name, status, and date',
            inputSchema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                status: { type: 'string' },
                dateFrom: { type: 'string' },
                dateTo: { type: 'string' },
                limit: { type: 'number', default: 100 },
                offset: { type: 'number', default: 0 }
              }
            }
          },

          // === ENHANCED ANALYTICS ===
          {
            name: 'get_detailed_campaign_stats',
            description: 'Get detailed campaign statistics with date range',
            inputSchema: {
              type: 'object',
              properties: {
                campaignId: {
                  type: 'string',
                  description: 'Campaign ID',
                  required: true
                },
                dateFrom: { type: 'string' },
                dateTo: { type: 'string' },
                includeLeadStats: { type: 'boolean', default: true },
                includeEmailStats: { type: 'boolean', default: true },
                includeLinkedInStats: { type: 'boolean', default: false }
              },
              required: ['campaignId']
            }
          },
          {
            name: 'get_multi_campaign_stats',
            description: 'Get statistics for multiple campaigns',
            inputSchema: {
              type: 'object',
              properties: {
                campaignIds: {
                  type: 'array',
                  description: 'Array of campaign IDs',
                  items: { type: 'string' }
                },
                dateFrom: { type: 'string' },
                dateTo: { type: 'string' }
              },
              required: ['campaignIds']
            }
          },

          // === LINKEDIN ENRICHMENT ===
          {
            name: 'search_database_for_linkedin',
            description: 'Search Lemlist database directly for LinkedIn URLs (faster than enrichment)',
            inputSchema: {
              type: 'object',
              properties: {
                filters: {
                  type: 'array',
                  description: 'Array of filter objects with filterId, in, and out properties',
                  items: {
                    type: 'object',
                    properties: {
                      filterId: { type: 'string', description: 'Filter field (country, industry, etc.)' },
                      in: { type: 'array', description: 'Values to include' },
                      out: { type: 'array', description: 'Values to exclude' }
                    }
                  },
                  default: []
                },
                page: {
                  type: 'number',
                  description: 'Page number for results',
                  default: 1
                }
              }
            }
          },
          {
            name: 'search_and_enrich_person',
            description: 'Search for a person and get their real LinkedIn URL via Lemlist enrichment',
            inputSchema: {
              type: 'object',
              properties: {
                firstName: {
                  type: 'string',
                  description: 'First name of the person',
                  required: true
                },
                lastName: {
                  type: 'string',
                  description: 'Last name of the person',
                  required: true
                },
                companyDomain: {
                  type: 'string',
                  description: 'Company domain (e.g., hyro.ai)',
                  required: true
                }
              },
              required: ['firstName', 'lastName', 'companyDomain']
            }
          },
          {
            name: 'enrich_lead_linkedin',
            description: 'Enrich an existing lead with real LinkedIn URL',
            inputSchema: {
              type: 'object',
              properties: {
                leadId: {
                  type: 'string',
                  description: 'Lead ID to enrich',
                  required: true
                }
              },
              required: ['leadId']
            }
          },
          {
            name: 'get_enriched_lead_data',
            description: 'Get the enriched lead data including real LinkedIn URL',
            inputSchema: {
              type: 'object',
              properties: {
                leadId: {
                  type: 'string',
                  description: 'Lead ID to check for enrichment data',
                  required: true
                }
              },
              required: ['leadId']
            }
          },

          // === IMPORT/EXPORT ===
          {
            name: 'export_leads',
            description: 'Export leads from a campaign',
            inputSchema: {
              type: 'object',
              properties: {
                campaignId: {
                  type: 'string',
                  description: 'Campaign ID',
                  required: true
                },
                format: {
                  type: 'string',
                  enum: ['csv', 'json'],
                  default: 'csv'
                }
              },
              required: ['campaignId']
            }
          },
          {
            name: 'validate_lead_data',
            description: 'Validate lead data before import',
            inputSchema: {
              type: 'object',
              properties: {
                leads: {
                  type: 'array',
                  description: 'Array of leads to validate',
                  items: {
                    type: 'object',
                    properties: {
                      email: { type: 'string' },
                      firstName: { type: 'string' },
                      lastName: { type: 'string' },
                      companyName: { type: 'string' }
                    }
                  }
                }
              },
              required: ['leads']
            }
          },

          // === RATE LIMITING ===
          {
            name: 'get_rate_limit_status',
            description: 'Get current API rate limit status',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          },

          // === UTILITY TOOLS ===
          {
            name: 'health_check',
            description: 'Check Lemlist API connection and server health',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          }
        ]
    };
  }

  async callTool(params) {
    const { name, arguments: args } = params;
      
      try {
        let result;

        switch (name) {
          // Campaign Management
          case 'get_campaigns':
            result = await this.lemlistClient.getCampaigns(args);
            break;

          case 'get_campaign':
            result = await this.lemlistClient.getCampaign(args.campaignId);
            break;

          case 'create_campaign':
            result = await this.lemlistClient.createCampaign(args);
            break;

          case 'update_campaign':
            result = await this.lemlistClient.updateCampaign(args.campaignId, args);
            break;

          case 'delete_campaign':
            result = await this.lemlistClient.deleteCampaign(args.campaignId);
            break;

          // Lead Management
          case 'get_leads':
            result = await this.lemlistClient.getLeads(args);
            break;

          case 'add_lead':
            result = await this.lemlistClient.addLead(args);
            break;

          case 'bulk_add_leads':
            result = await this.lemlistClient.bulkAddLeads(args.campaignId, args.leads);
            break;

          case 'update_lead':
            result = await this.lemlistClient.updateLead(args.leadId, args);
            break;

          case 'delete_lead':
            result = await this.lemlistClient.deleteLead(args.leadId);
            break;

          // Activity & Analytics
          case 'get_activities':
            result = await this.lemlistClient.getActivities(args);
            break;

          case 'get_campaign_stats':
            result = await this.lemlistClient.getCampaignStats(args.campaignId);
            break;

          // Team & Account
          case 'get_team_members':
            result = await this.lemlistClient.getTeamMembers();
            break;

          case 'get_account_info':
            result = await this.lemlistClient.getAccountInfo();
            break;

          // Templates
          case 'get_templates':
            result = await this.lemlistClient.getTemplates(args);
            break;

          case 'create_template':
            result = await this.lemlistClient.createTemplate(args);
            break;

          // High-level workflows
          case 'create_complete_campaign':
            result = await this.lemlistClient.createCompleteCampaign(args);
            break;

          // Unsubscribe Management
          case 'get_unsubscribes':
            result = await this.lemlistClient.getUnsubscribes(args);
            break;

          case 'add_to_unsubscribes':
            result = await this.lemlistClient.addToUnsubscribes(args.email);
            break;

          case 'remove_from_unsubscribes':
            result = await this.lemlistClient.removeFromUnsubscribes(args.email);
            break;

          case 'unsubscribe_from_campaign':
            result = await this.lemlistClient.unsubscribeFromCampaign(args.campaignId, args.leadId);
            break;

          // Advanced Activities
          case 'get_activities_with_filters':
            result = await this.lemlistClient.getActivitiesWithFilters(args);
            break;

          case 'get_activity_types':
            result = await this.lemlistClient.getActivityTypes();
            break;

          case 'get_grouped_activities':
            result = await this.lemlistClient.getGroupedActivities(args.campaignId, args.groupBy);
            break;

          // Webhooks
          case 'create_webhook':
            result = await this.lemlistClient.createWebhook(args);
            break;

          case 'get_webhooks':
            result = await this.lemlistClient.getWebhooks();
            break;

          case 'update_webhook':
            result = await this.lemlistClient.updateWebhook(args.webhookId, args);
            break;

          case 'delete_webhook':
            result = await this.lemlistClient.deleteWebhook(args.webhookId);
            break;

          // Advanced Search
          case 'search_leads_advanced':
            result = await this.lemlistClient.searchLeadsAdvanced(args);
            break;

          case 'search_campaigns':
            result = await this.lemlistClient.searchCampaigns(args);
            break;

          // Enhanced Analytics
          case 'get_detailed_campaign_stats':
            result = await this.lemlistClient.getDetailedCampaignStats(args.campaignId, args);
            break;

          case 'get_multi_campaign_stats':
            result = await this.lemlistClient.getMultiCampaignStats(args.campaignIds, args);
            break;

          // LinkedIn Enrichment
          case 'search_database_for_linkedin':
            result = await this.lemlistClient.searchPeople(args.filters || [], args.page || 1);
            break;

          case 'search_and_enrich_person':
            result = await this.lemlistClient.searchAndEnrichPerson(args.firstName, args.lastName, args.companyDomain);
            break;

          case 'enrich_lead_linkedin':
            result = await this.lemlistClient.enrichLeadWithLinkedIn(args.leadId);
            break;

          case 'get_enriched_lead_data':
            result = await this.lemlistClient.getEnrichedLeadData(args.leadId);
            break;

          // Import/Export
          case 'export_leads':
            result = await this.lemlistClient.exportLeads(args.campaignId, args);
            break;

          case 'validate_lead_data':
            result = await this.lemlistClient.validateLeadData(args.leads);
            break;

          // Rate Limiting
          case 'get_rate_limit_status':
            result = await this.lemlistClient.getRateLimitStatus();
            break;

          // Utility
          case 'health_check':
            result = await this.lemlistClient.healthCheck();
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
        const errorMessage = error.response?.data?.message || error.message || 'Unknown error occurred';
        const statusCode = error.response?.status || 500;
        
        // Enhanced error logging
        console.error(`[MCP Tool Error] ${name}:`, {
          message: errorMessage,
          status: statusCode,
          retryable: error.retryable,
          rateLimited: error.rateLimited,
          serverError: error.serverError,
          args: JSON.stringify(args)
        });
        
        // Categorize errors for better user feedback
        const errorCategory = this.categorizeError(error);
        const userFriendlyMessage = this.generateUserFriendlyMessage(error, name);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: true,
                message: userFriendlyMessage,
                technicalMessage: errorMessage,
                statusCode: statusCode,
                category: errorCategory,
                retryable: error.retryable || false,
                rateLimited: error.rateLimited || false,
                timestamp: new Date().toISOString(),
                tool: name,
                troubleshooting: this.getTroubleshootingTips(errorCategory, statusCode)
              }, null, 2),
            },
          ],
          isError: true,
        };
      }
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return await this.getToolsList();
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      return await this.callTool(request.params);
    });
  }

  categorizeError(error) {
    const status = error.response?.status || error.status;
    
    if (status === 401) return 'authentication';
    if (status === 403) return 'authorization';
    if (status === 404) return 'not_found';
    if (status === 429) return 'rate_limit';
    if (status >= 400 && status < 500) return 'client_error';
    if (status >= 500) return 'server_error';
    if (error.code === 'ECONNREFUSED') return 'connection_error';
    if (error.code === 'ETIMEDOUT') return 'timeout';
    
    return 'unknown';
  }

  generateUserFriendlyMessage(error, toolName) {
    const category = this.categorizeError(error);
    const status = error.response?.status || error.status;
    
    switch (category) {
      case 'authentication':
        return 'Authentication failed. Please check your Lemlist API key is correct and active.';
      case 'authorization':
        return 'Access denied. Your API key may not have permission for this operation.';
      case 'not_found':
        return 'The requested resource was not found. Please check the ID parameters.';
      case 'rate_limit':
        return 'Rate limit exceeded. Please wait a moment before trying again.';
      case 'server_error':
        return 'Lemlist server error. Please try again in a few minutes.';
      case 'connection_error':
        return 'Unable to connect to Lemlist API. Please check your internet connection.';
      case 'timeout':
        return 'Request timed out. Please try again.';
      case 'client_error':
        return `Request error (${status}): ${error.message || 'Invalid request parameters'}`;
      default:
        return `An error occurred while executing ${toolName}: ${error.message}`;
    }
  }

  getTroubleshootingTips(category, statusCode) {
    const tips = {
      authentication: [
        'Verify your API key in the .env file',
        'Run "npm run setup" to reconfigure',
        'Check if your API key is still active in Lemlist settings'
      ],
      authorization: [
        'Check your API key permissions in Lemlist',
        'Ensure your account has access to this feature',
        'Contact Lemlist support if permissions seem correct'
      ],
      not_found: [
        'Verify the campaign/lead ID exists',
        'Check for typos in the ID parameters',
        'Ensure you have access to the specified resource'
      ],
      rate_limit: [
        'Wait for the rate limit to reset',
        'Reduce the frequency of API calls',
        'Use bulk operations when available'
      ],
      server_error: [
        'Try again in a few minutes',
        'Check Lemlist status page for outages',
        'Contact support if the issue persists'
      ],
      connection_error: [
        'Check your internet connection',
        'Verify firewall settings allow HTTPS traffic',
        'Try again after a short wait'
      ],
      timeout: [
        'Try again with a smaller request',
        'Check your network connection stability',
        'Use pagination for large data requests'
      ]
    };
    
    return tips[category] || ['Contact support if the issue continues'];
  }

  setupErrorHandling() {
    this.server.onerror = (error) => {
      console.error('[MCP Server Error]', {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
    };

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('[Uncaught Exception]', {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('[Unhandled Rejection]', {
        reason: reason,
        promise: promise,
        timestamp: new Date().toISOString()
      });
    });

    process.on('SIGINT', async () => {
      console.error('[Shutdown] Received SIGINT, closing server gracefully...');
      try {
        await this.server.close();
        console.error('[Shutdown] Server closed successfully');
      } catch (error) {
        console.error('[Shutdown Error]', error);
      }
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.error('[Shutdown] Received SIGTERM, closing server gracefully...');
      try {
        await this.server.close();
        console.error('[Shutdown] Server closed successfully');
      } catch (error) {
        console.error('[Shutdown Error]', error);
      }
      process.exit(0);
    });
  }

  async run() {
    // Check if running in Railway/production mode (HTTP server) or stdio mode
    if (process.env.PORT || process.env.RAILWAY_ENVIRONMENT) {
      await this.runHttpServer();
    } else {
      await this.runStdioServer();
    }
  }

  async runStdioServer() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Lemlist MCP server running on stdio');
  }

  async runHttpServer() {
    const app = express();
    const port = process.env.PORT || 3000;

    // Middleware
    app.use(express.json());
    
    // CORS for multi-user access
    app.use((req, res, next) => {
      const allowedOrigins = process.env.ALLOWED_ORIGINS || '*';
      if (allowedOrigins === '*') {
        res.header('Access-Control-Allow-Origin', '*');
      } else {
        res.header('Access-Control-Allow-Origin', allowedOrigins);
      }
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      next();
    });

    // Health check endpoint for Railway
    app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        service: 'lemlist-mcp-server',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
      });
    });

    // MCP endpoint for remote access
    app.post('/mcp', async (req, res) => {
      try {
        // Basic API key validation if required
        if (process.env.API_KEY_REQUIRED === 'true') {
          const apiKey = req.headers.authorization?.replace('Bearer ', '');
          if (!apiKey || apiKey !== process.env.MCP_API_KEY) {
            return res.status(401).json({ error: 'Unauthorized' });
          }
        }

        // Get Lemlist API key from header (sent by proxy)
        const lemlistApiKey = req.headers['x-lemlist-api-key'] || process.env.LEMLIST_API_KEY;
        if (!lemlistApiKey) {
          return res.status(400).json({ error: 'Lemlist API key required' });
        }

        // Temporarily update the client with the user's API key
        const originalApiKey = this.lemlistClient.apiKey;
        this.lemlistClient = new LemlistClient({
          apiKey: lemlistApiKey,
        });

        const { method, params } = req.body;
        
        try {
          if (method === 'tools/list') {
            // Directly call the tools list handler instead of using server.request
            const toolsResponse = await this.getToolsList();
            console.log(`Tools list request - API Key: ${lemlistApiKey?.substring(0, 8)}...`);
            console.log(`Tools count: ${toolsResponse.tools?.length || 0}`);
            res.json(toolsResponse);
          } else if (method === 'tools/call') {
            const toolResponse = await this.callTool(params);
            res.json(toolResponse);
          } else {
            res.status(400).json({ error: 'Invalid method' });
          }
        } finally {
          // Restore original client (though this doesn't matter much for stateless requests)
          this.lemlistClient = new LemlistClient({
            apiKey: originalApiKey,
          });
        }
      } catch (error) {
        console.error('MCP Request Error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Info endpoint
    app.get('/', (req, res) => {
      res.json({
        service: 'Lemlist MCP Server',
        version: '1.0.0',
        description: 'Model Context Protocol server for Lemlist.com integration',
        endpoints: {
          health: '/health',
          mcp: '/mcp (POST)'
        },
        usage: 'Use this server with Claude Desktop or other MCP clients'
      });
    });

    app.listen(port, '0.0.0.0', () => {
      console.log(`Lemlist MCP Server listening on port ${port}`);
      console.log(`Health check available at: http://localhost:${port}/health`);
    });
  }
}

const server = new LemlistMCPServer();
server.run().catch(console.error);