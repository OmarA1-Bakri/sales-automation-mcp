/**
 * Provider Configuration
 * Centralized configuration for all provider integrations
 *
 * This module manages provider API keys, secrets, and settings.
 * Configurations can be overridden via environment variables.
 */

import { createLogger } from '../utils/logger.js';

const logger = createLogger('ProviderConfig');

export class ProviderConfig {
  constructor() {
    this.config = this.loadConfig();
    this.validateConfig();
  }

  /**
   * Load configuration from environment variables
   */
  loadConfig() {
    return {
      // Email Providers
      lemlist: {
        apiKey: process.env.LEMLIST_API_KEY,
        webhookSecret: process.env.LEMLIST_WEBHOOK_SECRET,
        apiUrl: process.env.LEMLIST_API_URL || 'https://api.lemlist.com/api',
        enabled: process.env.EMAIL_PROVIDER === 'lemlist' || process.env.LINKEDIN_PROVIDER === 'lemlist'
      },

      postmark: {
        serverToken: process.env.POSTMARK_SERVER_TOKEN,
        webhookSecret: process.env.POSTMARK_WEBHOOK_SECRET,
        apiUrl: process.env.POSTMARK_API_URL || 'https://api.postmarkapp.com',
        senderEmail: process.env.POSTMARK_SENDER_EMAIL,
        enabled: process.env.EMAIL_PROVIDER === 'postmark'
      },

      // LinkedIn Providers
      phantombuster: {
        apiKey: process.env.PHANTOMBUSTER_API_KEY,
        webhookSecret: process.env.PHANTOMBUSTER_WEBHOOK_SECRET,
        apiUrl: process.env.PHANTOMBUSTER_API_URL || 'https://api.phantombuster.com/api/v2',
        enabled: process.env.LINKEDIN_PROVIDER === 'phantombuster'
      },

      // Video Providers
      heygen: {
        apiKey: process.env.HEYGEN_API_KEY,
        webhookSecret: process.env.HEYGEN_WEBHOOK_SECRET,
        apiUrl: process.env.HEYGEN_API_URL || 'https://api.heygen.com',
        enabled: process.env.VIDEO_PROVIDER === 'heygen' || process.env.VIDEO_PROVIDER === undefined
      },

      // Provider Selection
      active: {
        email: process.env.EMAIL_PROVIDER || 'lemlist',
        linkedin: process.env.LINKEDIN_PROVIDER || 'lemlist',
        video: process.env.VIDEO_PROVIDER || 'heygen'
      }
    };
  }

  /**
   * Validate configuration
   * Ensures required secrets are present for active providers
   */
  validateConfig() {
    const errors = [];

    // Validate email provider
    const emailProvider = this.config.active.email;
    if (this.config[emailProvider]?.enabled) {
      if (!this.getProviderApiKey(emailProvider)) {
        errors.push(`${emailProvider} email provider is active but API key not configured`);
      }
    }

    // Validate LinkedIn provider
    const linkedinProvider = this.config.active.linkedin;
    if (this.config[linkedinProvider]?.enabled) {
      if (!this.getProviderApiKey(linkedinProvider)) {
        errors.push(`${linkedinProvider} LinkedIn provider is active but API key not configured`);
      }
    }

    // Validate video provider
    const videoProvider = this.config.active.video;
    if (this.config[videoProvider]?.enabled) {
      if (!this.getProviderApiKey(videoProvider)) {
        errors.push(`${videoProvider} video provider is active but API key not configured`);
      }
    }

    if (errors.length > 0) {
      logger.warn('Provider configuration warnings:', { errors });
      // Don't throw - allow app to start but log warnings
      // Some providers may be intentionally disabled
    }
  }

  /**
   * Get API key for a provider
   */
  getProviderApiKey(provider) {
    const config = this.config[provider];
    return config?.apiKey || config?.serverToken;
  }

  /**
   * Get webhook secret for a provider
   */
  getProviderWebhookSecret(provider) {
    return this.config[provider]?.webhookSecret;
  }

  /**
   * Get API URL for a provider
   */
  getProviderApiUrl(provider) {
    return this.config[provider]?.apiUrl;
  }

  /**
   * Check if provider is enabled
   */
  isProviderEnabled(provider) {
    return this.config[provider]?.enabled || false;
  }

  /**
   * Get active provider for a channel type
   */
  getActiveProvider(channelType) {
    return this.config.active[channelType];
  }

  /**
   * Get full configuration for a provider
   */
  getProviderConfig(provider) {
    return this.config[provider] || null;
  }

  /**
   * Get configuration summary (without secrets)
   */
  getConfigSummary() {
    return {
      active: this.config.active,
      providers: {
        lemlist: {
          enabled: this.config.lemlist.enabled,
          hasApiKey: !!this.config.lemlist.apiKey,
          hasWebhookSecret: !!this.config.lemlist.webhookSecret
        },
        postmark: {
          enabled: this.config.postmark.enabled,
          hasApiKey: !!this.config.postmark.serverToken,
          hasWebhookSecret: !!this.config.postmark.webhookSecret,
          senderEmail: this.config.postmark.senderEmail
        },
        phantombuster: {
          enabled: this.config.phantombuster.enabled,
          hasApiKey: !!this.config.phantombuster.apiKey,
          hasWebhookSecret: !!this.config.phantombuster.webhookSecret
        },
        heygen: {
          enabled: this.config.heygen.enabled,
          hasApiKey: !!this.config.heygen.apiKey,
          hasWebhookSecret: !!this.config.heygen.webhookSecret
        }
      }
    };
  }

  /**
   * Reload configuration from environment
   * Useful after environment variables change
   */
  reload() {
    logger.info('Reloading provider configuration');
    this.config = this.loadConfig();
    this.validateConfig();
  }
}

// Export singleton instance
export const providerConfig = new ProviderConfig();

export default providerConfig;
