const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/admin-auth');

router.get('/', (req, res) => {
  res.render('admin-dashboard', { title: 'YieldSwarm Admin' });
});

router.get('/council-engine', (req, res) => {
  res.render('admin-council-engine', { title: 'Council Engine' });
});

router.get('/wise-integration', (req, res) => {
  res.render('admin-wise', { title: 'Wise Integration' });
});

router.get('/blueforge-mining', (req, res) => {
  res.render('admin-blueforge', { title: 'Blue Forge Mining' });
});

router.get('/analytics', (req, res) => {
  res.render('admin-analytics', { title: 'Analytics' });
});

router.get('/settings', (req, res) => {
  res.render('admin-settings', { title: 'Settings' });
});

module.exports = router;