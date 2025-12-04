import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import api from '../services/api';

function ContactsPage() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSource, setFilterSource] = useState('all');
  const [selectedContacts, setSelectedContacts] = useState(new Set());
  const [enriching, setEnriching] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [totalContacts, setTotalContacts] = useState(0);

  useEffect(() => {
    loadContacts();
  }, [page, filterSource]);

  const loadContacts = async () => {
    setLoading(true);
    try {
      const params = {
        offset: (page - 1) * pageSize,
        limit: pageSize
      };

      if (filterSource !== 'all') {
        params.source = filterSource;
      }

      const result = await api.getContacts(params);

      if (result && result.contacts) {
        setContacts(result.contacts);
        setTotalContacts(result.total || result.contacts.length);
      } else {
        setContacts([]);
        setTotalContacts(0);
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to load contacts:', error);
      }
      toast.error('Failed to load contacts');
      setContacts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedContacts.size === contacts.length) {
      setSelectedContacts(new Set());
    } else {
      setSelectedContacts(new Set(contacts.map(c => c.email)));
    }
  };

  const handleSelectContact = (email) => {
    const newSelection = new Set(selectedContacts);
    if (newSelection.has(email)) {
      newSelection.delete(email);
    } else {
      newSelection.add(email);
    }
    setSelectedContacts(newSelection);
  };

  const handleEnrichSelected = async () => {
    if (selectedContacts.size === 0) {
      toast.error('Please select contacts to enrich');
      return;
    }

    setEnriching(true);
    try {
      // PERF-002 FIX: Use Set.has() directly for O(1) lookup instead of Array.includes() O(n)
      const contactsToEnrich = contacts.filter(c => selectedContacts.has(c.email));

      toast.loading(`Enriching ${contactsToEnrich.length} contacts...`, { id: 'enrich' });

      const result = await api.enrichContacts(contactsToEnrich);

      if (result && result.success) {
        toast.success(`Enriched ${result.enriched || contactsToEnrich.length} contacts`, { id: 'enrich' });
        await loadContacts();
      } else {
        toast.error('Enrichment failed', { id: 'enrich' });
      }
    } catch (error) {
      toast.error(`Enrichment error: ${error.message}`, { id: 'enrich' });
    } finally {
      setEnriching(false);
    }
  };

  const handleSyncSelected = async () => {
    if (selectedContacts.size === 0) {
      toast.error('Please select contacts to sync');
      return;
    }

    setSyncing(true);
    try {
      // PERF-002 FIX: Use Set.has() directly for O(1) lookup instead of Array.includes() O(n)
      const contactsToSync = contacts.filter(c => selectedContacts.has(c.email));

      toast.loading(`Syncing ${contactsToSync.length} contacts to HubSpot...`, { id: 'sync' });

      const result = await api.syncContacts(contactsToSync);

      if (result && result.success) {
        toast.success(`Synced ${result.synced || contactsToSync.length} contacts`, { id: 'sync' });
        await loadContacts();
      } else {
        toast.error('Sync failed', { id: 'sync' });
      }
    } catch (error) {
      toast.error(`Sync error: ${error.message}`, { id: 'sync' });
    } finally {
      setSyncing(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedContacts.size === 0) {
      toast.error('Please select contacts to delete');
      return;
    }

    if (!window.confirm(`Delete ${selectedContacts.size} selected contacts?`)) {
      return;
    }

    try {
      const selectedEmails = Array.from(selectedContacts);
      await api.deleteContacts(selectedEmails);
      toast.success(`Deleted ${selectedEmails.length} contacts`);
      setSelectedContacts(new Set());
      await loadContacts();
    } catch (error) {
      toast.error(`Delete failed: ${error.message}`);
    }
  };

  // Filter contacts by search query
  const filteredContacts = contacts.filter(contact => {
    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();
    return (
      contact.email?.toLowerCase().includes(query) ||
      contact.firstName?.toLowerCase().includes(query) ||
      contact.lastName?.toLowerCase().includes(query) ||
      contact.company?.toLowerCase().includes(query) ||
      contact.title?.toLowerCase().includes(query)
    );
  });

  const totalPages = Math.ceil(totalContacts / pageSize);

  return (
    <div data-testid="contacts-page" className="h-full overflow-auto bg-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Contacts</h1>
          <p className="text-slate-400">
            {totalContacts} imported contacts {selectedContacts.size > 0 && `(${selectedContacts.size} selected)`}
          </p>
        </div>

        {/* Toolbar */}
        <div className="bg-slate-800 rounded-lg p-4 mb-6 border border-slate-700">
          <div className="flex items-center justify-between gap-4">
            {/* Search */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  data-testid="contacts-search"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search contacts..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Filter by Source */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-400">Source:</label>
              <select
                data-testid="contacts-filter-source"
                value={filterSource}
                onChange={(e) => setFilterSource(e.target.value)}
                className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Sources</option>
                <option value="csv">CSV</option>
                <option value="hubspot">HubSpot</option>
                <option value="lemlist">Lemlist</option>
                <option value="manual">Manual</option>
              </select>
            </div>

            {/* Bulk Actions */}
            {selectedContacts.size > 0 && (
              <div className="flex items-center gap-2">
                <button
                  data-testid="enrich-contacts-btn"
                  onClick={handleEnrichSelected}
                  disabled={enriching}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {enriching ? 'Enriching...' : 'Enrich'}
                </button>
                <button
                  data-testid="sync-contacts-btn"
                  onClick={handleSyncSelected}
                  disabled={syncing}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {syncing ? 'Syncing...' : 'Sync to HubSpot'}
                </button>
                <button
                  onClick={handleDeleteSelected}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                >
                  Delete
                </button>
              </div>
            )}

            <button
              onClick={loadContacts}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Contacts Table */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-slate-400">Loading contacts...</div>
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="bg-slate-800 rounded-lg p-12 border border-slate-700 text-center">
            <svg className="mx-auto h-12 w-12 text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 data-testid="contacts-empty-message" className="text-lg font-medium text-white mb-2">No contacts found</h3>
            <p className="text-slate-400">
              {searchQuery ? 'Try a different search query' : 'Import contacts from CSV or sync from HubSpot to get started'}
            </p>
          </div>
        ) : (
          <>
            <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
              <table data-testid="contacts-table" className="w-full">
                <thead className="bg-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedContacts.size === contacts.length && contacts.length > 0}
                        onChange={handleSelectAll}
                        className="rounded bg-slate-600 border-slate-500 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Title</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Company</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Source</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Imported</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {filteredContacts.map((contact, index) => (
                    <tr key={contact.email || index} className="hover:bg-slate-700/50">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedContacts.has(contact.email)}
                          onChange={() => handleSelectContact(contact.email)}
                          className="rounded bg-slate-600 border-slate-500 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-white">
                          {contact.firstName} {contact.lastName}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-slate-300">{contact.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-slate-300">{contact.title || '-'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-slate-300">{contact.company || contact.companyDomain || '-'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          contact.source === 'csv' ? 'bg-blue-900/30 text-blue-400' :
                          contact.source === 'hubspot' ? 'bg-orange-900/30 text-orange-400' :
                          contact.source === 'lemlist' ? 'bg-purple-900/30 text-purple-400' :
                          'bg-slate-700 text-slate-400'
                        }`}>
                          {contact.source || 'unknown'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-slate-400">
                          {contact.importedAt ? new Date(contact.importedAt).toLocaleDateString() : '-'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-slate-400">
                  Page {page} of {totalPages}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default ContactsPage;
