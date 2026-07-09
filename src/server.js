require('dotenv').config();
const app = require('./app');
const scheduler = require('./jobs/scheduler');
const supabase = require('./config/supabase');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 3000;

/**
 * Start the server
 */
async function startServer() {
  try {
    // Test Supabase connection
    logger.info('Testing Supabase connection...');
    const connectionTest = await supabase.testConnection();
    
    if (!connectionTest) {
      logger.warn('Supabase connection test failed - ensure migrations have been run');
    }
    
    // Start the scheduler
    scheduler.start();
    
    // Start the Express server
    const server = app.listen(PORT, () => {
      logger.info(`Bitrix24 to Supabase Sync Service started on port ${PORT}`);
      logger.info(`Scheduler enabled: ${scheduler.isEnabled()}`);
      logger.info(`Sync schedule: ${scheduler.getSyncSchedule()}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
    
    // Graceful shutdown handling
    const gracefulShutdown = (signal) => {
      logger.info(`${signal} received. Starting graceful shutdown...`);
      
      // Stop the scheduler
      scheduler.stop();
      
      // Close the server
      server.close(() => {
        logger.info('Server closed successfully');
        process.exit(0);
      });
      
      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };
    
    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
      process.exit(1);
    });
    
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection', { reason, promise });
      process.exit(1);
    });
    
  } catch (error) {
    logger.error('Failed to start server', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

// Start the server
startServer();
