/**
 * Mock ICP Profile Data
 * Extracted from ICPPage.jsx for better code organization
 */

export const mockICPProfiles = [
  {
    id: 'icp_rtgs_psp_treasury',
    name: 'PSP Treasury Leaders',
    description: 'Treasury heads at global PSPs managing liquidity and FX risk',
    tier: 'core',
    active: true,
    firmographics: {
      companySize: { min: 10, max: 2000 },
      industries: ['Payment Service Provider', 'PSP', 'Cross-border Payments', 'Fintech'],
      revenue: { min: 5000000, max: 500000000 },
      geographies: ['United Kingdom', 'Germany', 'Singapore', 'Hong Kong', 'UAE']
    },
    titles: {
      primary: ['Head of Treasury', 'VP Treasury', 'Treasury Director', 'Treasury Manager'],
      secondary: ['Head of Operations', 'VP Operations', 'CFO', 'Head of Payments']
    },
    scoring: {
      autoApprove: 0.75,
      reviewRequired: 0.60,
      disqualify: 0.45
    },
    stats: {
      discovered: 142,
      enriched: 98,
      enrolled: 45,
      avgScore: 0.72
    }
  },
  {
    id: 'icp_rtgs_fintech_expansion',
    name: 'Expanding Fintech',
    description: 'Fast-growing fintech companies entering new markets',
    tier: 'growth',
    active: true,
    firmographics: {
      companySize: { min: 50, max: 1000 },
      industries: ['Fintech', 'Digital Banking', 'Payment Processing', 'Neobank'],
      revenue: { min: 10000000, max: 200000000 },
      geographies: ['Global']
    },
    titles: {
      primary: ['VP Product', 'Head of Expansion', 'CFO', 'COO'],
      secondary: ['Head of Operations', 'Treasury Director', 'Product Director']
    },
    scoring: {
      autoApprove: 0.70,
      reviewRequired: 0.55,
      disqualify: 0.40
    },
    stats: {
      discovered: 89,
      enriched: 62,
      enrolled: 28,
      avgScore: 0.68
    }
  },
  {
    id: 'icp_rtgs_ecommerce_high_volume',
    name: 'High-Volume E-commerce',
    description: 'E-commerce platforms processing $50M+ annually',
    tier: 'strategic',
    active: false,
    firmographics: {
      companySize: { min: 100, max: 5000 },
      industries: ['E-commerce', 'Marketplace', 'Retail Tech'],
      revenue: { min: 50000000, max: 1000000000 },
      geographies: ['United States', 'United Kingdom', 'Germany', 'Australia']
    },
    titles: {
      primary: ['CFO', 'VP Finance', 'Treasurer', 'Head of Payments'],
      secondary: ['VP Operations', 'COO', 'Head of Finance']
    },
    scoring: {
      autoApprove: 0.80,
      reviewRequired: 0.65,
      disqualify: 0.50
    },
    stats: {
      discovered: 37,
      enriched: 24,
      enrolled: 12,
      avgScore: 0.75
    }
  }
];
