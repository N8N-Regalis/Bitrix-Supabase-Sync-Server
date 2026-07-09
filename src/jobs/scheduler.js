const cron = require('node-cron');
const dealService = require('../services/dealService');
const logger = require('../utils/logger');

/**
 * Scheduler
 * Manages automated synchronization tasks using node-cron
 */
class Scheduler {
  constructor() {
    this.tasks = new Map();
    this.isSchedulerEnabled = process.env.ENABLE_SCHEDULER !== 'false';
    this.syncSchedule = process.env.SYNC_SCHEDULE || '*/15 * * * *'; // Default: every 15 minutes
  }
  
  /**
   * Start the scheduler
   */
  start() {
    if (!this.isSchedulerEnabled) {
      logger.info('Scheduler is disabled via ENABLE_SCHEDULER environment variable');
      return;
    }
    
    logger.info(`Starting scheduler with schedule: ${this.syncSchedule}`);
    
    // Schedule deal synchronization
    this.scheduleDealSync();
  }
  
  /**
   * Schedule deal synchronization
   */
  scheduleDealSync() {
    const taskName = 'dealSync';
    
    // Validate cron expression
    if (!cron.validate(this.syncSchedule)) {
      logger.error(`Invalid cron expression: ${this.syncSchedule}`);
      return;
    }
    
    // Create scheduled task
    const task = cron.schedule(this.syncSchedule, async () => {
      logger.info('Scheduled deal sync started');
      
      try {
        await dealService.syncDeals();
        logger.info('Scheduled deal sync completed successfully');
      } catch (error) {
        logger.error('Scheduled deal sync failed', { error: error.message });
      }
    }, {
      scheduled: false // Don't start immediately, we'll start it manually
    });
    
    // Store the task
    this.tasks.set(taskName, task);
    
    // Start the task
    task.start();
    
    logger.info(`Deal sync scheduled with cron: ${this.syncSchedule}`);
  }
  
  /**
   * Stop all scheduled tasks
   */
  stop() {
    logger.info('Stopping all scheduled tasks');
    
    this.tasks.forEach((task, taskName) => {
      task.stop();
      logger.info(`Stopped task: ${taskName}`);
    });
    
    this.tasks.clear();
  }
  
  /**
   * Stop a specific task by name
   * @param {string} taskName - Name of the task to stop
   */
  stopTask(taskName) {
    const task = this.tasks.get(taskName);
    
    if (task) {
      task.stop();
      this.tasks.delete(taskName);
      logger.info(`Stopped task: ${taskName}`);
    } else {
      logger.warn(`Task not found: ${taskName}`);
    }
  }
  
  /**
   * Get list of active tasks
   * @returns {Array<string>} Array of task names
   */
  getActiveTasks() {
    return Array.from(this.tasks.keys());
  }
  
  /**
   * Check if scheduler is enabled
   * @returns {boolean} Scheduler enabled status
   */
  isEnabled() {
    return this.isSchedulerEnabled;
  }
  
  /**
   * Get the sync schedule
   * @returns {string} Cron expression
   */
  getSyncSchedule() {
    return this.syncSchedule;
  }
}

// Export singleton instance
module.exports = new Scheduler();
