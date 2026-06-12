const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.render('index', { title: 'YieldSwarm' });
});

router.get('/yield', (req, res) => {
  res.render('yield', { title: 'Yield Optimizer' });
});

router.get('/vaults', (req, res) => {
  res.render('vaults', { title: 'Vaults' });
});

router.get('/mining', (req, res) => {
  res.render('mining', { title: 'Mining' });
});

router.get('/agents', (req, res) => {
  res.render('agents', { title: 'Agents' });
});

router.get('/depin', (req, res) => {
  res.render('depin', { title: 'DePIN' });
});

module.exports = router;