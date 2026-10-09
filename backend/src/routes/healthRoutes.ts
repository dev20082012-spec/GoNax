import { Router } from 'express';
import { getDatabase } from '../database/connection';
import { ModelRegistry } from '../domain/models/modelRegistry';
import { DatasetService } from '../services/datasetService';

const router = Router();
const modelRegistry = ModelRegistry.getInstance();
const datasetService = new DatasetService();

const startupTime = Date.now();

// Liveness probe
router.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    system: 'GoNax Species-Specific Carbon Intelligence API',
    version: '1.2.0-hardened',
    timestamp: new Date().toISOString()
  });
});

// Readiness probe (deep check without leaking credentials)
router.get('/ready', async (req, res) => {
  try {
    const db = await getDatabase();
    // Test basic query to ensure database is responsive
    const dbResult = await db.query('SELECT 1 as live');
    const isDbLive = dbResult && dbResult.length > 0;

    const models = modelRegistry.getAllModelsMetadata();
    const datasets = datasetService.getAllDatasets();

    const isReady = isDbLive && models.length > 0 && datasets.length > 0;

    if (!isReady) {
      return res.status(503).json({
        status: 'unready',
        database: isDbLive ? 'connected' : 'unreachable',
        models_registered: models.length,
        datasets_registered: datasets.length,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      status: 'ready',
      database: isDbLive ? 'connected' : 'unreachable',
      models_count: models.length,
      datasets_count: datasets.length,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(503).json({
      status: 'error',
      database: 'unreachable',
      error: 'Database or storage connectivity failure',
      timestamp: new Date().toISOString()
    });
  }
});

// Metrics / Operational status
router.get('/metrics', (req, res) => {
  const mem = process.memoryUsage();
  res.json({
    uptime_seconds: Math.floor((Date.now() - startupTime) / 1000),
    memory: {
      rss_mb: Math.round(mem.rss / 1024 / 1024),
      heap_total_mb: Math.round(mem.heapTotal / 1024 / 1024),
      heap_used_mb: Math.round(mem.heapUsed / 1024 / 1024)
    },
    node_version: process.version,
    platform: process.platform,
    timestamp: new Date().toISOString()
  });
});

export default router;
