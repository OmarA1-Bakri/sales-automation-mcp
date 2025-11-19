import React, { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import TitleBar from './components/TitleBar';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import ChatPage from './pages/ChatPage';
import CampaignsPage from './pages/CampaignsPage';
import ContactsPage from './pages/ContactsPage';
import ImportPage from './pages/ImportPage';
import ICPPage from './pages/ICPPage';
import SettingsPage from './pages/SettingsPage';
import ErrorBoundary from './components/ErrorBoundary';
import useStore from './store/useStore';

function App() {
  const { currentView, sidebarOpen } = useStore();

  // Load config on mount
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      // PHASE 3 FIX (P3.4): Load from secure encrypted storage
      if (window.electron?.retrieveCredential) {
        // Migrate from localStorage if needed
        await migrateFromLocalStorage();

        // Load encrypted credentials
        const keys = ['apiKey', 'hubspotKey', 'lemlistKey', 'exploriumKey'];
        const credentials = {};

        for (const key of keys) {
          const result = await window.electron.retrieveCredential(key);
          if (result.success && result.value) {
            credentials[key] = result.value;
          }
        }

        // Update store
        if (credentials.apiKey) {
          useStore.getState().updateApiKeys({
            salesAutomation: credentials.apiKey,
            hubspot: credentials.hubspotKey,
            lemlist: credentials.lemlistKey,
            explorium: credentials.exploriumKey,
          });
        }
      } else {
        // Fallback to localStorage in browser mode
        const savedApiKey = localStorage.getItem('apiKey');
        if (savedApiKey) {
          useStore.getState().updateApiKeys({ salesAutomation: savedApiKey });
        }
      }
    } catch (error) {
      console.error('Failed to load config:', error);
    }
  };

  // PHASE 3 FIX (P3.4): Migrate credentials from localStorage to encrypted storage
  const migrateFromLocalStorage = async () => {
    try {
      // Check if migration already done
      const migrated = localStorage.getItem('credentials-migrated');
      if (migrated === 'true') {
        return;
      }

      const keys = ['apiKey', 'hubspotKey', 'lemlistKey', 'exploriumKey'];
      let migrationCount = 0;

      for (const key of keys) {
        const value = localStorage.getItem(key);
        if (value && window.electron?.storeCredential) {
          const result = await window.electron.storeCredential(key, value);
          if (result.success) {
            migrationCount++;
            // Delete from localStorage after successful migration
            localStorage.removeItem(key);
          }
        }
      }

      if (migrationCount > 0) {
        console.log(`[Security] Migrated ${migrationCount} credentials to encrypted storage`);
        localStorage.setItem('credentials-migrated', 'true');
      }
    } catch (error) {
      console.error('[Security] Migration failed:', error);
    }
  };

  // Render current view with error boundaries (PHASE 3 FIX P3.5)
  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <ErrorBoundary fallbackMessage="Dashboard encountered an error. Please try again.">
            <Dashboard />
          </ErrorBoundary>
        );
      case 'chat':
        return (
          <ErrorBoundary fallbackMessage="Chat page encountered an error. Please try again.">
            <ChatPage />
          </ErrorBoundary>
        );
      case 'campaigns':
        return (
          <ErrorBoundary fallbackMessage="Campaigns page encountered an error. Please try again.">
            <CampaignsPage />
          </ErrorBoundary>
        );
      case 'contacts':
        return (
          <ErrorBoundary fallbackMessage="Contacts page encountered an error. Please try again.">
            <ContactsPage />
          </ErrorBoundary>
        );
      case 'import':
        return (
          <ErrorBoundary fallbackMessage="Import page encountered an error. Please try again.">
            <ImportPage />
          </ErrorBoundary>
        );
      case 'icp':
        return (
          <ErrorBoundary fallbackMessage="ICP page encountered an error. Please try again.">
            <ICPPage />
          </ErrorBoundary>
        );
      case 'settings':
        return (
          <ErrorBoundary fallbackMessage="Settings page encountered an error. Please try again.">
            <SettingsPage />
          </ErrorBoundary>
        );
      default:
        return (
          <ErrorBoundary fallbackMessage="Page encountered an error. Please try again.">
            <Dashboard />
          </ErrorBoundary>
        );
    }
  };

  return (
    // PHASE 3 FIX (P3.5): Wrap entire app in ErrorBoundary for top-level error catching
    <ErrorBoundary fallbackMessage="The application encountered an unexpected error.">
      <div className="h-screen w-screen flex flex-col overflow-hidden bg-slate-900">
        {/* Custom title bar for frameless window */}
        <TitleBar />

        {/* Main content area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar with error boundary */}
          <ErrorBoundary fallbackMessage="Sidebar encountered an error.">
            <Sidebar />
          </ErrorBoundary>

          {/* Main view */}
          <main
            className={`flex-1 overflow-hidden transition-all duration-300 ${
              sidebarOpen ? 'ml-0' : '-ml-64'
            }`}
          >
            {renderView()}
          </main>
        </div>

        {/* Toast notifications */}
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1e293b',
              color: '#f1f5f9',
              border: '1px solid #334155',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#ffffff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#ffffff',
              },
            },
          }}
        />
      </div>
    </ErrorBoundary>
  );
}

export default App;
