const axios = require('axios');
const logger = require('../utils/logger');

/**
 * Bitrix24 API Configuration
 * Handles all interactions with the Bitrix24 REST API
 */
class BitrixConfig {
  constructor() {
    this.webhookUrl = process.env.BITRIX_WEBHOOK_URL;
    
    if (!this.webhookUrl) {
      throw new Error('BITRIX_WEBHOOK_URL environment variable is required');
    }
    
    // Remove trailing slash if present
    this.webhookUrl = this.webhookUrl.replace(/\/$/, '');
    
    // Create axios instance with default configuration
    this.client = axios.create({
      baseURL: this.webhookUrl,
      timeout: 30000, // 30 seconds timeout
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.debug(`Bitrix API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        logger.error('Bitrix API Request Error', { error: error.message });
        return Promise.reject(error);
      }
    );
    
    // Response interceptor for logging and error handling
    this.client.interceptors.response.use(
      (response) => {
        logger.logApiRequest(
          response.config.method?.toUpperCase(),
          response.config.url,
          response.status
        );
        return response;
      },
      (error) => {
        if (error.response) {
          // Server responded with error status
          logger.error('Bitrix API Response Error', {
            status: error.response.status,
            data: error.response.data,
            url: error.config?.url
          });
        } else if (error.request) {
          // Request made but no response
          logger.error('Bitrix API No Response', { error: error.message });
        } else {
          // Request setup error
          logger.error('Bitrix API Request Setup Error', { error: error.message });
        }
        return Promise.reject(error);
      }
    );
  }
  
  /**
   * Make a request to Bitrix24 API with retry logic
   * @param {string} method - Bitrix API method (e.g., 'crm.deal.list')
   * @param {Object} params - Request parameters
   * @param {number} retries - Number of retry attempts
   * @returns {Promise<Object>} API response data
   */
  async request(method, params = {}, retries = 3) {
    const url = `${method}`;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await this.client.get(url, { params });
        
        // Check for Bitrix API errors
        if (response.data.error) {
          throw new Error(`Bitrix API Error: ${response.data.error}`);
        }
        
        return response.data;
      } catch (error) {
        // Don't retry on certain errors
        if (error.response?.status === 401 || error.response?.status === 403) {
          throw new Error(`Authentication failed: ${error.message}`);
        }
        
        // If this is the last attempt, throw the error
        if (attempt === retries) {
          throw error;
        }
        
        // Wait before retrying (exponential backoff)
        const waitTime = Math.pow(2, attempt) * 1000;
        logger.warn(`Retrying Bitrix request (attempt ${attempt}/${retries}) after ${waitTime}ms`);
        await this.sleep(waitTime);
      }
    }
  }
  
  /**
   * Sleep utility for retry delays
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Get the webhook URL
   * @returns {string} Webhook URL
   */
  getWebhookUrl() {
    return this.webhookUrl;
  }
}

// Export singleton instance
module.exports = new BitrixConfig();
