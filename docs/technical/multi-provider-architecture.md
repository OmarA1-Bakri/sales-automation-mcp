# Multi-Provider Outreach Architecture

**Version:** 2.0
**Last Updated:** January 2025
**Status:** Architecture Design

---

## Executive Summary

The RTGS Sales Automation Suite implements a **multi-provider architecture** with abstraction layers that enable seamless switching between email and LinkedIn providers based on business requirements, cost optimization, and internal approvals.

### **Provider Strategy**

**PRIMARY (Active Now):**
- **Lemlist** - Multi-channel platform (email + LinkedIn + phone + WhatsApp)
- Unified sequences and inbox
- Active by default

**SECONDARY (Implemented but Inactive):**
- **Postmark** - Email-only provider (cost optimization, full ownership)
- **Phantombuster** - LinkedIn-only provider (cost optimization, flexibility)
- Ready to switch on when internal approvals achieved
- Configuration-flag controlled

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│               Multi-Provider Outreach Architecture              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Campaign Orchestration Layer                │  │
│  │  • Sequence management                                   │  │
│  │  • Enrollment logic                                      │  │
│  │  • Multi-channel coordination                            │  │
│  │  • Provider-agnostic API                                 │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            │                                    │
│                            ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           Provider Abstraction Layer                     │  │
│  │                                                           │  │
│  │  ┌────────────────────────┐  ┌──────────────────────┐   │  │
│  │  │   EmailProvider        │  │  LinkedInProvider    │   │  │
│  │  │   (Interface)          │  │  (Interface)         │   │  │
│  │  │                        │  │                      │   │  │
│  │  │  • send()              │  │  • sendConnection()  │   │  │
│  │  │  • sendBatch()         │  │  • sendMessage()     │   │  │
│  │  │  • sendTemplate()      │  │  • visitProfile()    │   │  │
│  │  │  • trackOpens()        │  │  • trackAcceptance() │   │  │
│  │  │  • trackClicks()       │  │  • trackReplies()    │   │  │
│  │  └────────────────────────┘  └──────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            │                                    │
│                            ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Provider Implementations                    │  │
│  │                                                           │  │
│  │  ┌─────────────────────────────────────────────────┐    │  │
│  │  │  PRIMARY (ACTIVE)                               │    │  │
│  │  │  ┌────────────────────────────────────────┐     │    │  │
│  │  │  │  LemlistEmailProvider                  │     │    │  │
│  │  │  │  • Multi-channel sequences             │     │    │  │
│  │  │  │  • Email tracking                      │     │    │  │
│  │  │  │  • Conditional triggers                │     │    │  │
│  │  │  └────────────────────────────────────────┘     │    │  │
│  │  │  ┌────────────────────────────────────────┐     │    │  │
│  │  │  │  LemlistLinkedInProvider               │     │    │  │
│  │  │  │  • Native LinkedIn integration         │     │    │  │
│  │  │  │  • Profile visits, requests, messages  │     │    │  │
│  │  │  │  • Unified with email sequences        │     │    │  │
│  │  │  └────────────────────────────────────────┘     │    │  │
│  │  └─────────────────────────────────────────────────┘    │  │
│  │                                                           │  │
│  │  ┌─────────────────────────────────────────────────┐    │  │
│  │  │  SECONDARY (INACTIVE - Ready when approved)     │    │  │
│  │  │  ┌────────────────────────────────────────┐     │    │  │
│  │  │  │  PostmarkEmailProvider                 │     │    │  │
│  │  │  │  • Email-only (no LinkedIn)            │     │    │  │
│  │  │  │  • Batch sending (500/request)         │     │    │  │
│  │  │  │  • Template-based                      │     │    │  │
│  │  │  │  • Cost-effective at scale             │     │    │  │
│  │  │  └────────────────────────────────────────┘     │    │  │
│  │  │  ┌────────────────────────────────────────┐     │    │  │
│  │  │  │  PhantombusterLinkedInProvider         │     │    │  │
│  │  │  │  • LinkedIn-only (no email)            │     │    │  │
│  │  │  │  • Phantom-based automation            │     │    │  │
│  │  │  │  • Conservative rate limits            │     │    │  │
│  │  │  │  • Full ownership of automation        │     │    │  │
│  │  │  └────────────────────────────────────────┘     │    │  │
│  │  └─────────────────────────────────────────────────┘    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            │                                    │
│                            ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Configuration Layer                         │  │
│  │                                                           │  │
│  │  EMAIL_PROVIDER=lemlist      (or postmark)               │  │
│  │  LINKEDIN_PROVIDER=lemlist   (or phantombuster)          │  │
│  │                                                           │  │
│  │  Provider selection happens at runtime via factory       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Provider Abstraction Interfaces

### **EmailProvider Interface**

```javascript
/**
 * Base interface for all email providers
 * All implementations must adhere to this contract
 */
class EmailProvider {
  constructor(config) {
    if (new.target === EmailProvider) {
      throw new Error('EmailProvider is abstract and cannot be instantiated');
    }
    this.config = config;
  }

  /**
   * Send a single email
   * @param {Object} message - Email message
   * @param {string} message.to - Recipient email
   * @param {string} message.subject - Email subject
   * @param {string} message.body - Email body (HTML or text)
   * @param {Object} message.variables - Personalization variables
   * @param {string} message.campaignId - Associated campaign
   * @returns {Promise<Object>} Result with messageId and status
   */
  async send(message) {
    throw new Error('Method send() must be implemented');
  }

  /**
   * Send batch of emails (up to 500)
   * @param {Array<Object>} messages - Array of email messages
   * @returns {Promise<Array<Object>>} Array of results
   */
  async sendBatch(messages) {
    throw new Error('Method sendBatch() must be implemented');
  }

  /**
   * Send email using template
   * @param {string} templateId - Template identifier
   * @param {Object} data - Template data and variables
   * @returns {Promise<Object>} Result with messageId
   */
  async sendTemplate(templateId, data) {
    throw new Error('Method sendTemplate() must be implemented');
  }

  /**
   * Track email opens for a message
   * @param {string} messageId - Message identifier
   * @returns {Promise<Array<Object>>} Array of open events
   */
  async trackOpens(messageId) {
    throw new Error('Method trackOpens() must be implemented');
  }

  /**
   * Track email clicks for a message
   * @param {string} messageId - Message identifier
   * @returns {Promise<Array<Object>>} Array of click events
   */
  async trackClicks(messageId) {
    throw new Error('Method trackClicks() must be implemented');
  }

  /**
   * Get bounce events for a message
   * @param {string} messageId - Message identifier
   * @returns {Promise<Array<Object>>} Array of bounce events
   */
  async getBounces(messageId) {
    throw new Error('Method getBounces() must be implemented');
  }

  /**
   * Handle unsubscribe request
   * @param {string} email - Email to unsubscribe
   * @returns {Promise<boolean>} Success status
   */
  async unsubscribe(email) {
    throw new Error('Method unsubscribe() must be implemented');
  }

  /**
   * Get provider capabilities
   * @returns {Object} Capability flags
   */
  getCapabilities() {
    return {
      batchSending: false,
      templateSupport: false,
      openTracking: false,
      clickTracking: false,
      multiChannel: false,
      maxBatchSize: 0
    };
  }
}

module.exports = EmailProvider;
```

### **LinkedInProvider Interface**

```javascript
/**
 * Base interface for all LinkedIn providers
 * All implementations must adhere to this contract
 */
class LinkedInProvider {
  constructor(config) {
    if (new.target === LinkedInProvider) {
      throw new Error('LinkedInProvider is abstract and cannot be instantiated');
    }
    this.config = config;
  }

  /**
   * Send LinkedIn connection request
   * @param {Object} request - Connection request
   * @param {string} request.profileUrl - LinkedIn profile URL
   * @param {string} request.message - Personalized note (max 300 chars)
   * @param {string} request.campaignId - Associated campaign
   * @returns {Promise<Object>} Result with requestId and status
   */
  async sendConnectionRequest(request) {
    throw new Error('Method sendConnectionRequest() must be implemented');
  }

  /**
   * Send LinkedIn message to connection
   * @param {Object} message - LinkedIn message
   * @param {string} message.profileUrl - Recipient profile URL
   * @param {string} message.body - Message body
   * @param {string} message.campaignId - Associated campaign
   * @returns {Promise<Object>} Result with messageId and status
   */
  async sendMessage(message) {
    throw new Error('Method sendMessage() must be implemented');
  }

  /**
   * Visit LinkedIn profile (for warming)
   * @param {string} profileUrl - LinkedIn profile URL
   * @param {string} campaignId - Associated campaign
   * @returns {Promise<Object>} Result with visit status
   */
  async visitProfile(profileUrl, campaignId) {
    throw new Error('Method visitProfile() must be implemented');
  }

  /**
   * Track connection request acceptance
   * @param {string} requestId - Request identifier
   * @returns {Promise<Object>} Acceptance status and timestamp
   */
  async trackAcceptance(requestId) {
    throw new Error('Method trackAcceptance() must be implemented');
  }

  /**
   * Track message replies
   * @param {string} messageId - Message identifier
   * @returns {Promise<Array<Object>>} Array of reply events
   */
  async trackReplies(messageId) {
    throw new Error('Method trackReplies() must be implemented');
  }

  /**
   * Get current rate limit status
   * @returns {Promise<Object>} Rate limit info (remaining, reset time)
   */
  async getRateLimitStatus() {
    throw new Error('Method getRateLimitStatus() must be implemented');
  }

  /**
   * Get provider capabilities
   * @returns {Object} Capability flags
   */
  getCapabilities() {
    return {
      connectionRequests: false,
      messaging: false,
      profileVisits: false,
      voiceMessages: false,
      multiChannel: false,
      maxDailyConnections: 0,
      maxDailyMessages: 0
    };
  }
}

module.exports = LinkedInProvider;
```

---

## Provider Implementations

### **1. LemlistEmailProvider (PRIMARY - ACTIVE)**

```javascript
const EmailProvider = require('./email-provider.interface');
const lemlistClient = require('../clients/lemlist-client');

class LemlistEmailProvider extends EmailProvider {
  constructor(config) {
    super(config);
    this.client = lemlistClient;
  }

  async send(message) {
    // Map RTGS message format to Lemlist format
    const lemlistMessage = {
      email: message.to,
      campaignId: message.campaignId,
      variables: {
        ...message.variables,
        emailSubject: message.subject,
        emailBody: message.body
      }
    };

    const result = await this.client.addLeadToCampaign(lemlistMessage);

    return {
      messageId: result.id,
      provider: 'lemlist',
      status: 'sent',
      timestamp: new Date().toISOString()
    };
  }

  async sendBatch(messages) {
    // Lemlist doesn't have true batch API, send individually
    const results = await Promise.all(
      messages.map(msg => this.send(msg))
    );
    return results;
  }

  async sendTemplate(templateId, data) {
    // Lemlist uses campaign-based templates
    const campaign = await this.client.getCampaign(templateId);
    return this.send({
      to: data.to,
      subject: campaign.emailSubject,
      body: campaign.emailBody,
      variables: data.variables,
      campaignId: templateId
    });
  }

  async trackOpens(messageId) {
    const activities = await this.client.getLeadActivities(messageId);
    return activities.filter(a => a.type === 'emailOpened');
  }

  async trackClicks(messageId) {
    const activities = await this.client.getLeadActivities(messageId);
    return activities.filter(a => a.type === 'emailClicked');
  }

  async getBounces(messageId) {
    const activities = await this.client.getLeadActivities(messageId);
    return activities.filter(a => a.type === 'emailBounced');
  }

  async unsubscribe(email) {
    return await this.client.unsubscribeLead(email);
  }

  getCapabilities() {
    return {
      batchSending: false, // No native batch API
      templateSupport: true,
      openTracking: true,
      clickTracking: true,
      multiChannel: true, // Supports LinkedIn too
      maxBatchSize: 0
    };
  }
}

module.exports = LemlistEmailProvider;
```

### **2. LemlistLinkedInProvider (PRIMARY - ACTIVE)**

```javascript
const LinkedInProvider = require('./linkedin-provider.interface');
const lemlistClient = require('../clients/lemlist-client');

class LemlistLinkedInProvider extends LinkedInProvider {
  constructor(config) {
    super(config);
    this.client = lemlistClient;
  }

  async sendConnectionRequest(request) {
    const result = await this.client.addLinkedInStep({
      campaignId: request.campaignId,
      profileUrl: request.profileUrl,
      stepType: 'linkedinVisit', // Or 'linkedinInvite'
      message: request.message
    });

    return {
      requestId: result.id,
      provider: 'lemlist',
      status: 'sent',
      timestamp: new Date().toISOString()
    };
  }

  async sendMessage(message) {
    const result = await this.client.addLinkedInStep({
      campaignId: message.campaignId,
      profileUrl: message.profileUrl,
      stepType: 'linkedinMessage',
      message: message.body
    });

    return {
      messageId: result.id,
      provider: 'lemlist',
      status: 'sent',
      timestamp: new Date().toISOString()
    };
  }

  async visitProfile(profileUrl, campaignId) {
    const result = await this.client.addLinkedInStep({
      campaignId,
      profileUrl,
      stepType: 'linkedinVisit'
    });

    return {
      visitId: result.id,
      status: 'completed',
      timestamp: new Date().toISOString()
    };
  }

  async trackAcceptance(requestId) {
    const activities = await this.client.getLeadActivities(requestId);
    const acceptance = activities.find(a => a.type === 'linkedinInviteAccepted');

    return {
      accepted: !!acceptance,
      timestamp: acceptance?.timestamp || null
    };
  }

  async trackReplies(messageId) {
    const activities = await this.client.getLeadActivities(messageId);
    return activities.filter(a => a.type === 'linkedinReplied');
  }

  async getRateLimitStatus() {
    // Lemlist handles rate limiting internally
    return {
      remaining: 999, // Unknown, Lemlist manages this
      resetAt: null,
      managed: 'provider'
    };
  }

  getCapabilities() {
    return {
      connectionRequests: true,
      messaging: true,
      profileVisits: true,
      voiceMessages: true,
      multiChannel: true, // Native multi-channel with email
      maxDailyConnections: 100, // Lemlist default
      maxDailyMessages: 100
    };
  }
}

module.exports = LemlistLinkedInProvider;
```

### **3. PostmarkEmailProvider (SECONDARY - INACTIVE)**

```javascript
const EmailProvider = require('./email-provider.interface');
const postmarkClient = require('../clients/postmark-client');

class PostmarkEmailProvider extends EmailProvider {
  constructor(config) {
    super(config);
    this.client = postmarkClient;
    this.serverToken = config.POSTMARK_SERVER_TOKEN;
  }

  async send(message) {
    const result = await this.client.sendEmail({
      From: this.config.SENDER_EMAIL,
      To: message.to,
      Subject: message.subject,
      HtmlBody: message.body,
      MessageStream: 'outbound',
      TrackOpens: true,
      TrackLinks: 'HtmlAndText',
      Metadata: {
        campaignId: message.campaignId,
        ...message.variables
      }
    });

    return {
      messageId: result.MessageID,
      provider: 'postmark',
      status: 'sent',
      timestamp: result.SubmittedAt
    };
  }

  async sendBatch(messages) {
    const postmarkMessages = messages.map(msg => ({
      From: this.config.SENDER_EMAIL,
      To: msg.to,
      Subject: msg.subject,
      HtmlBody: msg.body,
      MessageStream: 'outbound',
      TrackOpens: true,
      TrackLinks: 'HtmlAndText',
      Metadata: {
        campaignId: msg.campaignId,
        ...msg.variables
      }
    }));

    const results = await this.client.sendEmailBatch(postmarkMessages);

    return results.map(r => ({
      messageId: r.MessageID,
      provider: 'postmark',
      status: r.ErrorCode === 0 ? 'sent' : 'failed',
      error: r.Message,
      timestamp: r.SubmittedAt
    }));
  }

  async sendTemplate(templateId, data) {
    const result = await this.client.sendEmailWithTemplate({
      From: this.config.SENDER_EMAIL,
      To: data.to,
      TemplateId: templateId,
      TemplateModel: data.variables,
      MessageStream: 'outbound',
      TrackOpens: true,
      TrackLinks: 'HtmlAndText'
    });

    return {
      messageId: result.MessageID,
      provider: 'postmark',
      status: 'sent',
      timestamp: result.SubmittedAt
    };
  }

  async trackOpens(messageId) {
    const opens = await this.client.getOpensForMessage(messageId);
    return opens.Opens.map(o => ({
      timestamp: o.FirstOpen,
      client: o.Client?.Name,
      os: o.OS?.Name,
      platform: o.Platform,
      geo: o.Geo
    }));
  }

  async trackClicks(messageId) {
    const clicks = await this.client.getClicksForMessage(messageId);
    return clicks.Clicks.map(c => ({
      timestamp: c.FirstClick,
      url: c.OriginalLink,
      client: c.Client?.Name,
      os: c.OS?.Name
    }));
  }

  async getBounces(messageId) {
    const delivery = await this.client.getOutboundMessageDetails(messageId);

    if (delivery.Status === 'Bounced') {
      return [{
        type: delivery.Details?.BounceID ? 'hard' : 'soft',
        reason: delivery.Details?.Summary,
        timestamp: delivery.ReceivedAt
      }];
    }

    return [];
  }

  async unsubscribe(email) {
    // Postmark handles unsubscribes via suppression list
    await this.client.createSuppressions([
      {
        EmailAddress: email,
        SuppressionOrigin: 'Customer'
      }
    ]);
    return true;
  }

  getCapabilities() {
    return {
      batchSending: true,
      templateSupport: true,
      openTracking: true,
      clickTracking: true,
      multiChannel: false, // Email only
      maxBatchSize: 500
    };
  }
}

module.exports = PostmarkEmailProvider;
```

### **4. PhantombusterLinkedInProvider (SECONDARY - INACTIVE)**

```javascript
const LinkedInProvider = require('./linkedin-provider.interface');
const phantombusterClient = require('../clients/phantombuster-client');

class PhantombusterLinkedInProvider extends LinkedInProvider {
  constructor(config) {
    super(config);
    this.client = phantombusterClient;
    this.apiKey = config.PHANTOMBUSTER_API_KEY;

    // Conservative rate limits
    this.dailyConnectionLimit = 20;
    this.dailyMessageLimit = 50;
  }

  async sendConnectionRequest(request) {
    // Use "LinkedIn Network Booster" phantom
    const phantomId = await this.client.launchPhantom({
      id: 'linkedin-network-booster',
      argument: {
        sessionCookie: this.config.LINKEDIN_SESSION_COOKIE,
        profileUrls: [request.profileUrl],
        message: request.message,
        onlySecondConnections: false
      }
    });

    return {
      requestId: phantomId,
      provider: 'phantombuster',
      status: 'queued',
      timestamp: new Date().toISOString()
    };
  }

  async sendMessage(message) {
    // Use "LinkedIn Message Sender" phantom
    const phantomId = await this.client.launchPhantom({
      id: 'linkedin-message-sender',
      argument: {
        sessionCookie: this.config.LINKEDIN_SESSION_COOKIE,
        profileUrls: [message.profileUrl],
        message: message.body
      }
    });

    return {
      messageId: phantomId,
      provider: 'phantombuster',
      status: 'queued',
      timestamp: new Date().toISOString()
    };
  }

  async visitProfile(profileUrl, campaignId) {
    // Use "LinkedIn Profile Scraper" phantom
    const phantomId = await this.client.launchPhantom({
      id: 'linkedin-profile-scraper',
      argument: {
        sessionCookie: this.config.LINKEDIN_SESSION_COOKIE,
        profileUrls: [profileUrl],
        scrapeMode: 'visit-only'
      }
    });

    return {
      visitId: phantomId,
      status: 'queued',
      timestamp: new Date().toISOString()
    };
  }

  async trackAcceptance(requestId) {
    const result = await this.client.getContainerResult(requestId);

    // Parse result for acceptance status
    const accepted = result.status === 'accepted';

    return {
      accepted,
      timestamp: result.finishedAt
    };
  }

  async trackReplies(messageId) {
    const result = await this.client.getContainerResult(messageId);

    // Parse messages from result
    const replies = result.messages?.filter(m => m.type === 'reply') || [];

    return replies.map(r => ({
      text: r.text,
      timestamp: r.timestamp,
      sender: r.sender
    }));
  }

  async getRateLimitStatus() {
    // Track our own rate limits (Phantombuster doesn't enforce)
    const today = new Date().toISOString().split('T')[0];
    const stats = await this.getUsageStats(today);

    return {
      connections: {
        remaining: this.dailyConnectionLimit - stats.connectionsSent,
        resetAt: new Date(today + 'T00:00:00Z').getTime() + 86400000
      },
      messages: {
        remaining: this.dailyMessageLimit - stats.messagesSent,
        resetAt: new Date(today + 'T00:00:00Z').getTime() + 86400000
      }
    };
  }

  getCapabilities() {
    return {
      connectionRequests: true,
      messaging: true,
      profileVisits: true,
      voiceMessages: false,
      multiChannel: false, // LinkedIn only
      maxDailyConnections: this.dailyConnectionLimit,
      maxDailyMessages: this.dailyMessageLimit
    };
  }

  async getUsageStats(date) {
    // Query our database for today's usage
    // This would be implemented in the actual class
    return {
      connectionsSent: 0,
      messagesSent: 0
    };
  }
}

module.exports = PhantombusterLinkedInProvider;
```

---

## Provider Factory

```javascript
const LemlistEmailProvider = require('./providers/lemlist-email-provider');
const LemlistLinkedInProvider = require('./providers/lemlist-linkedin-provider');
const PostmarkEmailProvider = require('./providers/postmark-email-provider');
const PhantombusterLinkedInProvider = require('./providers/phantombuster-linkedin-provider');

class ProviderFactory {
  constructor(config) {
    this.config = config;
  }

  /**
   * Create email provider based on configuration
   * @returns {EmailProvider} Configured email provider
   */
  createEmailProvider() {
    const provider = this.config.EMAIL_PROVIDER || 'lemlist';

    switch (provider.toLowerCase()) {
      case 'postmark':
        console.log('Using Postmark for email (SECONDARY provider)');
        return new PostmarkEmailProvider(this.config);

      case 'lemlist':
      default:
        console.log('Using Lemlist for email (PRIMARY provider)');
        return new LemlistEmailProvider(this.config);
    }
  }

  /**
   * Create LinkedIn provider based on configuration
   * @returns {LinkedInProvider} Configured LinkedIn provider
   */
  createLinkedInProvider() {
    const provider = this.config.LINKEDIN_PROVIDER || 'lemlist';

    switch (provider.toLowerCase()) {
      case 'phantombuster':
        console.log('Using Phantombuster for LinkedIn (SECONDARY provider)');
        return new PhantombusterLinkedInProvider(this.config);

      case 'lemlist':
      default:
        console.log('Using Lemlist for LinkedIn (PRIMARY provider)');
        return new LemlistLinkedInProvider(this.config);
    }
  }

  /**
   * Get capabilities of configured providers
   * @returns {Object} Combined capabilities
   */
  getProviderCapabilities() {
    const emailProvider = this.createEmailProvider();
    const linkedinProvider = this.createLinkedInProvider();

    return {
      email: emailProvider.getCapabilities(),
      linkedin: linkedinProvider.getCapabilities()
    };
  }

  /**
   * Check if multi-channel sequences are supported
   * @returns {boolean} True if both email and LinkedIn use same provider with multi-channel
   */
  supportsNativeMultiChannel() {
    const emailProvider = this.config.EMAIL_PROVIDER || 'lemlist';
    const linkedinProvider = this.config.LINKEDIN_PROVIDER || 'lemlist';

    return (
      emailProvider === 'lemlist' &&
      linkedinProvider === 'lemlist'
    );
  }
}

module.exports = ProviderFactory;
```

---

## Configuration Management

### **Environment Variables**

```bash
# .env file

# Provider Selection (ACTIVE = PRIMARY)
EMAIL_PROVIDER=lemlist              # Options: lemlist, postmark
LINKEDIN_PROVIDER=lemlist            # Options: lemlist, phantombuster

# Lemlist Configuration (PRIMARY - ACTIVE)
LEMLIST_API_KEY=your_lemlist_api_key
LEMLIST_SENDER_EMAIL=sales@rtgs.com

# Postmark Configuration (SECONDARY - INACTIVE until approval)
POSTMARK_SERVER_TOKEN=your_postmark_token
POSTMARK_SENDER_EMAIL=sales@rtgs.com

# Phantombuster Configuration (SECONDARY - INACTIVE until approval)
PHANTOMBUSTER_API_KEY=your_phantombuster_key
LINKEDIN_SESSION_COOKIE=your_linkedin_session

# Multi-Channel Settings
ENABLE_MULTI_CHANNEL=true           # Use provider's native multi-channel if available
FALLBACK_EMAIL_TO_LINKEDIN=true    # If email bounces, try LinkedIn
MAX_DAILY_EMAILS=500                # Global daily limit
MAX_DAILY_LINKEDIN=50               # Global daily limit
```

### **Provider Configuration Schema**

```javascript
// mcp-server/src/config/provider-config.js

module.exports = {
  providers: {
    email: {
      lemlist: {
        name: 'Lemlist',
        status: 'active',
        priority: 1,
        capabilities: [
          'send',
          'sendBatch',
          'sendTemplate',
          'trackOpens',
          'trackClicks',
          'multiChannel'
        ],
        limits: {
          batchSize: null, // No native batch
          dailyEmails: null // Managed by Lemlist
        },
        cost: {
          monthly: 149, // Multichannel Expert plan
          perContact: 0.30
        }
      },
      postmark: {
        name: 'Postmark',
        status: 'inactive',
        priority: 2,
        capabilities: [
          'send',
          'sendBatch',
          'sendTemplate',
          'trackOpens',
          'trackClicks'
        ],
        limits: {
          batchSize: 500,
          dailyEmails: 50000 // Plan dependent
        },
        cost: {
          monthly: 15, // 50k emails
          perEmail: 0.0003
        }
      }
    },
    linkedin: {
      lemlist: {
        name: 'Lemlist LinkedIn',
        status: 'active',
        priority: 1,
        capabilities: [
          'connectionRequests',
          'messaging',
          'profileVisits',
          'voiceMessages',
          'multiChannel'
        ],
        limits: {
          dailyConnections: 100,
          dailyMessages: 100
        },
        cost: {
          monthly: 149, // Included in Multichannel
          perAction: 0
        }
      },
      phantombuster: {
        name: 'Phantombuster',
        status: 'inactive',
        priority: 2,
        capabilities: [
          'connectionRequests',
          'messaging',
          'profileVisits'
        ],
        limits: {
          dailyConnections: 20, // Conservative
          dailyMessages: 50
        },
        cost: {
          monthly: 69,
          perAction: 0
        }
      }
    }
  }
};
```

---

## Usage Examples

### **Example 1: Send Email (Provider-Agnostic)**

```javascript
const ProviderFactory = require('./providers/provider-factory');
const factory = new ProviderFactory(process.env);

// Automatically uses configured provider (Lemlist by default)
const emailProvider = factory.createEmailProvider();

await emailProvider.send({
  to: 'contact@example.com',
  subject: 'Quick question about treasury',
  body: '<p>Hi John,</p><p>I noticed your company...</p>',
  variables: {
    firstName: 'John',
    companyName: 'Acme Corp'
  },
  campaignId: 'camp_123'
});

// Works identically whether using Lemlist or Postmark!
```

### **Example 2: Send LinkedIn Connection Request**

```javascript
const ProviderFactory = require('./providers/provider-factory');
const factory = new ProviderFactory(process.env);

// Automatically uses configured provider (Lemlist by default)
const linkedinProvider = factory.createLinkedInProvider();

await linkedinProvider.sendConnectionRequest({
  profileUrl: 'https://linkedin.com/in/john-doe',
  message: 'Hi John, I saw your post about expanding into new markets...',
  campaignId: 'camp_123'
});

// Works identically whether using Lemlist or Phantombuster!
```

### **Example 3: Multi-Channel Sequence (Lemlist Native)**

```javascript
// When both providers are Lemlist, use native multi-channel
if (factory.supportsNativeMultiChannel()) {
  // Create unified multi-channel campaign
  const campaign = await lemlistClient.createCampaign({
    name: 'PSP Treasury Q1',
    steps: [
      { type: 'email', delay: 0, subject: '...', body: '...' },
      { type: 'linkedinVisit', delay: 24 },
      { type: 'email', delay: 72, subject: '...', body: '...' },
      { type: 'linkedinInvite', delay: 120, message: '...' },
      { type: 'linkedinMessage', delay: 168, message: '...' }
    ]
  });
} else {
  // Use separate orchestration for mixed providers
  await emailProvider.send(...);
  setTimeout(() => linkedinProvider.visitProfile(...), 86400000); // 24 hours
}
```

### **Example 4: Switch to Secondary Providers**

```bash
# Update .env file when internal approval achieved

# Before (PRIMARY - Lemlist)
EMAIL_PROVIDER=lemlist
LINKEDIN_PROVIDER=lemlist

# After (SECONDARY - Postmark + Phantombuster)
EMAIL_PROVIDER=postmark
LINKEDIN_PROVIDER=phantombuster

# Restart application - no code changes needed!
```

### **Example 5: Check Provider Capabilities**

```javascript
const capabilities = factory.getProviderCapabilities();

console.log(capabilities);
// Output:
// {
//   email: {
//     batchSending: false,
//     templateSupport: true,
//     openTracking: true,
//     clickTracking: true,
//     multiChannel: true,
//     maxBatchSize: 0
//   },
//   linkedin: {
//     connectionRequests: true,
//     messaging: true,
//     profileVisits: true,
//     voiceMessages: true,
//     multiChannel: true,
//     maxDailyConnections: 100,
//     maxDailyMessages: 100
//   }
// }

// Adjust logic based on capabilities
if (capabilities.email.batchSending && emails.length > 100) {
  await emailProvider.sendBatch(emails);
} else {
  for (const email of emails) {
    await emailProvider.send(email);
  }
}
```

---

## Provider Comparison Matrix

| Feature | Lemlist Email | Postmark | Lemlist LinkedIn | Phantombuster |
|---------|---------------|----------|------------------|---------------|
| **Status** | ACTIVE | INACTIVE | ACTIVE | INACTIVE |
| **Type** | Multi-channel | Email-only | Multi-channel | LinkedIn-only |
| **Batch Sending** | ❌ No | ✅ Yes (500) | N/A | N/A |
| **Template Support** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **Open Tracking** | ✅ Yes | ✅ Yes | N/A | N/A |
| **Click Tracking** | ✅ Yes | ✅ Yes | N/A | N/A |
| **Multi-Channel** | ✅ Yes | ❌ No | ✅ Yes | ❌ No |
| **Connection Requests** | N/A | N/A | ✅ Yes | ✅ Yes |
| **LinkedIn Messages** | N/A | N/A | ✅ Yes | ✅ Yes |
| **Profile Visits** | N/A | N/A | ✅ Yes | ✅ Yes |
| **Voice Messages** | N/A | N/A | ✅ Yes | ❌ No |
| **Daily Email Limit** | Provider managed | 50k+ | N/A | N/A |
| **Daily LinkedIn Limit** | N/A | N/A | 100 | 20 (conservative) |
| **Cost/Month** | $149 | $15 (50k) | $149 (included) | $69 |
| **Ideal For** | Unified sequences | High volume | Native multi-channel | Full control |

---

## Migration Strategy

### **Phase 1: Build Abstraction Layer (Week 3)**
- Create EmailProvider and LinkedInProvider interfaces
- Implement provider factory
- Add configuration management
- **Status:** Foundation ready

### **Phase 2: Implement Lemlist (PRIMARY - Week 5)**
- LemlistEmailProvider
- LemlistLinkedInProvider
- Multi-channel orchestration
- **Status:** ACTIVE by default, production-ready

### **Phase 3: Implement Postmark (SECONDARY - Week 6A)**
- PostmarkEmailProvider
- Email-only functionality
- Webhook integration
- **Status:** INACTIVE, ready to activate

### **Phase 4: Implement Phantombuster (SECONDARY - Week 6B)**
- PhantombusterLinkedInProvider
- LinkedIn-only functionality
- Rate limit management
- **Status:** INACTIVE, ready to activate

### **Phase 5: Testing & Validation (Week 7)**
- Test all providers in isolation
- Test provider switching
- Validate feature parity
- Performance benchmarking

### **Phase 6: Production Deployment (Week 8)**
- Deploy with Lemlist active (default)
- Postmark and Phantombuster ready but inactive
- Configuration documentation
- Team training on provider switching

---

## Cost-Benefit Analysis

### **Scenario 1: Start with Lemlist (Current Plan)**
**Monthly Cost:** $729
**Benefits:**
- ✅ Multi-channel sequences out of the box
- ✅ Single provider to manage
- ✅ Fastest time to market
- ✅ Proven platform

**When to Switch:**
- High volume (>5000 emails/month) → Switch to Postmark ($80/month savings)
- LinkedIn rate limits too restrictive → Switch to Phantombuster
- Want full ownership → Switch both

### **Scenario 2: Switch to Postmark + Phantombuster**
**Monthly Cost:** $664 ($65/month savings, $780/year)
**Benefits:**
- ✅ Lower cost at scale
- ✅ Full control over automation
- ✅ Better API for programmatic control
- ✅ No platform dependency

**Trade-offs:**
- ❌ No native multi-channel (need custom orchestration)
- ❌ More complex setup
- ❌ Two providers to manage

### **Scenario 3: Hybrid (Postmark Email + Lemlist LinkedIn)**
**Monthly Cost:** $654 ($75/month savings)
**Benefits:**
- ✅ Cost savings on email
- ✅ Keep Lemlist's LinkedIn capabilities
- ✅ Balanced approach

**Ideal For:**
- High email volume, moderate LinkedIn usage
- Want cost savings without losing multi-channel partially

---

## Decision Framework

### **When to Use Lemlist**
✅ Multi-channel sequences critical
✅ Speed to market important
✅ Team prefers single platform
✅ <5000 emails/month
✅ LinkedIn + email equally important

### **When to Switch to Postmark**
✅ Email volume >5000/month
✅ Cost optimization priority
✅ Want full ownership of email automation
✅ Email-first strategy

### **When to Switch to Phantombuster**
✅ Need higher LinkedIn daily limits
✅ Want full control over LinkedIn automation
✅ Lemlist LinkedIn too restrictive
✅ LinkedIn-heavy strategy

---

## Monitoring & Alerts

### **Provider Health Monitoring**

```javascript
// Monitor provider health and switch if needed
class ProviderHealthMonitor {
  async checkHealth() {
    const emailProvider = factory.createEmailProvider();
    const linkedinProvider = factory.createLinkedInProvider();

    const health = {
      email: await this.checkEmailProviderHealth(emailProvider),
      linkedin: await this.checkLinkedInProviderHealth(linkedinProvider)
    };

    if (!health.email.healthy || !health.linkedin.healthy) {
      await this.alertTeam(health);
    }

    return health;
  }

  async checkEmailProviderHealth(provider) {
    try {
      // Test send
      await provider.send({
        to: 'test@blackhole.postmarkapp.com', // Test address
        subject: 'Health check',
        body: 'Testing provider health'
      });

      return {
        healthy: true,
        provider: provider.constructor.name,
        lastChecked: new Date()
      };
    } catch (error) {
      return {
        healthy: false,
        provider: provider.constructor.name,
        error: error.message,
        lastChecked: new Date()
      };
    }
  }
}
```

---

## Next Steps

1. ✅ Review and approve multi-provider architecture
2. ⏳ Implement provider abstraction layer (Phase 7C)
3. ⏳ Build Lemlist integration (Phase 7D) - ACTIVE
4. ⏳ Build Postmark integration (Phase 7E) - INACTIVE
5. ⏳ Build Phantombuster integration (Phase 7F) - INACTIVE
6. ⏳ Test provider switching mechanism
7. ⏳ Document switching process for team
8. ⏳ Deploy with Lemlist active, others ready

---

**Made with ❤️ for the RTGS Team**
