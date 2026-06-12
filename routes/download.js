const express = require('express');
const router = express.Router();

router.get('/code', (req, res) => {
  res.json({ message: 'Code download endpoint — implement tarball generation' });
});

router.get('/sync', (req, res) => {
  res.json({ message: 'Sync script download endpoint' });
});

module.exports = router;