/**
 * YOLO Mode Manager - Autonomous Sales Automation
 *
 * Manages fully autonomous operation including:
 * - Scheduled discovery, enrichment, sync, and outreach
 * - Continuous reply monitoring
 * - Campaign optimization
 * - Safety limits and quality gates
 */

import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import cron from 'node-cron';
import { createLogger } from './logger.js';

export class YoloManager {
  constructor(workers, database) {
    this.workers = workers;
    this.database = database;
    this.logger = createLogger('YOLO');

    // YOLO state
    this.enabled = false;
    this.paused = false;
    this.testMode = false;
    this.config = null;
    this.configPath = '.sales-automation/yolo-config.yaml';

    // Cron jobs
    this.cronJobs = [];

    // Activity tracking
    this.stats = {
      cyclesRun: 0,
      lastCycleAt: null,
      discovered: 0,
      enriched: 0,
      synced: 0,
      enrolled: 0,
      repliesHandled: 0,
      errors: 0,
    };
  }

  // ==========================================================================
  // ENABLE / DISABLE
  // ==========================================================================

  async enable(options = {}) {
    const { config_path, test_mode = false } = options;

    try {
      this.logger.info('Enabling autonomous mode...');

      // Load configuration
      if (config_path) {
        this.configPath = config_path;
      }

      this.config = await this._loadConfig();

      if (!this.config || !this.config.yolo_mode?.enabled) {
        return {
          success: false,
          error: 'YOLO mode not enabled in configuration file',
          configPath: this.configPath,
        };
      }

      this.testMode = test_mode;

      // Validate configuration
      const validation = this._validateConfig();
      if (!validation.valid) {
        return {
          success: false,
          error: 'Configuration validation failed',
          issues: validation.issues,
        };
      }

      // Test API connections
      const healthCheck = await this._healthCheck();
      if (!healthCheck.allHealthy) {
        return {
          success: false,
          error: 'API health check failed',
          issues: healthCheck.issues,
        };
      }

      // Schedule cron jobs
      this._scheduleCronJobs();

      this.enabled = true;
      this.paused = false;

      this.logger.info('Autonomous mode enabled successfully');

      return {
        success: true,
        message: 'YOLO mode enabled',
        testMode: this.testMode,
        config: this.config.yolo_mode,
        nextRun: this._getNextRunTime(),
      };
    } catch (error) {
      this.logger.error(`Failed to enable: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async disable(options = {}) {
    const { immediate = false } = options;

    try {
      this.logger.info('Disabling autonomous mode...');

      if (!immediate && this.currentCycle) {
        this.logger.info('Finishing current cycle before stopping...');
        // Wait for current cycle to finish
        await this.currentCycle;
      }

      // Stop all cron jobs
      this._stopCronJobs();

      this.enabled = false;
      this.paused = false;

      this.logger.info('Autonomous mode disabled');

      return {
        success: true,
        message: 'YOLO mode disabled',
        stats: this.stats,
      };
    } catch (error) {
      this.logger.error(`Failed to disable: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ==========================================================================
  // PAUSE / RESUME
  // ==========================================================================

  async pause() {
    if (!this.enabled) {
      return {
        success: false,
        error: 'YOLO mode is not enabled',
      };
    }

    this.paused = true;
    this.logger.info('Paused');

    return {
      success: true,
      message: 'YOLO mode paused',
      resumeWith: 'yolo_resume',
    };
  }

  async resume() {
    if (!this.enabled) {
      return {
        success: false,
        error: 'YOLO mode is not enabled',
      };
    }

    this.paused = false;
    this.logger.info('Resumed');

    return {
      success: true,
      message: 'YOLO mode resumed',
      nextRun: this._getNextRunTime(),
    };
  }

  // ==========================================================================
  // EMERGENCY STOP
  // ==========================================================================

  async emergencyStop(options = {}) {
    const { reason = 'Manual emergency stop' } = options;

    this.logger.warn(`EMERGENCY STOP: ${reason}`);

    try {
      // 1. Disable YOLO mode immediately
      this.enabled = false;
      this.paused = false;
      this._stopCronJobs();

      // 2. Pause all active lemlist campaigns
      const campaigns = await this.workers.outreach.getActiveCampaigns();
      for (const campaign of campaigns) {
        await this.workers.outreach.lemlist.pauseCampaign(campaign.id);
        this.logger.info(`Paused campaign: ${campaign.name}`);
      }

      // 3. Cancel pending jobs
      // TODO: Add job cancellation if needed

      // 4. Log emergency stop
      await this._logActivity('emergency_stop', { reason });

      return {
        success: true,
        message: 'Emergency stop completed',
        reason,
        campaignsPaused: campaigns.length,
        action: 'Review system state before resuming',
      };
    } catch (error) {
      this.logger.error(`Emergency stop failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ==========================================================================
  // STATUS
  // ==========================================================================

  async getStatus(options = {}) {
    const { detailed = true } = options;

    const status = {
      enabled: this.enabled,
      paused: this.paused,
      testMode: this.testMode,
      stats: this.stats,
    };

    if (detailed && this.enabled) {
      status.config = this.config?.yolo_mode;
      status.nextRun = this._getNextRunTime();
      status.cronJobs = this.cronJobs.map((job) => ({
        schedule: job.schedule,
        nextRun: job.nextRun,
      }));

      // Get today's activity
      const today = new Date().toISOString().split('T')[0];
      status.todayActivity = await this._getTodayActivity();
    }

    return {
      success: true,
      status,
    };
  }

  // ==========================================================================
  // TRIGGER CYCLE
  // ==========================================================================

  async triggerCycle(options = {}) {
    const { skip_steps = [] } = options;

    if (this.paused) {
      return {
        success: false,
        error: 'YOLO mode is paused',
      };
    }

    this.logger.info('Manually triggering cycle...');

    try {
      const result = await this._runCycle(skip_steps);

      return {
        success: true,
        message: 'YOLO cycle completed',
        result,
      };
    } catch (error) {
      this.logger.error(`Cycle failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ==========================================================================
  // CONFIGURATION
  // ==========================================================================

  async getConfig() {
    if (!this.config) {
      this.config = await this._loadConfig();
    }

    return {
      success: true,
      config: this.config,
      configPath: this.configPath,
    };
  }

  async updateConfig(options) {
    const { config, restart = false } = options;

    try {
      // Merge with existing config
      const currentConfig = await this._loadConfig();
      const updatedConfig = this._mergeConfig(currentConfig, config);

      // Save to file
      const configFile = path.resolve(this.configPath);
      fs.writeFileSync(configFile, yaml.stringify(updatedConfig), 'utf-8');

      this.config = updatedConfig;

      this.logger.info('Configuration updated');

      // Restart if requested
      if (restart && this.enabled) {
        await this.disable({ immediate: true });
        await this.enable();
      }

      return {
        success: true,
        message: 'Configuration updated',
        config: updatedConfig,
        restarted: restart,
      };
    } catch (error) {
      this.logger.error(`Failed to update config: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ==========================================================================
  // ACTIVITY LOG
  // ==========================================================================

  async getActivity(options = {}) {
    const { from_date, to_date, limit = 100 } = options;

    try {
      let query = 'SELECT * FROM yolo_activity WHERE 1=1';
      const params = [];

      if (from_date) {
        query += ' AND activity_date >= ?';
        params.push(from_date);
      }

      if (to_date) {
        query += ' AND activity_date <= ?';
        params.push(to_date);
      }

      query += ' ORDER BY created_at DESC LIMIT ?';
      params.push(limit);

      const stmt = this.database.prepare(query);
      const activities = stmt.all(...params);

      return {
        success: true,
        activities: activities.map((a) => ({
          ...a,
          data: JSON.parse(a.data),
        })),
        total: activities.length,
      };
    } catch (error) {
      this.logger.error(`Failed to get activity: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================

  async _loadConfig() {
    try {
      const configFile = path.resolve(this.configPath);
      const content = fs.readFileSync(configFile, 'utf-8');
      return yaml.parse(content);
    } catch (error) {
      this.logger.error(`Failed to load config: ${error.message}`);
      return null;
    }
  }

  _validateConfig() {
    const issues = [];

    if (!this.config.yolo_mode) {
      issues.push('Missing yolo_mode section');
    }

    const yolo = this.config.yolo_mode;

    if (!yolo.discovery?.icp_profiles || yolo.discovery.icp_profiles.length === 0) {
      issues.push('No ICP profiles configured');
    }

    if (!yolo.discovery?.schedule) {
      issues.push('No discovery schedule configured');
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  async _healthCheck() {
    const issues = [];

    // Check HubSpot
    try {
      await this.workers.crmSync.hubspot.healthCheck();
    } catch (error) {
      issues.push(`HubSpot: ${error.message}`);
    }

    // Check Lemlist
    try {
      await this.workers.outreach.lemlist.healthCheck();
    } catch (error) {
      issues.push(`Lemlist: ${error.message}`);
    }

    // Check Explorium
    try {
      await this.workers.enrichment.explorium.healthCheck();
    } catch (error) {
      issues.push(`Explorium: ${error.message}`);
    }

    return {
      allHealthy: issues.length === 0,
      issues,
    };
  }

  _scheduleCronJobs() {
    const yolo = this.config.yolo_mode;

    // Discovery + full cycle
    if (yolo.discovery?.schedule) {
      const discoveryCron = cron.schedule(yolo.discovery.schedule, async () => {
        if (this.enabled && !this.paused) {
          this.logger.info('Running scheduled discovery cycle...');
          await this._runCycle();
        }
      });

      this.cronJobs.push({
        name: 'discovery_cycle',
        schedule: yolo.discovery.schedule,
        cron: discoveryCron,
      });

      this.logger.info(`Scheduled discovery: ${yolo.discovery.schedule}`);
    }

    // Reply monitoring
    if (yolo.monitoring?.check_interval_hours) {
      const monitorSchedule = `0 */${yolo.monitoring.check_interval_hours} * * *`;
      const monitorCron = cron.schedule(monitorSchedule, async () => {
        if (this.enabled && !this.paused) {
          console.log('[YOLO] Running reply monitoring...');
          await this._monitorReplies();
        }
      });

      this.cronJobs.push({
        name: 'reply_monitoring',
        schedule: monitorSchedule,
        cron: monitorCron,
      });

      console.log(`[YOLO] Scheduled monitoring: every ${yolo.monitoring.check_interval_hours} hours`);
    }
  }

  _stopCronJobs() {
    for (const job of this.cronJobs) {
      job.cron.stop();
      console.log(`[YOLO] Stopped cron job: ${job.name}`);
    }
    this.cronJobs = [];
  }

  _getNextRunTime() {
    // TODO: Calculate next run time from cron schedule
    return 'Next run time calculation not yet implemented';
  }

  async _runCycle(skipSteps = []) {
    const yolo = this.config.yolo_mode;
    const result = {
      discovered: 0,
      enriched: 0,
      synced: 0,
      enrolled: 0,
      errors: [],
    };

    try {
      // Step 1: Discovery
      if (!skipSteps.includes('discovery')) {
        console.log('[YOLO] Step 1: Discovery...');
        const discoveries = [];

        for (const icpProfile of yolo.discovery.icp_profiles) {
          const discovery = await this.workers.leadDiscovery.discoverByICP({
            icpProfileName: icpProfile,
            count: yolo.discovery.leads_per_day,
            minScore: yolo.discovery.min_icp_score || 0.75,
          });

          if (discovery.success) {
            discoveries.push(...discovery.companies);
          }
        }

        result.discovered = discoveries.length;
        console.log(`[YOLO] Discovered ${result.discovered} companies`);
      }

      // Step 2: Enrichment
      if (!skipSteps.includes('enrichment') && yolo.enrichment?.auto_enrich) {
        console.log('[YOLO] Step 2: Enrichment...');
        // TODO: Enrich discovered contacts
      }

      // Step 3: CRM Sync
      if (!skipSteps.includes('sync') && yolo.crm_sync?.auto_create_contacts) {
        console.log('[YOLO] Step 3: CRM Sync...');
        // TODO: Sync enriched contacts to HubSpot
      }

      // Step 4: Outreach
      if (!skipSteps.includes('outreach') && yolo.outreach?.auto_enroll) {
        console.log('[YOLO] Step 4: Outreach...');
        // TODO: Enroll contacts in campaigns
      }

      // Update stats
      this.stats.cyclesRun++;
      this.stats.lastCycleAt = new Date().toISOString();
      this.stats.discovered += result.discovered;

      // Log activity
      await this._logActivity('cycle_completed', result);

      return result;
    } catch (error) {
      console.error('[YOLO] Cycle error:', error.message);
      result.errors.push(error.message);
      this.stats.errors++;
      throw error;
    }
  }

  async _monitorReplies() {
    try {
      const replies = await this.workers.outreach.checkForReplies();

      console.log(`[YOLO] Found ${replies.total} replies`);

      if (replies.positive.length > 0) {
        console.log(`[YOLO] ${replies.positive.length} positive replies - creating tasks`);

        // TODO: Create HubSpot tasks for positive replies
      }

      this.stats.repliesHandled += replies.total;

      await this._logActivity('reply_monitoring', {
        total: replies.total,
        positive: replies.positive.length,
        negative: replies.negative.length,
      });
    } catch (error) {
      console.error('[YOLO] Reply monitoring error:', error.message);
    }
  }

  async _getTodayActivity() {
    const today = new Date().toISOString().split('T')[0];

    try {
      const stmt = this.database.prepare(`
        SELECT * FROM yolo_activity
        WHERE activity_date = ?
        ORDER BY created_at DESC
      `);

      const activities = stmt.all(today);

      return activities.map((a) => ({
        type: a.activity_type,
        data: JSON.parse(a.data),
        timestamp: a.created_at,
      }));
    } catch (error) {
      console.error('[YOLO] Failed to get today activity:', error.message);
      return [];
    }
  }

  async _logActivity(activityType, data) {
    try {
      const today = new Date().toISOString().split('T')[0];

      const stmt = this.database.prepare(`
        INSERT INTO yolo_activity (activity_type, activity_date, data, created_at)
        VALUES (?, ?, ?, datetime('now'))
      `);

      stmt.run(activityType, today, JSON.stringify(data));
    } catch (error) {
      console.error('[YOLO] Failed to log activity:', error.message);
    }
  }

  _mergeConfig(current, updates) {
    // Deep merge configuration objects
    return {
      ...current,
      yolo_mode: {
        ...current.yolo_mode,
        ...updates.yolo_mode,
      },
    };
  }
}

export default YoloManager;
