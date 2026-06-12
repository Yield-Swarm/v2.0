const express = require('express');
const router = express.Router();

router.get('/opportunities', (req, res) => {
  res.json({ opportunities: [] });
});

router.post('/commit', (req, res) => {
  res.json({ commitment_id: 'mock', status: 'active' });
});

module.exports = router;