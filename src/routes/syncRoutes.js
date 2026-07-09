const express = require('express');
const dealService = require('../services/dealService');
const logger = require('../utils/logger');

/**
 * Sync Routes
 * REST endpoints for synchronization operations
 */
const router = express.Router();

/**
 * GET /
 * Returns service status
 */
router.get('/', (req, res) => {
  res.json({
    service: 'Bitrix24 to Supabase Sync Service',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /health
 * Returns health check status
 */
router.get('/health', async (req, res) => {
  try {
    const syncStatus = await dealService.getSyncStatus();
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      sync: syncStatus
    });
  } catch (error) {
    logger.error('Health check failed', { error: error.message });
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

/**
 * POST /sync/deals
 * Triggers manual deal synchronization
 */
router.post('/sync/deals', async (req, res) => {
  const syncStartTime = Date.now();
  
  try {
    logger.info('Manual deal sync triggered via API');
    
    // Run synchronization
    const stats = await dealService.syncDeals();
    
    const duration = Date.now() - syncStartTime;
    
    res.json({
      success: true,
      message: 'Deal synchronization completed successfully',
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      stats: stats
    });
  } catch (error) {
    const duration = Date.now() - syncStartTime;
    logger.error('Manual deal sync failed', { error: error.message });
    
    res.status(500).json({
      success: false,
      message: 'Deal synchronization failed',
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      error: error.message
    });
  }
});

/**
 * GET /sync/status
 * Returns current synchronization status
 */
router.get('/sync/status', async (req, res) => {
  try {
    const status = await dealService.getSyncStatus();
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      status: status
    });
  } catch (error) {
    logger.error('Get sync status failed', { error: error.message });
    
    res.status(500).json({
      success: false,
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

module.exports = router;
