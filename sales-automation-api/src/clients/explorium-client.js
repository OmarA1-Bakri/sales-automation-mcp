/**
 * Explorium Client - Sales Automation Integration
 *
 * This client provides access to Explorium's B2B data enrichment API
 * for sales automation workflows. Explorium provides live company and contact
 * intelligence with high-quality, harmonized data.
 *
 * Key Features:
 * - Company enrichment (firmographics, technographics, financials)
 * - Contact enrichment (job titles, email verification, social profiles)
 * - Target discovery (find companies matching specific criteria)
 * - Real-time data (live business intelligence, not stale databases)
 *
 * API Documentation: https://developers.explorium.ai
 */

import { createLogger } from '../utils/logger.js';
import { createCircuitBreaker } from '../utils/circuit-breaker.js';

export class ExploriumClient {
  constructor(config = {}) {
    // E2E Mock Mode: When enabled, return mock data instead of calling real APIs
    // This allows E2E tests to run without valid external API credentials
    this.mockMode = process.env.E2E_MOCK_EXTERNAL_APIS === 'true';

    if (this.mockMode) {
      this.logger = createLogger('ExploriumClient');
      this.logger.info('[ExploriumClient] Running in E2E mock mode - returning mock data');
      this.apiKey = 'mock-explorium-key';
      this.baseURL = 'https://api.explorium.ai/v1';
      this.requestCount = 0;
      this.resetTime = Date.now() + 60000;
      this.maxRequestsPerMinute = 200;
      return; // Skip real API setup in mock mode
    }

    this.apiKey = config.apiKey || process.env.EXPLORIUM_API_KEY;

    if (!this.apiKey) {
      throw new Error(
        'EXPLORIUM_API_KEY is required for Explorium integration. ' +
          'Get your API key at https://www.explorium.ai'
      );
    }

    this.baseURL = 'https://api.explorium.ai/v1';

    // Initialize request counter for rate limiting
    this.requestCount = 0;
    this.resetTime = Date.now() + 60000; // 1 minute window
    this.maxRequestsPerMinute = 200; // Explorium limit

    // SECURITY FIX: Phase 2, T2.4 - Use secure logger with PII redaction
    this.logger = createLogger('ExploriumClient');

    // PHASE 3 FIX (P3.6): Wrap request method with circuit breaker
    // Circuit Breaker wraps retry logic: CB → _makeRequest (with retry) → fetch
    this.circuitBreaker = createCircuitBreaker(
      async (endpoint, options, retryCount) => {
        return await this._makeRequestInternal(endpoint, options, retryCount);
      },
      {
        serviceName: 'explorium',
        fallback: (endpoint, options, retryCount) => {
          this.logger.warn('Explorium circuit open, service temporarily unavailable');
          throw new Error(
            'Explorium API is temporarily unavailable. Please try again in a few moments.'
          );
        }
      }
    );
  }

  // ============================================================================
  // CONTACT ENRICHMENT
  // ============================================================================

  /**
   * Enrich contact data with job details, email verification, and social profiles
   *
   * Explorium requires a two-step process:
   * 1. Fetch Prospects to get prospect_id
   * 2. Enrich Contact using prospect_id
   *
   * @param {Object} contact - Contact information
   * @param {Object} options - Enrichment options
   * @param {boolean} options.includeSocialMedia - Include social media metrics
   * @returns {Promise<Object>} Enriched contact data
   */
  async enrichContact(contact, options = {}) {
    // E2E Mock Mode: Return mock enriched contact data
    if (this.mockMode) {
      return this._getMockEnrichedContact(contact);
    }

    this._checkRateLimit();

    try {
      const { email, firstName, lastName, companyDomain, company } = contact;

      // Step 1: Match prospect to get prospect_id
      const prospectToMatch = {};

      if (email) {
        prospectToMatch.email = email;
      }

      if (firstName && lastName) {
        prospectToMatch.full_name = `${firstName} ${lastName}`;
      }

      if (companyDomain || company?.domain || company?.name) {
        prospectToMatch.company_name = company?.name || companyDomain;
      }

      const matchResponse = await this._makeRequest('/prospects/match', {
        method: 'POST',
        body: JSON.stringify({
          prospects_to_match: [prospectToMatch]
        })
      });

      if (!matchResponse.matched_prospects || matchResponse.matched_prospects.length === 0) {
        // SECURITY FIX: Phase 2, T2.4 - Use secure logger to redact PII
        this.logger.warn('No prospect matched', { email, firstName, lastName });
        return this._emptyContactResponse(contact);
      }

      const matchedProspect = matchResponse.matched_prospects[0];
      const prospectId = matchedProspect.prospect_id;

      if (!prospectId) {
        // SECURITY FIX: Phase 2, T2.4 - Use secure logger to redact PII
        this.logger.warn('No prospect_id returned', { email });
        return this._emptyContactResponse(contact);
      }

      // Step 2: Enrich the contact (parallel: contact info + profile + optional social media)
      const enrichmentPromises = [
        this._makeRequest('/prospects/contacts_information/enrich', {
          method: 'POST',
          body: JSON.stringify({ prospect_id: prospectId })
        }).catch(err => ({ error: err.message })),

        this._makeRequest('/prospects/profiles/enrich', {
          method: 'POST',
          body: JSON.stringify({ prospect_id: prospectId })
        }).catch(err => ({ error: err.message }))
      ];

      // Optionally add social media enrichment
      if (options.includeSocialMedia) {
        enrichmentPromises.push(
          this.enrichIndividualSocialMedia(prospectId).catch(err => ({ error: err.message }))
        );
      }

      const enrichmentResults = await Promise.all(enrichmentPromises);
      const [contactInfo, profileInfo, socialMediaInfo] = enrichmentResults;

      // Parse and structure the enrichment data
      return this._parseContactEnrichment(
        contactInfo.data || contactInfo,
        profileInfo.data || profileInfo,
        contact,
        matchedProspect,
        socialMediaInfo
      );

    } catch (error) {
      // SECURITY FIX: Phase 2, T2.4 - Use secure logger to redact PII
      this.logger.error('Contact enrichment failed', { error: error.message });
      return this._handleError('enrichContact', error);
    }
  }

  /**
   * Parse Explorium contact enrichment response into standardized format
   * Extracts ALL available fields from Professional Profile and Contact Details
   * @private
   */
  _parseContactEnrichment(contactInfo, profileInfo, originalContact, prospectData, socialMediaInfo) {
    const { email, firstName, lastName, companyDomain } = originalContact;

    // Handle errors in API responses
    const contact = contactInfo.error ? {} : contactInfo;
    const profile = profileInfo.error ? {} : profileInfo;
    const socialMedia = socialMediaInfo?.socialMedia || {};

    // === CONTACT DETAILS (from /prospects/contacts_information/enrich) ===

    // Extract professional email
    const professionalEmail = contact.professions_email || contact.professional_email || email;

    // Extract personal email from emails array
    const personalEmailObj = contact.emails?.find(e => e.type === 'personal');
    const personalEmail = personalEmailObj?.address || null;

    // Email validation
    const emailStatus = contact.professional_email_status || 'unknown';
    const emailVerified = emailStatus === 'valid' || emailStatus === 'deliverable';

    const emailValidation = {
      deliverable: emailStatus === 'deliverable' || emailStatus === 'valid',
      validFormat: emailStatus !== 'invalid',
      disposable: emailStatus === 'disposable',
      roleBased: emailStatus === 'role_based',
      catchAll: emailStatus === 'catch-all'
    };

    // Extract phone numbers
    const phoneNumber = contact.mobile_phone ||
                       (contact.phone_numbers && contact.phone_numbers[0]?.phone_number) ||
                       null;
    const phoneValidation = null; // Not provided in response

    // === PROFESSIONAL PROFILE (from /prospects/profiles/enrich) ===

    // Extract current job (data is at root level in actual API response)
    const currentJob = {
      job_title: profile.job_title,
      title: profile.job_title,
      company_name: profile.company_name,
      name: profile.company_name,
      company_domain: profile.company_website,
      domain: profile.company_website,
      seniority_level: profile.job_seniority_level,
      department: profile.job_department,
      location: profile.city && profile.region_name ? `${profile.city}, ${profile.region_name}` : null
    };

    // Extract previous jobs from experience array
    const previousJobs = (profile.experience || [])
      .filter(exp => !exp.is_primary) // Filter out current job
      .map(exp => ({
        company_name: exp.company?.name,
        domain: exp.company?.website,
        title: exp.title?.name,
        seniority_level: exp.title?.levels?.[0],
        start_date: exp.start_date,
        end_date: exp.end_date
      }));

    // Extract education
    const education = profile.education || [];

    // Extract social profiles
    const linkedinUrl = profile.linkedin || profile.linkedin_url || prospectData.input?.linkedin || null;
    const twitterHandle = profile.twitter || profile.twitter_handle || null;
    const facebookUrl = profile.facebook || profile.facebook_url || null;

    // Extract location data
    const location = currentJob.location || null;
    const country = profile.country_name || profile.country || null;
    const city = profile.city || null;
    const state = profile.region_name || profile.state || profile.region || null;

    // Extract experience metrics
    const yearsOfExperience = profile.years_of_experience || profile.total_years_of_experience || null;
    const yearsInCurrentRole = currentJob.years_in_role || currentJob.tenure_years || null;

    // Extract skills and certifications
    const skills = profile.skills || [];
    const certifications = profile.certifications || [];

    // Extract previous companies (map from job history)
    const previousCompanies = previousJobs.map(job => ({
      name: job.company_name || job.name,
      domain: job.company_domain || job.domain,
      title: job.job_title || job.title,
      startDate: job.start_date || job.started_on,
      endDate: job.end_date || job.ended_on,
      duration: job.duration || job.tenure_months
    }));

    return {
      // === Contact Details ===
      email: professionalEmail,
      personalEmail,
      emailVerified,
      emailValidation: {
        deliverable: emailValidation.deliverable,
        validFormat: emailValidation.valid_format,
        disposable: emailValidation.disposable,
        roleBased: emailValidation.role_based,
        catchAll: emailValidation.catch_all
      },
      phoneNumber,
      phoneValidation,

      // === Basic Identity ===
      firstName: firstName || profile.first_name || prospectData.input?.full_name?.split(' ')[0],
      lastName: lastName || profile.last_name || prospectData.input?.full_name?.split(' ').slice(1).join(' '),
      fullName: profile.full_name || prospectData.input?.full_name || `${firstName || ''} ${lastName || ''}`.trim(),

      // === Current Position ===
      title: currentJob.job_title || currentJob.title || null,
      currentCompany: currentJob.company_name || currentJob.name || prospectData.input?.company_name,
      currentCompanyDomain: companyDomain || currentJob.company_domain || currentJob.domain,
      seniority: currentJob.seniority_level || currentJob.job_level || this._determineSeniority(currentJob.job_title),
      department: currentJob.department || currentJob.functional_area || null,

      // === Location ===
      location,
      country,
      city,
      state,

      // === Experience ===
      yearsOfExperience,
      yearsInCurrentRole,
      previousCompanies,

      // === Social Profiles ===
      linkedinUrl,
      twitterHandle,
      facebookUrl,

      // === Skills & Education ===
      skills,
      certifications,
      education,

      // === Social Media Metrics (if requested) ===
      socialMediaMetrics: Object.keys(socialMedia).length > 0 ? {
        linkedinFollowers: socialMedia.linkedinFollowers,
        linkedinConnections: socialMedia.linkedinConnections,
        linkedinPostsLast30Days: socialMedia.linkedinPostsLast30Days,
        twitterFollowers: socialMedia.twitterFollowers,
        twitterFollowing: socialMedia.twitterFollowing,
        twitterTweets: socialMedia.twitterTweets,
        instagramFollowers: socialMedia.instagramFollowers,
        youtubeSubscribers: socialMedia.youtubeSubscribers
      } : null,

      // === Metadata ===
      confidenceScore: this._calculateConfidenceScore(contact, profile),
      dataSource: 'explorium',
      enrichedAt: new Date().toISOString()
    };
  }

  /**
   * Bulk enrich multiple contacts using Explorium's bulk API
   * More efficient than batchEnrichContacts for large volumes
   *
   * @param {Array} prospectIds - Array of prospect_ids to enrich
   * @returns {Promise<Object>} Bulk enrichment results
   */
  async bulkEnrichContactsInformation(prospectIds) {
    this._checkRateLimit();

    try {
      const response = await this._makeRequest('/prospects/contacts_information/bulk_enrich', {
        method: 'POST',
        body: JSON.stringify({
          prospect_ids: prospectIds
        })
      });

      return {
        success: true,
        data: response.data || []
      };
    } catch (error) {
      return this._handleError('bulkEnrichContactsInformation', error);
    }
  }

  /**
   * Bulk enrich prospect profiles (work history, education, skills)
   *
   * @param {Array} prospectIds - Array of prospect_ids to enrich
   * @returns {Promise<Object>} Bulk profile enrichment results
   */
  async bulkEnrichProspectProfiles(prospectIds) {
    this._checkRateLimit();

    try {
      const response = await this._makeRequest('/prospects/profiles/bulk_enrich', {
        method: 'POST',
        body: JSON.stringify({
          prospect_ids: prospectIds
        })
      });

      return {
        success: true,
        data: response.data || []
      };
    } catch (error) {
      return this._handleError('bulkEnrichProspectProfiles', error);
    }
  }

  /**
   * Batch enrich multiple contacts (legacy method - uses individual calls)
   * For better performance with large volumes, use bulkEnrichContactsInformation
   *
   * @param {Array} contacts - Array of contact objects
   * @returns {Promise<Array>} Array of enriched contacts
   */
  async batchEnrichContacts(contacts) {
    const results = [];

    // Process in batches of 10 to respect rate limits
    const batchSize = 10;
    for (let i = 0; i < contacts.length; i += batchSize) {
      const batch = contacts.slice(i, i + batchSize);

      // Enrich contacts in parallel within each batch
      const batchPromises = batch.map(contact =>
        this.enrichContact(contact).catch(err => ({
          error: err.message,
          contact
        }))
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Wait between batches to avoid rate limiting
      if (i + batchSize < contacts.length) {
        await this._sleep(1000);
      }
    }

    return results;
  }

  // ============================================================================
  // COMPANY ENRICHMENT
  // ============================================================================

  /**
   * Enrich company data with firmographics, technographics, and signals
   *
   * Explorium requires a two-step process:
   * 1. Fetch Businesses to get business_id
   * 2. Enrich Business using business_id
   *
   * @param {Object} companyIdentifier - Company domain, name, or LinkedIn URL
   * @param {Object} options - Enrichment options
   * @param {boolean} options.includeSocialMedia - Include social media metrics
   * @param {boolean} options.includeWorkforce - Include workforce trends
   * @param {boolean} options.includeIntent - Include intent topics (Bombora)
   * @param {boolean} options.includeFinancials - Include financial metrics
   * @param {boolean} options.includeCompetitive - Include competitive landscape
   * @param {boolean} options.includeInsights - Include strategic insights
   * @param {boolean} options.includeRatings - Include employee ratings
   * @returns {Promise<Object>} Enriched company data
   */
  async enrichCompany(companyIdentifier, options = {}) {
    // E2E Mock Mode: Return mock enriched company data
    if (this.mockMode) {
      return this._getMockEnrichedCompany(companyIdentifier);
    }

    this._checkRateLimit();

    try {
      const { domain, name, linkedinUrl } = companyIdentifier;

      // Step 1: Match business to get business_id
      const businessToMatch = {};

      if (domain) {
        businessToMatch.domain = domain;
      }

      if (name) {
        businessToMatch.business_name = name;
      }

      // Match business using /businesses/match endpoint
      const matchResponse = await this._makeRequest('/businesses/match', {
        method: 'POST',
        body: JSON.stringify({
          businesses_to_match: [businessToMatch]
        })
      });

      if (!matchResponse.matched_businesses || matchResponse.matched_businesses.length === 0) {
        this.logger.warn('No business matched', { domain, name });
        return this._emptyCompanyResponse(companyIdentifier);
      }

      const matchedBusiness = matchResponse.matched_businesses[0];
      const businessId = matchedBusiness.business_id;

      if (!businessId) {
        this.logger.warn('No business_id returned', { domain, name });
        return this._emptyCompanyResponse(companyIdentifier);
      }

      // Step 2: Enrich the company (parallel requests for different data types)
      const enrichmentPromises = [
        this._makeRequest('/businesses/firmographics/enrich', {
          method: 'POST',
          body: JSON.stringify({ business_id: businessId })
        }).catch(err => ({ error: err.message })),

        this._makeRequest('/businesses/technographics/enrich', {
          method: 'POST',
          body: JSON.stringify({ business_id: businessId })
        }).catch(err => ({ error: err.message })),

        this._makeRequest('/businesses/funding_and_acquisition/enrich', {
          method: 'POST',
          body: JSON.stringify({ business_id: businessId })
        }).catch(err => ({ error: err.message }))
      ];

      // Add optional advanced enrichments
      if (options.includeSocialMedia) {
        enrichmentPromises.push(this.enrichCompanySocialMedia(businessId).catch(err => ({ error: err.message })));
      }
      if (options.includeWorkforce) {
        enrichmentPromises.push(this.enrichWorkforceTrends(businessId).catch(err => ({ error: err.message })));
      }
      if (options.includeIntent) {
        enrichmentPromises.push(this.enrichBusinessIntentTopics(businessId).catch(err => ({ error: err.message })));
      }
      if (options.includeFinancials) {
        enrichmentPromises.push(this.enrichFinancialMetrics(businessId).catch(err => ({ error: err.message })));
      }
      if (options.includeCompetitive) {
        enrichmentPromises.push(this.enrichCompetitiveLandscape(businessId).catch(err => ({ error: err.message })));
      }
      if (options.includeInsights) {
        enrichmentPromises.push(this.enrichStrategicInsights(businessId).catch(err => ({ error: err.message })));
      }
      if (options.includeRatings) {
        enrichmentPromises.push(this.enrichCompanyRatings(businessId).catch(err => ({ error: err.message })));
      }

      const enrichmentResults = await Promise.all(enrichmentPromises);
      const [firmographics, technographics, funding, ...advancedData] = enrichmentResults;

      // Parse and structure the enrichment data
      return this._parseCompanyEnrichment(
        matchedBusiness,
        firmographics,
        technographics,
        funding,
        advancedData,
        options
      );

    } catch (error) {
      this.logger.error('Company enrichment failed', { error: error.message });
      return this._handleError('enrichCompany', error);
    }
  }

  /**
   * Parse Explorium company enrichment response into standardized format
   * Extracts ALL available fields from Firmographics, Technographics, and Funding
   * @private
   */
  _parseCompanyEnrichment(business, firmographics, technographics, funding, advancedData = [], options = {}) {
    // Extract data with error handling (data is inside .data property)
    const firm = firmographics.error ? {} : (firmographics.data || firmographics);
    const tech = technographics.error ? {} : (technographics.data || technographics);
    const fund = funding.error ? {} : (funding.data || funding);

    // Parse advanced enrichment data based on what was requested
    let socialMedia = {};
    let workforce = {};
    let intent = {};
    let financials = {};
    let competitive = {};
    let strategic = {};
    let ratings = {};

    let dataIndex = 0;
    if (options.includeSocialMedia && advancedData[dataIndex]) {
      socialMedia = advancedData[dataIndex].socialMedia || {};
      dataIndex++;
    }
    if (options.includeWorkforce && advancedData[dataIndex]) {
      workforce = advancedData[dataIndex].workforce || {};
      dataIndex++;
    }
    if (options.includeIntent && advancedData[dataIndex]) {
      intent = advancedData[dataIndex].intent || {};
      dataIndex++;
    }
    if (options.includeFinancials && advancedData[dataIndex]) {
      financials = advancedData[dataIndex].financials || {};
      dataIndex++;
    }
    if (options.includeCompetitive && advancedData[dataIndex]) {
      competitive = advancedData[dataIndex].competitive || {};
      dataIndex++;
    }
    if (options.includeInsights && advancedData[dataIndex]) {
      strategic = advancedData[dataIndex].strategic || {};
      dataIndex++;
    }
    if (options.includeRatings && advancedData[dataIndex]) {
      ratings = advancedData[dataIndex].ratings || {};
      dataIndex++;
    }

    // === FIRMOGRAPHICS (35+ fields from actual API response) ===

    // Basic Identity
    const businessName = firm.name || business.company_name || business.business_name || null;
    const domain = business.domain || firm.domain || null;

    // Industry Classification
    const industry = firm.linkedin_industry_category || firm.industry || null;
    const subIndustry = firm.sub_industry || null;
    const naicsCode = firm.naics || firm.naics_code || null;
    const naicsDescription = firm.naics_description || null;
    const sicCode = firm.sic_code || null;
    const sicCodeDescription = firm.sic_code_description || null;

    // Size Metrics (from actual API response)
    const employeeCount = firm.number_of_employees || firm.employee_count || null;
    const employeeRange = firm.number_of_employees_range || firm.employee_range || null;
    const annualRevenue = firm.yearly_revenue || firm.annual_revenue || null;
    const revenueRange = firm.yearly_revenue_range || firm.revenue_range || null;

    // Company Details
    const foundedYear = firm.founded_year || firm.year_founded || null;
    const companyType = firm.ticker ? 'public' : (firm.company_type || 'private');
    const businessModel = firm.business_model || null;
    const companyDescription = firm.business_description || firm.company_description || firm.description || null;
    const tagline = firm.tagline || null;

    // Location (from actual API response)
    const street = firm.street || null;
    const zipCode = firm.zip_code || null;
    const headquartersCity = firm.city_name || firm.headquarters_city || null;
    const headquartersState = firm.region_name || firm.headquarters_state || null;
    const headquartersCountry = firm.country_name || firm.headquarters_country || null;
    const headquarters = street && headquartersCity
      ? `${street}, ${headquartersCity}, ${headquartersState} ${zipCode}`
      : `${headquartersCity || ''}, ${headquartersState || ''}, ${headquartersCountry || ''}`.trim();

    const totalOffices = firm.locations_distribution?.reduce((sum, loc) => sum + (loc.locations || 0), 0) || null;
    const officeLocations = firm.locations_distribution || [];

    // Contact Information
    const phoneNumber = firm.phone || firm.phone_number || null;
    const logoUrl = firm.business_logo || firm.logo_url || null;
    const websiteUrl = firm.website || firm.website_url || (domain ? `https://${domain}` : null);

    // Social & Public Profiles (from actual API response)
    const linkedinUrl = firm.linkedin_profile || business.linkedin_url || firm.linkedin_url || null;
    const twitterHandle = firm.twitter || firm.twitter_handle || null;
    const facebookUrl = firm.facebook || firm.facebook_url || null;
    const crunchbaseUrl = firm.crunchbase || firm.crunchbase_url || null;

    // Public Company Data
    const stockSymbol = firm.ticker || firm.stock_symbol || null;
    const stockExchange = firm.stock_exchange || null;
    const ipoDate = firm.ipo_date || null;

    // Corporate Structure
    const parentCompany = firm.parent_company || null;
    const subsidiaries = firm.subsidiaries || [];
    const competitors = firm.competitors || [];

    // === TECHNOGRAPHICS (from actual API response) ===

    // The actual API returns full_tech_stack array
    const technologies = tech.full_tech_stack || tech.technologies || [];

    // Detailed tech categorization (if provided by API)
    const techByCategory = {
      analytics: tech.analytics_tools || [],
      crm: tech.crm_platforms || [],
      marketingAutomation: tech.marketing_automation || [],
      ecommerce: tech.ecommerce_platforms || [],
      paymentProcessors: tech.payment_processors || [],
      cloudProviders: tech.cloud_providers || [],
      cdnProviders: tech.cdn_providers || [],
      security: tech.security_tools || [],
      databases: tech.databases || [],
      programmingLanguages: tech.programming_languages || [],
      frameworks: tech.frameworks || [],
      cms: tech.cms_platforms || []
    };

    // === FUNDING & ACQUISITIONS (20+ fields) ===

    const totalFundingAmount = fund.total_funding_amount || null;
    const lastFundingAmount = fund.last_funding_amount || null;
    const lastFundingDate = fund.last_funding_date || null;
    const fundingStage = fund.funding_stage || fund.last_funding_stage || null;
    const fundingRounds = fund.funding_rounds || [];
    const investors = fund.investors || [];
    const leadInvestors = fund.lead_investors || [];
    const valuation = fund.valuation || null;

    // Acquisition status
    const acquisitionStatus = fund.acquisition_status || false;
    const acquiredBy = fund.acquired_by || null;
    const acquisitionDate = fund.acquisition_date || null;
    const acquisitionPrice = fund.acquisition_price || null;
    const acquisitionsMade = fund.acquisitions_made || [];

    // IPO data
    const ipoStatus = fund.ipo_status || (ipoDate ? 'public' : null);
    const ipoValuation = fund.ipo_valuation || null;

    // === SIGNALS & INTENT ===

    const signals = [];

    // Funding signals
    if (fundingRounds.length > 0) {
      signals.push('funding');
    }

    // Growth signals
    const employeeGrowth6m = firm.employee_count_growth_6_months || 0;
    if (employeeGrowth6m > 10) {
      signals.push('hiring');
    }
    if (employeeGrowth6m > 20) {
      signals.push('rapid_growth');
    }

    // Expansion signals
    if (firm.international_presence || officeLocations.length > 1) {
      signals.push('expansion');
    }

    // Recent acquisition activity
    if (acquisitionsMade.length > 0) {
      signals.push('acquisitions');
    }

    // IPO activity
    if (ipoStatus === 'public' && ipoDate) {
      const ipoYear = new Date(ipoDate).getFullYear();
      const currentYear = new Date().getFullYear();
      if (currentYear - ipoYear <= 2) {
        signals.push('recent_ipo');
      }
    }

    return {
      // === Core Identity ===
      domain,
      name: businessName,
      companyDescription,
      tagline,
      logoUrl,
      websiteUrl,

      // === Classification ===
      industry,
      subIndustry,
      naicsCode,
      naicsDescription,
      sicCode,
      sicCodeDescription,
      businessModel,
      companyType,

      // === Size & Scale ===
      employees: employeeCount,
      employeeRange,
      employeeGrowth6m,
      revenue: annualRevenue,
      revenueRange,

      // === Location ===
      headquarters,
      headquartersCountry,
      headquartersCity,
      headquartersState,
      headquartersZip: zipCode,
      totalOffices,
      officeLocations,

      // === Founded & History ===
      foundedYear,

      // === Contact ===
      phoneNumber,

      // === Social & Public Profiles ===
      linkedinUrl,
      twitterHandle,
      facebookUrl,
      crunchbaseUrl,

      // === Public Company Data ===
      stockSymbol,
      stockExchange,
      ipoDate,
      ipoStatus,
      ipoValuation,

      // === Corporate Structure ===
      parentCompany,
      subsidiaries,
      competitors,

      // === Technology ===
      technologies,
      techByCategory,

      // === Funding ===
      fundingStage,
      totalFundingAmount,
      lastFundingAmount,
      lastFundingDate,
      fundingRounds,
      investors,
      leadInvestors,
      valuation,

      // === Acquisitions ===
      acquisitionStatus,
      acquiredBy,
      acquisitionDate,
      acquisitionPrice,
      acquisitionsMade,

      // === Signals & Intent ===
      signals,

      // === Advanced Enrichment Data (if requested) ===
      socialMediaMetrics: Object.keys(socialMedia).length > 0 ? socialMedia : null,
      workforceMetrics: Object.keys(workforce).length > 0 ? workforce : null,
      intentData: Object.keys(intent).length > 0 ? intent : null,
      financialMetrics: Object.keys(financials).length > 0 ? financials : null,
      competitiveData: Object.keys(competitive).length > 0 ? competitive : null,
      strategicInsights: Object.keys(strategic).length > 0 ? strategic : null,
      employeeRatings: Object.keys(ratings).length > 0 ? ratings : null,

      // === Metadata ===
      confidenceScore: this._calculateCompanyConfidence(firm, tech, fund),
      dataSource: 'explorium',
      enrichedAt: new Date().toISOString()
    };
  }

  /**
   * Batch enrich multiple companies
   * @param {Array} companies - Array of company identifiers
   * @returns {Promise<Array>} Array of enriched companies
   */
  async batchEnrichCompanies(companies) {
    // Explorium supports bulk enrichment for up to 50 companies
    const batchSize = 50;
    const results = [];

    for (let i = 0; i < companies.length; i += batchSize) {
      const batch = companies.slice(i, i + batchSize);

      // First, get all business_ids
      const businessIds = [];
      for (const company of batch) {
        try {
          const filters = company.domain
            ? { domain: { values: [company.domain] } }
            : { company_name: { values: [company.name] } };

          const searchResponse = await this._makeRequest('/businesses', {
            method: 'POST',
            body: JSON.stringify({
              mode: 'full',
              size: 1,
              page_size: 1,
              page: 1,
              filters
            })
          });

          if (searchResponse.data && searchResponse.data[0]) {
            businessIds.push(searchResponse.data[0].business_id);
          }
        } catch (err) {
          this.logger.warn('Could not find business', { domain: company.domain, error: err.message });
        }
      }

      // Bulk enrich
      if (businessIds.length > 0) {
        try {
          const bulkResponse = await this._makeRequest('/businesses/bulk-enrich', {
            method: 'POST',
            body: JSON.stringify({
              business_ids: businessIds
            })
          });

          results.push(...bulkResponse.data || []);
        } catch (err) {
          this.logger.error('Bulk enrichment failed', { error: err.message });
        }
      }
    }

    return results;
  }

  // ============================================================================
  // ADVANCED ENRICHMENT - SOCIAL MEDIA, WORKFORCE, INTENT, INSIGHTS
  // ============================================================================

  /**
   * Enrich individual's social media presence
   * LinkedIn followers, engagement metrics, activity
   *
   * @param {string} prospectId - Prospect ID from match endpoint
   * @returns {Promise<Object>} Social media data
   */
  async enrichIndividualSocialMedia(prospectId) {
    this._checkRateLimit();

    try {
      const response = await this._makeRequest('/prospects/social_media/enrich', {
        method: 'POST',
        body: JSON.stringify({ prospect_id: prospectId })
      });

      return {
        success: true,
        data: response.data || response,
        socialMedia: {
          linkedinFollowers: response.data?.linkedin_followers || null,
          linkedinConnections: response.data?.linkedin_connections || null,
          linkedinPostsLast30Days: response.data?.linkedin_posts_last_30_days || null,
          twitterFollowers: response.data?.twitter_followers || null,
          twitterFollowing: response.data?.twitter_following || null,
          twitterTweets: response.data?.twitter_tweets || null,
          instagramFollowers: response.data?.instagram_followers || null,
          youtubeSubscribers: response.data?.youtube_subscribers || null
        }
      };
    } catch (error) {
      return this._handleError('enrichIndividualSocialMedia', error);
    }
  }

  /**
   * Enrich company's social media presence
   * LinkedIn followers, engagement rate, posts, multi-platform metrics
   *
   * @param {string} businessId - Business ID from match endpoint
   * @returns {Promise<Object>} Company social media data
   */
  async enrichCompanySocialMedia(businessId) {
    this._checkRateLimit();

    try {
      const response = await this._makeRequest('/businesses/social_media/enrich', {
        method: 'POST',
        body: JSON.stringify({ business_id: businessId })
      });

      return {
        success: true,
        data: response.data || response,
        socialMedia: {
          linkedinFollowers: response.data?.linkedin_followers || null,
          linkedinEmployeeCount: response.data?.linkedin_employee_count || null,
          linkedinPostsLast30Days: response.data?.linkedin_posts_last_30_days || null,
          linkedinEngagementRate: response.data?.linkedin_engagement_rate || null,
          twitterFollowers: response.data?.twitter_followers || null,
          twitterFollowing: response.data?.twitter_following || null,
          twitterTweets: response.data?.twitter_tweets || null,
          twitterEngagementRate: response.data?.twitter_engagement_rate || null,
          facebookLikes: response.data?.facebook_likes || null,
          facebookFollowers: response.data?.facebook_followers || null,
          instagramFollowers: response.data?.instagram_followers || null,
          youtubeSubscribers: response.data?.youtube_subscribers || null,
          youtubeVideos: response.data?.youtube_videos || null
        }
      };
    } catch (error) {
      return this._handleError('enrichCompanySocialMedia', error);
    }
  }

  /**
   * Enrich workforce trends by department
   * Hiring signals, headcount growth, department-specific metrics
   *
   * @param {string} businessId - Business ID from match endpoint
   * @returns {Promise<Object>} Workforce trends data
   */
  async enrichWorkforceTrends(businessId) {
    this._checkRateLimit();

    try {
      const response = await this._makeRequest('/businesses/workforce_trends/enrich', {
        method: 'POST',
        body: JSON.stringify({ business_id: businessId })
      });

      return {
        success: true,
        data: response.data || response,
        workforce: {
          totalEmployees: response.data?.total_employees || null,
          employeeGrowth6m: response.data?.employee_growth_6m || null,
          engineeringHeadcount: response.data?.engineering_headcount || null,
          salesHeadcount: response.data?.sales_headcount || null,
          marketingHeadcount: response.data?.marketing_headcount || null,
          productHeadcount: response.data?.product_headcount || null,
          operationsHeadcount: response.data?.operations_headcount || null,
          hrHeadcount: response.data?.hr_headcount || null,
          financeHeadcount: response.data?.finance_headcount || null,
          customerSuccessHeadcount: response.data?.customer_success_headcount || null,
          engineeringGrowthRate: response.data?.engineering_growth_rate || null,
          salesGrowthRate: response.data?.sales_growth_rate || null,
          newHiresLast30Days: response.data?.new_hires_last_30_days || null,
          departuresLast30Days: response.data?.departures_last_30_days || null,
          openPositions: response.data?.open_positions || null
        }
      };
    } catch (error) {
      return this._handleError('enrichWorkforceTrends', error);
    }
  }

  /**
   * Enrich business intent topics (Bombora data)
   * Intent signals, trending topics, buying surge indicators
   *
   * @param {string} businessId - Business ID from match endpoint
   * @returns {Promise<Object>} Intent topics data
   */
  async enrichBusinessIntentTopics(businessId) {
    this._checkRateLimit();

    try {
      const response = await this._makeRequest('/businesses/intent_topics/enrich', {
        method: 'POST',
        body: JSON.stringify({ business_id: businessId })
      });

      return {
        success: true,
        data: response.data || response,
        intent: {
          topics: response.data?.intent_topics || [],
          trendingTopics: response.data?.trending_topics || [],
          surgeIndicators: response.data?.surge_indicators || []
        }
      };
    } catch (error) {
      return this._handleError('enrichBusinessIntentTopics', error);
    }
  }

  /**
   * Enrich financial metrics for public companies
   * Market cap, revenue, profit margins, stock data, quarterly earnings
   *
   * @param {string} businessId - Business ID from match endpoint
   * @returns {Promise<Object>} Financial metrics data
   */
  async enrichFinancialMetrics(businessId) {
    this._checkRateLimit();

    try {
      const response = await this._makeRequest('/businesses/financial_metrics/enrich', {
        method: 'POST',
        body: JSON.stringify({ business_id: businessId })
      });

      return {
        success: true,
        data: response.data || response,
        financials: {
          marketCap: response.data?.market_cap || null,
          revenue: response.data?.revenue || null,
          revenueGrowthYoy: response.data?.revenue_growth_yoy || null,
          profitMargin: response.data?.profit_margin || null,
          ebitda: response.data?.ebitda || null,
          peRatio: response.data?.pe_ratio || null,
          debtToEquity: response.data?.debt_to_equity || null,
          currentRatio: response.data?.current_ratio || null,
          quickRatio: response.data?.quick_ratio || null,
          roe: response.data?.roe || null,
          roa: response.data?.roa || null,
          cashFlow: response.data?.cash_flow || null,
          freeCashFlow: response.data?.free_cash_flow || null,
          quarterlyEarnings: response.data?.quarterly_earnings || [],
          dividendYield: response.data?.dividend_yield || null,
          beta: response.data?.beta || null,
          fiftyTwoWeekHigh: response.data?.['52_week_high'] || null,
          fiftyTwoWeekLow: response.data?.['52_week_low'] || null,
          currentStockPrice: response.data?.current_stock_price || null
        }
      };
    } catch (error) {
      return this._handleError('enrichFinancialMetrics', error);
    }
  }

  /**
   * Enrich competitive landscape
   * Direct competitors, market share, competitive position
   *
   * @param {string} businessId - Business ID from match endpoint
   * @returns {Promise<Object>} Competitive landscape data
   */
  async enrichCompetitiveLandscape(businessId) {
    this._checkRateLimit();

    try {
      const response = await this._makeRequest('/businesses/competitive_landscape/enrich', {
        method: 'POST',
        body: JSON.stringify({ business_id: businessId })
      });

      return {
        success: true,
        data: response.data || response,
        competitive: {
          directCompetitors: response.data?.direct_competitors || [],
          indirectCompetitors: response.data?.indirect_competitors || [],
          marketShare: response.data?.market_share || null,
          competitivePosition: response.data?.competitive_position || null,
          competitiveAdvantages: response.data?.competitive_advantages || [],
          competitiveDisadvantages: response.data?.competitive_disadvantages || []
        }
      };
    } catch (error) {
      return this._handleError('enrichCompetitiveLandscape', error);
    }
  }

  /**
   * Enrich strategic insights for public companies
   * Strategic priorities, growth strategy, market positioning
   *
   * @param {string} businessId - Business ID from match endpoint
   * @returns {Promise<Object>} Strategic insights data
   */
  async enrichStrategicInsights(businessId) {
    this._checkRateLimit();

    try {
      const response = await this._makeRequest('/businesses/strategic_insights/enrich', {
        method: 'POST',
        body: JSON.stringify({ business_id: businessId })
      });

      return {
        success: true,
        data: response.data || response,
        strategic: {
          strategicPriorities: response.data?.strategic_priorities || [],
          growthStrategy: response.data?.growth_strategy || null,
          marketPositioning: response.data?.market_positioning || null,
          competitiveAdvantages: response.data?.competitive_advantages || [],
          targetMarkets: response.data?.target_markets || [],
          expansionPlans: response.data?.expansion_plans || [],
          innovationFocus: response.data?.innovation_focus || [],
          recentInitiatives: response.data?.recent_initiatives || []
        }
      };
    } catch (error) {
      return this._handleError('enrichStrategicInsights', error);
    }
  }

  /**
   * Enrich company ratings by employees
   * Glassdoor ratings, culture score, work-life balance, reviews
   *
   * @param {string} businessId - Business ID from match endpoint
   * @returns {Promise<Object>} Employee ratings data
   */
  async enrichCompanyRatings(businessId) {
    this._checkRateLimit();

    try {
      const response = await this._makeRequest('/businesses/employee_ratings/enrich', {
        method: 'POST',
        body: JSON.stringify({ business_id: businessId })
      });

      return {
        success: true,
        data: response.data || response,
        ratings: {
          glassdoorRating: response.data?.glassdoor_rating || null,
          glassdoorReviewsCount: response.data?.glassdoor_reviews_count || null,
          cultureRating: response.data?.culture_rating || null,
          workLifeBalanceRating: response.data?.work_life_balance_rating || null,
          compensationRating: response.data?.compensation_rating || null,
          careerOpportunitiesRating: response.data?.career_opportunities_rating || null,
          seniorManagementRating: response.data?.senior_management_rating || null,
          recommendToFriendPct: response.data?.recommend_to_friend_pct || null,
          ceoApprovalRating: response.data?.ceo_approval_rating || null,
          diversityRating: response.data?.diversity_rating || null,
          recentReviews: response.data?.recent_reviews || [],
          pros: response.data?.pros || [],
          cons: response.data?.cons || []
        }
      };
    } catch (error) {
      return this._handleError('enrichCompanyRatings', error);
    }
  }

  // ============================================================================
  // TARGET DISCOVERY
  // ============================================================================

  /**
   * Discover companies matching specific criteria
   * @param {Object} criteria - Search criteria
   * @returns {Promise<Object>} Matching companies
   */
  async discoverCompanies(criteria) {
    // E2E Mock Mode: Return mock discovered companies
    if (this.mockMode) {
      return this._getMockDiscoveredCompanies(criteria);
    }

    this._checkRateLimit();

    try {
      const filters = this._buildCompanyFilter(criteria);
      const limit = criteria.limit || 50;

      const response = await this._makeRequest('/businesses', {
        method: 'POST',
        body: JSON.stringify({
          mode: 'full',
          size: limit,
          page_size: Math.min(limit, 500), // Max 500 per page
          page: 1,
          filters
        })
      });

      return {
        success: true,
        companies: response.data || [],
        totalFound: response.pagination?.total || response.data?.length || 0,
        hasMore: response.pagination?.has_more || false
      };
    } catch (error) {
      return this._handleError('discoverCompanies', error);
    }
  }

  /**
   * Find contacts at specific companies matching criteria
   * @param {Object} search - Search parameters
   * @returns {Promise<Object>} Matching contacts
   */
  async findContacts(search) {
    // E2E Mock Mode: Return mock found contacts
    if (this.mockMode) {
      return this._getMockFoundContacts(search);
    }

    this._checkRateLimit();

    try {
      const filters = this._buildContactFilter(search);
      const limit = search.limit || 50;

      const response = await this._makeRequest('/prospects', {
        method: 'POST',
        body: JSON.stringify({
          mode: 'full',
          size: limit,
          page_size: Math.min(limit, 500), // Max 500 per page
          page: 1,
          filters
        })
      });

      return {
        success: true,
        contacts: response.data || [],
        totalFound: response.pagination?.total || response.data?.length || 0,
        hasMore: response.pagination?.has_more || false
      };
    } catch (error) {
      return this._handleError('findContacts', error);
    }
  }

  // ============================================================================
  // EVENTS & SIGNALS
  // ============================================================================

  /**
   * Fetch business events (funding, partnerships, M&A, growth signals)
   *
   * @param {Object} params - Event search parameters
   * @param {Array<string>} params.business_ids - Business IDs to get events for
   * @param {Array<string>} [params.event_types] - Filter by event types
   * @returns {Promise<Object>} Business events
   */
  async fetchBusinessEvents(params) {
    this._checkRateLimit();

    try {
      const response = await this._makeRequest('/businesses/events', {
        method: 'POST',
        body: JSON.stringify(params)
      });

      return {
        success: true,
        events: response.data || [],
        totalFound: response.total_results || 0
      };
    } catch (error) {
      return this._handleError('fetchBusinessEvents', error);
    }
  }

  /**
   * Fetch prospect events (job changes, promotions, anniversaries)
   *
   * @param {Object} params - Event search parameters
   * @param {Array<string>} params.prospect_ids - Prospect IDs to get events for
   * @param {Array<string>} [params.event_types] - Filter by event types
   * @returns {Promise<Object>} Prospect events
   */
  async fetchProspectEvents(params) {
    this._checkRateLimit();

    try {
      const response = await this._makeRequest('/prospects/events', {
        method: 'POST',
        body: JSON.stringify(params)
      });

      return {
        success: true,
        events: response.data || [],
        totalFound: response.total_results || 0
      };
    } catch (error) {
      return this._handleError('fetchProspectEvents', error);
    }
  }

  // ============================================================================
  // STATISTICS & ANALYTICS
  // ============================================================================

  /**
   * Fetch aggregated business statistics
   *
   * @param {Object} filters - Filter criteria for statistics
   * @returns {Promise<Object>} Aggregated business insights
   */
  async fetchBusinessStatistics(filters) {
    this._checkRateLimit();

    try {
      const response = await this._makeRequest('/businesses/stats', {
        method: 'POST',
        body: JSON.stringify({ filters })
      });

      return {
        success: true,
        stats: response.stats || {},
        totalResults: response.total_results || 0
      };
    } catch (error) {
      return this._handleError('fetchBusinessStatistics', error);
    }
  }

  /**
   * Fetch aggregated prospect statistics
   *
   * @param {Object} filters - Filter criteria for statistics
   * @returns {Promise<Object>} Aggregated prospect insights by department/geography
   */
  async fetchProspectStatistics(filters) {
    this._checkRateLimit();

    try {
      const response = await this._makeRequest('/prospects/stats', {
        method: 'POST',
        body: JSON.stringify({ filters })
      });

      return {
        success: true,
        stats: response.stats || {},
        totalResults: response.total_results || 0
      };
    } catch (error) {
      return this._handleError('fetchProspectStatistics', error);
    }
  }

  // ============================================================================
  // AUTOCOMPLETE & VALIDATION
  // ============================================================================

  /**
   * Get valid autocomplete values for filter fields
   * Must be called before using certain filters: google_category, naics_category,
   * linkedin_category, company_tech_stack_tech, job_title
   *
   * @param {string} field - Field name to get autocomplete for
   * @param {string} query - Partial query string
   * @returns {Promise<Object>} Autocomplete suggestions
   */
  async autocomplete(field, query) {
    this._checkRateLimit();

    try {
      const response = await this._makeRequest('/autocomplete', {
        method: 'POST',
        body: JSON.stringify({
          field,
          query
        })
      });

      return {
        success: true,
        suggestions: response.suggestions || []
      };
    } catch (error) {
      return this._handleError('autocomplete', error);
    }
  }

  // ============================================================================
  // UTILITY & HEALTH
  // ============================================================================

  /**
   * Check if Explorium API is accessible
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    // E2E Mock Mode: Return healthy status
    if (this.mockMode) {
      return {
        success: true,
        status: 'healthy',
        message: 'Explorium API running in E2E mock mode',
        mockMode: true,
        features: {
          companyEnrichment: true,
          contactEnrichment: true,
          targetDiscovery: true,
          bulkOperations: true,
        },
      };
    }

    if (!this.apiKey) {
      return {
        success: false,
        status: 'unhealthy',
        error: 'EXPLORIUM_API_KEY not configured',
        message: 'Get your API key at https://www.explorium.ai',
      };
    }

    try {
      // Make a minimal API call to verify connectivity
      await this._makeRequest('/businesses', {
        method: 'POST',
        body: JSON.stringify({
          mode: 'preview',
          size: 1,
          page_size: 1,
          page: 1,
          filters: {}  // Empty filters for health check
        })
      });

      return {
        success: true,
        status: 'healthy',
        message: 'Explorium API is accessible',
        features: {
          companyEnrichment: true,
          contactEnrichment: true,
          targetDiscovery: true,
          bulkOperations: true,
        },
        compliance: {
          gdpr: true,
          ccpa: true,
          soc2: true,
          iso27001: true,
        },
      };
    } catch (error) {
      return {
        success: false,
        status: 'unhealthy',
        error: error.message,
        message: 'Failed to connect to Explorium API'
      };
    }
  }

  /**
   * Get rate limit status
   * @returns {Object} Rate limit info
   */
  getRateLimitStatus() {
    const remainingRequests = Math.max(
      0,
      this.maxRequestsPerMinute - this.requestCount
    );
    const secondsUntilReset = Math.max(
      0,
      Math.ceil((this.resetTime - Date.now()) / 1000)
    );

    return {
      maxRequestsPerMinute: this.maxRequestsPerMinute,
      remainingRequests,
      secondsUntilReset,
      throttled: remainingRequests === 0,
    };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Make HTTP request to Explorium API with circuit breaker protection
   * @private
   */
  // PHASE 3 FIX (P3.6): Circuit breaker wrapper for all API requests
  async _makeRequest(endpoint, options = {}, retryCount = 0) {
    return await this.circuitBreaker.fire(endpoint, options, retryCount);
  }

  /**
   * Internal HTTP request to Explorium API (called by circuit breaker)
   * @private
   */
  // PHASE 3 FIX (P3.3): Add retry logic with exponential backoff
  async _makeRequestInternal(endpoint, options = {}, retryCount = 0) {
    const url = `${this.baseURL}${endpoint}`;
    const maxRetries = 5;
    const baseDelay = 1000; // 1 second

    const headers = {
      'api_key': this.apiKey,
      'Content-Type': 'application/json',
      ...options.headers
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      if (!response.ok) {
        const errorText = await response.text();

        // Determine if error is retryable
        const isRetryable =
          response.status === 429 || // Rate limit
          response.status >= 500 ||   // Server errors
          response.status === 408;    // Request timeout

        if (isRetryable && retryCount < maxRetries) {
          // Calculate exponential backoff delay: 1s, 2s, 4s, 8s, 16s
          const delay = baseDelay * Math.pow(2, retryCount);

          this.logger.warn('Retrying Explorium request', {
            attempt: retryCount + 1,
            maxRetries,
            status: response.status,
            endpoint,
            delayMs: delay
          });

          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, delay));

          // Retry the request
          return this._makeRequestInternal(endpoint, options, retryCount + 1);
        }

        // Non-retryable errors or max retries reached
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please wait before making more requests.');
        }

        if (response.status === 401 || response.status === 403) {
          throw new Error('Invalid API key or unauthorized access');
        }

        throw new Error(`Explorium API error (${response.status}): ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      // Network errors are also retryable
      const isNetworkError = error.message.includes('fetch') ||
                             error.message.includes('network') ||
                             error.message.includes('ECONNREFUSED') ||
                             error.message.includes('ETIMEDOUT');

      if (isNetworkError && retryCount < maxRetries) {
        const delay = baseDelay * Math.pow(2, retryCount);

        this.logger.warn('Network error, retrying Explorium request', {
          attempt: retryCount + 1,
          maxRetries,
          endpoint,
          error: error.message,
          delayMs: delay
        });

        await new Promise(resolve => setTimeout(resolve, delay));
        return this._makeRequestInternal(endpoint, options, retryCount + 1);
      }

      throw error;
    }
  }

  /**
   * Check and enforce rate limits
   * @private
   */
  _checkRateLimit() {
    const now = Date.now();

    if (now >= this.resetTime) {
      this.requestCount = 0;
      this.resetTime = now + 60000;
    }

    if (this.requestCount >= this.maxRequestsPerMinute) {
      const waitSeconds = Math.ceil((this.resetTime - now) / 1000);
      throw new Error(
        `Explorium rate limit exceeded. Wait ${waitSeconds}s before next request.`
      );
    }

    this.requestCount++;
  }

  /**
   * Build company filter from criteria
   * @private
   */
  _buildCompanyFilter(criteria) {
    const filters = {};

    if (criteria.industry) {
      // Industry uses google_category with {values: [...]} format
      const industries = Array.isArray(criteria.industry)
        ? criteria.industry
        : [criteria.industry];
      filters.google_category = { values: industries };
    }

    if (criteria.employees) {
      // Convert to company_size array format
      const { min, max } = criteria.employees;
      const ranges = [];
      if (min <= 10) ranges.push('1-10');
      if (min <= 50 && max >= 11) ranges.push('11-50');
      if (min <= 200 && max >= 51) ranges.push('51-200');
      if (min <= 500 && max >= 201) ranges.push('201-500');
      if (min <= 1000 && max >= 501) ranges.push('501-1000');
      if (min <= 5000 && max >= 1001) ranges.push('1001-5000');
      if (min <= 10000 && max >= 5001) ranges.push('5001-10000');
      if (max >= 10001) ranges.push('10001+');

      if (ranges.length > 0) {
        filters.company_size = { values: ranges };
      }
    }

    if (criteria.location || criteria.geography) {
      const locations = criteria.location || criteria.geography;
      const locationArray = Array.isArray(locations) ? locations : [locations];
      filters.country_code = { values: locationArray };
    }

    if (criteria.technologies) {
      const techs = Array.isArray(criteria.technologies)
        ? criteria.technologies
        : [criteria.technologies];
      filters.technologies = { values: techs };
    }

    return filters;
  }

  /**
   * Build contact filter from search parameters
   * @private
   */
  _buildContactFilter(search) {
    const filters = {};

    if (search.companyDomain) {
      filters.domain = { values: [search.companyDomain] };
    }

    if (search.titles) {
      const titles = Array.isArray(search.titles) ? search.titles : [search.titles];
      filters.job_title = { type: 'includes', values: titles };
    }

    if (search.departments) {
      const depts = Array.isArray(search.departments) ? search.departments : [search.departments];
      filters.job_department = { type: 'includes', values: depts };
    }

    if (search.seniority) {
      const levels = Array.isArray(search.seniority) ? search.seniority : [search.seniority];
      filters.job_level = { type: 'includes', values: levels };
    }

    // Default: only return prospects with emails
    filters.has_email = { type: 'exists', value: true };

    return filters;
  }

  /**
   * Calculate confidence score for contact enrichment
   * @private
   */
  _calculateConfidenceScore(enrichData, prospectData) {
    let score = 0.5; // Base score

    // Email verification adds confidence
    if (enrichData.professional_email_status === 'valid') {
      score += 0.3;
    } else if (enrichData.professional_email_status === 'catch-all') {
      score += 0.1;
    }

    // Phone number adds confidence
    if (enrichData.mobile_phone || (enrichData.phone_numbers && enrichData.phone_numbers.length > 0)) {
      score += 0.1;
    }

    // LinkedIn profile adds confidence
    if (prospectData.linkedin_url) {
      score += 0.1;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Calculate confidence score for company enrichment
   * @private
   */
  _calculateCompanyConfidence(firm, tech, fund) {
    let score = 0.5; // Base score

    // Firmographics completeness
    if (firm.industry) score += 0.1;
    if (firm.employee_count) score += 0.1;
    if (firm.revenue_range) score += 0.1;

    // Technographics
    if (tech.technologies && tech.technologies.length > 0) score += 0.1;

    // Funding data
    if (fund.last_funding_stage) score += 0.1;

    return Math.min(score, 1.0);
  }

  /**
   * Determine seniority level from job title
   * @private
   */
  _determineSeniority(jobTitle) {
    if (!jobTitle) return null;

    const title = jobTitle.toLowerCase();

    if (title.includes('ceo') || title.includes('cto') || title.includes('cfo') || title.includes('chief')) {
      return 'C-Level';
    }
    if (title.includes('vp') || title.includes('vice president')) {
      return 'VP';
    }
    if (title.includes('director')) {
      return 'Director';
    }
    if (title.includes('manager') || title.includes('head')) {
      return 'Manager';
    }

    return 'Individual Contributor';
  }

  /**
   * Empty contact response when enrichment fails
   * @private
   */
  _emptyContactResponse(contact) {
    return {
      email: contact.email,
      firstName: contact.firstName,
      lastName: contact.lastName,
      emailVerified: false,
      title: null,
      seniority: null,
      department: null,
      linkedinUrl: null,
      phoneNumber: null,
      location: null,
      companyDomain: contact.companyDomain,
      confidenceScore: 0.0
    };
  }

  /**
   * Empty company response when enrichment fails
   * @private
   */
  _emptyCompanyResponse(companyIdentifier) {
    return {
      domain: companyIdentifier.domain,
      name: companyIdentifier.name || companyIdentifier.domain,
      industry: null,
      employees: null,
      revenue: null,
      headquarters: null,
      foundedYear: null,
      technologies: [],
      fundingStage: null,
      fundingAmount: null,
      signals: [],
      linkedinUrl: companyIdentifier.linkedinUrl,
      confidenceScore: 0.0
    };
  }

  /**
   * Handle and format errors
   * @private
   */
  _handleError(method, error) {
    const errorResponse = {
      success: false,
      error: error.message || 'Unknown error',
      method,
      timestamp: new Date().toISOString(),
    };

    this.logger.error(`${method} failed`, errorResponse);

    return errorResponse;
  }

  /**
   * Sleep utility
   * @private
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ============================================================================
  // E2E MOCK MODE RESPONSE METHODS
  // ============================================================================

  /**
   * Generate mock enriched contact for E2E testing
   * @private
   */
  _getMockEnrichedContact(contact) {
    const { email, firstName, lastName, companyDomain } = contact;
    return {
      // Contact Details
      email: email || 'mock.user@example.com',
      personalEmail: null,
      emailVerified: true,
      emailValidation: {
        deliverable: true,
        validFormat: true,
        disposable: false,
        roleBased: false,
        catchAll: false
      },
      phoneNumber: '+1-555-123-4567',
      phoneValidation: null,

      // Basic Identity
      firstName: firstName || 'Mock',
      lastName: lastName || 'User',
      fullName: `${firstName || 'Mock'} ${lastName || 'User'}`,

      // Current Position
      title: 'Senior Software Engineer',
      currentCompany: 'Mock Tech Corp',
      currentCompanyDomain: companyDomain || 'mocktech.com',
      seniority: 'Manager',
      department: 'Engineering',

      // Location
      location: 'San Francisco, CA',
      country: 'United States',
      city: 'San Francisco',
      state: 'California',

      // Experience
      yearsOfExperience: 8,
      yearsInCurrentRole: 2,
      previousCompanies: [
        { name: 'Previous Corp', domain: 'previous.com', title: 'Software Engineer' }
      ],

      // Social Profiles
      linkedinUrl: 'https://linkedin.com/in/mockuser',
      twitterHandle: '@mockuser',
      facebookUrl: null,

      // Skills & Education
      skills: ['JavaScript', 'React', 'Node.js', 'TypeScript'],
      certifications: [],
      education: [{ school: 'Mock University', degree: 'BS Computer Science' }],

      // Metadata
      confidenceScore: 0.95,
      dataSource: 'explorium-mock',
      mockMode: true,
      enrichedAt: new Date().toISOString()
    };
  }

  /**
   * Generate mock enriched company for E2E testing
   * @private
   */
  _getMockEnrichedCompany(companyIdentifier) {
    const { domain, name } = companyIdentifier;
    return {
      // Core Identity
      domain: domain || 'mockcompany.com',
      name: name || 'Mock Company Inc',
      companyDescription: 'A mock company for E2E testing purposes',
      tagline: 'Making testing easier',
      logoUrl: 'https://via.placeholder.com/150',
      websiteUrl: `https://${domain || 'mockcompany.com'}`,

      // Classification
      industry: 'Technology',
      subIndustry: 'Software Development',
      naicsCode: '541511',
      naicsDescription: 'Custom Computer Programming Services',
      sicCode: '7371',
      sicCodeDescription: 'Computer Programming Services',
      businessModel: 'B2B SaaS',
      companyType: 'private',

      // Size & Scale
      employees: 150,
      employeeRange: '101-250',
      employeeGrowth6m: 15,
      revenue: 25000000,
      revenueRange: '$10M-$50M',

      // Location
      headquarters: '123 Mock Street, San Francisco, CA 94105',
      headquartersCountry: 'United States',
      headquartersCity: 'San Francisco',
      headquartersState: 'California',
      headquartersZip: '94105',
      totalOffices: 3,
      officeLocations: [
        { city: 'San Francisco', country: 'US', locations: 1 },
        { city: 'New York', country: 'US', locations: 1 },
        { city: 'London', country: 'UK', locations: 1 }
      ],

      // Founded
      foundedYear: 2018,

      // Contact
      phoneNumber: '+1-555-000-0000',

      // Social Profiles
      linkedinUrl: 'https://linkedin.com/company/mockcompany',
      twitterHandle: '@mockcompany',
      facebookUrl: null,
      crunchbaseUrl: null,

      // Public Company Data
      stockSymbol: null,
      stockExchange: null,
      ipoDate: null,
      ipoStatus: null,
      ipoValuation: null,

      // Corporate Structure
      parentCompany: null,
      subsidiaries: [],
      competitors: ['Competitor A', 'Competitor B'],

      // Technology
      technologies: ['React', 'Node.js', 'PostgreSQL', 'AWS', 'Docker'],
      techByCategory: {
        analytics: ['Google Analytics'],
        crm: ['Salesforce'],
        marketingAutomation: ['HubSpot'],
        cloudProviders: ['AWS'],
        databases: ['PostgreSQL'],
        frameworks: ['React', 'Express']
      },

      // Funding
      fundingStage: 'Series B',
      totalFundingAmount: 45000000,
      lastFundingAmount: 30000000,
      lastFundingDate: '2023-06-15',
      fundingRounds: [
        { stage: 'Seed', amount: 5000000, date: '2019-01-15' },
        { stage: 'Series A', amount: 10000000, date: '2021-03-20' },
        { stage: 'Series B', amount: 30000000, date: '2023-06-15' }
      ],
      investors: ['Mock Ventures', 'Test Capital'],
      leadInvestors: ['Mock Ventures'],
      valuation: 150000000,

      // Signals
      signals: ['funding', 'hiring', 'expansion'],

      // Metadata
      confidenceScore: 0.92,
      dataSource: 'explorium-mock',
      mockMode: true,
      enrichedAt: new Date().toISOString()
    };
  }

  /**
   * Generate mock discovered companies for E2E testing
   * @private
   */
  _getMockDiscoveredCompanies(criteria) {
    const limit = criteria.limit || 5;
    const companies = [];

    for (let i = 1; i <= Math.min(limit, 10); i++) {
      companies.push({
        business_id: `mock-business-${i}`,
        domain: `mockcompany${i}.com`,
        name: `Mock Company ${i}`,
        industry: criteria.industry || 'Technology',
        employee_count: 50 + (i * 25),
        revenue_range: '$10M-$50M',
        location: 'San Francisco, CA',
        founded_year: 2015 + i,
        linkedin_url: `https://linkedin.com/company/mockcompany${i}`,
        technologies: ['React', 'Node.js', 'AWS'],
        funding_stage: i % 2 === 0 ? 'Series A' : 'Series B',
        mockMode: true
      });
    }

    return {
      success: true,
      companies,
      totalFound: companies.length,
      hasMore: false,
      mockMode: true
    };
  }

  /**
   * Generate mock found contacts for E2E testing
   * @private
   */
  _getMockFoundContacts(search) {
    const limit = search.limit || 5;
    const contacts = [];

    const mockNames = [
      { first: 'Alice', last: 'Johnson' },
      { first: 'Bob', last: 'Smith' },
      { first: 'Carol', last: 'Williams' },
      { first: 'David', last: 'Brown' },
      { first: 'Eva', last: 'Davis' },
      { first: 'Frank', last: 'Miller' },
      { first: 'Grace', last: 'Wilson' },
      { first: 'Henry', last: 'Moore' },
      { first: 'Ivy', last: 'Taylor' },
      { first: 'Jack', last: 'Anderson' }
    ];

    const mockTitles = [
      'VP of Engineering',
      'Senior Product Manager',
      'Director of Sales',
      'CTO',
      'Head of Marketing',
      'Software Engineer',
      'Data Scientist',
      'UX Designer',
      'DevOps Lead',
      'Account Executive'
    ];

    for (let i = 0; i < Math.min(limit, 10); i++) {
      const name = mockNames[i % mockNames.length];
      const title = search.titles?.[0] || mockTitles[i % mockTitles.length];

      contacts.push({
        prospect_id: `mock-prospect-${i + 1}`,
        email: `${name.first.toLowerCase()}.${name.last.toLowerCase()}@${search.companyDomain || 'mockcompany.com'}`,
        first_name: name.first,
        last_name: name.last,
        full_name: `${name.first} ${name.last}`,
        job_title: title,
        job_department: search.departments?.[0] || 'Engineering',
        job_seniority_level: search.seniority?.[0] || 'Director',
        linkedin_url: `https://linkedin.com/in/${name.first.toLowerCase()}${name.last.toLowerCase()}`,
        company_name: 'Mock Company',
        company_domain: search.companyDomain || 'mockcompany.com',
        location: 'San Francisco, CA',
        mockMode: true
      });
    }

    return {
      success: true,
      contacts,
      totalFound: contacts.length,
      hasMore: false,
      mockMode: true
    };
  }
}

// Export for use in sales automation workflows
export default ExploriumClient;
