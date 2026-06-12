const { pool } = require('../db/index');

async function seedDefaultWallets() {
  // Non-blocking bittensor wallet seed
  console.log('[bittensor] Wallet seed skipped — no bittensor integration configured');
}

module.exports = { seedDefaultWallets };