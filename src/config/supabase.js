const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');

/**
 * Supabase Configuration
 * Handles all interactions with Supabase database
 */
class SupabaseConfig {
  constructor() {
    this.supabaseUrl = process.env.SUPABASE_URL;
    this.supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!this.supabaseUrl) {
      throw new Error('SUPABASE_URL environment variable is required');
    }
    
    if (!this.supabaseKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
    }
    
    // Create Supabase client with service role key for full access
    this.client = createClient(this.supabaseUrl, this.supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    logger.info('Supabase client initialized');
  }
  
  /**
   * Get the Supabase client instance
   * @returns {Object} Supabase client
   */
  getClient() {
    return this.client;
  }
  
  /**
   * Get the Supabase URL
   * @returns {string} Supabase URL
   */
  getSupabaseUrl() {
    return this.supabaseUrl;
  }
  
  /**
   * Test database connection
   * @returns {Promise<boolean>} Connection status
   */
  async testConnection() {
    try {
      const { data, error } = await this.client
        .from('deals')
        .select('count', { count: 'exact', head: true })
        .limit(1);
      
      if (error) {
        // If table doesn't exist yet, that's okay for initial setup
        if (error.code === '42P01') {
          logger.warn('Deals table does not exist yet - run migrations first');
          return false;
        }
        throw error;
      }
      
      logger.info('Supabase connection test successful');
      return true;
    } catch (error) {
      logger.error('Supabase connection test failed', { error: error.message });
      return false;
    }
  }
}

// Export singleton instance
module.exports = new SupabaseConfig();
