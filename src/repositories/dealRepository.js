const supabase = require('../config/supabase');
const logger = require('../utils/logger');

/**
 * Deal Repository
 * Handles all database operations for deals
 * Implements repository pattern for clean separation of concerns
 */
class DealRepository {
  /**
   * Upsert a deal into the database
   * Updates existing record if deal_id exists, inserts new record otherwise
   * @param {Object} deal - Normalized deal object
   * @returns {Promise<Object>} Result of the upsert operation
   */
  async upsert(deal) {
    try {
      const { data, error } = await supabase
        .getClient()
        .from('deals')
        .upsert(deal, {
          onConflict: 'deal_id',
          ignoreDuplicates: false
        })
        .select();
      
      if (error) {
        logger.error('Deal upsert failed', { 
          dealId: deal.deal_id, 
          error: error.message 
        });
        throw error;
      }
      
      logger.logDbOperation('upsert', 'deals', 1);
      return data;
    } catch (error) {
      logger.error('Deal repository upsert error', { 
        dealId: deal.deal_id, 
        error: error.message 
      });
      throw error;
    }
  }
  
  /**
   * Batch upsert multiple deals
   * @param {Array<Object>} deals - Array of normalized deal objects
   * @returns {Promise<Object>} Result of the batch upsert operation
   */
  async batchUpsert(deals) {
    try {
      const { data, error } = await supabase
        .getClient()
        .from('deals')
        .upsert(deals, {
          onConflict: 'deal_id',
          ignoreDuplicates: false
        })
        .select();
      
      if (error) {
        logger.error('Batch deal upsert failed', { 
          count: deals.length, 
          error: error.message 
        });
        throw error;
      }
      
      logger.logDbOperation('batch upsert', 'deals', deals.length);
      return data;
    } catch (error) {
      logger.error('Deal repository batch upsert error', { 
        count: deals.length, 
        error: error.message 
      });
      throw error;
    }
  }
  
  /**
   * Get a deal by its ID
   * @param {number} dealId - Deal ID
   * @returns {Promise<Object|null>} Deal object or null if not found
   */
  async findById(dealId) {
    try {
      const { data, error } = await supabase
        .getClient()
        .from('deals')
        .select('*')
        .eq('deal_id', dealId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          // Not found
          return null;
        }
        logger.error('Deal find by ID failed', { 
          dealId, 
          error: error.message 
        });
        throw error;
      }
      
      return data;
    } catch (error) {
      logger.error('Deal repository find by ID error', { 
        dealId, 
        error: error.message 
      });
      throw error;
    }
  }
  
  /**
   * Get all deals
   * @param {Object} options - Query options
   * @param {number} options.limit - Maximum number of records to return
   * @param {number} options.offset - Number of records to skip
   * @returns {Promise<Array<Object>>} Array of deals
   */
  async findAll(options = {}) {
    try {
      const { limit = 100, offset = 0 } = options;
      
      let query = supabase
        .getClient()
        .from('deals')
        .select('*')
        .order('updated_at', { ascending: false });
      
      if (limit) {
        query = query.limit(limit);
      }
      
      if (offset) {
        query = query.range(offset, offset + limit - 1);
      }
      
      const { data, error } = await query;
      
      if (error) {
        logger.error('Deal find all failed', { error: error.message });
        throw error;
      }
      
      return data;
    } catch (error) {
      logger.error('Deal repository find all error', { error: error.message });
      throw error;
    }
  }
  
  /**
   * Get the count of deals in the database
   * @returns {Promise<number>} Number of deals
   */
  async count() {
    try {
      const { count, error } = await supabase
        .getClient()
        .from('deals')
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        logger.error('Deal count failed', { error: error.message });
        throw error;
      }
      
      return count || 0;
    } catch (error) {
      logger.error('Deal repository count error', { error: error.message });
      throw error;
    }
  }
  
  /**
   * Get deals by stage ID
   * @param {string} stageId - Stage ID
   * @returns {Promise<Array<Object>>} Array of deals
   */
  async findByStageId(stageId) {
    try {
      const { data, error } = await supabase
        .getClient()
        .from('deals')
        .select('*')
        .eq('stage_id', stageId)
        .order('updated_at', { ascending: false });
      
      if (error) {
        logger.error('Deal find by stage ID failed', { 
          stageId, 
          error: error.message 
        });
        throw error;
      }
      
      return data;
    } catch (error) {
      logger.error('Deal repository find by stage ID error', { 
        stageId, 
        error: error.message 
      });
      throw error;
    }
  }
  
  /**
   * Get deals by assigned user ID
   * @param {number} assignedById - User ID
   * @returns {Promise<Array<Object>>} Array of deals
   */
  async findByAssignedById(assignedById) {
    try {
      const { data, error } = await supabase
        .getClient()
        .from('deals')
        .select('*')
        .eq('assigned_by_id', assignedById)
        .order('updated_at', { ascending: false });
      
      if (error) {
        logger.error('Deal find by assigned by ID failed', { 
          assignedById, 
          error: error.message 
        });
        throw error;
      }
      
      return data;
    } catch (error) {
      logger.error('Deal repository find by assigned by ID error', { 
        assignedById, 
        error: error.message 
      });
      throw error;
    }
  }
  
  /**
   * Delete a deal by its ID
   * @param {number} dealId - Deal ID
   * @returns {Promise<Object>} Result of the delete operation
   */
  async delete(dealId) {
    try {
      const { data, error } = await supabase
        .getClient()
        .from('deals')
        .delete()
        .eq('deal_id', dealId);
      
      if (error) {
        logger.error('Deal delete failed', { 
          dealId, 
          error: error.message 
        });
        throw error;
      }
      
      logger.logDbOperation('delete', 'deals', 1);
      return data;
    } catch (error) {
      logger.error('Deal repository delete error', { 
        dealId, 
        error: error.message 
      });
      throw error;
    }
  }
  
  /**
   * Get the last updated timestamp for deals
   * @returns {Promise<string|null>} Last updated timestamp or null
   */
  async getLastUpdated() {
    try {
      const { data, error } = await supabase
        .getClient()
        .from('deals')
        .select('updated_at')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          // No records
          return null;
        }
        logger.error('Deal get last updated failed', { error: error.message });
        throw error;
      }
      
      return data?.updated_at || null;
    } catch (error) {
      logger.error('Deal repository get last updated error', { 
        error: error.message 
      });
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new DealRepository();
