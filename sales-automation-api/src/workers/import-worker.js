/**
 * Import Worker - Sales Automation
 *
 * Handles importing contacts from multiple sources:
 * - CSV files
 * - Lemlist campaigns
 * - HubSpot CRM
 * - Manual lists
 *
 * Features:
 * - Automatic field mapping
 * - Deduplication
 * - Validation
 * - Batch processing
 */

import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { EventEmitter } from 'events';
import { safeJsonParse } from '../utils/prototype-protection.js';
// ARCH-004 FIX: Import structured logger
import { createLogger } from '../utils/logger.js';

const logger = createLogger('ImportWorker');

export class ImportWorker extends EventEmitter {
  constructor(clients, database) {
    super();

    this.hubspot = clients.hubspot;
    this.lemlist = clients.lemlist;
    this.explorium = clients.explorium;
    this.database = database;

    // Import statistics
    this.stats = {
      imported: 0,
      skipped: 0,
      errors: 0,
    };
  }

  // ==========================================================================
  // CSV IMPORT
  // ==========================================================================

  /**
   * Import contacts from CSV file
   * @param {Object} params - Import parameters
   * @returns {Promise<Object>} Import results
   */
  async importFromCSV(params) {
    const { filePath, fieldMapping = null, skipHeader = true, deduplicate = true } = params;

    try {
      logger.info(`[Import] Reading CSV file: ${filePath}`);

      // Read CSV file
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const records = parse(fileContent, {
        columns: skipHeader,
        skip_empty_lines: true,
        trim: true,
      });

      logger.info(`[Import] Found ${records.length} records in CSV`);

      // Apply field mapping if provided
      const mappedContacts = fieldMapping
        ? this._applyFieldMapping(records, fieldMapping)
        : this._autoMapFields(records);

      // Validate contacts
      const validContacts = this._validateContacts(mappedContacts);

      logger.info(`[Import] ${validContacts.length} valid contacts after validation`);

      // Deduplicate if enabled
      let finalContacts = validContacts;
      if (deduplicate) {
        finalContacts = await this._deduplicateContacts(validContacts);
        logger.info(`[Import] ${finalContacts.length} unique contacts after deduplication`);
      }

      // Store imported contacts
      await this._storeImportedContacts(finalContacts, 'csv');

      this.stats.imported += finalContacts.length;
      this.stats.skipped += validContacts.length - finalContacts.length;

      const result = {
        success: true,
        imported: finalContacts.length,
        skipped: validContacts.length - finalContacts.length,
        contacts: finalContacts,
      };

      // Emit event for automatic enrichment
      if (finalContacts.length > 0) {
        logger.info(`[Import] Emitting contacts-imported event for ${finalContacts.length} contacts`);
        this.emit('contacts-imported', {
          source: 'csv',
          contacts: finalContacts,
          count: finalContacts.length,
        });
      }

      return result;
    } catch (error) {
      logger.error('[Import] CSV import failed:', error.message);
      this.stats.errors++;
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Apply custom field mapping to CSV records
   * @private
   */
  _applyFieldMapping(records, mapping) {
    return records.map((record) => {
      const contact = {};

      for (const [targetField, sourceField] of Object.entries(mapping)) {
        contact[targetField] = record[sourceField] || null;
      }

      return contact;
    });
  }

  /**
   * Auto-detect field mapping from CSV headers
   * @private
   */
  _autoMapFields(records) {
    if (records.length === 0) return [];

    const contacts = [];
    const sampleRecord = records[0];
    const headers = Object.keys(sampleRecord);

    // Common field variations
    const fieldVariations = {
      email: ['email', 'e-mail', 'email address', 'work email', 'contact email'],
      firstName: ['first name', 'firstname', 'fname', 'given name', 'first'],
      lastName: ['last name', 'lastname', 'lname', 'surname', 'family name', 'last'],
      title: ['title', 'job title', 'position', 'role', 'job role'],
      company: ['company', 'company name', 'organization', 'employer'],
      companyDomain: ['domain', 'company domain', 'website', 'company website'],
      phone: ['phone', 'phone number', 'telephone', 'mobile', 'contact number'],
      linkedinUrl: ['linkedin', 'linkedin url', 'linkedin profile', 'li url'],
      location: ['location', 'city', 'country', 'region', 'address'],
    };

    // Build mapping
    const mapping = {};
    for (const [targetField, variations] of Object.entries(fieldVariations)) {
      const matchedHeader = headers.find((header) =>
        variations.some((variation) => header.toLowerCase().includes(variation))
      );
      if (matchedHeader) {
        mapping[targetField] = matchedHeader;
      }
    }

    logger.info('[Import] Auto-detected field mapping:', mapping);

    // Apply mapping
    for (const record of records) {
      const contact = {};
      for (const [targetField, sourceField] of Object.entries(mapping)) {
        contact[targetField] = record[sourceField] || null;
      }
      contacts.push(contact);
    }

    return contacts;
  }

  // ==========================================================================
  // LEMLIST IMPORT
  // ==========================================================================

  /**
   * Import leads from Lemlist campaign
   * @param {Object} params - Import parameters
   * @returns {Promise<Object>} Import results
   */
  async importFromLemlist(params) {
    const { campaignId = null, status = null, limit = 1000, deduplicate = true } = params;

    try {
      logger.info('[Import] Fetching leads from Lemlist...');

      // Get leads from Lemlist
      const lemlistLeads = await this.lemlist.getLeads({
        campaignId,
        status, // replied, contacted, not_contacted
        limit,
      });

      logger.info(`[Import] Found ${lemlistLeads.length} leads in Lemlist`);

      // Map Lemlist format to our contact format
      const contacts = lemlistLeads.map((lead) => ({
        email: lead.email,
        firstName: lead.firstName,
        lastName: lead.lastName,
        title: lead.customFields?.title || null,
        company: lead.companyName,
        companyDomain: lead.customFields?.companyDomain || null,
        phone: lead.phone || null,
        linkedinUrl: lead.linkedinUrl || null,
        source: 'lemlist',
        lemlistId: lead.id,
        lemlistCampaignId: lead.campaignId,
        lemlistStatus: lead.status,
      }));

      // Validate
      const validContacts = this._validateContacts(contacts);

      // Deduplicate
      let finalContacts = validContacts;
      if (deduplicate) {
        finalContacts = await this._deduplicateContacts(validContacts);
      }

      // Store
      await this._storeImportedContacts(finalContacts, 'lemlist');

      this.stats.imported += finalContacts.length;
      this.stats.skipped += validContacts.length - finalContacts.length;

      const result = {
        success: true,
        imported: finalContacts.length,
        skipped: validContacts.length - finalContacts.length,
        contacts: finalContacts,
      };

      // Emit event for automatic enrichment
      if (finalContacts.length > 0) {
        logger.info(`[Import] Emitting contacts-imported event for ${finalContacts.length} contacts`);
        this.emit('contacts-imported', {
          source: 'lemlist',
          contacts: finalContacts,
          count: finalContacts.length,
          campaignId,
        });
      }

      return result;
    } catch (error) {
      logger.error('[Import] Lemlist import failed:', error.message);
      this.stats.errors++;
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Import all contacts from all Lemlist campaigns
   * @param {Object} params - Import parameters
   * @returns {Promise<Object>} Import results
   */
  async importAllLemlistCampaigns(params = {}) {
    const { deduplicate = true } = params;

    try {
      logger.info('[Import] Fetching all Lemlist campaigns...');

      // Get all campaigns
      const campaigns = await this.lemlist.getCampaigns();

      logger.info(`[Import] Found ${campaigns.length} Lemlist campaigns`);

      const allContacts = [];

      // Import from each campaign
      for (const campaign of campaigns) {
        logger.info(`[Import] Processing campaign: ${campaign.name}`);

        const result = await this.importFromLemlist({
          campaignId: campaign.id,
          deduplicate: false, // We'll deduplicate at the end
        });

        if (result.success) {
          allContacts.push(...result.contacts);
        }
      }

      logger.info(`[Import] Total leads from all campaigns: ${allContacts.length}`);

      // Deduplicate across all campaigns
      let finalContacts = allContacts;
      if (deduplicate) {
        finalContacts = await this._deduplicateContacts(allContacts);
        logger.info(`[Import] ${finalContacts.length} unique contacts after deduplication`);
      }

      return {
        success: true,
        campaignsProcessed: campaigns.length,
        totalLeads: allContacts.length,
        uniqueContacts: finalContacts.length,
        contacts: finalContacts,
      };
    } catch (error) {
      logger.error('[Import] Lemlist batch import failed:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ==========================================================================
  // HUBSPOT IMPORT
  // ==========================================================================

  /**
   * Import contacts from HubSpot CRM
   * @param {Object} params - Import parameters
   * @returns {Promise<Object>} Import results
   */
  async importFromHubSpot(params) {
    const {
      filters = [],
      properties = ['email', 'firstname', 'lastname', 'jobtitle', 'company', 'phone', 'linkedin_url'],
      limit = 1000,
      deduplicate = true,
    } = params;

    try {
      logger.info('[Import] Fetching contacts from HubSpot...');

      // Build search params
      const searchParams = {
        filterGroups: filters,
        properties,
        limit,
      };

      // Get contacts from HubSpot
      const hubspotContacts = await this.hubspot.searchContacts(searchParams);

      logger.info(`[Import] Found ${hubspotContacts.length} contacts in HubSpot`);

      // Map HubSpot format to our contact format
      const contacts = hubspotContacts.map((contact) => ({
        email: contact.properties.email,
        firstName: contact.properties.firstname,
        lastName: contact.properties.lastname,
        title: contact.properties.jobtitle,
        company: contact.properties.company,
        companyDomain: contact.properties.domain || null,
        phone: contact.properties.phone,
        linkedinUrl: contact.properties.linkedin_url,
        source: 'hubspot',
        hubspotId: contact.id,
        hubspotProperties: contact.properties,
      }));

      // Validate
      const validContacts = this._validateContacts(contacts);

      // Deduplicate
      let finalContacts = validContacts;
      if (deduplicate) {
        finalContacts = await this._deduplicateContacts(validContacts);
      }

      // Store
      await this._storeImportedContacts(finalContacts, 'hubspot');

      this.stats.imported += finalContacts.length;
      this.stats.skipped += validContacts.length - finalContacts.length;

      const result = {
        success: true,
        imported: finalContacts.length,
        skipped: validContacts.length - finalContacts.length,
        contacts: finalContacts,
      };

      // Emit event for automatic enrichment
      if (finalContacts.length > 0) {
        logger.info(`[Import] Emitting contacts-imported event for ${finalContacts.length} contacts`);
        this.emit('contacts-imported', {
          source: 'hubspot',
          contacts: finalContacts,
          count: finalContacts.length,
        });
      }

      return result;
    } catch (error) {
      logger.error('[Import] HubSpot import failed:', error.message);
      this.stats.errors++;
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Import contacts from HubSpot list
   * @param {Object} params - Import parameters
   * @returns {Promise<Object>} Import results
   */
  async importFromHubSpotList(params) {
    const { listId, deduplicate = true } = params;

    try {
      logger.info(`[Import] Fetching contacts from HubSpot list: ${listId}`);

      // Get list members
      const listMembers = await this.hubspot.getListMembers(listId);

      logger.info(`[Import] Found ${listMembers.length} contacts in list`);

      // Fetch full contact details
      const contactIds = listMembers.map((member) => member.id);
      const hubspotContacts = await this.hubspot.batchGetContacts(contactIds);

      // Map to our format
      const contacts = hubspotContacts.map((contact) => ({
        email: contact.properties.email,
        firstName: contact.properties.firstname,
        lastName: contact.properties.lastname,
        title: contact.properties.jobtitle,
        company: contact.properties.company,
        companyDomain: contact.properties.domain,
        phone: contact.properties.phone,
        linkedinUrl: contact.properties.linkedin_url,
        source: 'hubspot_list',
        hubspotId: contact.id,
        hubspotListId: listId,
      }));

      // Validate
      const validContacts = this._validateContacts(contacts);

      // Deduplicate
      let finalContacts = validContacts;
      if (deduplicate) {
        finalContacts = await this._deduplicateContacts(validContacts);
      }

      // Store
      await this._storeImportedContacts(finalContacts, 'hubspot_list');

      this.stats.imported += finalContacts.length;

      return {
        success: true,
        imported: finalContacts.length,
        contacts: finalContacts,
      };
    } catch (error) {
      logger.error('[Import] HubSpot list import failed:', error.message);
      this.stats.errors++;
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ==========================================================================
  // VALIDATION & DEDUPLICATION
  // ==========================================================================

  /**
   * Validate contacts
   * @private
   */
  _validateContacts(contacts) {
    const valid = [];

    for (const contact of contacts) {
      // Email is required
      if (!contact.email) {
        console.warn('[Import] Skipping contact without email');
        this.stats.skipped++;
        continue;
      }

      // Basic email format validation
      if (!this._isValidEmail(contact.email)) {
        console.warn(`[Import] Skipping invalid email: ${contact.email}`);
        this.stats.skipped++;
        continue;
      }

      // At least first name or last name required
      if (!contact.firstName && !contact.lastName) {
        console.warn(`[Import] Skipping contact with no name: ${contact.email}`);
        this.stats.skipped++;
        continue;
      }

      valid.push(contact);
    }

    return valid;
  }

  /**
   * Basic email validation
   * @private
   */
  _isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Deduplicate contacts by email
   * @private
   * 
   * PHASE 3 FIX (P3.2): Race condition protection
   * - In-memory deduplication within batch (seen Set)
   * - Database check for existing contacts
   * - Final protection: INSERT OR REPLACE + PRIMARY KEY on email
   * 
   * Note: There is still a theoretical TOCTOU race between the database check
   * and the INSERT, but this is mitigated by:
   * 1. Single-threaded Node.js event loop (no parallel execution within one process)
   * 2. INSERT OR REPLACE atomic operation (database-level protection)
   * 3. email PRIMARY KEY constraint (prevents duplicates at schema level)
   */
  async _deduplicateContacts(contacts) {
    const seen = new Set();
    const unique = [];

    for (const contact of contacts) {
      const email = contact.email.toLowerCase();

      // Step 1: Check if we've already seen this email in this batch
      if (seen.has(email)) {
        logger.info(`[Import] Skipping duplicate email in batch: ${email}`);
        continue;
      }

      // Step 2: Check if already in database
      // Note: This is a performance optimization to avoid unnecessary processing.
      // The INSERT OR REPLACE in _storeImportedContacts() provides the final atomic protection.
      const existing = await this._checkExistingContact(email);
      if (existing) {
        logger.info(`[Import] Skipping existing contact in database: ${email}`);
        continue;
      }

      seen.add(email);
      unique.push(contact);
    }

    return unique;
  }

  /**
   * Check if contact already exists in database
   * @private
   */
  async _checkExistingContact(email) {
    try {
      const stmt = this.database.db.prepare(
        'SELECT 1 FROM imported_contacts WHERE email = ? LIMIT 1'
      );
      return stmt.get(email.toLowerCase()) !== undefined;
    } catch (error) {
      logger.error('[Import] Error checking existing contact:', error.message);
      this.stats.errors = (this.stats.errors || 0) + 1;
      // SEC-004 FIX: Re-throw - returning false could cause duplicate imports
      throw new Error(`Failed to check existing contact ${email}: ${error.message}`);
    }
  }

  // ==========================================================================
  // DATABASE OPERATIONS
  // ==========================================================================

  /**
   * Store imported contacts in database
   * @private
   */
  async _storeImportedContacts(contacts, source) {
    // PHASE 3 FIX (P3.1): Wrap batch operation in transaction for data integrity
    const transaction = this.database.db.transaction((contactsToStore) => {
      const stmt = this.database.db.prepare(`
        INSERT OR REPLACE INTO imported_contacts
        (email, first_name, last_name, title, company, company_domain, phone, linkedin_url, source, data, imported_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `);

      for (const contact of contactsToStore) {
        stmt.run(
          contact.email.toLowerCase(),
          contact.firstName,
          contact.lastName,
          contact.title,
          contact.company,
          contact.companyDomain,
          contact.phone,
          contact.linkedinUrl,
          source,
          JSON.stringify(contact)
        );
      }

      return contactsToStore.length;
    });

    try {
      const storedCount = transaction(contacts);
      logger.info(`[Import] Stored ${storedCount} contacts in database`);
    } catch (error) {
      logger.error('[Import] Failed to store contacts:', error.message);
      // PHASE 3 FIX (P3.1): Transaction automatically rolled back on error
      throw error;
    }
  }

  /**
   * Get all imported contacts
   */
  async getAllImportedContacts(params = {}) {
    const { source = null, limit = 1000, offset = 0 } = params;

    try {
      let query = 'SELECT * FROM imported_contacts';
      const queryParams = [];

      if (source) {
        query += ' WHERE source = ?';
        queryParams.push(source);
      }

      query += ' ORDER BY imported_at DESC LIMIT ? OFFSET ?';
      queryParams.push(limit, offset);

      const stmt = this.database.db.prepare(query);
      const rows = stmt.all(...queryParams);

      // PERF-004 FIX: Use safeJsonParse to prevent prototype pollution
      return rows.map((row) => ({
        ...safeJsonParse(row.data),
        importedAt: row.imported_at,
      }));
    } catch (error) {
      logger.error('[Import] Failed to get imported contacts:', error.message);
      this.stats.errors = (this.stats.errors || 0) + 1;
      // SEC-004 FIX: Re-throw - returning [] hides database errors from callers
      throw new Error(`Failed to get imported contacts: ${error.message}`);
    }
  }

  // ==========================================================================
  // UTILITIES
  // ==========================================================================

  /**
   * Get import statistics
   */
  getStats() {
    return {
      ...this.stats,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      imported: 0,
      skipped: 0,
      errors: 0,
    };
  }

  /**
   * Get import summary
   */
  async getImportSummary() {
    try {
      const summary = this.database
        .prepare(
          `
        SELECT
          source,
          COUNT(*) as count,
          MIN(imported_at) as first_import,
          MAX(imported_at) as last_import
        FROM imported_contacts
        GROUP BY source
      `
        )
        .all();

      return summary;
    } catch (error) {
      logger.error('[Import] Failed to get summary:', error.message);
      return [];
    }
  }
}

export default ImportWorker;
