/**
 * Job Queue Manager
 * Handles background job submission, queuing, and status tracking
 */

import { randomUUID } from 'crypto';
import { Database } from './database.js';

export class JobQueue {
  constructor(db = null) {
    this.db = db;
  }

  async initialize() {
    if (!this.db) {
      this.db = new Database();
      await this.db.initialize();
    }
  }

  /**
   * Enqueue a new job
   */
  async enqueue(type, parameters, priority = 'normal') {
    const id = `${type}_${randomUUID().split('-')[0]}`;

    const job = this.db.createJob(id, type, parameters, priority);

    console.log(`Job enqueued: ${id} (type: ${type}, priority: ${priority})`);

    return job;
  }

  /**
   * Dequeue next pending job
   */
  async dequeue() {
    const job = this.db.getNextPendingJob();

    if (job) {
      console.log(`Job dequeued: ${job.id} (type: ${job.type})`);
    }

    return job;
  }

  /**
   * Get job status
   */
  async getStatus(jobId) {
    const job = this.db.getJob(jobId);

    if (!job) {
      return {
        error: 'Job not found',
        job_id: jobId,
      };
    }

    const response = {
      job_id: job.id,
      type: job.type,
      status: job.status,
      priority: job.priority,
      progress: job.progress || 0,
      created_at: new Date(job.created_at).toISOString(),
    };

    if (job.started_at) {
      response.started_at = new Date(job.started_at).toISOString();
    }

    if (job.completed_at) {
      response.completed_at = new Date(job.completed_at).toISOString();
      const duration = job.completed_at - job.started_at;
      response.duration_seconds = Math.round(duration / 1000);
    }

    if (job.status === 'processing') {
      const elapsed = Date.now() - job.started_at;
      const estimated = job.progress > 0 ? elapsed / job.progress : elapsed;
      const remaining = estimated - elapsed;
      response.eta_seconds = Math.round(remaining / 1000);
    }

    if (job.result) {
      response.result = job.result;
    }

    if (job.error) {
      response.error = job.error;
    }

    return response;
  }

  /**
   * Update job status
   */
  async updateStatus(jobId, status, result = null, error = null) {
    this.db.updateJobStatus(jobId, status, result, error);
    console.log(`Job ${jobId} status updated: ${status}`);
  }

  /**
   * Update job progress (0.0 to 1.0)
   */
  async updateProgress(jobId, progress) {
    this.db.updateJobProgress(jobId, progress);
  }

  /**
   * List jobs with optional filters
   */
  async list(filters = {}) {
    const jobs = this.db.listJobs(filters);

    return jobs.map(job => ({
      job_id: job.id,
      type: job.type,
      status: job.status,
      priority: job.priority,
      progress: job.progress || 0,
      created_at: new Date(job.created_at).toISOString(),
      started_at: job.started_at ? new Date(job.started_at).toISOString() : null,
      completed_at: job.completed_at ? new Date(job.completed_at).toISOString() : null,
    }));
  }

  /**
   * Cancel a pending job
   */
  async cancel(jobId) {
    const cancelled = this.db.cancelJob(jobId);

    if (cancelled) {
      console.log(`Job cancelled: ${jobId}`);
      return { success: true, message: 'Job cancelled' };
    } else {
      return { success: false, message: 'Job cannot be cancelled (not pending or not found)' };
    }
  }

  /**
   * Get queue statistics
   */
  async getStats() {
    const all = this.db.listJobs({ limit: 1000 });

    const stats = {
      total: all.length,
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
    };

    all.forEach(job => {
      stats[job.status]++;
    });

    return stats;
  }

  /**
   * Cleanup old jobs
   */
  async cleanup(daysToKeep = 90) {
    return this.db.cleanup(daysToKeep);
  }
}
