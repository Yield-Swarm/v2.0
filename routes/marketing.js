const express = require('express');
const router = express.Router();

router.get('/campaigns', (req, res) => {
  res.json({ campaigns: [] });
});

router.post('/campaign', (req, res) => {
  res.json({ id: 'mock', status: 'created' });
});

module.exports = router;