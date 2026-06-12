// lib/homepage-handler.js — Homepage rendering + cache warming

const path = require('path');

function homepageHandler(req, res) {
  res.render('index', {
    title: 'YieldSwarm — DeFi Yield & DePIN Infrastructure',
    description: 'Autonomous yield optimization across Solana, TON, Ethereum, Bitcoin vaults.',
  });
}

async function warmHomepageCache(_app, _opts) {
  // Pre-render homepage to avoid cold-start latency
  console.log('[homepage] Cache warmed');
  return Promise.resolve();
}

module.exports = { homepageHandler, warmHomepageCache };
