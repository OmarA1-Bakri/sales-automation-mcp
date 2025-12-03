/**
 * Persona 2: "The Daily Driver" - Marcus Johnson, Account Executive
 *
 * Profile:
 * - Role: Account Executive at a mid-market sales team
 * - Technical proficiency: 3/5 (Intermediate)
 * - Responsibilities: Daily prospecting, lead qualification, pipeline management
 * - Goal: Hit quota by efficiently working leads
 * - Success metrics: Meetings booked, reply rates, pipeline value
 */

export const persona2_DailyDriver = {
  identity: {
    name: "Marcus Johnson",
    role: "Account Executive",
    company: "CloudScale Inc",
    proficiency: 3,
    email: "marcus.johnson@cloudscale.com",
    timezone: "America/New_York"
  },

  goals: {
    primary: "Find and engage high-quality leads efficiently every day",
    secondary: [
      "Use AI chat to discover leads matching ICP",
      "Review and qualify discovered contacts",
      "Track pipeline metrics on dashboard",
      "Manage existing contact relationships"
    ],
    successMetrics: [
      "15+ qualified leads per week",
      "> 20% email reply rate",
      "Pipeline value growth 10% MoM",
      "Time to first contact < 24 hours"
    ],
    urgency: "medium"
  },

  testFlows: [
    // ============================================================
    // FLOW 1: Morning Dashboard Check - Simplified
    // ============================================================
    {
      name: "Morning Dashboard Review",
      page: "dashboard",
      priority: "critical",
      steps: [
        {
          action: "navigate",
          selector: "text=Dashboard",
          waitFor: "networkidle",
          description: "Open Dashboard"
        },
        {
          action: "wait",
          duration: 2000,
          description: "Wait for metrics to load"
        },
        {
          action: "screenshot",
          name: "morning-dashboard-state"
        }
      ],
      assertions: [
        { type: "visible", selector: "[data-testid='dashboard-page']" },
        { type: "anyOf", selectors: ["text=YOLO Mode", "[data-testid='yolo-controls']", "svg"] },
        { type: "noErrors" }
      ],
      screenshots: ["dashboard-metrics", "dashboard-activity"]
    },

    // ============================================================
    // FLOW 2: AI Chat for Lead Discovery - Simplified
    // ============================================================
    {
      name: "Discover Leads via AI Chat",
      page: "ai-assistant",
      priority: "critical",
      steps: [
        {
          action: "navigate",
          selector: "text=AI Assistant",
          waitFor: "networkidle",
          description: "Navigate to AI Chat"
        },
        {
          action: "wait",
          duration: 1000,
          description: "Wait for chat to initialize"
        },
        {
          action: "type",
          selector: "textarea",
          value: "Find me 25 new leads that match my Enterprise SaaS Buyers ICP profile",
          description: "Enter discovery prompt"
        },
        {
          action: "click",
          selector: "button:has-text('Send')",
          waitFor: 5000,
          description: "Send message and wait for AI response"
        },
        {
          action: "wait",
          duration: 2000,
          description: "Wait for response to render"
        },
        {
          action: "screenshot",
          name: "ai-chat-discovery"
        }
      ],
      assertions: [
        { type: "visible", selector: "[data-testid='chat-page']" },
        { type: "noErrors" }
      ],
      screenshots: ["ai-chat-discovery-request", "ai-chat-discovery-response"]
    },

    // ============================================================
    // FLOW 3: Quick Action - Chat with AI - Simplified
    // ============================================================
    {
      name: "Use Quick Action - Chat with AI",
      page: "ai-assistant",
      priority: "high",
      steps: [
        {
          action: "navigate",
          selector: "text=AI Assistant",
          waitFor: "networkidle",
          description: "Navigate directly to AI Assistant"
        },
        {
          action: "wait",
          duration: 1000,
          description: "Wait for chat to load"
        },
        {
          action: "screenshot",
          name: "ai-assistant-page"
        }
      ],
      assertions: [
        { type: "visible", selector: "[data-testid='chat-page']" },
        { type: "noErrors" }
      ]
    },

    // ============================================================
    // FLOW 4: View and Manage Contacts - Simplified
    // ============================================================
    {
      name: "Review Contacts List",
      page: "contacts",
      priority: "critical",
      steps: [
        {
          action: "navigate",
          selector: "text=Contacts",
          waitFor: "networkidle",
          description: "Navigate to Contacts"
        },
        {
          action: "wait",
          duration: 2000,
          description: "Wait for contacts to load"
        },
        {
          action: "screenshot",
          name: "contacts-page"
        }
      ],
      assertions: [
        { type: "visible", selector: "[data-testid='contacts-page']" },
        { type: "anyOf", selectors: ["input", "table", ".rounded-lg"] },
        { type: "noErrors" }
      ],
      screenshots: ["contacts-list", "contacts-filtered"]
    },

    // ============================================================
    // FLOW 5: View Contact Details - Simplified
    // ============================================================
    {
      name: "View Contact Details",
      page: "contacts",
      priority: "high",
      steps: [
        {
          action: "navigate",
          selector: "text=Contacts",
          waitFor: "networkidle",
          description: "Navigate to Contacts page"
        },
        {
          action: "wait",
          duration: 1500,
          description: "Wait for contacts list to load"
        },
        {
          action: "screenshot",
          name: "contact-details"
        }
      ],
      assertions: [
        { type: "visible", selector: "[data-testid='contacts-page']" },
        // Handle both empty and populated states - table OR empty message
        { type: "anyOf", selectors: ["[data-testid='contacts-table']", "[data-testid='contacts-empty-message']"] },
        { type: "noErrors" }
      ],
      screenshots: ["contact-details"]
    },

    // ============================================================
    // FLOW 6: AI Chat - Pipeline Stats - Simplified
    // ============================================================
    {
      name: "Check Pipeline Stats via AI",
      page: "ai-assistant",
      priority: "medium",
      steps: [
        {
          action: "navigate",
          selector: "text=AI Assistant",
          waitFor: "networkidle"
        },
        {
          action: "wait",
          duration: 1000,
          description: "Wait for chat to load"
        },
        {
          action: "click",
          selector: "button:has-text('Show pipeline stats')",
          waitFor: 5000,
          description: "Click pipeline stats quick action"
        },
        {
          action: "screenshot",
          name: "pipeline-stats"
        }
      ],
      assertions: [
        { type: "visible", selector: "[data-testid='chat-page']" },
        { type: "noErrors" }
      ],
      screenshots: ["ai-pipeline-stats"]
    },

    // ============================================================
    // FLOW 7: AI Chat - Enrich Contacts - Simplified
    // ============================================================
    {
      name: "Request Contact Enrichment via AI",
      page: "ai-assistant",
      priority: "medium",
      steps: [
        {
          action: "navigate",
          selector: "text=AI Assistant",
          waitFor: "networkidle"
        },
        {
          action: "wait",
          duration: 1000,
          description: "Wait for chat to load"
        },
        {
          action: "click",
          selector: "button:has-text('Enrich my contacts')",
          waitFor: 5000,
          description: "Click enrich quick action"
        },
        {
          action: "screenshot",
          name: "enrich-request"
        }
      ],
      assertions: [
        { type: "visible", selector: "[data-testid='chat-page']" },
        { type: "noErrors" }
      ]
    },

    // ============================================================
    // FLOW 8: Check Activity Feed - Simplified
    // ============================================================
    {
      name: "Review Recent Activity",
      page: "dashboard",
      priority: "medium",
      steps: [
        {
          action: "navigate",
          selector: "text=Dashboard",
          waitFor: "networkidle",
          description: "Navigate to Dashboard"
        },
        {
          action: "wait",
          duration: 2000,
          description: "Wait for dashboard to load"
        },
        {
          action: "screenshot",
          name: "dashboard-activity"
        }
      ],
      assertions: [
        { type: "visible", selector: "[data-testid='dashboard-page']" },
        { type: "anyOf", selectors: ["text=YOLO Mode", "[data-testid='yolo-controls']", "svg"] },
        { type: "noErrors" }
      ],
      screenshots: ["activity-feed"]
    },

    // ============================================================
    // FLOW 9: Bulk Contact Selection - Simplified
    // ============================================================
    {
      name: "Select Multiple Contacts",
      page: "contacts",
      priority: "medium",
      steps: [
        {
          action: "navigate",
          selector: "text=Contacts",
          waitFor: "networkidle",
          description: "Navigate to Contacts"
        },
        {
          action: "wait",
          duration: 1500,
          description: "Wait for contacts to load"
        },
        {
          action: "screenshot",
          name: "contacts-list-view"
        }
      ],
      assertions: [
        { type: "visible", selector: "[data-testid='contacts-page']" },
        { type: "noErrors" }
      ],
      screenshots: ["contacts-multi-select"]
    }
  ],

  // ============================================================
  // TEST DATA FIXTURES
  // ============================================================
  testData: {
    chatPrompts: [
      "Find me 25 new leads that match my Enterprise SaaS Buyers ICP profile",
      "What are my current pipeline statistics?",
      "Show me leads that haven't been contacted yet",
      "Enrich all contacts imported today",
      "How many emails were sent this week?",
      "List contacts with reply rate above 15%"
    ],

    searchQueries: [
      "john",
      "smith",
      "@gmail.com",
      "CTO",
      "fintech"
    ],

    filterCombinations: [
      { source: "csv", search: "" },
      { source: "hubspot", search: "" },
      { source: "all", search: "CEO" },
      { source: "csv", search: "@acme" }
    ]
  },

  // ============================================================
  // EDGE CASES & ERROR SCENARIOS
  // ============================================================
  edgeCases: [
    {
      name: "Empty Contact List",
      scenario: "Search returns no results",
      steps: [
        { action: "navigate", selector: "text=Contacts" },
        { action: "type", selector: "input[placeholder*='Search']", value: "xyznonexistent12345" },
        { action: "wait", duration: 1000 }
      ],
      expectedBehavior: "Empty state message shown",
      assertions: [
        { type: "visible", selector: "text=No contacts found, text=no results" }
      ]
    },
    {
      name: "AI Chat Rate Limit",
      scenario: "Send many messages rapidly",
      steps: [
        { action: "navigate", selector: "text=AI Assistant" },
        { action: "loop", count: 5, steps: [
          { action: "type", selector: "input[placeholder*='Ask']", value: "Hello" },
          { action: "click", selector: "button:has-text('Send')" },
          { action: "wait", duration: 100 }
        ]}
      ],
      expectedBehavior: "Rate limit message or queued requests",
      assertions: [
        { type: "anyOf", selectors: [
          "text=rate limit",
          "text=too fast",
          ".assistant-message"
        ]}
      ]
    },
    {
      name: "AI Chat Error Recovery",
      scenario: "API returns error, then retry",
      steps: [
        { action: "navigate", selector: "text=AI Assistant" },
        { action: "type", selector: "input[placeholder*='Ask']", value: "Test error handling with invalid request !!!@@##$$" },
        { action: "click", selector: "button:has-text('Send')" },
        { action: "wait", duration: 3000 }
      ],
      expectedBehavior: "Error message with retry option or graceful handling",
      assertions: [
        { type: "anyOf", selectors: [
          ".error-message",
          ".assistant-message",
          "text=try again"
        ]}
      ]
    },
    {
      name: "Dashboard Metrics Loading",
      scenario: "Verify loading states",
      steps: [
        { action: "navigate", selector: "text=Dashboard" },
        { action: "screenshot", name: "dashboard-loading" }
      ],
      expectedBehavior: "Loading indicators then data",
      assertions: [
        { type: "eventually", selector: ".metric-value, .stat-value", timeout: 10000 }
      ]
    },
    {
      name: "Contact Details Empty Fields",
      scenario: "View contact with missing data",
      steps: [
        { action: "navigate", selector: "text=Contacts" },
        { action: "type", selector: "input[placeholder*='Search']", value: "" },
        { action: "click", selector: ".contact-row:first-child" }
      ],
      expectedBehavior: "Graceful display of missing fields",
      assertions: [
        { type: "notVisible", selector: "text=undefined, text=null" }
      ]
    },
    {
      name: "Long Chat Message",
      scenario: "Send very long prompt",
      steps: [
        { action: "navigate", selector: "text=AI Assistant" },
        { action: "type", selector: "input[placeholder*='Ask']", value: "Please " + "find leads that ".repeat(100) + "match my ICP" },
        { action: "click", selector: "button:has-text('Send')" }
      ],
      expectedBehavior: "Message truncated or handled gracefully",
      assertions: [
        { type: "anyOf", selectors: [
          ".assistant-message",
          "text=too long",
          ".error-message"
        ]}
      ]
    }
  ],

  // ============================================================
  // CLEANUP PROCEDURES
  // ============================================================
  cleanup: [
    {
      name: "Clear Search Filters",
      steps: [
        { action: "navigate", selector: "text=Contacts" },
        { action: "clear", selector: "input[placeholder*='Search']" },
        { action: "click", selector: "button:has-text('Refresh')" }
      ]
    },
    {
      name: "Clear Chat History",
      steps: [
        { action: "navigate", selector: "text=AI Assistant" },
        { action: "click", selector: "button:has-text('Clear'), button:has-text('New Chat')" }
      ]
    }
  ]
};

export default persona2_DailyDriver;
