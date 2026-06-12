const express = require('express');
const router = express.Router();

router.get('/balance', (req, res) => {
  res.json({ balance: 0, currency: 'USD' });
});

router.post('/create-link', (req, res) => {
  res.json({ url: 'https://wise.com/pay/mock', status: 'pending' });
});

router.get('/status/:id', (req, res) => {
  res.json({ id: req.params.id, status: 'completed' });
});

router.get('/zec-convert', (req, res) => {
  res.json({ zec: 1, usd: 25.5 });
});

module.exports = router;