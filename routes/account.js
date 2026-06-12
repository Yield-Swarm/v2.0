const express = require('express');
const router = express.Router();

router.post('/login', (req, res) => {
  res.json({ token: 'mock', user: { id: 'mock' } });
});

router.post('/register', (req, res) => {
  res.json({ token: 'mock', user: { id: 'mock' } });
});

router.get('/profile', (req, res) => {
  res.json({ id: 'mock', email: 'user@example.com' });
});

module.exports = router;