const express = require('express');
const router = express.Router();

router.get('/products', (req, res) => {
  res.json({ products: [] });
});

router.post('/purchase', (req, res) => {
  res.json({ order_id: 'mock', status: 'pending' });
});

module.exports = router;