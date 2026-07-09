const bitrix = require('../config/bitrix');
const dealRepository = require('../repositories/dealRepository');
const logger = require('../utils/logger');

/**
 * Deal Service
 * Handles Bitrix24 API interactions and synchronization logic for deals
 * Implements service pattern for business logic
 */
class DealService {
  /**
   * Fetch all deals from Bitrix24 with automatic pagination
   * @returns {Promise<Array<Object>>} Array of all deals from Bitrix24
   */
  async fetchAllDealsFromBitrix() {
    const allDeals = [];
    let nextPage = true;
    let start = 0;
    const batchSize = 50; // Bitrix24 default batch size
    
    logger.info('Starting to fetch deals from Bitrix24');
    
    try {
      while (nextPage) {
        const response = await bitrix.request('crm.deal.list', {
          select: [
            'ID',
            'TITLE',
            'STAGE_ID',
            'CATEGORY_ID',
            'ASSIGNED_BY_ID',
            'COMPANY_ID',
            'CONTACT_ID',
            'OPPORTUNITY',
            'CURRENCY_ID',
            'DATE_CREATE',
            'DATE_MODIFY',
            'CLOSEDATE',
            'CLOSED',
            'STAGE_SEMANTIC_ID'
          ],
          order: { 'ID': 'ASC' },
          start: start
        });
        
        if (response.result && response.result.length > 0) {
          allDeals.push(...response.result);
          logger.debug(`Fetched ${response.result.length} deals (total: ${allDeals.length})`);
        }
        
        // Check if there are more pages
        nextPage = response.next || false;
        start = response.next || 0;
        
        // Small delay to avoid rate limiting
        if (nextPage) {
          await this.sleep(100);
        }
      }
      
      logger.info(`Successfully fetched ${allDeals.length} deals from Bitrix24`);
      return allDeals;
    } catch (error) {
      logger.error('Error fetching deals from Bitrix24', { 
        error: error.message,
        fetchedCount: allDeals.length
      });
      throw error;
    }
  }
  
  /**
   * Normalize a Bitrix24 deal object to match database schema
   * @param {Object} bitrixDeal - Raw deal from Bitrix24 API
   * @returns {Object} Normalized deal object
   */
  normalizeDeal(bitrixDeal) {
    const now = new Date().toISOString();
    
    return {
      deal_id: parseInt(bitrixDeal.ID),
      title: bitrixDeal.TITLE || '',
      stage_id: bitrixDeal.STAGE_ID || null,
      category_id: bitrixDeal.CATEGORY_ID ? parseInt(bitrixDeal.CATEGORY_ID) : null,
      assigned_by_id: bitrixDeal.ASSIGNED_BY_ID ? parseInt(bitrixDeal.ASSIGNED_BY_ID) : null,
      company_id: bitrixDeal.COMPANY_ID ? parseInt(bitrixDeal.COMPANY_ID) : null,
      contact_id: bitrixDeal.CONTACT_ID ? parseInt(bitrixDeal.CONTACT_ID) : null,
      opportunity: bitrixDeal.OPPORTUNITY ? parseFloat(bitrixDeal.OPPORTUNITY) : null,
      currency_id: bitrixDeal.CURRENCY_ID || null,
      created_at: bitrixDeal.DATE_CREATE || null,
      updated_at: bitrixDeal.DATE_MODIFY || null,
      closed_at: bitrixDeal.CLOSEDATE || null,
      is_closed: bitrixDeal.CLOSED === 'Y',
      is_won: bitrixDeal.STAGE_SEMANTIC_ID === 'S', // 'S' means success/won
      raw_json: bitrixDeal, // Store raw data for reference
      created_on_sync: now,
      updated_on_sync: now
    };
  }
  
  /**
   * Normalize an array of Bitrix24 deals
   * @param {Array<Object>} bitrixDeals - Array of raw deals from Bitrix24 API
   * @returns {Array<Object>} Array of normalized deal objects
   */
  normalizeDeals(bitrixDeals) {
    return bitrixDeals.map(deal => this.normalizeDeal(deal));
  }
  
  /**
   * Synchronize deals from Bitrix24 to Supabase
   * @returns {Promise<Object>} Sync statistics
   */
  async syncDeals() {
    const startTime = Date.now();
    const stats = {
      downloaded: 0,
      inserted: 0,
      updated: 0,
      errors: 0
    };
    
    logger.logSyncStart('deals');
    
    try {
      // Fetch all deals from Bitrix24
      const bitrixDeals = await this.fetchAllDealsFromBitrix();
      stats.downloaded = bitrixDeals.length;
      
      if (bitrixDeals.length === 0) {
        logger.info('No deals found in Bitrix24');
        logger.logSyncComplete('deals', { ...stats, duration: Date.now() - startTime });
        return stats;
      }
      
      // Normalize deals
      const normalizedDeals = this.normalizeDeals(bitrixDeals);
      
      // Batch upsert to Supabase
      // Process in batches to avoid payload size limits
      const batchSize = 100;
      for (let i = 0; i < normalizedDeals.length; i += batchSize) {
        const batch = normalizedDeals.slice(i, i + batchSize);
        
        try {
          await dealRepository.batchUpsert(batch);
          
          // Track inserted vs updated by checking if records existed
          for (const deal of batch) {
            const existing = await dealRepository.findById(deal.deal_id);
            if (existing) {
              stats.updated++;
            } else {
              stats.inserted++;
            }
          }
          
          logger.debug(`Batch ${Math.floor(i / batchSize) + 1} synced successfully`);
        } catch (error) {
          logger.error(`Batch ${Math.floor(i / batchSize) + 1} sync failed`, { 
            error: error.message 
          });
          stats.errors += batch.length;
          
          // Try individual upserts for failed batch
          for (const deal of batch) {
            try {
              await dealRepository.upsert(deal);
              const existing = await dealRepository.findById(deal.deal_id);
              if (existing) {
                stats.updated++;
              } else {
                stats.inserted++;
              }
            } catch (individualError) {
              logger.error(`Individual deal sync failed`, { 
                dealId: deal.deal_id, 
                error: individualError.message 
              });
              stats.errors++;
            }
          }
        }
      }
      
      const duration = Date.now() - startTime;
      logger.logSyncComplete('deals', { ...stats, duration });
      
      return stats;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.logSyncError('deals', error);
      throw new Error(`Deal synchronization failed: ${error.message}`);
    }
  }
  
  /**
   * Get sync status
   * @returns {Promise<Object>} Sync status information
   */
  async getSyncStatus() {
    try {
      const totalDeals = await dealRepository.count();
      const lastUpdated = await dealRepository.getLastUpdated();
      
      return {
        total_deals: totalDeals,
        last_updated: lastUpdated,
        bitrix_webhook_url: bitrix.getWebhookUrl()
      };
    } catch (error) {
      logger.error('Error getting sync status', { error: error.message });
      throw error;
    }
  }
  
  /**
   * Sleep utility for delays
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
module.exports = new DealService();
