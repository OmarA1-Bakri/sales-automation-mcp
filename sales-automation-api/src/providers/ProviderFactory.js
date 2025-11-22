/**
 * Provider Factory
 * Creates provider instances based on environment configuration
 *
 * This factory implements the Factory Pattern to provide a single point
 * of instantiation for all provider types (Email, LinkedIn, Video).
 * Providers can be switched via environment variables without code changes.
 */

import { createLogger } from '../utils/logger.js';

const logger = createLogger('ProviderFactory');

export class ProviderFactory {
  constructor() {
    this.emailProviders = new Map();
    this.linkedInProviders = new Map();
    this.videoProviders = new Map();

    // Instance cache to prevent creating multiple instances
    this.cachedInstances = {
      email: null,
      linkedin: null,
      video: null
    };

    // Register providers as they become available
    this.registerProviders();
  }

  /**
   * Register all available providers
   * Providers are lazy-loaded only when needed
   */
  registerProviders() {
    // Email Providers
    this.emailProviders.set('lemlist', async () => {
      try {
        const { LemlistEmailProvider } = await import('./lemlist/LemlistEmailProvider.js');
        return new LemlistEmailProvider();
      } catch (error) {
        throw new Error(
          `Lemlist email provider not yet implemented. ` +
          `This will be available in Phase 7D. Error: ${error.message}`
        );
      }
    });

    this.emailProviders.set('postmark', async () => {
      try {
        const { PostmarkEmailProvider } = await import('./postmark/PostmarkEmailProvider.js');
        return new PostmarkEmailProvider();
      } catch (error) {
        throw new Error(
          `Postmark email provider not yet implemented. ` +
          `This will be available in Phase 7E. Error: ${error.message}`
        );
      }
    });

    // LinkedIn Providers
    this.linkedInProviders.set('lemlist', async () => {
      try {
        const { LemlistLinkedInProvider } = await import('./lemlist/LemlistLinkedInProvider.js');
        return new LemlistLinkedInProvider();
      } catch (error) {
        throw new Error(
          `Lemlist LinkedIn provider not yet implemented. ` +
          `This will be available in Phase 7D. Error: ${error.message}`
        );
      }
    });

    this.linkedInProviders.set('phantombuster', async () => {
      try {
        const { PhantombusterLinkedInProvider } = await import('./phantombuster/PhantombusterLinkedInProvider.js');
        return new PhantombusterLinkedInProvider();
      } catch (error) {
        throw new Error(
          `Phantombuster LinkedIn provider not yet implemented. ` +
          `This will be available in Phase 7E. Error: ${error.message}`
        );
      }
    });

    // Video Providers
    this.videoProviders.set('heygen', async () => {
      try {
        const { HeyGenVideoProvider } = await import('./heygen/HeyGenVideoProvider.js');
        return new HeyGenVideoProvider();
      } catch (error) {
        throw new Error(
          `HeyGen video provider not yet implemented. ` +
          `This will be available in Phase 7F. Error: ${error.message}`
        );
      }
    });
  }

  /**
   * Create email provider based on EMAIL_PROVIDER environment variable
   *
   * @returns {Promise<EmailProvider>} Configured email provider instance
   * @throws {Error} If provider not configured or not found
   */
  async createEmailProvider() {
    // Check cache first
    if (this.cachedInstances.email) {
      logger.debug('Returning cached email provider instance');
      return this.cachedInstances.email;
    }

    const providerName = process.env.EMAIL_PROVIDER || 'lemlist';

    logger.info('Creating email provider', { provider: providerName });

    const providerFactory = this.emailProviders.get(providerName.toLowerCase());

    if (!providerFactory) {
      const available = Array.from(this.emailProviders.keys()).join(', ');
      throw new Error(
        `Email provider "${providerName}" not found. Available providers: ${available}`
      );
    }

    try {
      const provider = await providerFactory();

      // Validate configuration
      await provider.validateConfig();

      // Cache the instance
      this.cachedInstances.email = provider;

      logger.info('Email provider created and cached', {
        provider: providerName,
        capabilities: provider.getCapabilities()
      });

      return provider;
    } catch (error) {
      logger.error('Failed to create email provider', {
        provider: providerName,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Create LinkedIn provider based on LINKEDIN_PROVIDER environment variable
   *
   * @returns {Promise<LinkedInProvider>} Configured LinkedIn provider instance
   * @throws {Error} If provider not configured or not found
   */
  async createLinkedInProvider() {
    // Check cache first
    if (this.cachedInstances.linkedin) {
      logger.debug('Returning cached LinkedIn provider instance');
      return this.cachedInstances.linkedin;
    }

    const providerName = process.env.LINKEDIN_PROVIDER || 'lemlist';

    logger.info('Creating LinkedIn provider', { provider: providerName });

    const providerFactory = this.linkedInProviders.get(providerName.toLowerCase());

    if (!providerFactory) {
      const available = Array.from(this.linkedInProviders.keys()).join(', ');
      throw new Error(
        `LinkedIn provider "${providerName}" not found. Available providers: ${available}`
      );
    }

    try {
      const provider = await providerFactory();

      // Validate configuration
      await provider.validateConfig();

      // Cache the instance
      this.cachedInstances.linkedin = provider;

      logger.info('LinkedIn provider created and cached', {
        provider: providerName,
        capabilities: provider.getCapabilities()
      });

      return provider;
    } catch (error) {
      logger.error('Failed to create LinkedIn provider', {
        provider: providerName,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Create video provider based on VIDEO_PROVIDER environment variable
   *
   * @returns {Promise<VideoProvider>} Configured video provider instance
   * @throws {Error} If provider not configured or not found
   */
  async createVideoProvider() {
    // Check cache first
    if (this.cachedInstances.video) {
      logger.debug('Returning cached video provider instance');
      return this.cachedInstances.video;
    }

    const providerName = process.env.VIDEO_PROVIDER || 'heygen';

    logger.info('Creating video provider', { provider: providerName });

    const providerFactory = this.videoProviders.get(providerName.toLowerCase());

    if (!providerFactory) {
      const available = Array.from(this.videoProviders.keys()).join(', ');
      throw new Error(
        `Video provider "${providerName}" not found. Available providers: ${available}`
      );
    }

    try {
      const provider = await providerFactory();

      // Validate configuration
      await provider.validateConfig();

      // Cache the instance
      this.cachedInstances.video = provider;

      logger.info('Video provider created and cached', {
        provider: providerName,
        capabilities: provider.getCapabilities()
      });

      return provider;
    } catch (error) {
      logger.error('Failed to create video provider', {
        provider: providerName,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Create all providers for a campaign
   * Used when campaign needs multi-channel capabilities
   *
   * @returns {Promise<Object>} Object with all provider instances
   * @returns {EmailProvider} providers.email
   * @returns {LinkedInProvider} providers.linkedin
   * @returns {VideoProvider} providers.video
   */
  async createAllProviders() {
    logger.info('Creating all providers for multi-channel campaign');

    const [email, linkedin, video] = await Promise.all([
      this.createEmailProvider(),
      this.createLinkedInProvider(),
      this.createVideoProvider()
    ]);

    return { email, linkedin, video };
  }

  /**
   * Get provider configuration summary
   * Shows which providers are currently configured
   *
   * @returns {Object} Configuration summary
   */
  getProviderConfig() {
    return {
      email: {
        active: process.env.EMAIL_PROVIDER || 'lemlist',
        available: Array.from(this.emailProviders.keys())
      },
      linkedin: {
        active: process.env.LINKEDIN_PROVIDER || 'lemlist',
        available: Array.from(this.linkedInProviders.keys())
      },
      video: {
        active: process.env.VIDEO_PROVIDER || 'heygen',
        available: Array.from(this.videoProviders.keys())
      }
    };
  }

  /**
   * Validate all provider configurations
   * Checks if all active providers are properly configured
   *
   * @returns {Promise<Object>} Validation results
   * @returns {boolean} result.valid - True if all providers valid
   * @returns {Array<string>} result.errors - Error messages if any
   */
  async validateAllProviders() {
    const errors = [];

    try {
      await this.createEmailProvider();
    } catch (error) {
      errors.push(`Email provider error: ${error.message}`);
    }

    try {
      await this.createLinkedInProvider();
    } catch (error) {
      errors.push(`LinkedIn provider error: ${error.message}`);
    }

    try {
      await this.createVideoProvider();
    } catch (error) {
      errors.push(`Video provider error: ${error.message}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Clear provider instance cache
   * Useful for testing or when configuration changes
   */
  clearCache() {
    logger.info('Clearing provider instance cache');
    this.cachedInstances = {
      email: null,
      linkedin: null,
      video: null
    };
  }

  /**
   * Reload providers with new configuration
   * Clears cache and reloads provider config
   */
  async reload() {
    logger.info('Reloading provider factory');
    this.clearCache();

    // Reload provider config if it has a reload method
    const providerConfig = await import('../config/provider-config.js');
    if (providerConfig.providerConfig?.reload) {
      providerConfig.providerConfig.reload();
    }
  }
}

// Export singleton instance
export const providerFactory = new ProviderFactory();

export default providerFactory;
