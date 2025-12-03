/**
 * RTGS Sales Automation - Master E2E Test Suite
 *
 * Orchestrates all persona-based tests for comprehensive coverage.
 * Run with: npm run test:e2e or npx playwright test
 */

import { persona1_PowerUser } from './personas/persona-1-power-user.js';
import { persona2_DailyDriver } from './personas/persona-2-daily-driver.js';
import { persona3_CampaignSpecialist } from './personas/persona-3-campaign-specialist.js';
import { persona4_ImpatientExecutive } from './personas/persona-4-impatient-executive.js';
import { persona5_OnboardingRookie } from './personas/persona-5-onboarding-rookie.js';

// ============================================================
// MASTER TEST SUITE CONFIGURATION
// ============================================================

export const masterTestSuite = {
  name: "RTGS Sales Automation - Full E2E Test Suite",
  version: "1.0.0",
  description: "Comprehensive end-to-end testing using 5 persona archetypes",

  // Test environment configuration
  config: {
    baseUrl: process.env.TEST_BASE_URL || "http://localhost:5173",
    apiUrl: process.env.TEST_API_URL || "http://localhost:3001",
    timeout: 30000,
    retries: 2,
    parallel: false, // Run sequentially to avoid state conflicts
    screenshotOnFailure: true,
    videoOnFailure: true,
    traceOnFailure: true
  },

  // All personas in execution order
  personas: [
    {
      id: "persona-5",
      data: persona5_OnboardingRookie,
      executionOrder: 1,
      reason: "Test empty/initial states before data exists"
    },
    {
      id: "persona-1",
      data: persona1_PowerUser,
      executionOrder: 2,
      reason: "Set up ICP profiles and system configuration"
    },
    {
      id: "persona-3",
      data: persona3_CampaignSpecialist,
      executionOrder: 3,
      reason: "Create campaigns after ICPs exist"
    },
    {
      id: "persona-2",
      data: persona2_DailyDriver,
      executionOrder: 4,
      reason: "Daily operations with existing data"
    },
    {
      id: "persona-4",
      data: persona4_ImpatientExecutive,
      executionOrder: 5,
      reason: "Performance checks on populated system"
    }
  ],

  // ============================================================
  // FEATURE COVERAGE MATRIX
  // ============================================================
  coverageMatrix: {
    // Dashboard Features
    dashboard: {
      feature: "Dashboard",
      testedBy: ["persona-2", "persona-4", "persona-5"],
      flows: {
        "View metrics cards": ["persona-2:Morning Dashboard Review", "persona-4:30-Second Executive Dashboard Check"],
        "Quick actions": ["persona-2:Use Quick Action - Chat with AI"],
        "Activity feed": ["persona-2:Review Recent Activity"],
        "YOLO status display": ["persona-4:Verify YOLO Mode Running"],
        "First-time experience": ["persona-5:First Time Dashboard Experience"]
      },
      coverage: "HIGH"
    },

    // AI Assistant Features
    aiAssistant: {
      feature: "AI Assistant / Chat",
      testedBy: ["persona-1", "persona-2", "persona-3", "persona-5"],
      flows: {
        "Send message": ["persona-2:Discover Leads via AI Chat"],
        "Quick actions": ["persona-2:Check Pipeline Stats via AI", "persona-5:Explore AI Quick Actions"],
        "Lead discovery": ["persona-2:Discover Leads via AI Chat"],
        "Enrichment request": ["persona-2:Request Contact Enrichment via AI"],
        "Onboarding help": ["persona-5:Ask AI Assistant for Guidance"],
        "YOLO explanation": ["persona-5:Understand YOLO Mode"]
      },
      coverage: "HIGH"
    },

    // Contacts Features
    contacts: {
      feature: "Contacts Management",
      testedBy: ["persona-1", "persona-2", "persona-5"],
      flows: {
        "View list": ["persona-2:Review Contacts List"],
        "Search contacts": ["persona-2:Review Contacts List"],
        "Filter by source": ["persona-2:Review Contacts List"],
        "View details": ["persona-2:View Contact Details"],
        "Bulk selection": ["persona-2:Select Multiple Contacts"],
        "Empty states": ["persona-5:Experience Empty States"]
      },
      coverage: "HIGH"
    },

    // Import Features
    import: {
      feature: "CSV Import",
      testedBy: ["persona-1", "persona-5"],
      flows: {
        "Upload CSV": ["persona-1:Bulk CSV Import"],
        "Field mapping": ["persona-1:Bulk CSV Import"],
        "Preview data": ["persona-1:Bulk CSV Import"],
        "Import execution": ["persona-1:Bulk CSV Import"],
        "View import page": ["persona-5:Explore Import Page"]
      },
      coverage: "MEDIUM"
    },

    // Campaigns Features
    campaigns: {
      feature: "Campaigns",
      testedBy: ["persona-3", "persona-4"],
      flows: {
        "View campaigns": ["persona-3:View Campaigns Dashboard", "persona-4:Quick Campaigns Status"],
        "Create email campaign": ["persona-3:Create Email Campaign"],
        "Create LinkedIn campaign": ["persona-3:Create LinkedIn Campaign"],
        "Create video campaign": ["persona-3:Create Video Campaign"],
        "Edit campaign": ["persona-3:Edit Campaign Templates"],
        "View analytics": ["persona-3:View Campaign Analytics"],
        "A/B testing": ["persona-3:A/B Test Setup"]
      },
      coverage: "HIGH"
    },

    // ICP Profiles Features
    icpProfiles: {
      feature: "ICP Profiles",
      testedBy: ["persona-1", "persona-5"],
      flows: {
        "View profiles": ["persona-1:Navigate to ICP Profiles", "persona-5:Browse ICP Profiles"],
        "Create core ICP": ["persona-1:Create Core ICP Profile"],
        "Create expansion ICP": ["persona-1:Create Expansion Market ICP"],
        "Test scoring": ["persona-1:Test ICP Scoring"],
        "View profile details": ["persona-5:Browse ICP Profiles"]
      },
      coverage: "HIGH"
    },

    // Settings Features
    settings: {
      feature: "Settings",
      testedBy: ["persona-1", "persona-5"],
      flows: {
        "API configuration": ["persona-1:Full Settings Configuration"],
        "Email settings": ["persona-1:Full Settings Configuration"],
        "Provider toggle": ["persona-1:Full Settings Configuration"],
        "View settings": ["persona-5:Explore Settings Page"]
      },
      coverage: "MEDIUM"
    },

    // YOLO Mode Features
    yoloMode: {
      feature: "YOLO Automation Mode",
      testedBy: ["persona-1", "persona-4"],
      flows: {
        "Enable YOLO": ["persona-1:Enable YOLO Mode"],
        "Disable YOLO": ["persona-1:Disable YOLO Mode"],
        "View status": ["persona-4:Verify YOLO Mode Running"],
        "Emergency pause": ["persona-4:Emergency YOLO Pause"],
        "Resume after pause": ["persona-4:Resume YOLO Mode"]
      },
      coverage: "HIGH"
    },

    // Performance Features
    performance: {
      feature: "Performance & Analytics",
      testedBy: ["persona-3", "persona-4"],
      flows: {
        "View performance page": ["persona-4:Quick Performance Page Glance"],
        "Campaign analytics": ["persona-3:View Campaign Analytics"],
        "Export reports": ["persona-3:Export Performance Report"]
      },
      coverage: "MEDIUM"
    },

    // Navigation & UX
    navigation: {
      feature: "Navigation & UX",
      testedBy: ["persona-4", "persona-5"],
      flows: {
        "Sidebar navigation": ["persona-5:Explore All Sidebar Items"],
        "Fast navigation": ["persona-4:Fast Navigation Between Pages"],
        "Back button": ["persona-5:Test Back Navigation"],
        "Random navigation": ["persona-5:Random Navigation (edge case)"]
      },
      coverage: "HIGH"
    }
  },

  // ============================================================
  // TEST EXECUTION PHASES
  // ============================================================
  phases: [
    {
      name: "Phase 1: Smoke Tests",
      description: "Quick validation that core features work",
      duration: "5 minutes",
      tests: [
        { persona: "persona-5", flow: "First Time Dashboard Experience" },
        { persona: "persona-5", flow: "Explore All Sidebar Items" },
        { persona: "persona-4", flow: "30-Second Executive Dashboard Check" }
      ]
    },
    {
      name: "Phase 2: Core Feature Tests",
      description: "Test primary user workflows",
      duration: "15 minutes",
      tests: [
        { persona: "persona-1", flow: "Full Settings Configuration" },
        { persona: "persona-1", flow: "Create Core ICP Profile" },
        { persona: "persona-2", flow: "Discover Leads via AI Chat" },
        { persona: "persona-2", flow: "Review Contacts List" },
        { persona: "persona-3", flow: "Create Email Campaign" }
      ]
    },
    {
      name: "Phase 3: Advanced Feature Tests",
      description: "Test complex and integrated workflows",
      duration: "20 minutes",
      tests: [
        { persona: "persona-1", flow: "Bulk CSV Import" },
        { persona: "persona-1", flow: "Enable YOLO Mode" },
        { persona: "persona-3", flow: "A/B Test Setup" },
        { persona: "persona-3", flow: "View Campaign Analytics" }
      ]
    },
    {
      name: "Phase 4: Edge Cases & Error Handling",
      description: "Test error scenarios and edge cases",
      duration: "15 minutes",
      tests: [
        { persona: "persona-5", flow: "Random Navigation" },
        { persona: "persona-5", flow: "Empty Form Submission" },
        { persona: "persona-2", flow: "AI Chat Rate Limit" },
        { persona: "persona-4", flow: "Slow Network Simulation" }
      ]
    },
    {
      name: "Phase 5: Performance Validation",
      description: "Verify performance requirements",
      duration: "5 minutes",
      tests: [
        { persona: "persona-4", flow: "30-Second Executive Dashboard Check" },
        { persona: "persona-4", flow: "Fast Navigation Between Pages" }
      ]
    }
  ],

  // ============================================================
  // PRIORITY CLASSIFICATION
  // ============================================================
  priorityFlows: {
    critical: [
      // Must pass for any release
      "persona-4:30-Second Executive Dashboard Check",
      "persona-2:Discover Leads via AI Chat",
      "persona-2:Review Contacts List",
      "persona-1:Full Settings Configuration",
      "persona-1:Create Core ICP Profile",
      "persona-3:Create Email Campaign",
      "persona-5:First Time Dashboard Experience"
    ],
    high: [
      // Should pass for most releases
      "persona-1:Bulk CSV Import",
      "persona-1:Enable YOLO Mode",
      "persona-2:View Contact Details",
      "persona-3:View Campaign Analytics",
      "persona-4:Emergency YOLO Pause",
      "persona-5:Ask AI Assistant for Guidance"
    ],
    medium: [
      // Nice to have passing
      "persona-1:Test ICP Scoring",
      "persona-2:Select Multiple Contacts",
      "persona-3:A/B Test Setup",
      "persona-5:Explore Settings Page"
    ]
  },

  // ============================================================
  // CLEANUP SEQUENCE
  // ============================================================
  cleanup: {
    order: [
      // Clean up in reverse order of creation
      "Clear chat history",
      "Delete test campaigns",
      "Delete test ICP profiles",
      "Delete test contacts",
      "Reset YOLO mode",
      "Clear search filters"
    ],
    strategies: {
      database: "Transaction rollback or dedicated test database",
      ui: "Run cleanup flows from each persona",
      api: "Call /api/test/reset endpoint if available"
    }
  }
};

// ============================================================
// TEST RUNNER HELPERS
// ============================================================

/**
 * Get all flows for a specific page
 */
export function getFlowsByPage(page) {
  const flows = [];
  for (const persona of masterTestSuite.personas) {
    for (const flow of persona.data.testFlows) {
      if (flow.page === page) {
        flows.push({
          persona: persona.id,
          personaName: persona.data.identity.name,
          flow: flow
        });
      }
    }
  }
  return flows;
}

/**
 * Get all critical priority flows
 */
export function getCriticalFlows() {
  return masterTestSuite.priorityFlows.critical;
}

/**
 * Get coverage summary
 */
export function getCoverageSummary() {
  const summary = {};
  for (const [key, value] of Object.entries(masterTestSuite.coverageMatrix)) {
    summary[key] = {
      feature: value.feature,
      coverage: value.coverage,
      flowCount: Object.keys(value.flows).length,
      personas: value.testedBy.length
    };
  }
  return summary;
}

/**
 * Get test execution order
 */
export function getExecutionOrder() {
  return masterTestSuite.personas
    .sort((a, b) => a.executionOrder - b.executionOrder)
    .map(p => ({
      id: p.id,
      name: p.data.identity.name,
      role: p.data.identity.role,
      flowCount: p.data.testFlows.length,
      reason: p.reason
    }));
}

export default masterTestSuite;
