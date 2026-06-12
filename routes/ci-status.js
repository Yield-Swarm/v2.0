const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ status: 'ready', version: '2.0', deployed_at: new Date().toISOString() });
});

module.exports = router;