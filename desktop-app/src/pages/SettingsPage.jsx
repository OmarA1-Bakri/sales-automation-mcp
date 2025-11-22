import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import api from '../services/api';
import useStore from '../store/useStore';

function SettingsPage() {
  const { apiKeys, updateApiKeys } = useStore();
  const [apiKey, setApiKey] = useState('');
  const [apiUrl, setApiUrl] = useState('http://localhost:3000');
  const [useHttps, setUseHttps] = useState(true);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);

  // Integration API keys
  const [hubspotKey, setHubspotKey] = useState('');
  const [lemlistKey, setLemlistKey] = useState('');
  const [exploriumKey, setExploriumKey] = useState('');
  const [integrationStatus, setIntegrationStatus] = useState(null);

  // PHASE 3 FIX (P3.4): Load saved settings from secure encrypted storage
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Load API URL from localStorage (not sensitive)
        const savedApiUrl = localStorage.getItem('apiUrl');
        if (savedApiUrl) {
          setApiUrl(savedApiUrl);
          api.baseURL = savedApiUrl;
          setUseHttps(savedApiUrl.startsWith('https'));
        }

        // Load API keys from encrypted storage
        if (window.electron?.retrieveCredential) {
          // Load main API key
          const apiKeyResult = await window.electron.retrieveCredential('apiKey');
          if (apiKeyResult.success && apiKeyResult.value) {
            setApiKey(apiKeyResult.value);
            api.setApiKey(apiKeyResult.value);
          }

          // Load integration keys
          const hubspotResult = await window.electron.retrieveCredential('hubspotKey');
          if (hubspotResult.success && hubspotResult.value) {
            setHubspotKey(hubspotResult.value);
          }

          const lemlistResult = await window.electron.retrieveCredential('lemlistKey');
          if (lemlistResult.success && lemlistResult.value) {
            setLemlistKey(lemlistResult.value);
          }

          const exploriumResult = await window.electron.retrieveCredential('exploriumKey');
          if (exploriumResult.success && exploriumResult.value) {
            setExploriumKey(exploriumResult.value);
          }
        } else {
          // Fallback to localStorage in browser mode
          const savedApiKey = localStorage.getItem('apiKey');
          const savedHubspot = localStorage.getItem('hubspotKey');
          const savedLemlist = localStorage.getItem('lemlistKey');
          const savedExplorium = localStorage.getItem('exploriumKey');

          if (savedApiKey) {
            setApiKey(savedApiKey);
            api.setApiKey(savedApiKey);
          }
          if (savedHubspot) setHubspotKey(savedHubspot);
          if (savedLemlist) setLemlistKey(savedLemlist);
          if (savedExplorium) setExploriumKey(savedExplorium);
        }

        // Load integration status
        loadIntegrationStatus();
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    };

    loadSettings();
  }, []);

  const loadIntegrationStatus = async () => {
    try {
      const stats = await api.getStats();
      if (stats && stats.integrations) {
        setIntegrationStatus(stats.integrations);
      }
    } catch (error) {
      console.error('Failed to load integration status:', error);
    }
  };

  // PHASE 3 FIX (P3.4): Save API key to encrypted storage
  const handleSave = async () => {
    if (!apiKey.trim()) {
      toast.error('Please enter an API key');
      return;
    }

    // SECURITY FIX: Phase 2, T2.5 - Validate URL before saving (SSRF prevention)
    const validation = isValidApiUrl(apiUrl);
    if (!validation.valid) {
      toast.error(`Invalid API URL: ${validation.error}`);
      return;
    }

    try {
      // Save API URL to localStorage (not sensitive)
      localStorage.setItem('apiUrl', apiUrl);

      // Save API key to encrypted storage
      if (window.electron?.storeCredential) {
        const result = await window.electron.storeCredential('apiKey', apiKey);
        if (!result.success) {
          toast.error('Failed to save API key securely');
          return;
        }

        if (!result.encrypted) {
          toast.error('Warning: API key saved without encryption', {
            icon: '⚠️',
          });
        }
      } else {
        // Fallback to localStorage in browser mode
        localStorage.setItem('apiKey', apiKey);
      }

      // Update API service
      api.setApiKey(apiKey);
      api.baseURL = apiUrl;

      // Update store
      updateApiKeys({ salesAutomation: apiKey });

      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    }
  };

  const handleTestConnection = async () => {
    if (!apiKey.trim()) {
      toast.error('Please enter an API key first');
      return;
    }

    // SECURITY FIX: Phase 2, T2.5 - Validate URL before making request (SSRF prevention)
    const validation = isValidApiUrl(apiUrl);
    if (!validation.valid) {
      toast.error(`Invalid API URL: ${validation.error}`);
      setConnectionStatus({
        success: false,
        message: validation.error,
      });
      return;
    }

    setTestingConnection(true);
    setConnectionStatus(null);

    try {
      // Update API service with current settings (without saving)
      api.setApiKey(apiKey);
      api.baseURL = apiUrl;

      // Test connection
      const health = await api.testConnection();

      if (health.status === 'healthy') {
        setConnectionStatus({
          success: true,
          message: 'Connection successful',
          service: health.service,
          version: health.version,
        });
        toast.success('Connection successful!');
      } else {
        setConnectionStatus({
          success: false,
          message: 'Server returned unexpected response',
        });
        toast.error('Connection test failed');
      }
    } catch (error) {
      setConnectionStatus({
        success: false,
        message: error.message || 'Connection failed',
      });
      toast.error(`Connection failed: ${error.message}`);
    } finally {
      setTestingConnection(false);
    }
  };

  // SECURITY FIX: Phase 2, T2.5 - Validate URL to prevent SSRF attacks
  const isValidApiUrl = (url) => {
    try {
      const parsed = new URL(url);

      // Only allow HTTP and HTTPS protocols
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return { valid: false, error: 'Only HTTP and HTTPS protocols are allowed' };
      }

      // Block private IP ranges (SSRF prevention)
      const hostname = parsed.hostname.toLowerCase();

      // Block localhost/loopback (except explicitly allowed)
      const localhostPatterns = ['localhost', '127.0.0.1', '[::1]', '0.0.0.0'];
      const isLocalhost = localhostPatterns.some(pattern => hostname === pattern);

      // Block private IP ranges
      const privateIpPatterns = [
        /^10\./,                    // 10.0.0.0/8
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./,  // 172.16.0.0/12
        /^192\.168\./,              // 192.168.0.0/16
        /^169\.254\./,              // Link-local (AWS metadata)
        /^fd[0-9a-f]{2}:/i,         // IPv6 private
      ];
      const isPrivateIp = privateIpPatterns.some(pattern => pattern.test(hostname));

      // Block cloud metadata endpoints
      const metadataPatterns = [
        '169.254.169.254',          // AWS/Azure/GCP metadata
        'metadata.google.internal', // GCP metadata
        'metadata.azure.com',       // Azure metadata
      ];
      const isMetadataEndpoint = metadataPatterns.some(pattern => hostname.includes(pattern));

      // Allow localhost only for development
      if (!isLocalhost && (isPrivateIp || isMetadataEndpoint)) {
        return { valid: false, error: 'Cannot connect to private IP addresses or cloud metadata endpoints' };
      }

      // Validate port (if specified)
      if (parsed.port) {
        const port = parseInt(parsed.port, 10);
        if (isNaN(port) || port < 1 || port > 65535) {
          return { valid: false, error: 'Invalid port number' };
        }
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: 'Invalid URL format' };
    }
  };

  const handleProtocolChange = (https) => {
    setUseHttps(https);
    const currentUrl = new URL(apiUrl);
    const newUrl = https
      ? `https://${currentUrl.hostname}:3457`  // HTTPS port
      : `http://${currentUrl.hostname}:3000`;   // HTTP port
    setApiUrl(newUrl);
  };

  // PHASE 3 FIX (P3.4): Save integration keys to encrypted storage
  const handleSaveIntegrations = async () => {
    try {
      let saveCount = 0;

      // Save integration keys to encrypted storage
      if (window.electron?.storeCredential) {
        if (hubspotKey.trim()) {
          const result = await window.electron.storeCredential('hubspotKey', hubspotKey);
          if (result.success) saveCount++;
        }
        if (lemlistKey.trim()) {
          const result = await window.electron.storeCredential('lemlistKey', lemlistKey);
          if (result.success) saveCount++;
        }
        if (exploriumKey.trim()) {
          const result = await window.electron.storeCredential('exploriumKey', exploriumKey);
          if (result.success) saveCount++;
        }
      } else {
        // Fallback to localStorage in browser mode
        if (hubspotKey.trim()) {
          localStorage.setItem('hubspotKey', hubspotKey);
          saveCount++;
        }
        if (lemlistKey.trim()) {
          localStorage.setItem('lemlistKey', lemlistKey);
          saveCount++;
        }
        if (exploriumKey.trim()) {
          localStorage.setItem('exploriumKey', exploriumKey);
          saveCount++;
        }
      }

      // Update store
      updateApiKeys({
        hubspot: hubspotKey,
        lemlist: lemlistKey,
        explorium: exploriumKey,
      });

      if (saveCount > 0) {
        toast.success('Integration settings saved securely. Restart the API server to apply changes.');
      } else {
        toast.error('No integration keys to save');
      }
    } catch (error) {
      console.error('Failed to save integration settings:', error);
      toast.error('Failed to save integration settings');
    }
  };

  const getStatusColor = (status) => {
    if (status === 'healthy') return 'text-green-400';
    if (status === 'unhealthy') return 'text-red-400';
    return 'text-slate-400';
  };

  const getStatusIcon = (status) => {
    if (status === 'healthy') return '✓';
    if (status === 'unhealthy') return '✗';
    return '?';
  };

  return (
    <div className="h-full overflow-auto bg-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
          <p className="text-slate-400">Configure your API connection and preferences</p>
        </div>

        {/* API Configuration */}
        <div className="bg-slate-800 rounded-lg p-6 mb-6 border border-slate-700">
          <h2 className="text-xl font-semibold text-white mb-4">API Configuration</h2>

          {/* API Key */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk_live_..."
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-2 text-sm text-slate-400">
              Your API key for authenticating with the Sales Automation server
            </p>
          </div>

          {/* Protocol Toggle */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-300 mb-3">
              Connection Protocol
            </label>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => handleProtocolChange(false)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  !useHttps
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                }`}
              >
                HTTP
              </button>
              <button
                onClick={() => handleProtocolChange(true)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  useHttps
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                }`}
              >
                HTTPS (Recommended)
              </button>
            </div>
            {!useHttps && (
              <p className="mt-2 text-sm text-amber-400 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Warning: HTTP is not secure. Use for development only.
              </p>
            )}
          </div>

          {/* API URL */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              API URL
            </label>
            <input
              type="text"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="http://localhost:3000"
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-2 text-sm text-slate-400">
              Default: {useHttps ? 'https://localhost:3457' : 'http://localhost:3000'}
            </p>
          </div>

          {/* Connection Status */}
          {connectionStatus && (
            <div className={`mb-6 p-4 rounded-lg ${
              connectionStatus.success
                ? 'bg-green-900/30 border border-green-700'
                : 'bg-red-900/30 border border-red-700'
            }`}>
              <div className="flex items-center">
                {connectionStatus.success ? (
                  <svg className="w-5 h-5 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                )}
                <div className="flex-1">
                  <p className={`font-medium ${
                    connectionStatus.success ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {connectionStatus.message}
                  </p>
                  {connectionStatus.success && connectionStatus.service && (
                    <p className="text-sm text-slate-400 mt-1">
                      Service: {connectionStatus.service} v{connectionStatus.version}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center space-x-4">
            <button
              onClick={handleTestConnection}
              disabled={testingConnection}
              className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {testingConnection ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Testing...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Test Connection
                </>
              )}
            </button>

            <button
              onClick={handleSave}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              Save Settings
            </button>
          </div>
        </div>

        {/* Integration Management */}
        <div className="bg-slate-800 rounded-lg p-6 mb-6 border border-slate-700">
          <h2 className="text-xl font-semibold text-white mb-4">Integration API Keys</h2>
          <p className="text-slate-400 mb-6">
            Configure API keys for third-party integrations. These are stored in localStorage and must be set in the server's .env file to take effect.
          </p>

          {/* Integration Status */}
          {integrationStatus && (
            <div className="mb-6 p-4 bg-slate-700/50 rounded-lg">
              <h3 className="text-sm font-medium text-slate-300 mb-3">Current Status</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className={`text-2xl font-bold mb-1 ${getStatusColor(integrationStatus.hubspot)}`}>
                    {getStatusIcon(integrationStatus.hubspot)}
                  </div>
                  <div className="text-sm text-slate-400">HubSpot</div>
                  <div className={`text-xs ${getStatusColor(integrationStatus.hubspot)}`}>
                    {integrationStatus.hubspot}
                  </div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold mb-1 ${getStatusColor(integrationStatus.lemlist)}`}>
                    {getStatusIcon(integrationStatus.lemlist)}
                  </div>
                  <div className="text-sm text-slate-400">Lemlist</div>
                  <div className={`text-xs ${getStatusColor(integrationStatus.lemlist)}`}>
                    {integrationStatus.lemlist}
                  </div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold mb-1 ${getStatusColor(integrationStatus.explorium)}`}>
                    {getStatusIcon(integrationStatus.explorium)}
                  </div>
                  <div className="text-sm text-slate-400">Explorium</div>
                  <div className={`text-xs ${getStatusColor(integrationStatus.explorium)}`}>
                    {integrationStatus.explorium}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* HubSpot Key */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              HubSpot API Key
            </label>
            <input
              type="password"
              value={hubspotKey}
              onChange={(e) => setHubspotKey(e.target.value)}
              placeholder="pat-na1-..."
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-2 text-sm text-slate-400">
              Get from HubSpot → Settings → Integrations → Private Apps
            </p>
            {integrationStatus?.hubspot === 'unhealthy' && (
              <p className="mt-2 text-sm text-red-400 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                Current API key is invalid or expired. Please update.
              </p>
            )}
          </div>

          {/* Lemlist Key */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Lemlist API Key
            </label>
            <input
              type="password"
              value={lemlistKey}
              onChange={(e) => setLemlistKey(e.target.value)}
              placeholder="..."
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-2 text-sm text-slate-400">
              Get from Lemlist → Settings → Integrations → API
            </p>
          </div>

          {/* Explorium Key */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Explorium API Key
            </label>
            <input
              type="password"
              value={exploriumKey}
              onChange={(e) => setExploriumKey(e.target.value)}
              placeholder="..."
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-2 text-sm text-slate-400">
              Contact Explorium support for API access
            </p>
          </div>

          <button
            onClick={handleSaveIntegrations}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            Save Integration Keys
          </button>

          <div className="mt-4 p-3 bg-amber-900/30 border border-amber-700 rounded-lg">
            <p className="text-sm text-amber-400">
              <strong>Note:</strong> Integration keys saved here are stored in your browser's localStorage.
              To apply these changes to the server, you must update the <code className="bg-slate-700 px-1 rounded">.env</code> file
              in the <code className="bg-slate-700 px-1 rounded">sales-automation-api</code> directory and restart the API server.
            </p>
          </div>
        </div>

        {/* Quick Start Guide */}
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h2 className="text-xl font-semibold text-white mb-4">Quick Start</h2>
          <div className="space-y-3 text-slate-300">
            <div className="flex items-start">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-sm font-bold mr-3 mt-0.5">1</span>
              <div>
                <p className="font-medium">Enter your API Key</p>
                <p className="text-sm text-slate-400">Get your API key from the .env file in the sales-automation-api directory</p>
              </div>
            </div>
            <div className="flex items-start">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-sm font-bold mr-3 mt-0.5">2</span>
              <div>
                <p className="font-medium">Choose Protocol</p>
                <p className="text-sm text-slate-400">HTTPS is recommended for security (port 3457). Use HTTP (port 3000) for development only.</p>
              </div>
            </div>
            <div className="flex items-start">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-sm font-bold mr-3 mt-0.5">3</span>
              <div>
                <p className="font-medium">Test Connection</p>
                <p className="text-sm text-slate-400">Click "Test Connection" to verify the API server is reachable</p>
              </div>
            </div>
            <div className="flex items-start">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-sm font-bold mr-3 mt-0.5">4</span>
              <div>
                <p className="font-medium">Configure Integrations</p>
                <p className="text-sm text-slate-400">Add API keys for HubSpot, Lemlist, and Explorium to enable imports and sync</p>
              </div>
            </div>
            <div className="flex items-start">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-sm font-bold mr-3 mt-0.5">5</span>
              <div>
                <p className="font-medium">Save Settings</p>
                <p className="text-sm text-slate-400">Settings are saved to your browser's localStorage</p>
              </div>
            </div>
          </div>
        </div>

        {/* Current API Key Display (for debugging) - SECURITY: Limited to 8 chars */}
        {apiKey && process.env.NODE_ENV === 'development' && (
          <div className="mt-6 bg-slate-800 rounded-lg p-4 border border-slate-700">
            <p className="text-xs text-slate-400 mb-2">Current API Key (masked):</p>
            <code className="text-xs text-green-400 font-mono">
              {apiKey.substring(0, 8)}***...***{apiKey.substring(apiKey.length - 4)}
            </code>
          </div>
        )}
      </div>
    </div>
  );
}

export default SettingsPage;
