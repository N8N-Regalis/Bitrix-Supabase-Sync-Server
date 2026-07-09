const winston = require('winston');

/**
 * Winston logger configuration
 * Provides structured logging with different levels and formats
 */
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'bitrix-supabase-sync' },
  transports: [
    // Write all logs with importance level of 'error' or less to error.log
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Write all logs to combined.log
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// If we're not in production, log to the console with a simple format
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

/**
 * Log sync operation start
 * @param {string} entity - Entity being synced (e.g., 'deals')
 */
logger.logSyncStart = (entity) => {
  logger.info(`Sync started for ${entity}`);
};

/**
 * Log sync operation completion
 * @param {string} entity - Entity that was synced
 * @param {Object} stats - Sync statistics
 * @param {number} stats.downloaded - Number of records downloaded
 * @param {number} stats.inserted - Number of records inserted
 * @param {number} stats.updated - Number of records updated
 * @param {number} stats.duration - Duration in milliseconds
 */
logger.logSyncComplete = (entity, stats) => {
  logger.info(`Sync completed for ${entity}`, {
    downloaded: stats.downloaded,
    inserted: stats.inserted,
    updated: stats.updated,
    duration: `${stats.duration}ms`
  });
};

/**
 * Log sync error
 * @param {string} entity - Entity being synced
 * @param {Error} error - Error object
 */
logger.logSyncError = (entity, error) => {
  logger.error(`Sync error for ${entity}`, {
    error: error.message,
    stack: error.stack
  });
};

/**
 * Log API request
 * @param {string} method - HTTP method
 * @param {string} url - Request URL
 * @param {number} statusCode - Response status code
 */
logger.logApiRequest = (method, url, statusCode) => {
  logger.debug(`API Request`, {
    method,
    url,
    statusCode
  });
};

/**
 * Log database operation
 * @param {string} operation - Operation type (insert, update, upsert)
 * @param {string} table - Table name
 * @param {number} count - Number of affected rows
 */
logger.logDbOperation = (operation, table, count) => {
  logger.debug(`Database ${operation}`, {
    table,
    count
  });
};

module.exports = logger;
