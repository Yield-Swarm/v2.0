const express = require('express');
const router = express.Router();

router.post('/set-webhook', (req, res) => {
  res.json({ webhook_set: true });
});

router.post('/broadcast', (req, res) => {
  res.json({ broadcast_id: 'mock', agents_notified: 0 });
});

module.exports = router;