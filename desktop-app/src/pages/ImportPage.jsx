import React, { useState } from 'react';
import { Upload, Database, Mail, CheckCircle, AlertTriangle, Loader } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../services/api';

function ImportPage() {
  const [activeTab, setActiveTab] = useState('csv'); // 'csv' | 'hubspot' | 'lemlist'
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  // CSV Import State
  const [csvFile, setCsvFile] = useState(null);
  const [csvData, setCsvData] = useState([]);

  // HubSpot Import State
  const [hubspotListId, setHubspotListId] = useState('');

  // Lemlist Import State
  const [lemlistCampaignId, setLemlistCampaignId] = useState('');
  const [lemlistCampaigns, setLemlistCampaigns] = useState([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);

  const handleCSVUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    setCsvFile(file);

    // Read and parse CSV (simple parsing for preview)
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split('\n');
      const headers = lines[0].split(',');
      const preview = lines.slice(1, 6).map(line => {
        const values = line.split(',');
        return headers.reduce((obj, header, i) => {
          obj[header.trim()] = values[i] || '';
          return obj;
        }, {});
      });
      setCsvData(preview);
    };
    reader.readAsText(file);
  };

  const handleImportCSV = async () => {
    if (!csvFile) {
      toast.error('Please select a CSV file');
      return;
    }

    setImporting(true);
    setImportResult(null);

    try {
      // Read the CSV file content
      const fileContent = await csvFile.text();

      // Send to API
      const result = await api.call('/api/import/csv', 'POST', {
        csvData: fileContent,
        deduplicate: true
      });

      if (result.success) {
        toast.success(`Imported ${result.imported || 0} contacts from CSV`);
        setImportResult({
          success: true,
          message: 'Import successful',
          imported: result.imported || 0,
          failed: result.skipped || 0
        });
      } else {
        throw new Error(result.error || 'Import failed');
      }
    } catch (error) {
      toast.error(`Import failed: ${error.message}`);
      setImportResult({
        success: false,
        message: error.message,
        imported: 0,
        failed: 0
      });
    } finally {
      setImporting(false);
    }
  };

  const handleImportHubSpot = async () => {
    if (!hubspotListId.trim()) {
      toast.error('Please enter a HubSpot list ID');
      return;
    }

    setImporting(true);
    setImportResult(null);

    try {
      const result = await api.importFromHubSpot({
        listId: hubspotListId,
        limit: 1000
      });

      toast.success(`Imported ${result.imported || 0} contacts from HubSpot`);
      setImportResult({
        success: true,
        message: 'Import successful',
        imported: result.imported || 0,
        failed: result.failed || 0
      });
    } catch (error) {
      toast.error(`Import failed: ${error.message}`);
      setImportResult({
        success: false,
        message: error.message,
        imported: 0,
        failed: 0
      });
    } finally {
      setImporting(false);
    }
  };

  const loadLemlistCampaigns = async () => {
    setLoadingCampaigns(true);
    try {
      const result = await api.getCampaignsDirect();
      if (result && result.campaigns) {
        setLemlistCampaigns(result.campaigns);
      }
    } catch (error) {
      console.error('Failed to load campaigns:', error);
      toast.error('Failed to load campaigns. Enter campaign ID manually.');
    } finally {
      setLoadingCampaigns(false);
    }
  };

  const handleImportLemlist = async () => {
    if (!lemlistCampaignId.trim()) {
      toast.error('Please select or enter a Lemlist campaign ID');
      return;
    }

    setImporting(true);
    setImportResult(null);

    try {
      const result = await api.importFromLemlist({
        campaignId: lemlistCampaignId,
        limit: 1000
      });

      toast.success(`Imported ${result.imported || 0} contacts from Lemlist`);
      setImportResult({
        success: true,
        message: 'Import successful',
        imported: result.imported || 0,
        failed: result.failed || 0
      });
    } catch (error) {
      toast.error(`Import failed: ${error.message}`);
      setImportResult({
        success: false,
        message: error.message,
        imported: 0,
        failed: 0
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div data-testid="import-page" className="h-full overflow-auto bg-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Import Contacts</h1>
          <p className="text-slate-400">Import contacts from CSV, HubSpot, or Lemlist</p>
        </div>

        {/* Tab Navigation */}
        <div data-testid="import-tabs" className="flex space-x-2 mb-6 border-b border-slate-700">
          <button
            data-testid="import-tab-csv"
            onClick={() => setActiveTab('csv')}
            className={`px-6 py-3 font-medium transition-colors border-b-2 ${
              activeTab === 'csv'
                ? 'text-blue-400 border-blue-400'
                : 'text-slate-400 border-transparent hover:text-white'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Upload size={18} />
              <span>CSV Upload</span>
            </div>
          </button>
          <button
            data-testid="import-tab-hubspot"
            onClick={() => setActiveTab('hubspot')}
            className={`px-6 py-3 font-medium transition-colors border-b-2 ${
              activeTab === 'hubspot'
                ? 'text-blue-400 border-blue-400'
                : 'text-slate-400 border-transparent hover:text-white'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Database size={18} />
              <span>HubSpot</span>
            </div>
          </button>
          <button
            data-testid="import-tab-lemlist"
            onClick={() => setActiveTab('lemlist')}
            className={`px-6 py-3 font-medium transition-colors border-b-2 ${
              activeTab === 'lemlist'
                ? 'text-blue-400 border-blue-400'
                : 'text-slate-400 border-transparent hover:text-white'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Mail size={18} />
              <span>Lemlist</span>
            </div>
          </button>
        </div>

        {/* Tab Content */}
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          {/* CSV Upload Tab */}
          {activeTab === 'csv' && (
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">Upload CSV File</h2>
              <p className="text-slate-400 mb-6">
                Upload a CSV file containing contact information. Contacts will be stored in the database. Required columns: email, firstName, lastName, company
              </p>

              {/* File Upload */}
              <div className="mb-6">
                <label className="block w-full">
                  <div data-testid="import-dropzone" className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors">
                    <Upload size={48} className="mx-auto mb-4 text-slate-400" />
                    <p className="text-white font-medium mb-2">
                      {csvFile ? csvFile.name : 'Click to upload CSV file'}
                    </p>
                    <p className="text-sm text-slate-400">or drag and drop</p>
                  </div>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCSVUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* CSV Preview */}
              {csvData.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-white mb-3">Preview (first 5 rows)</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-700">
                          {Object.keys(csvData[0]).map((header) => (
                            <th key={header} className="text-left py-2 px-3 text-slate-300 font-medium">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {csvData.map((row, i) => (
                          <tr key={i} className="border-b border-slate-700/50">
                            {Object.values(row).map((value, j) => (
                              <td key={j} className="py-2 px-3 text-slate-400">
                                {String(value).substring(0, 50)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <button
                data-testid="import-btn"
                onClick={handleImportCSV}
                disabled={!csvFile || importing}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {importing ? (
                  <>
                    <Loader className="animate-spin mr-2" size={18} />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2" size={18} />
                    Import Contacts
                  </>
                )}
              </button>
            </div>
          )}

          {/* HubSpot Import Tab */}
          {activeTab === 'hubspot' && (
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">Import from HubSpot</h2>
              <p className="text-slate-400 mb-6">
                Import contacts from a HubSpot list or using filters
              </p>

              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  HubSpot List ID
                </label>
                <input
                  type="text"
                  value={hubspotListId}
                  onChange={(e) => setHubspotListId(e.target.value)}
                  placeholder="123456"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-2 text-sm text-slate-400">
                  Find list ID in HubSpot under Contacts Lists
                </p>
              </div>

              <button
                onClick={handleImportHubSpot}
                disabled={!hubspotListId.trim() || importing}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {importing ? (
                  <>
                    <Loader className="animate-spin mr-2" size={18} />
                    Importing...
                  </>
                ) : (
                  <>
                    <Database className="mr-2" size={18} />
                    Import from HubSpot
                  </>
                )}
              </button>
            </div>
          )}

          {/* Lemlist Import Tab */}
          {activeTab === 'lemlist' && (
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">Import from Lemlist</h2>
              <p className="text-slate-400 mb-6">
                Import contacts from a Lemlist campaign
              </p>

              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Lemlist Campaign ID
                </label>
                <input
                  type="text"
                  value={lemlistCampaignId}
                  onChange={(e) => setLemlistCampaignId(e.target.value)}
                  placeholder="cam_..."
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-2 text-sm text-slate-400">
                  Campaign ID starts with "cam_"
                </p>
              </div>

              <button
                onClick={handleImportLemlist}
                disabled={!lemlistCampaignId.trim() || importing}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {importing ? (
                  <>
                    <Loader className="animate-spin mr-2" size={18} />
                    Importing...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2" size={18} />
                    Import from Lemlist
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Import Result */}
        {importResult && (
          <div className={`mt-6 p-4 rounded-lg ${
            importResult.success
              ? 'bg-green-900/30 border border-green-700'
              : 'bg-red-900/30 border border-red-700'
          }`}>
            <div className="flex items-start">
              {importResult.success ? (
                <CheckCircle className="text-green-400 mr-3 flex-shrink-0" size={24} />
              ) : (
                <AlertTriangle className="text-red-400 mr-3 flex-shrink-0" size={24} />
              )}
              <div className="flex-1">
                <p className={`font-medium ${
                  importResult.success ? 'text-green-400' : 'text-red-400'
                }`}>
                  {importResult.message}
                </p>
                {importResult.success && (
                  <div className="mt-2 text-sm text-slate-300">
                    <p>Imported: {importResult.imported} contacts</p>
                    {importResult.failed > 0 && (
                      <p className="text-amber-400">Failed: {importResult.failed} contacts</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Import Tips */}
        <div className="mt-8 bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4">Import Tips</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li className="flex items-start">
              <CheckCircle size={16} className="text-green-400 mr-2 mt-0.5 flex-shrink-0" />
              <span><strong>CSV Format:</strong> Ensure your CSV has headers: email, firstName, lastName, company</span>
            </li>
            <li className="flex items-start">
              <CheckCircle size={16} className="text-green-400 mr-2 mt-0.5 flex-shrink-0" />
              <span><strong>Deduplication:</strong> Contacts are automatically deduplicated by email address</span>
            </li>
            <li className="flex items-start">
              <CheckCircle size={16} className="text-green-400 mr-2 mt-0.5 flex-shrink-0" />
              <span><strong>HubSpot Lists:</strong> You can find list IDs in HubSpot under Contacts → Lists</span>
            </li>
            <li className="flex items-start">
              <CheckCircle size={16} className="text-green-400 mr-2 mt-0.5 flex-shrink-0" />
              <span><strong>Lemlist Campaigns:</strong> Campaign IDs can be found in the Lemlist dashboard URL</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default ImportPage;
