/**
 * CRM Sync Worker - Sales Automation
 *
 * Handles synchronization of enriched contacts and companies to HubSpot CRM.
 * Manages deduplication, company association, property mapping, and activity logging.
 *
 * Key Features:
 * - Automatic deduplication (email-based for contacts, domain-based for companies)
 * - Company-contact association
 * - Custom property mapping (ICP scores, enrichment data, pain points)
 * - Activity timeline logging
 * - Batch operations with error handling
 */

export class CRMSyncWorker {
  constructor(hubspotClient, database) {
    this.hubspot = hubspotClient;
    this.database = database;

    // Sync statistics
    this.stats = {
      contactsCreated: 0,
      contactsUpdated: 0,
      companiesCreated: 0,
      companiesUpdated: 0,
      associationsCreated: 0,
      errors: 0,
    };
  }

  // ==========================================================================
  // CONTACT SYNC
  // ==========================================================================

  /**
   * Sync enriched contact to HubSpot
   * @param {Object} enrichedContact - Enriched contact data from enrichment worker
   * @param {Object} options - Sync options
   * @returns {Promise<Object>} Sync result with HubSpot contact ID
   */
  async syncContact(enrichedContact, options = {}) {
    const {
      deduplicate = true,
      createIfNew = true,
      updateIfExists = true,
      associateCompany = true,
      logActivity = true,
    } = options;

    const { email, firstName, lastName, company, intelligence, dataQuality } =
      enrichedContact;

    try {
      console.log(`[CRM Sync] Processing contact: ${email}`);

      // Step 1: Check for existing contact (deduplication)
      let existingContact = null;
      if (deduplicate) {
        const searchResult = await this.hubspot.findContactByEmail(email);
        if (searchResult.success && searchResult.found) {
          existingContact = searchResult.contact;
        } else if (!searchResult.success) {
          console.warn(`[CRM Sync] Failed to search for contact ${email}: ${searchResult.error}`);
          // Continue as if new, or throw? Better to throw to avoid duplicates if API is down
          throw new Error(`Failed to search for contact: ${searchResult.error}`);
        }
      }

      // Step 2: Prepare HubSpot properties
      const properties = this._mapContactProperties(enrichedContact);

      let contactId;
      if (existingContact) {
        // Contact exists
        if (updateIfExists) {
          console.log(
            `[CRM Sync] Updating existing contact: ${existingContact.id}`
          );
          const updateResult = await this.hubspot.updateContact(existingContact.id, properties);
          if (!updateResult.success) {
            throw new Error(`Failed to update contact: ${updateResult.error}`);
          }
          contactId = existingContact.id;
          this.stats.contactsUpdated++;
        } else {
          console.log(`[CRM Sync] Skipping existing contact: ${email}`);
          contactId = existingContact.id;
        }
      } else {
        // New contact
        if (createIfNew) {
          console.log(`[CRM Sync] Creating new contact: ${email}`);
          const createResult = await this.hubspot.createContact(properties);
          if (!createResult.success) {
            throw new Error(`Failed to create contact: ${createResult.error}`);
          }
          contactId = createResult.contactId;
          this.stats.contactsCreated++;
        } else {
          console.log(`[CRM Sync] Skipping new contact (createIfNew=false)`);
          return {
            success: false,
            reason: 'Contact does not exist and createIfNew=false',
          };
        }
      }

      // Step 3: Sync company and associate
      let companyId = null;
      if (associateCompany && company) {
        companyId = await this.syncCompany(company, {
          deduplicate: true,
          createIfNew: true,
        });

        if (companyId) {
          const assocResult = await this.hubspot.associateContactToCompany(contactId, companyId);
          if (assocResult.success) {
            this.stats.associationsCreated++;
            console.log(
              `[CRM Sync] Associated contact ${contactId} with company ${companyId}`
            );
          } else {
            console.warn(`[CRM Sync] Failed to associate contact ${contactId} with company ${companyId}: ${assocResult.error}`);
          }
        }
      }

      // Step 4: Log enrichment activity
      if (logActivity) {
        await this._logEnrichmentActivity(contactId, enrichedContact);
      }

      // Step 5: Store sync record in database
      await this._recordSync('contact', email, contactId, {
        dataQuality,
        enrichedAt: enrichedContact.enrichedAt,
      });

      return {
        success: true,
        contactId,
        companyId,
        action: existingContact ? 'updated' : 'created',
      };
    } catch (error) {
      console.error(`[CRM Sync] Failed to sync contact ${email}:`, error.message);
      this.stats.errors++;
      return {
        success: false,
        error: error.message,
        contact: { email, firstName, lastName },
      };
    }
  }

  /**
   * Batch sync multiple contacts to HubSpot
   * @param {Array} enrichedContacts - Array of enriched contacts
   * @param {Object} options - Sync options
   * @returns {Promise<Object>} Batch sync results
   */
  async batchSyncContacts(enrichedContacts, options = {}) {
    const { batchSize = 100, continueOnError = true } = options;

    console.log(
      `[CRM Sync] Starting batch sync of ${enrichedContacts.length} contacts`
    );

    const results = {
      total: enrichedContacts.length,
      created: [],
      updated: [],
      failed: [],
    };

    // Process in batches
    for (let i = 0; i < enrichedContacts.length; i += batchSize) {
      const batch = enrichedContacts.slice(i, i + batchSize);
      console.log(
        `[CRM Sync] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(enrichedContacts.length / batchSize)}`
      );

      // Process each contact in batch
      for (const contact of batch) {
        const result = await this.syncContact(contact, options);

        if (result.success) {
          if (result.action === 'created') {
            results.created.push({
              email: contact.email,
              contactId: result.contactId,
            });
          } else {
            results.updated.push({
              email: contact.email,
              contactId: result.contactId,
            });
          }
        } else {
          results.failed.push(result);
          if (!continueOnError) break;
        }

        // Small delay to respect rate limits
        await this._sleep(50);
      }

      // Longer delay between batches
      if (i + batchSize < enrichedContacts.length) {
        await this._sleep(1000);
      }
    }

    console.log(
      `[CRM Sync] Batch sync complete: ${results.created.length} created, ${results.updated.length} updated, ${results.failed.length} failed`
    );

    return results;
  }

  // ==========================================================================
  // COMPANY SYNC
  // ==========================================================================

  /**
   * Sync company to HubSpot
   * @param {Object} companyData - Company data from enrichment
   * @param {Object} options - Sync options
   * @returns {Promise<string>} HubSpot company ID
   */
  async syncCompany(companyData, options = {}) {
    const { deduplicate = true, createIfNew = true, updateIfExists = true } =
      options;

    const { domain, name } = companyData;

    try {
      console.log(`[CRM Sync] Processing company: ${domain || name}`);

      // Step 1: Check for existing company
      let existingCompany = null;
      if (deduplicate && domain) {
        const searchResult = await this.hubspot.findCompanyByDomain(domain);
        if (searchResult.success && searchResult.found) {
          existingCompany = searchResult.company;
        } else if (!searchResult.success) {
          console.warn(`[CRM Sync] Failed to search for company ${domain}: ${searchResult.error}`);
          // Throw to avoid duplicates
          throw new Error(`Failed to search for company: ${searchResult.error}`);
        }
      }

      // Step 2: Prepare properties
      const properties = this._mapCompanyProperties(companyData);

      let companyId;
      if (existingCompany) {
        if (updateIfExists) {
          console.log(
            `[CRM Sync] Updating existing company: ${existingCompany.id}`
          );
          const updateResult = await this.hubspot.updateCompany(existingCompany.id, properties);
          if (!updateResult.success) {
            throw new Error(`Failed to update company: ${updateResult.error}`);
          }
          companyId = existingCompany.id;
          this.stats.companiesUpdated++;
        } else {
          companyId = existingCompany.id;
        }
      } else {
        if (createIfNew) {
          console.log(`[CRM Sync] Creating new company: ${domain || name}`);
          const createResult = await this.hubspot.createCompany(properties);
          if (!createResult.success) {
            throw new Error(`Failed to create company: ${createResult.error}`);
          }
          companyId = createResult.companyId;
          this.stats.companiesCreated++;
        } else {
          return null;
        }
      }

      // Step 3: Store sync record
      await this._recordSync('company', domain || name, companyId, {
        enrichedAt: companyData.enrichedAt,
      });

      return companyId;
    } catch (error) {
      console.error(
        `[CRM Sync] Failed to sync company ${domain || name}:`,
        error.message
      );
      this.stats.errors++;
      return null;
    }
  }

  // ==========================================================================
  // PROPERTY MAPPING
  // ==========================================================================

  /**
   * Map enriched contact data to HubSpot properties
   * @private
   */
  _mapContactProperties(enrichedContact) {
    const {
      email,
      firstName,
      lastName,
      title,
      phoneNumber,
      linkedinUrl,
      location,
      seniority,
      department,
      company,
      intelligence,
      dataQuality,
      enrichedAt,
    } = enrichedContact;

    const properties = {
      email,
      firstname: firstName,
      lastname: lastName,
    };

    // Standard properties
    if (title) properties.jobtitle = title;
    if (phoneNumber) properties.phone = phoneNumber;
    if (linkedinUrl) properties.linkedin_url = linkedinUrl;
    if (location) properties.city = location;
    if (seniority) properties.seniority = seniority;
    if (department) properties.department = department;

    // Company info (if not associating as separate company)
    if (company && company.name) {
      properties.company = company.name;
      if (company.domain) properties.domain = company.domain;
    }

    // Custom properties for sales intelligence
    if (intelligence) {
      // Pain points
      if (intelligence.painHypotheses && intelligence.painHypotheses.length > 0) {
        properties.pain_points = intelligence.painHypotheses
          .map((p) => p.pain)
          .join('; ');
        properties.pain_confidence = Math.max(
          ...intelligence.painHypotheses.map((p) => p.confidence)
        );
      }

      // Personalization hooks
      if (
        intelligence.personalizationHooks &&
        intelligence.personalizationHooks.length > 0
      ) {
        properties.personalization_hooks = intelligence.personalizationHooks
          .map((h) => h.hook)
          .join('; ');
      }

      // Why now trigger
      if (intelligence.whyNow) {
        properties.why_now_trigger = intelligence.whyNow.trigger;
        properties.why_now_urgency = intelligence.whyNow.urgency;
      }
    }

    // Enrichment metadata
    properties.data_quality_score = dataQuality;
    properties.last_enriched = enrichedAt;
    properties.enrichment_source = 'explorium';

    return properties;
  }

  /**
   * Map company data to HubSpot properties
   * @private
   */
  _mapCompanyProperties(companyData) {
    const {
      name,
      domain,
      industry,
      employees,
      revenue,
      headquarters,
      foundedYear,
      technologies,
      fundingStage,
      fundingAmount,
      signals,
    } = companyData;

    const properties = {
      name,
    };

    // Standard properties
    if (domain) properties.domain = domain;
    if (industry) properties.industry = industry;
    if (employees) properties.numberofemployees = employees;
    if (revenue) properties.annualrevenue = revenue;
    if (headquarters) properties.city = headquarters;
    if (foundedYear) properties.founded_year = foundedYear;

    // Custom properties
    if (technologies && technologies.length > 0) {
      properties.technologies = technologies.join('; ');
    }

    if (fundingStage) {
      properties.funding_stage = fundingStage;
    }

    if (fundingAmount) {
      properties.total_funding = fundingAmount;
    }

    if (signals && signals.length > 0) {
      properties.growth_signals = signals.join('; ');
    }

    return properties;
  }

  // ==========================================================================
  // ACTIVITY LOGGING
  // ==========================================================================

  /**
   * Log enrichment activity to HubSpot timeline
   * @private
   */
  async _logEnrichmentActivity(contactId, enrichedContact) {
    try {
      const { intelligence, dataQuality, enrichedAt } = enrichedContact;

      let noteBody = `Contact enriched via Explorium on ${new Date(enrichedAt).toLocaleDateString()}\n\n`;
      noteBody += `**Data Quality:** ${(dataQuality * 100).toFixed(0)}%\n\n`;

      if (intelligence && intelligence.painHypotheses.length > 0) {
        noteBody += `**Identified Pain Points:**\n`;
        intelligence.painHypotheses.forEach((pain) => {
          noteBody += `- ${pain.pain} (confidence: ${(pain.confidence * 100).toFixed(0)}%)\n`;
        });
        noteBody += `\n`;
      }

      if (intelligence && intelligence.personalizationHooks.length > 0) {
        noteBody += `**Personalization Hooks:**\n`;
        intelligence.personalizationHooks.forEach((hook) => {
          noteBody += `- ${hook.hook}\n`;
        });
        noteBody += `\n`;
      }

      if (intelligence && intelligence.whyNow) {
        noteBody += `**Why Now:** ${intelligence.whyNow.trigger} (urgency: ${intelligence.whyNow.urgency})\n`;
      }

      await this.hubspot.createNote({
        body: noteBody,
        associatedObjectType: 'contact',
        associatedObjectId: contactId,
      });

      console.log(`[CRM Sync] Logged enrichment activity for contact ${contactId}`);
    } catch (error) {
      console.error(
        `[CRM Sync] Failed to log activity for contact ${contactId}:`,
        error.message
      );
    }
  }

  // ==========================================================================
  // SYNC RECORDS
  // ==========================================================================

  /**
   * Record sync in database for tracking
   * @private
   */
  async _recordSync(type, identifier, hubspotId, metadata) {
    try {
      const stmt = this.database.prepare(`
        INSERT OR REPLACE INTO crm_sync_log (type, identifier, hubspot_id, metadata, synced_at)
        VALUES (?, ?, ?, ?, datetime('now'))
      `);

      stmt.run(type, identifier, hubspotId, JSON.stringify(metadata));
    } catch (error) {
      console.error('[CRM Sync] Failed to record sync:', error.message);
    }
  }

  /**
   * Check if contact/company was recently synced
   */
  async wasRecentlySynced(type, identifier, withinHours = 24) {
    try {
      const stmt = this.database.prepare(`
        SELECT synced_at
        FROM crm_sync_log
        WHERE type = ? AND identifier = ?
        ORDER BY synced_at DESC
        LIMIT 1
      `);

      const row = stmt.get(type, identifier);
      if (!row) return false;

      const syncedAt = new Date(row.synced_at).getTime();
      const age = Date.now() - syncedAt;
      const maxAge = withinHours * 60 * 60 * 1000;

      return age < maxAge;
    } catch (error) {
      console.error('[CRM Sync] Failed to check sync status:', error.message);
      return false;
    }
  }

  // ==========================================================================
  // BULK OPERATIONS
  // ==========================================================================

  /**
   * Upsert contacts in bulk (HubSpot batch API)
   * @param {Array} contacts - Array of enriched contacts
   * @returns {Promise<Object>} Batch upsert result
   */
  async bulkUpsertContacts(contacts) {
    console.log(`[CRM Sync] Bulk upserting ${contacts.length} contacts`);

    try {
      // Map to HubSpot format
      const hubspotContacts = contacts.map((contact) => ({
        properties: this._mapContactProperties(contact),
      }));

      // Use HubSpot batch API
      const result = await this.hubspot.batchUpsertContacts(hubspotContacts);

      console.log(
        `[CRM Sync] Bulk upsert complete: ${result.results?.length || 0} contacts processed`
      );

      return result;
    } catch (error) {
      console.error('[CRM Sync] Bulk upsert failed:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ==========================================================================
  // UTILITIES
  // ==========================================================================

  async _sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get sync statistics
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
      contactsCreated: 0,
      contactsUpdated: 0,
      companiesCreated: 0,
      companiesUpdated: 0,
      associationsCreated: 0,
      errors: 0,
    };
  }

  /**
   * Get recent sync history
   */
  async getRecentSyncs(limit = 100) {
    try {
      const stmt = this.database.prepare(`
        SELECT *
        FROM crm_sync_log
        ORDER BY synced_at DESC
        LIMIT ?
      `);

      return stmt.all(limit);
    } catch (error) {
      console.error('[CRM Sync] Failed to get sync history:', error.message);
      return [];
    }
  }
}

export default CRMSyncWorker;
