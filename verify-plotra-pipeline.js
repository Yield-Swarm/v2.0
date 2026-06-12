#!/usr/bin/env node
/**
 * verify-plotra-pipeline.js — Post-deploy verification for Plotra agent registration pipeline.
 * Run: node verify-plotra-pipeline.js
 */
'use strict';

const db = require('./db/plotra-registration');
const svc = require('./services/plotra-registration');
const { pool } = require('./db/index');

async function verify() {
  console.log('=== PLOTRA PIPELINE VERIFICATION ===\n');

  // 1. Registration stats
  const stats = await db.getPipelineStats();
  console.log('Registration stats:', JSON.stringify(stats, null, 2));

  // 2. Source counts
  const src = await pool.query(
    "SELECT 'arena_deities' as src, COUNT(*)::text as total FROM arena_deities WHERE is_active = true " +
    "UNION ALL SELECT 'swarm_ys_agents' as src, COUNT(*)::text FROM swarm_ys_agents " +
    "UNION ALL SELECT 'plotra_agents' as src, COUNT(*)::text FROM plotra_agents " +
    "UNION ALL SELECT 'deity_wallets' as src, COUNT(*)::text FROM deity_wallets WHERE network = 'sepolia'"
  );
  console.log('\nSource counts:', JSON.stringify(src.rows, null, 2));

  // 3. Faucet stats
  const faucetStats = await db.getFaucetStats();
  console.log('\nFaucet stats:', JSON.stringify(faucetStats, null, 2));

  // 4. Fix any stuck pending agents
  const fix = await svc.promotePendingArenaDeities();
  console.log('\nPending fix result:', JSON.stringify(fix, null, 2));

  // 5. Tag Immunefi agents (scan for security capability)
  const tag = await svc.analyzeAndTagImmunefiAgents();
  console.log('\nImmunefi tag result:', JSON.stringify(tag, null, 2));

  // 6. Process faucet drips
  const drips = await svc.processFaucetDrips({ batchSize: 50 });
  const dripped = drips.filter(r => r.success).length;
  console.log('\nFaucet drips: ' + dripped + '/' + drips.length + ' dripped');

  // 7. Final stats
  const finalStats = await db.getPipelineStats();
  console.log('\nFINAL registration stats:', JSON.stringify(finalStats, null, 2));
  const finalFaucetStats = await db.getFaucetStats();
  console.log('\nFINAL faucet stats:', JSON.stringify(finalFaucetStats, null, 2));

  // 8. Sample agents
  const sample = await pool.query(
    "SELECT agent_id, agent_name, source_table, registration_status, immunefi_ready, genesis_link " +
    "FROM plotra_agents ORDER BY registered_at DESC LIMIT 5"
  );
  console.log('\nLatest 5 agents:', JSON.stringify(sample.rows, null, 2));

  console.log('\n=== VERIFICATION COMPLETE ===');
  console.log('Summary: ' + finalStats.registered + ' registered, ' + finalStats.pending + ' pending, ' +
              finalStats.failed + ' failed | ' + finalStats.immunefi_ready + ' Immunefi-ready');
}

verify().catch(err => {
  console.error('VERIFICATION ERROR:', err.message);
  process.exit(1);
});