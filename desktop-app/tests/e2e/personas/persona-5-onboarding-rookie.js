/**
 * Persona 5: "The Onboarding Rookie" - Alex Thompson, New SDR
 *
 * Profile:
 * - Role: Sales Development Representative (first week on job)
 * - Technical proficiency: 1/5 (Beginner)
 * - Responsibilities: Learning the system, basic lead work
 * - Goal: Understand how to use the platform
 * - Success metrics: Complete onboarding, handle first leads
 */

export const persona5_OnboardingRookie = {
  identity: {
    name: "Alex Thompson",
    role: "Sales Development Representative",
    company: "FreshStart Tech",
    proficiency: 1,
    email: "alex.thompson@freshstart.io",
    timezone: "America/Denver",
    daysOnJob: 3
  },

  goals: {
    primary: "Learn how to use the sales automation platform",
    secondary: [
      "Understand each feature through exploration",
      "Use AI assistant for guidance",
      "Complete first CSV import",
      "View existing contacts and campaigns"
    ],
    successMetrics: [
      "Navigate all pages without errors",
      "Successfully ask AI for help",
      "Complete one import task",
      "Understand YOLO mode basics"
    ],
    urgency: "low"
  },

  testFlows: [
    // ============================================================
    // FLOW 1: First Time Dashboard View
    // ============================================================
    {
      name: "First Time Dashboard Experience",
      page: "dashboard",
      priority: "critical",
      steps: [
        {
          action: "navigate",
          selector: "text=Dashboard",
          waitFor: "networkidle",
          description: "Open Dashboard for first time"
        },
        {
          action: "wait",
          duration: 2000,
          description: "Let page fully load"
        },
        {
          action: "screenshot",
          name: "rookie-first-dashboard"
        },
        // Look for any onboarding or help indicators
        {
          action: "search",
          selectors: [
            "text=Welcome",
            "text=Getting Started",
            "text=Help",
            ".onboarding-tooltip",
            ".help-icon"
          ],
          description: "Look for onboarding cues"
        }
      ],
      assertions: [
        { type: "visible", selector: ".sidebar, nav" },
        { type: "visible", selector: ".main-content, main" },
        { type: "noErrors" }
      ],
      screenshots: ["first-time-dashboard"]
    },

    // ============================================================
    // FLOW 2: Explore Sidebar Navigation
    // ============================================================
    {
      name: "Explore All Sidebar Items",
      page: "dashboard",
      priority: "critical",
      steps: [
        // Click each sidebar item to explore
        {
          action: "click",
          selector: "text=Dashboard",
          waitFor: 1000,
          description: "Click Dashboard"
        },
        {
          action: "screenshot",
          name: "explore-dashboard"
        },
        {
          action: "click",
          selector: "text=AI Assistant",
          waitFor: 1000,
          description: "Click AI Assistant"
        },
        {
          action: "screenshot",
          name: "explore-ai-assistant"
        },
        {
          action: "click",
          selector: "text=Campaigns",
          waitFor: 1000,
          description: "Click Campaigns"
        },
        {
          action: "screenshot",
          name: "explore-campaigns"
        },
        {
          action: "click",
          selector: "text=Contacts",
          waitFor: 1000,
          description: "Click Contacts"
        },
        {
          action: "screenshot",
          name: "explore-contacts"
        },
        {
          action: "click",
          selector: "text=Import",
          waitFor: 1000,
          description: "Click Import"
        },
        {
          action: "screenshot",
          name: "explore-import"
        },
        {
          action: "click",
          selector: "text=ICP Profiles",
          waitFor: 1000,
          description: "Click ICP Profiles"
        },
        {
          action: "screenshot",
          name: "explore-icp"
        },
        {
          action: "click",
          selector: "text=Settings",
          waitFor: 1000,
          description: "Click Settings"
        },
        {
          action: "screenshot",
          name: "explore-settings"
        }
      ],
      assertions: [
        { type: "noErrors" },
        { type: "no404" }
      ],
      screenshots: [
        "explore-dashboard",
        "explore-ai-assistant",
        "explore-campaigns",
        "explore-contacts",
        "explore-import",
        "explore-icp",
        "explore-settings"
      ]
    },

    // ============================================================
    // FLOW 3: Ask AI For Help
    // ============================================================
    {
      name: "Ask AI Assistant for Guidance",
      page: "ai-assistant",
      priority: "critical",
      steps: [
        {
          action: "navigate",
          selector: "text=AI Assistant",
          waitFor: "networkidle"
        },
        {
          action: "type",
          selector: "input[placeholder*='Ask'], textarea[placeholder*='Ask']",
          value: "I'm new here. Can you explain how this platform works and what I should do first?",
          description: "Ask for onboarding help"
        },
        {
          action: "click",
          selector: "button:has-text('Send')",
          waitFor: 10000,
          description: "Send message"
        },
        {
          action: "wait",
          duration: 2000,
          description: "Wait for AI response"
        },
        {
          action: "screenshot",
          name: "ai-onboarding-help"
        }
      ],
      assertions: [
        { type: "visible", selector: "[data-testid='chat-page']" },
        { type: "noErrors" }
      ],
      screenshots: ["ai-help-request", "ai-help-response"]
    },

    // ============================================================
    // FLOW 4: AI Assistant Chat Interface
    // ============================================================
    {
      name: "AI Assistant Chat Interface",
      page: "ai-assistant",
      priority: "high",
      steps: [
        {
          action: "navigate",
          selector: "text=AI Assistant",
          waitFor: "networkidle"
        },
        {
          action: "wait",
          duration: 1000,
          description: "Let page fully load"
        },
        {
          action: "screenshot",
          name: "ai-chat-interface"
        }
      ],
      assertions: [
        // Verify core chat UI elements exist (works whether welcome or chat mode)
        { type: "anyOf", selectors: [
          "input[placeholder*='Ask']",
          "textarea",
          "button:has-text('Send')"
        ]},
        { type: "noErrors" }
      ]
    },

    // ============================================================
    // FLOW 5: View Empty States
    // ============================================================
    {
      name: "Experience Empty States",
      page: "contacts",
      priority: "high",
      steps: [
        {
          action: "navigate",
          selector: "text=Contacts",
          waitFor: "networkidle"
        },
        // Search for something that doesn't exist
        {
          action: "type",
          selector: "input[placeholder*='Search']",
          value: "xyznonexistent12345",
          description: "Search for non-existent contact"
        },
        {
          action: "wait",
          duration: 1500
        },
        {
          action: "screenshot",
          name: "empty-search-results"
        },
        // Clear and check normal state
        {
          action: "clear",
          selector: "input[placeholder*='Search']"
        },
        {
          action: "click",
          selector: "button:has-text('Refresh')",
          waitFor: 2000
        }
      ],
      assertions: [
        { type: "anyOf", selectors: [
          "text=No contacts found",
          "text=no results",
          ".empty-state",
          ".contact-row"
        ]}
      ]
    },

    // ============================================================
    // FLOW 6: Attempt Import (View Only)
    // ============================================================
    {
      name: "Explore Import Page",
      page: "import",
      priority: "high",
      steps: [
        {
          action: "navigate",
          selector: "text=Import",
          waitFor: "networkidle"
        },
        {
          action: "screenshot",
          name: "import-page-view"
        },
        // Look for help text or instructions
        {
          action: "search",
          selectors: [
            "text=Upload",
            "text=CSV",
            "text=drag",
            "text=drop",
            ".dropzone"
          ]
        }
      ],
      assertions: [
        { type: "anyOf", selectors: [
          "text=Import",
          "text=Upload",
          "text=CSV",
          ".dropzone"
        ]},
        { type: "noErrors" }
      ]
    },

    // ============================================================
    // FLOW 7: View ICP Profiles (Read Only)
    // ============================================================
    {
      name: "Browse ICP Profiles",
      page: "icp",
      priority: "high",
      steps: [
        {
          action: "navigate",
          selector: "text=ICP Profiles",
          waitFor: "networkidle"
        },
        {
          action: "wait",
          duration: 1000,
          description: "Let profiles load"
        },
        {
          action: "screenshot",
          name: "icp-profiles-list"
        },
        // Look for profile cards or empty state
        {
          action: "search",
          selectors: [
            "[data-testid='icp-profile-card']",
            "text=Create",
            "text=New Profile",
            "[data-testid='create-icp-btn']"
          ],
          description: "Find profile cards or create button"
        }
      ],
      assertions: [
        { type: "anyOf", selectors: [
          "text=ICP Profiles",
          "text=ICP",
          "text=Ideal Customer"
        ]},
        { type: "anyOf", selectors: [
          "[data-testid='icp-profile-card']",
          "text=No profiles",
          "text=Create",
          "[data-testid='create-icp-btn']"
        ]},
        { type: "noErrors" }
      ]
    },

    // ============================================================
    // FLOW 8: Learn About YOLO Mode
    // ============================================================
    {
      name: "Understand YOLO Mode",
      page: "dashboard",
      priority: "medium",
      steps: [
        {
          action: "navigate",
          selector: "text=Dashboard",
          waitFor: "networkidle"
        },
        {
          action: "wait",
          duration: 1000,
          description: "Let dashboard load"
        },
        // Look for YOLO section (use valid CSS selector only)
        {
          action: "scroll",
          selector: "[data-testid='yolo-controls']"
        },
        {
          action: "screenshot",
          name: "yolo-section-rookie"
        }
      ],
      assertions: [
        { type: "anyOf", selectors: [
          "[data-testid='yolo-controls']",
          "[data-testid='yolo-toggle-btn']",
          "text=YOLO Mode"
        ]},
        { type: "noErrors" }
      ]
    },

    // ============================================================
    // FLOW 9: Navigation State Test
    // ============================================================
    {
      name: "Test Navigation State",
      page: "dashboard",
      priority: "medium",
      steps: [
        {
          action: "navigate",
          selector: "text=Dashboard",
          waitFor: "networkidle"
        },
        {
          action: "click",
          selector: "text=Campaigns",
          waitFor: 2000,
          description: "Go to Campaigns"
        },
        {
          action: "screenshot",
          name: "on-campaigns-page"
        },
        {
          action: "click",
          selector: "text=Contacts",
          waitFor: 2000,
          description: "Go to Contacts"
        },
        {
          action: "screenshot",
          name: "on-contacts-page"
        },
        // Return to Dashboard via sidebar (more reliable than browser back)
        {
          action: "click",
          selector: "text=Dashboard",
          waitFor: 2000,
          description: "Return to Dashboard"
        },
        {
          action: "screenshot",
          name: "back-to-dashboard"
        }
      ],
      assertions: [
        { type: "anyOf", selectors: [
          "text=Dashboard",
          "text=Welcome",
          "[data-testid='yolo-controls']"
        ]},
        { type: "noErrors" }
      ]
    },

    // ============================================================
    // FLOW 10: Settings Exploration (Read Only)
    // ============================================================
    {
      name: "Explore Settings Page",
      page: "settings",
      priority: "medium",
      steps: [
        {
          action: "navigate",
          selector: "text=Settings",
          waitFor: "networkidle"
        },
        {
          action: "wait",
          duration: 1500,
          description: "Let settings load"
        },
        {
          action: "screenshot",
          name: "settings-rookie-view"
        },
        // Search for settings elements
        {
          action: "search",
          selectors: [
            "text=API Configuration",
            "[data-testid='api-key-input']",
            "text=Connection Protocol"
          ],
          description: "Find settings content"
        },
        {
          action: "screenshot",
          name: "settings-api-config"
        }
      ],
      assertions: [
        { type: "anyOf", selectors: [
          ".bg-slate-900",
          ".max-w-4xl",
          ".rounded-lg"
        ]},
        { type: "anyOf", selectors: [
          "[data-testid='api-key-input']",
          "input[type='password']",
          "[data-testid='settings-page']"
        ]},
        { type: "noErrors" }
      ]
    }
  ],

  // ============================================================
  // TEST DATA FIXTURES
  // ============================================================
  testData: {
    helpQueries: [
      "I'm new here. Can you explain how this platform works?",
      "What is YOLO mode and how does it work?",
      "How do I import contacts from a CSV file?",
      "What is an ICP profile?",
      "How do I create my first campaign?",
      "What do the metrics on the dashboard mean?"
    ],

    confusionScenarios: [
      "Click random buttons",
      "Navigate backwards repeatedly",
      "Search for non-existent items",
      "Try to access advanced features"
    ]
  },

  // ============================================================
  // EDGE CASES & ERROR SCENARIOS
  // ============================================================
  edgeCases: [
    {
      name: "Random Navigation",
      scenario: "Click around randomly",
      steps: [
        { action: "click", selector: "text=Campaigns" },
        { action: "click", selector: "text=Settings" },
        { action: "click", selector: "text=AI Assistant" },
        { action: "browserBack" },
        { action: "browserBack" },
        { action: "click", selector: "text=Contacts" },
        { action: "browserForward" }
      ],
      expectedBehavior: "No crashes or undefined states",
      assertions: [
        { type: "noErrors" },
        { type: "notContains", selector: "body", text: "undefined" }
      ]
    },
    {
      name: "Rapid Click Actions",
      scenario: "Click same element multiple times quickly",
      steps: [
        { action: "navigate", selector: "text=AI Assistant" },
        { action: "rapidClick", selector: "button:has-text('Send')", count: 5 }
      ],
      expectedBehavior: "No duplicate messages or errors",
      assertions: [
        { type: "noErrors" }
      ]
    },
    {
      name: "Empty Form Submission",
      scenario: "Try to submit empty forms",
      steps: [
        { action: "navigate", selector: "text=ICP Profiles" },
        { action: "click", selector: "button:has-text('New')" },
        { action: "click", selector: "button:has-text('Create')" }
      ],
      expectedBehavior: "Validation errors shown",
      assertions: [
        { type: "visible", selector: "text=required, .error, .validation-error" }
      ]
    },
    {
      name: "Long Idle Session",
      scenario: "Leave page open for extended time",
      steps: [
        { action: "navigate", selector: "text=Dashboard" },
        { action: "wait", duration: 60000 },
        { action: "click", selector: "text=Campaigns" }
      ],
      expectedBehavior: "Page still responsive or session refresh",
      assertions: [
        { type: "anyOf", selectors: [
          ".campaign-card",
          "text=session",
          "text=refresh"
        ]}
      ]
    },
    {
      name: "AI Chat Spam",
      scenario: "Send same message repeatedly",
      steps: [
        { action: "navigate", selector: "text=AI Assistant" },
        { action: "loop", count: 3, steps: [
          { action: "type", selector: "input[placeholder*='Ask']", value: "Help" },
          { action: "click", selector: "button:has-text('Send')" },
          { action: "wait", duration: 500 }
        ]}
      ],
      expectedBehavior: "Handles gracefully, no crashes",
      assertions: [
        { type: "noErrors" },
        { type: "count", selector: ".assistant-message", min: 1 }
      ]
    },
    {
      name: "Confusion Flow - Wrong Page",
      scenario: "Try to create campaign from Contacts page",
      steps: [
        { action: "navigate", selector: "text=Contacts" },
        { action: "search", selectors: ["button:has-text('Create Campaign')"] }
      ],
      expectedBehavior: "No campaign create button on Contacts, or clear redirect",
      assertions: [
        { type: "noErrors" }
      ]
    }
  ],

  // ============================================================
  // ACCESSIBILITY CHECKS
  // ============================================================
  accessibilityChecks: {
    keyboardNavigation: true,
    screenReaderLabels: true,
    colorContrast: true,
    focusIndicators: true
  },

  // ============================================================
  // CLEANUP PROCEDURES
  // ============================================================
  cleanup: [
    {
      name: "Clear Chat History",
      steps: [
        { action: "navigate", selector: "text=AI Assistant" },
        { action: "click", selector: "button:has-text('Clear'), button:has-text('New Chat')" }
      ]
    },
    {
      name: "Reset Search Filters",
      steps: [
        { action: "navigate", selector: "text=Contacts" },
        { action: "clear", selector: "input[placeholder*='Search']" }
      ]
    }
  ]
};

export default persona5_OnboardingRookie;
