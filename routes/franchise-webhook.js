const express = require('express');
const router = express.Router();

router.post('/webhook', (req, res) => {
  res.json({ received: true, type: 'franchise' });
});

module.exports = router;