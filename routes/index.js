// routes/index.js — Central route mount dispatcher
// Mounts all route groups safely with crash guards

const express = require('express');

function mountAllRoutes(app) {
  // Admin login (no auth required)
  const { adminLoginRouter } = require('../middleware/admin-auth');
  app.use('/admin', adminLoginRouter);

  // Admin panel (protected)
  const { requireAdmin } = require('../middleware/admin-auth');
  const adminRouter = require('./admin');
  app.use('/admin', requireAdmin, adminRouter);

  // API routes
  app.use('/api/health', (req, res) => res.json({ status: 'ok', ts: Date.now() }));

  // Ci status
  const ciStatus = require('./ci-status');
  app.use('/api/ci', ciStatus);

  // Download endpoints
  const download = require('./download');
  app.use('/api', download);

  // Infrastructure status
  const infrastructureDb = require('../db/cloud-infrastructure');
  app.get('/api/infrastructure/status', async (req, res) => {
    try {
      const rows = await infrastructureDb.getInfrastructureStatus().catch(() => []);
      const COSTS = { azure: 249, gcp: 89, aws: 450, akash: 180, ovh: 39 };
      res.json({
        azure:  { status: rows.find(r => r.provider === 'azure')?.status || 'unknown', region: 'East US', service: 'Primary VM' },
        gcp:    { status: rows.find(r => r.provider === 'gcp')?.status || 'unknown', region: 'us-central1', service: 'Cloud SQL' },
        aws:    { status: rows.find(r => r.provider === 'aws')?.status || 'unknown', region: 'us-east-1', service: 'SageMaker LLM' },
        akash:  { status: rows.find(r => r.provider === 'akash')?.status || 'unknown', region: 'Chain 8', service: 'GPU Compute' },
        ovh:    { status: rows.find(r => r.provider === 'ovhcloud')?.status || 'unknown', region: 'Gravelines (GRA)', service: 'Backup VM' },
        total_cost_mo: Object.values(COSTS).reduce((a, b) => a + b, 0),
        updated_at: new Date().toISOString(),
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // Admin council engine protocol
  const councilEngine = require('./council-engine-protocol');
  app.use('/api/council-engine', councilEngine);

  // Wise integration
  const wise = require('./wise-integration');
  app.use('/api/wise-integration', wise);

  // Blue forge mining
  const blueforge = require('./blueforge-mining');
  app.use('/api/blueforge', blueforge);

  // Telegram swarm
  const telegram = require('./telegram-swarm');
  app.use('/api/telegram-swarm', telegram);

  // Marketing
  const marketing = require('./marketing');
  app.use('/api/marketing', marketing);

  // Shop
  const shop = require('./shop');
  app.use('/api/shop', shop);

  // Invest
  const invest = require('./invest');
  app.use('/api/invest', invest);

  // Account
  const account = require('./account');
  app.use('/account', account);

  // Yield optimizer (homepage + yield pages)
  const yieldOptimizer = require('./yield-optimizer');
  app.use('/', yieldOptimizer);

  console.log('[routes] All routes mounted');
}

module.exports = { mountAllRoutes };
