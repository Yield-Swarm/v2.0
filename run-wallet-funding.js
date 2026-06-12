/**
 * run-wallet-funding.js — Execute SOL devnet airdrops for all deity wallets.
 * Safe to run: logs to deity_wallet_funding table, rate-limited 300ms between txs.
 */
'use strict';

require('./server');
const { seedDeityWallets, getFundingStats } = require('./services/deity-wallet-funding');

async function main() {
  console.log('[WalletFunding] Starting SOL devnet airdrop for all 169 deity wallets...');
  const result = await seedDeityWallets({ chain: 'solana_devnet', maxAgents: 175, dryRun: false });
  console.log('[WalletFunding] SOL devnet airdrop complete:', JSON.stringify(result, null, 2));
  const stats = await getFundingStats();
  console.log('[WalletFunding] Aggregate stats:', JSON.stringify(stats));
  process.exit(0);
}

main().catch(err => {
  console.error('[WalletFunding] Fatal:', err.message);
  process.exit(1);
});