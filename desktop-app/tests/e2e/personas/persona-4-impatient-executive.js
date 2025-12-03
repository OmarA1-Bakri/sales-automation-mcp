/**
 * Persona 4: "The Impatient Executive" - David Park, VP of Sales
 *
 * Profile:
 * - Role: VP of Sales overseeing multiple teams
 * - Technical proficiency: 2/5 (Basic)
 * - Responsibilities: Pipeline oversight, executive reporting, strategic decisions
 * - Goal: Quick status checks and high-level metrics
 * - Success metrics: Revenue targets, team productivity, forecast accuracy
 */

export const persona4_ImpatientExecutive = {
  identity: {
    name: "David Park",
    role: "VP of Sales",
    company: "Velocity Partners",
    proficiency: 2,
    email: "david.park@velocitypartners.com",
    timezone: "America/Los_Angeles"
  },

  goals: {
    primary: "Get quick status updates without diving into details",
    secondary: [
      "Check YOLO mode status at a glance",
      "View pipeline metrics quickly",
      "Monitor team activity",
      "Ensure system is running properly"
    ],
    successMetrics: [
      "Dashboard loads in < 3 seconds",
      "All critical metrics visible above fold",
      "YOLO status immediately apparent",
      "No errors blocking access"
    ],
    urgency: "very-high"
  },

  testFlows: [
    // ============================================================
    // FLOW 1: Quick Dashboard Check (Primary Flow) - Simplified
    // ============================================================
    {
      name: "30-Second Executive Dashboard Check",
      page: "dashboard",
      priority: "critical",
      timeout: 10000,
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
          description: "Wait for dashboard to load"
        },
        {
          action: "screenshot",
          name: "executive-dashboard-view"
        }
      ],
      assertions: [
        { type: "anyOf", selectors: ["text=YOLO Mode", "text=Dashboard", "[data-testid='yolo-controls']"] },
        { type: "visible", selector: "[data-testid='dashboard-page']" },
        { type: "noErrors" }
      ],
      screenshots: ["dashboard-executive-view"]
    },

    // ============================================================
    // FLOW 2: Quick Performance Check (Charts/Metrics)
    // ============================================================
    {
      name: "Quick Performance Page Glance",
      page: "dashboard",
      priority: "high",
      steps: [
        {
          action: "navigate",
          selector: "text=Dashboard",
          waitFor: "networkidle",
          description: "Open Dashboard (has charts)"
        },
        {
          action: "wait",
          duration: 2000,
          description: "Wait for charts to load"
        },
        {
          action: "screenshot",
          name: "performance-executive-view"
        }
      ],
      assertions: [
        { type: "anyOf", selectors: ["svg", ".recharts-wrapper", "canvas", "[data-testid='performance-stats']"] },
        { type: "noErrors" }
      ]
    },

    // ============================================================
    // FLOW 3: Quick Campaigns Check
    // ============================================================
    {
      name: "Quick Campaigns Status",
      page: "campaigns",
      priority: "high",
      steps: [
        {
          action: "navigate",
          selector: "text=Campaigns",
          waitFor: "networkidle"
        },
        {
          action: "wait",
          duration: 1000,
          description: "Wait for campaigns to load"
        },
        {
          action: "screenshot",
          name: "campaigns-executive-view"
        }
      ],
      assertions: [
        { type: "visible", selector: "[data-testid='campaigns-page']" },
        { type: "noErrors" }
      ]
    },

    // ============================================================
    // FLOW 4: Emergency YOLO Pause
    // ============================================================
    {
      name: "Emergency YOLO Pause",
      page: "dashboard",
      priority: "critical",
      steps: [
        {
          action: "navigate",
          selector: "text=Dashboard",
          waitFor: "networkidle"
        },
        {
          action: "wait",
          duration: 1000,
          description: "Wait for YOLO controls to load"
        },
        {
          action: "scroll",
          selector: "[data-testid='yolo-controls']"
        },
        {
          action: "screenshot",
          name: "yolo-controls-view"
        }
      ],
      assertions: [
        { type: "anyOf", selectors: ["text=YOLO Mode", "[data-testid='yolo-controls']", "[data-testid='yolo-toggle-btn']"] },
        { type: "noErrors" }
      ],
      screenshots: ["yolo-paused"]
    },

    // ============================================================
    // FLOW 5: Check Contact Count
    // ============================================================
    {
      name: "Quick Contact Count Check",
      page: "contacts",
      priority: "medium",
      steps: [
        {
          action: "navigate",
          selector: "text=Contacts",
          waitFor: "networkidle"
        },
        {
          action: "wait",
          duration: 1000,
          description: "Wait for contacts page to load"
        },
        {
          action: "screenshot",
          name: "contacts-list-view"
        }
      ],
      assertions: [
        { type: "visible", selector: "[data-testid='contacts-page']" },
        { type: "noErrors" }
      ]
    },

    // ============================================================
    // FLOW 6: Navigation Speed Test
    // ============================================================
    {
      name: "Fast Navigation Between Pages",
      page: "dashboard",
      priority: "high",
      steps: [
        {
          action: "navigate",
          selector: "text=Dashboard",
          waitFor: 1000
        },
        {
          action: "click",
          selector: "text=Campaigns",
          waitFor: 1000
        },
        {
          action: "click",
          selector: "text=Contacts",
          waitFor: 1000
        },
        {
          action: "click",
          selector: "text=Performance",
          waitFor: 1000
        },
        {
          action: "click",
          selector: "text=Dashboard",
          waitFor: 1000
        }
      ],
      assertions: [
        { type: "noErrors", timeout: 10000 },
        { type: "visible", selector: "text=Dashboard" }
      ]
    }
  ],

  // ============================================================
  // TEST DATA FIXTURES
  // ============================================================
  testData: {
    expectedMetrics: {
      dashboardCards: ["Total Contacts", "Active Campaigns", "Emails Sent", "Positive Replies"],
      yoloStats: ["Cycles Run", "Discovered", "Enriched", "Enrolled"]
    },

    navigationOrder: [
      "Dashboard",
      "Campaigns",
      "Contacts",
      "Performance"
    ]
  },

  // ============================================================
  // EDGE CASES & ERROR SCENARIOS
  // ============================================================
  edgeCases: [
    {
      name: "Slow Network Simulation",
      scenario: "Dashboard loads on slow connection",
      setup: { networkThrottle: "3G" },
      steps: [
        { action: "navigate", selector: "text=Dashboard" },
        { action: "waitForSelector", selector: ".loading-spinner, .skeleton", timeout: 1000 },
        { action: "waitForSelector", selector: ".metric-card", timeout: 30000 }
      ],
      expectedBehavior: "Loading indicators shown, then content",
      assertions: [
        { type: "eventually", selector: ".metric-card", timeout: 30000 }
      ]
    },
    {
      name: "API Timeout",
      scenario: "Backend is slow to respond",
      setup: { responseDelay: 10000 },
      steps: [
        { action: "navigate", selector: "text=Dashboard" },
        { action: "wait", duration: 15000 }
      ],
      expectedBehavior: "Timeout message or cached data shown",
      assertions: [
        { type: "anyOf", selectors: [
          ".metric-card",
          "text=timeout",
          "text=unavailable"
        ]}
      ]
    },
    {
      name: "Partial Data Load",
      scenario: "Some metrics fail to load",
      steps: [
        { action: "navigate", selector: "text=Dashboard" },
        { action: "wait", duration: 5000 }
      ],
      expectedBehavior: "Available data shown, errors for missing",
      assertions: [
        { type: "notContains", selector: "body", text: "undefined" },
        { type: "notContains", selector: "body", text: "NaN" }
      ]
    },
    {
      name: "YOLO Mode Unavailable",
      scenario: "YOLO controls don't respond",
      steps: [
        { action: "navigate", selector: "text=Dashboard" },
        { action: "click", selector: "button:has-text('Pause')" },
        { action: "wait", duration: 5000 }
      ],
      expectedBehavior: "Error message if action fails",
      assertions: [
        { type: "anyOf", selectors: [
          "text=Paused",
          ".toast-error",
          "text=unavailable"
        ]}
      ]
    },
    {
      name: "Session Timeout During Use",
      scenario: "Session expires while viewing",
      setup: { simulateSessionExpiry: true },
      steps: [
        { action: "navigate", selector: "text=Dashboard" },
        { action: "wait", duration: 2000 },
        { action: "click", selector: "text=Campaigns" }
      ],
      expectedBehavior: "Redirect to login or refresh prompt",
      assertions: [
        { type: "anyOf", selectors: [
          "text=login",
          "text=session",
          ".campaign-card"
        ]}
      ]
    },
    {
      name: "Zero Metrics State",
      scenario: "All metrics show zero",
      steps: [
        { action: "navigate", selector: "text=Dashboard" },
        { action: "assert", selector: ".metric-card" }
      ],
      expectedBehavior: "Zero values displayed properly, not errors",
      assertions: [
        { type: "notContains", selector: ".metric-card", text: "error" },
        { type: "notContains", selector: ".metric-card", text: "undefined" }
      ]
    }
  ],

  // ============================================================
  // PERFORMANCE REQUIREMENTS
  // ============================================================
  performanceRequirements: {
    dashboardLoad: { maxMs: 3000 },
    navigationTransition: { maxMs: 1000 },
    metricsRender: { maxMs: 2000 },
    yoloToggle: { maxMs: 2000 },
    pageInteractive: { maxMs: 5000 }
  },

  // ============================================================
  // CLEANUP PROCEDURES
  // ============================================================
  cleanup: [
    {
      name: "Ensure YOLO Running",
      steps: [
        { action: "navigate", selector: "text=Dashboard" },
        { action: "conditional", condition: { notVisible: "text=YOLO Mode Active" }, ifTrue: [
          { action: "click", selector: "button:has-text('Enable'), button:has-text('Start')" }
        ]}
      ]
    }
  ]
};

export default persona4_ImpatientExecutive;
