/**
 * Global State Management with Zustand
 *
 * Simple, intuitive state management for the entire app
 * Persists critical state to localStorage for session continuity
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Define which state keys to persist (exclude large/ephemeral data)
const PERSISTED_KEYS = [
  'currentView',
  'sidebarOpen',
  'apiKeys',
  'yoloMode',
  'icpProfiles',
];

export const useStore = create(
  persist(
    (set, get) => ({
  // ==========================================================================
  // APP STATE
  // ==========================================================================
  isLoading: false,
  currentView: 'dashboard', // dashboard, chat, campaigns, contacts, import, settings, icp
  sidebarOpen: true,

  setCurrentView: (view) => set({ currentView: view }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setLoading: (loading) => set({ isLoading: loading }),

  // ==========================================================================
  // USER & CONFIG
  // ==========================================================================
  user: {
    name: 'RTGS User',
    email: '',
    role: 'Sales Team',
  },

  apiKeys: {
    hubspot: '',
    lemlist: '',
    explorium: '',
    apollo: '',
  },

  updateApiKeys: (keys) =>
    set((state) => ({
      apiKeys: { ...state.apiKeys, ...keys },
    })),

  // ==========================================================================
  // YOLO MODE STATE
  // ==========================================================================
  yoloMode: {
    enabled: false,
    paused: false,
    testMode: false,
    stats: {
      cyclesRun: 0,
      discovered: 0,
      enriched: 0,
      synced: 0,
      enrolled: 0,
    },
    nextRun: null,
  },

  updateYoloMode: (yoloData) =>
    set((state) => ({
      yoloMode: { ...state.yoloMode, ...yoloData },
    })),

  // ==========================================================================
  // CAMPAIGNS
  // ==========================================================================
  campaigns: [],
  selectedCampaign: null,

  setCampaigns: (campaigns) => set({ campaigns }),
  selectCampaign: (campaign) => set({ selectedCampaign: campaign }),

  // ==========================================================================
  // CONTACTS
  // ==========================================================================
  contacts: [],
  selectedContacts: [],

  setContacts: (contacts) => set({ contacts }),
  toggleContactSelection: (contactEmail) =>
    set((state) => {
      const isSelected = state.selectedContacts.includes(contactEmail);
      return {
        selectedContacts: isSelected
          ? state.selectedContacts.filter((e) => e !== contactEmail)
          : [...state.selectedContacts, contactEmail],
      };
    }),
  clearContactSelection: () => set({ selectedContacts: [] }),

  // ==========================================================================
  // ICP PROFILES
  // ==========================================================================
  icpProfiles: [
    {
      id: 'fintech_vp_finance',
      name: 'FinTech VP of Finance',
      description: 'Vice Presidents of Finance at FinTech companies (50-500 employees)',
      criteria: {
        industries: ['Financial Services', 'FinTech', 'Banking'],
        titles: ['VP of Finance', 'Vice President Finance', 'Head of Finance'],
        companySize: '50-500',
        technologies: ['Stripe', 'Plaid', 'Banking APIs'],
      },
      active: true,
    },
    {
      id: 'treasury_head',
      name: 'Head of Treasury',
      description: 'Treasury leaders managing cash flow and payments',
      criteria: {
        industries: ['Financial Services', 'E-commerce', 'SaaS'],
        titles: ['Head of Treasury', 'Director of Treasury', 'Treasury Manager'],
        companySize: '100-1000',
        technologies: ['Payment Systems', 'Banking Software'],
      },
      active: true,
    },
  ],

  setICPProfiles: (profiles) => set({ icpProfiles: profiles }),
  addICPProfile: (profile) =>
    set((state) => ({
      icpProfiles: [...state.icpProfiles, profile],
    })),
  updateICPProfile: (id, updates) =>
    set((state) => ({
      icpProfiles: state.icpProfiles.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
    })),
  deleteICPProfile: (id) =>
    set((state) => ({
      icpProfiles: state.icpProfiles.filter((p) => p.id !== id),
    })),

  // ==========================================================================
  // CHAT MESSAGES
  // ==========================================================================
  chatMessages: [
    {
      id: '1',
      role: 'assistant',
      content: "👋 Hi! I'm your RTGS Sales Automation assistant. I can help you:\n\n• Set up and run campaigns\n• Import and manage contacts\n• Configure ICP profiles\n• Enable YOLO mode for full automation\n• Answer questions about your outreach\n\nWhat would you like to do today?",
      timestamp: new Date().toISOString(),
    },
  ],

  addChatMessage: (message) =>
    set((state) => ({
      chatMessages: [
        ...state.chatMessages,
        {
          ...message,
          id: `${Date.now()}`,
          timestamp: new Date().toISOString(),
        },
      ],
    })),

  clearChat: () =>
    set({
      chatMessages: [
        {
          id: '1',
          role: 'assistant',
          content: "Chat cleared. How can I help you?",
          timestamp: new Date().toISOString(),
        },
      ],
    }),

  // ==========================================================================
  // NOTIFICATIONS
  // ==========================================================================
  notifications: [],

  addNotification: (notification) =>
    set((state) => ({
      notifications: [
        ...state.notifications,
        {
          ...notification,
          id: `notif-${Date.now()}`,
          timestamp: new Date().toISOString(),
        },
      ],
    })),

  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),

  clearNotifications: () => set({ notifications: [] }),

  // ==========================================================================
  // JOBS & ACTIVITY
  // ==========================================================================
  jobs: [],
  activityLog: [],

  setJobs: (jobs) => set({ jobs }),
  addJob: (job) =>
    set((state) => ({
      jobs: [job, ...state.jobs],
    })),

  updateJob: (jobId, updates) =>
    set((state) => ({
      jobs: state.jobs.map((j) => (j.id === jobId ? { ...j, ...updates } : j)),
    })),

  setActivityLog: (log) => set({ activityLog: log }),
  addActivity: (activity) =>
    set((state) => ({
      activityLog: [activity, ...state.activityLog],
    })),
    }),
    {
      name: 'rtgs-sales-automation-storage', // localStorage key
      storage: createJSONStorage(() => localStorage),
      // Only persist selected keys (exclude large/ephemeral data like chatMessages, jobs)
      partialize: (state) =>
        Object.fromEntries(
          Object.entries(state).filter(([key]) => PERSISTED_KEYS.includes(key))
        ),
      // Handle hydration for version migrations
      version: 1,
      onRehydrateStorage: () => (state) => {
        if (state) {
          console.log('[Store] Hydrated persisted state');
        }
      },
    }
  )
);

export default useStore;
