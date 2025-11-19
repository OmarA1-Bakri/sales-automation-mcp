/**
 * Mock Campaign Data
 * Extracted from CampaignsPage.jsx for better code organization
 */

export const mockCampaigns = [
  {
    id: 'camp_treasury_q1_2025',
    name: 'PSP Treasury Q1 2025',
    status: 'active',
    type: 'multi-channel',
    icpProfile: 'icp_rtgs_psp_treasury',
    createdAt: '2025-01-15T10:00:00Z',
    startedAt: '2025-01-16T08:00:00Z',
    performance: {
      // Email metrics
      enrolled: 142,
      contacted: 128,
      opened: 89,
      clicked: 34,
      replied: 12,
      bounced: 3,
      unsubscribed: 2,
      openRate: 0.695,
      clickRate: 0.266,
      replyRate: 0.094,
      bounceRate: 0.023,
      // LinkedIn metrics
      linkedinSent: 98,
      linkedinAccepted: 34,
      linkedinMessaged: 34,
      linkedinReplied: 8,
      linkedinAcceptRate: 0.347,
      linkedinReplyRate: 0.235
    },
    emailPerformance: [
      {
        step: 1,
        subject: 'Quick question about {{companyName}} treasury',
        sent: 142,
        opened: 98,
        clicked: 42,
        replied: 8,
        bounced: 2,
        openRate: 0.69,
        clickRate: 0.30,
        replyRate: 0.056
      },
      {
        step: 2,
        subject: 'Re: Treasury infrastructure',
        sent: 112,
        opened: 76,
        clicked: 28,
        replied: 4,
        bounced: 1,
        openRate: 0.68,
        clickRate: 0.25,
        replyRate: 0.036
      },
      {
        step: 3,
        subject: 'RTGS case study: €2M saved annually',
        sent: 89,
        opened: 54,
        clicked: 18,
        replied: 0,
        bounced: 0,
        openRate: 0.61,
        clickRate: 0.20,
        replyRate: 0.00
      }
    ],
    linkedinPerformance: [
      {
        step: 1,
        type: 'connection',
        message: 'Hi {{firstName}}, I noticed {{companyName}} is expanding into new markets...',
        sent: 98,
        accepted: 34,
        acceptRate: 0.347
      },
      {
        step: 2,
        type: 'message',
        message: 'Thanks for connecting! Given your role in treasury...',
        sent: 34,
        replied: 8,
        replyRate: 0.235
      }
    ],
    sequence: {
      totalSteps: 5,
      currentStep: 3,
      completionRate: 0.60
    }
  },
  {
    id: 'camp_fintech_expansion_jan',
    name: 'Fintech Expansion January',
    status: 'active',
    type: 'multi-channel',
    icpProfile: 'icp_rtgs_fintech_expansion',
    createdAt: '2025-01-20T14:00:00Z',
    startedAt: '2025-01-21T09:00:00Z',
    performance: {
      // Email metrics
      enrolled: 89,
      contacted: 76,
      opened: 52,
      clicked: 18,
      replied: 7,
      bounced: 2,
      unsubscribed: 1,
      openRate: 0.684,
      clickRate: 0.237,
      replyRate: 0.092,
      bounceRate: 0.026,
      // LinkedIn metrics
      linkedinSent: 64,
      linkedinAccepted: 28,
      linkedinMessaged: 28,
      linkedinReplied: 6,
      linkedinAcceptRate: 0.438,
      linkedinReplyRate: 0.214
    },
    emailPerformance: [
      {
        step: 1,
        subject: 'Scaling {{companyName}} across borders?',
        sent: 89,
        opened: 62,
        clicked: 24,
        replied: 5,
        bounced: 1,
        openRate: 0.70,
        clickRate: 0.27,
        replyRate: 0.056
      },
      {
        step: 2,
        subject: 'Re: Multi-currency settlement',
        sent: 76,
        opened: 48,
        clicked: 14,
        replied: 2,
        bounced: 1,
        openRate: 0.63,
        clickRate: 0.18,
        replyRate: 0.026
      }
    ],
    linkedinPerformance: [
      {
        step: 1,
        type: 'connection',
        message: 'Saw your post about international expansion...',
        sent: 64,
        accepted: 28,
        acceptRate: 0.438
      },
      {
        step: 2,
        type: 'message',
        message: 'Thanks for accepting! How are you handling FX settlement?',
        sent: 28,
        replied: 6,
        replyRate: 0.214
      }
    ],
    sequence: {
      totalSteps: 4,
      currentStep: 2,
      completionRate: 0.50
    }
  },
  {
    id: 'camp_ecommerce_pilot',
    name: 'E-commerce Pilot',
    status: 'paused',
    type: 'email',
    icpProfile: 'icp_rtgs_ecommerce_high_volume',
    createdAt: '2025-01-10T11:00:00Z',
    startedAt: '2025-01-12T10:00:00Z',
    pausedAt: '2025-01-18T15:30:00Z',
    performance: {
      enrolled: 37,
      contacted: 32,
      opened: 18,
      clicked: 6,
      replied: 2,
      bounced: 1,
      unsubscribed: 0,
      openRate: 0.563,
      clickRate: 0.188,
      replyRate: 0.063,
      bounceRate: 0.031,
      // LinkedIn metrics (empty for email-only campaign)
      linkedinSent: 0,
      linkedinAccepted: 0,
      linkedinMessaged: 0,
      linkedinReplied: 0,
      linkedinAcceptRate: 0,
      linkedinReplyRate: 0
    },
    emailPerformance: [
      {
        step: 1,
        subject: 'Simplify FX for {{companyName}}',
        sent: 37,
        opened: 24,
        clicked: 8,
        replied: 2,
        bounced: 1,
        openRate: 0.65,
        clickRate: 0.22,
        replyRate: 0.054
      },
      {
        step: 2,
        subject: 'Re: International payments',
        sent: 32,
        opened: 18,
        clicked: 5,
        replied: 0,
        bounced: 0,
        openRate: 0.56,
        clickRate: 0.16,
        replyRate: 0.00
      }
    ],
    linkedinPerformance: [],
    sequence: {
      totalSteps: 3,
      currentStep: 2,
      completionRate: 0.67
    }
  },
  {
    id: 'camp_test_new_copy',
    name: 'Test: New Value Prop',
    status: 'draft',
    type: 'email',
    icpProfile: 'icp_rtgs_psp_treasury',
    createdAt: '2025-01-25T16:00:00Z',
    performance: {
      enrolled: 0,
      contacted: 0,
      opened: 0,
      clicked: 0,
      replied: 0,
      bounced: 0,
      unsubscribed: 0,
      openRate: 0,
      clickRate: 0,
      replyRate: 0,
      bounceRate: 0
    },
    emailPerformance: [],
    linkedinPerformance: [],
    sequence: {
      totalSteps: 3,
      currentStep: 0,
      completionRate: 0
    }
  }
];
