const express = require('express');
const router = express.Router();

router.get('/status', (req, res) => {
  res.json({ miners: 22, status: 'online', hashrate: '1.2 GH/s' });
});

router.get('/pools', (req, res) => {
  res.json({ pools: ['2miners', 'f2pool', 'poolin'] });
});

module.exports = router;