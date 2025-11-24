/**
 * Lead Discovery Worker - Sales Automation
 *
 * Handles intelligent lead discovery using ICP profiles, intent signals,
 * and account-based targeting. Manages discovery sources and scoring.
 *
 * Key Features:
 * - ICP-based discovery (match companies to ideal customer profiles)
 * - Intent signal detection (find companies showing buying intent)
 * - Account-based discovery (find contacts at target accounts)
 * - Multi-source aggregation (Explorium, HubSpot, manual lists)
 * - Composite scoring algorithm
 * - Deduplication and validation
 */

import fs from 'fs';
import yaml from 'yaml';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class LeadDiscoveryWorker {
  constructor(clients, database) {
    this.explorium = clients.explorium;
    this.hubspot = clients.hubspot;
    this.database = database;

    // Discovery statistics
    this.stats = {
      companiesDiscovered: 0,
      contactsDiscovered: 0,
      avgIcpScore: 0,
      errors: 0,
    };

    // Load ICP profiles
    this.icpProfiles = this._loadIcpProfiles();
  }

  // ==========================================================================
  // ICP-BASED DISCOVERY
  // ==========================================================================

  /**
   * Discover companies matching an ICP profile
   * @param {Object} params - Discovery parameters
   * @returns {Promise<Object>} Discovered companies with scores
   */
  async discoverByICP(params) {
    const {
      icpProfileName,
      count = 50,
      minScore = 0.75,
      geography = null,
      excludeExisting = true,
    } = params;

    try {
      console.log(`[Discovery] Starting ICP discovery: ${icpProfileName}`);

      // Step 1: Load ICP profile
      const icpProfile = this.icpProfiles[icpProfileName];
      if (!icpProfile) {
        throw new Error(`ICP profile not found: ${icpProfileName}`);
      }

      // Step 2: Build search criteria from ICP
      const searchCriteria = this._buildSearchCriteria(icpProfile, geography);

      // Step 3: Discover companies via Explorium
      const companies = await this.explorium.discoverCompanies(searchCriteria);

      console.log(
        `[Discovery] Found ${companies.length} potential companies`
      );

      // Step 4: Score each company against ICP
      const scoredCompanies = [];
      for (const company of companies) {
        const icpScore = this._calculateIcpScore(company, icpProfile);

        if (icpScore >= minScore) {
          scoredCompanies.push({
            ...company,
            icpScore,
            icpProfile: icpProfileName,
            discoveredAt: new Date().toISOString(),
          });
        }
      }

      // Step 5: Filter out existing companies (if enabled)
      let filteredCompanies = scoredCompanies;
      if (excludeExisting) {
        filteredCompanies = await this._filterExisting(scoredCompanies);
      }

      // Step 6: Sort by ICP score and limit
      const finalCompanies = filteredCompanies
        .sort((a, b) => b.icpScore - a.icpScore)
        .slice(0, count);

      // Step 7: Store discovered companies
      await this._storeDiscoveredCompanies(finalCompanies);

      // Update stats
      this.stats.companiesDiscovered += finalCompanies.length;
      this.stats.avgIcpScore =
        finalCompanies.reduce((sum, c) => sum + c.icpScore, 0) /
        finalCompanies.length;

      console.log(
        `[Discovery] Completed: ${finalCompanies.length} companies (avg score: ${this.stats.avgIcpScore.toFixed(2)})`
      );

      return {
        success: true,
        companies: finalCompanies,
        total: finalCompanies.length,
        avgScore: this.stats.avgIcpScore,
        icpProfile: icpProfileName,
      };
    } catch (error) {
      console.error('[Discovery] ICP discovery failed:', error.message);
      this.stats.errors++;
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Discover contacts at target companies
   * @param {Object} params - Discovery parameters
   * @returns {Promise<Object>} Discovered contacts
   */
  async discoverContactsAtCompanies(params) {
    const { companies, titles = [], departments = [], seniority = [] } = params;

    try {
      console.log(
        `[Discovery] Finding contacts at ${companies.length} companies`
      );

      const allContacts = [];

      for (const company of companies) {
        const contacts = await this.explorium.findContacts({
          companyDomain: company.domain,
          titles,
          departments,
          seniority,
        });

        // Score contacts based on fit
        for (const contact of contacts) {
          const contactScore = this._calculateContactScore(
            contact,
            company,
            titles
          );

          allContacts.push({
            ...contact,
            company,
            contactScore,
            discoveredAt: new Date().toISOString(),
          });
        }
      }

      // Sort by score
      allContacts.sort((a, b) => b.contactScore - a.contactScore);

      // Store discovered contacts
      await this._storeDiscoveredContacts(allContacts);

      this.stats.contactsDiscovered += allContacts.length;

      console.log(`[Discovery] Found ${allContacts.length} contacts`);

      return {
        success: true,
        contacts: allContacts,
        total: allContacts.length,
      };
    } catch (error) {
      console.error('[Discovery] Contact discovery failed:', error.message);
      this.stats.errors++;
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ==========================================================================
  // INTENT SIGNAL DISCOVERY
  // ==========================================================================

  /**
   * Discover companies showing buying intent signals
   * @param {Object} params - Discovery parameters
   * @returns {Promise<Object>} Companies with intent signals
   */
  async discoverByIntent(params) {
    const {
      signals = ['funding', 'expansion', 'hiring'],
      industry = null,
      count = 50,
      minIntentScore = 0.7,
    } = params;

    try {
      console.log(
        `[Discovery] Finding companies with intent signals: ${signals.join(', ')}`
      );

      // Build search criteria focused on signals
      const searchCriteria = {
        signals,
        industry,
        limit: count * 2, // Get more to filter
      };

      const companies = await this.explorium.discoverCompanies(searchCriteria);

      // Score intent strength
      const scoredCompanies = [];
      for (const company of companies) {
        const intentScore = this._calculateIntentScore(company, signals);

        if (intentScore >= minIntentScore) {
          scoredCompanies.push({
            ...company,
            intentScore,
            detectedSignals: company.signals || [],
            discoveredAt: new Date().toISOString(),
          });
        }
      }

      // Sort by intent score and limit
      const finalCompanies = scoredCompanies
        .sort((a, b) => b.intentScore - a.intentScore)
        .slice(0, count);

      await this._storeDiscoveredCompanies(finalCompanies);

      this.stats.companiesDiscovered += finalCompanies.length;

      console.log(
        `[Discovery] Found ${finalCompanies.length} companies with strong intent`
      );

      return {
        success: true,
        companies: finalCompanies,
        total: finalCompanies.length,
        signals,
      };
    } catch (error) {
      console.error('[Discovery] Intent discovery failed:', error.message);
      this.stats.errors++;
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ==========================================================================
  // ACCOUNT-BASED DISCOVERY
  // ==========================================================================

  /**
   * Discover contacts at a specific target account
   * @param {Object} params - Account parameters
   * @returns {Promise<Object>} Contacts at account
   */
  async discoverByAccount(params) {
    const {
      companyDomain,
      companyName,
      targetTitles = [],
      departments = [],
      seniority = [],
      count = 10,
    } = params;

    try {
      console.log(
        `[Discovery] Finding contacts at ${companyDomain || companyName}`
      );

      // Step 1: Enrich company data
      const company = await this.explorium.enrichCompany({
        domain: companyDomain,
        name: companyName,
      });

      // Step 2: Find contacts
      const contacts = await this.explorium.findContacts({
        companyDomain: companyDomain || company.domain,
        titles: targetTitles,
        departments,
        seniority,
      });

      // Step 3: Score and sort contacts
      const scoredContacts = contacts
        .map((contact) => ({
          ...contact,
          company,
          contactScore: this._calculateContactScore(
            contact,
            company,
            targetTitles
          ),
          discoveredAt: new Date().toISOString(),
        }))
        .sort((a, b) => b.contactScore - a.contactScore)
        .slice(0, count);

      await this._storeDiscoveredContacts(scoredContacts);

      this.stats.contactsDiscovered += scoredContacts.length;

      console.log(
        `[Discovery] Found ${scoredContacts.length} contacts at ${company.name}`
      );

      return {
        success: true,
        company,
        contacts: scoredContacts,
        total: scoredContacts.length,
      };
    } catch (error) {
      console.error('[Discovery] Account discovery failed:', error.message);
      this.stats.errors++;
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ==========================================================================
  // SCORING ALGORITHMS
  // ==========================================================================

  /**
   * Calculate ICP fit score (0-1)
   * Composite algorithm: Fit × 0.35 + Intent × 0.35 + Reachability × 0.20 + Freshness × 0.10
   * @private
   */
  _calculateIcpScore(company, icpProfile) {
    let fitScore = 0;
    let intentScore = 0;
    let reachabilityScore = 0;
    let freshnessScore = 0;

    // 1. Fit Score (0.35 weight)
    const fitFactors = [];

    // Industry match
    if (icpProfile.industry && company.industry) {
      const industryMatch = icpProfile.industry.some((ind) =>
        company.industry.toLowerCase().includes(ind.toLowerCase())
      );
      fitFactors.push(industryMatch ? 1 : 0);
    }

    // Employee range
    if (icpProfile.employees && company.employees) {
      const { min, max } = icpProfile.employees;
      const inRange =
        company.employees >= min && company.employees <= max;
      fitFactors.push(inRange ? 1 : 0.5);
    }

    // Revenue range
    if (icpProfile.revenue && company.revenue) {
      // Simple check - in real implementation, parse revenue string
      fitFactors.push(0.8); // Assume reasonable match
    }

    // Technology stack
    if (icpProfile.technologies && company.technologies) {
      const techMatches = icpProfile.technologies.filter((tech) =>
        company.technologies.some((companyTech) =>
          companyTech.toLowerCase().includes(tech.toLowerCase())
        )
      ).length;
      const techScore = techMatches / icpProfile.technologies.length;
      fitFactors.push(techScore);
    }

    // Geography
    if (icpProfile.geography && company.headquarters) {
      const geoMatch = icpProfile.geography.some((geo) =>
        company.headquarters.toLowerCase().includes(geo.toLowerCase())
      );
      fitFactors.push(geoMatch ? 1 : 0);
    }

    fitScore =
      fitFactors.length > 0
        ? fitFactors.reduce((a, b) => a + b, 0) / fitFactors.length
        : 0;

    // 2. Intent Score (0.35 weight)
    if (company.signals && company.signals.length > 0) {
      const signalWeights = {
        funding: 0.9,
        expansion: 0.85,
        hiring: 0.75,
        'new_product': 0.8,
        regulatory: 0.7,
        partnership: 0.65,
      };

      const intentFactors = company.signals.map(
        (signal) => signalWeights[signal] || 0.5
      );
      intentScore =
        intentFactors.reduce((a, b) => a + b, 0) / intentFactors.length;
    }

    // 3. Reachability Score (0.20 weight)
    if (company.emailVerificationRate) {
      reachabilityScore = company.emailVerificationRate;
    } else {
      reachabilityScore = 0.7; // Assume reasonable default
    }

    // 4. Freshness Score (0.10 weight)
    if (company.lastUpdated) {
      const daysSinceUpdate =
        (Date.now() - new Date(company.lastUpdated).getTime()) /
        (1000 * 60 * 60 * 24);
      freshnessScore = Math.max(0, 1 - daysSinceUpdate / 90); // Decay over 90 days
    } else {
      freshnessScore = 0.8; // Assume fresh if no data
    }

    // Composite score
    const compositeScore =
      fitScore * 0.35 +
      intentScore * 0.35 +
      reachabilityScore * 0.2 +
      freshnessScore * 0.1;

    return Math.min(1, Math.max(0, compositeScore));
  }

  /**
   * Calculate contact fit score (0-1)
   * @private
   */
  _calculateContactScore(contact, company, targetTitles) {
    let score = 0;
    let factors = 0;

    // Title match (40%)
    if (targetTitles.length > 0 && contact.title) {
      const titleMatch = targetTitles.some((target) =>
        contact.title.toLowerCase().includes(target.toLowerCase())
      );
      score += titleMatch ? 0.4 : 0.1;
    } else {
      score += 0.3; // Default if no target titles
    }
    factors += 0.4;

    // Seniority (30%)
    const seniorityWeights = {
      'C-Level': 1.0,
      VP: 0.9,
      Director: 0.8,
      Manager: 0.6,
      Individual: 0.4,
    };
    score += (seniorityWeights[contact.seniority] || 0.5) * 0.3;
    factors += 0.3;

    // Email verified (20%)
    if (contact.emailVerified) {
      score += 0.2;
    }
    factors += 0.2;

    // LinkedIn profile (10%)
    if (contact.linkedinUrl) {
      score += 0.1;
    }
    factors += 0.1;

    return score;
  }

  /**
   * Calculate intent signal strength (0-1)
   * @private
   */
  _calculateIntentScore(company, targetSignals) {
    if (!company.signals || company.signals.length === 0) {
      return 0;
    }

    const signalWeights = {
      funding: 0.95,
      expansion: 0.9,
      hiring: 0.8,
      'new_product': 0.85,
      regulatory: 0.75,
      partnership: 0.7,
      'media_presence': 0.6,
    };

    // Calculate weighted average of detected signals
    const detectedSignals = company.signals.filter((signal) =>
      targetSignals.includes(signal)
    );

    if (detectedSignals.length === 0) {
      return 0;
    }

    const totalWeight = detectedSignals.reduce(
      (sum, signal) => sum + (signalWeights[signal] || 0.5),
      0
    );

    return totalWeight / detectedSignals.length;
  }

  // ==========================================================================
  // ICP PROFILE MANAGEMENT
  // ==========================================================================

  /**
   * Load ICP profiles from YAML configuration
   * @private
   */
  _loadIcpProfiles() {
    try {
      // Try loading from project root
      const icpPath = join(process.cwd(), '.sales-automation/icp-profiles.yaml');

      if (fs.existsSync(icpPath)) {
        const content = fs.readFileSync(icpPath, 'utf-8');
        const profiles = yaml.parse(content);

        console.log(
          `[Discovery] Loaded ${Object.keys(profiles).length} ICP profiles`
        );

        return profiles;
      } else {
        console.warn('[Discovery] ICP profiles not found, using defaults');
        return this._getDefaultIcpProfiles();
      }
    } catch (error) {
      console.error('[Discovery] Failed to load ICP profiles:', error.message);
      return this._getDefaultIcpProfiles();
    }
  }

  /**
   * Get default ICP profiles
   * @private
   */
  _getDefaultIcpProfiles() {
    return {
      default: {
        name: 'Default ICP',
        industry: ['Technology', 'Financial Services'],
        employees: { min: 50, max: 500 },
        geography: ['United States', 'United Kingdom'],
        technologies: [],
        signals: ['funding', 'expansion', 'hiring'],
      },
    };
  }

  /**
   * Build search criteria from ICP profile
   * @private
   */
  _buildSearchCriteria(icpProfile, geographyOverride = null) {
    return {
      industry: icpProfile.industry,
      employees: icpProfile.employees,
      location: geographyOverride || icpProfile.geography,
      technologies: icpProfile.technologies,
      signals: icpProfile.signals,
    };
  }

  // ==========================================================================
  // DEDUPLICATION
  // ==========================================================================

  /**
   * Filter out companies already in HubSpot
   * @private
   */
  async _filterExisting(companies) {
    const filtered = [];

    for (const company of companies) {
      try {
        const existing = await this.hubspot.findCompanyByDomain(company.domain);

        if (!existing) {
          filtered.push(company);
        } else {
          console.log(
            `[Discovery] Skipping existing company: ${company.domain}`
          );
        }
      } catch (error) {
        // If error checking, include the company
        filtered.push(company);
      }
    }

    return filtered;
  }

  // ==========================================================================
  // DATABASE OPERATIONS
  // ==========================================================================

  async _storeDiscoveredCompanies(companies) {
    try {
      const stmt = this.database.db.prepare(`
        INSERT OR REPLACE INTO discovered_companies
        (domain, name, icp_score, intent_score, data, discovered_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
      `);

      for (const company of companies) {
        stmt.run(
          company.domain,
          company.name,
          company.icpScore || 0,
          company.intentScore || 0,
          JSON.stringify(company)
        );
      }
    } catch (error) {
      console.error('[Discovery] Failed to store companies:', error.message);
    }
  }

  async _storeDiscoveredContacts(contacts) {
    try {
      const stmt = this.database.db.prepare(`
        INSERT OR REPLACE INTO discovered_contacts
        (email, first_name, last_name, company_domain, contact_score, data, discovered_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `);

      for (const contact of contacts) {
        stmt.run(
          contact.email,
          contact.firstName,
          contact.lastName,
          contact.company?.domain || null,
          contact.contactScore || 0,
          JSON.stringify(contact)
        );
      }
    } catch (error) {
      console.error('[Discovery] Failed to store contacts:', error.message);
    }
  }

  // ==========================================================================
  // UTILITIES
  // ==========================================================================

  /**
   * Get discovery statistics
   */
  getStats() {
    return {
      ...this.stats,
      icpProfilesLoaded: Object.keys(this.icpProfiles).length,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      companiesDiscovered: 0,
      contactsDiscovered: 0,
      avgIcpScore: 0,
      errors: 0,
    };
  }

  /**
   * Get available ICP profiles
   */
  getAvailableIcpProfiles() {
    return Object.keys(this.icpProfiles).map((key) => ({
      name: key,
      ...this.icpProfiles[key],
    }));
  }
}

export default LeadDiscoveryWorker;
