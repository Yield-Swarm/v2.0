/**
 * god-mode-detonate.js — GOD MODE: Simultaneous detonation of all 28 cron jobs + Daily Forge.
 * One-shot script. Does NOT start the HTTP server.
 * Fires: Daily Forge (10-phase pipeline) + 28 Hyperscale cron bursts in parallel.
 *
 * Usage: node god-mode-detonate.js
 */

'use strict';

require('dotenv').config();

const forge    = require('./services/daily-forge');
const hyper    = require('./services/cron-hyperscale');
const queue    = require('./services/task-queue-manager');
const batchExec = require('./services/batch-executor');

// All 28 cron job names from the CRON_REGISTRY
const ALL_CRON_JOBS = [
  'council_morning_directive',
  'revenue_accounting',
  'aegis_security_audit',
  'moltbook_marketing',
  'mining_orchestration',
  'airdrop_farming',
  'grant_pipeline',
  'lindell_scoring',
  'swarm_health_probe',
  'lead_intelligence',
  'cx_oracle_signals',
  'arena_strategy_eval',
  'treasury_yield_calc',
  'lore_contribution',
  'outreach_sequencer',
  'token_vesting_check',
  'compliance_scan',
  'bridge_tx_verifier',
  'plotra_canvas_cycle',
  'discord_engagement',
  'mega_audit_probe',
  'swarm_cx_relay',
  'governance_proof',
  'referral_tracker',
  'email_nurture',
  'crm_scoring',
  'testnet_tx_probe',
  'knowledge_bus_update',
];

async function godModeDetonate() {
  const startTime = Date.now();
  console.log('\n' + '═'.repeat(72));
  console.log('🔱⚡ GOD MODE ACTIVATED — SIMULTANEOUS CRON DETONATION');
  console.log('═'.repeat(72));
  console.log(`⏰ ${new Date().toISOString()}`);
  console.log(`📋 Firing: 28 hyperscale jobs + 10-phase Daily Forge pipeline`);
  console.log('═'.repeat(72) + '\n');

  // Start the batch executor + queue manager (needed for hyperscale)
  batchExec.start();
  console.log('[god-mode] ✅ Batch executor started');

  const results = {
    dailyForge: null,
    hyperscale: [],
    errors: [],
    summary: {},
  };

  // ── FIRE ALL 28 HYPERSCALE JOBS IN PARALLEL ─────────────────────────────────
  console.log('\n⚡ PHASE A: Bursting all 28 hyperscale cron jobs...\n');

  const burstPromises = ALL_CRON_JOBS.map(async (jobName) => {
    try {
      const tasksSpawned = await hyper.burstCronJob(jobName, 89); // max burst per job
      console.log(`  ✅ ${jobName} — ${tasksSpawned} micro-tasks spawned`);
      return { job: jobName, status: 'fired', tasksSpawned };
    } catch (err) {
      console.error(`  ❌ ${jobName} — ${err.message}`);
      results.errors.push({ job: jobName, error: err.message });
      return { job: jobName, status: 'error', error: err.message };
    }
  });

  results.hyperscale = await Promise.all(burstPromises);

  const firedCount  = results.hyperscale.filter(r => r.status === 'fired').length;
  const burstErrors = results.hyperscale.filter(r => r.status === 'error').length;
  const totalTasks  = results.hyperscale.reduce((s, r) => s + (r.tasksSpawned || 0), 0);

  console.log(`\n⚡ Hyperscale burst complete: ${firedCount}/28 jobs fired, ${totalTasks} total micro-tasks in queue\n`);

  // ── FIRE DAILY FORGE (10 PHASES) ────────────────────────────────────────────
  console.log('🌅 PHASE B: Triggering Daily Forge 10-phase pipeline...\n');

  try {
    // Daily Forge runs async but we fire and wait for the result
    const forgeResult = await Promise.race([
      forge.run('god_mode'),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Daily Forge timed out after 15min')), 15 * 60 * 1000)
      ),
    ]);
    results.dailyForge = forgeResult;
    console.log(`\n🔱 Daily Forge complete: status=${forgeResult.status}, phases=${forgeResult.completedCount}/10, alignment=${forgeResult.alignmentScore}/100`);
  } catch (err) {
    console.error(`\n❌ Daily Forge error: ${err.message}`);
    results.dailyForge = { status: 'error', error: err.message };
    results.errors.push({ job: 'daily_forge', error: err.message });
  }

  // ── COMPILE STATUS REPORT ────────────────────────────────────────────────────
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  const forgeOk = results.dailyForge?.status === 'completed' || results.dailyForge?.status === 'partial';

  results.summary = {
    timestamp: new Date().toISOString(),
    elapsed_seconds: elapsed,
    god_mode: 'EXECUTED',
    hyperscale: {
      jobs_fired: firedCount,
      jobs_errored: burstErrors,
      total_micro_tasks: totalTasks,
    },
    daily_forge: {
      status: results.dailyForge?.status || 'unknown',
      phases_completed: results.dailyForge?.completedCount || 0,
      phases_failed: results.dailyForge?.failedCount || 0,
      alignment_score: results.dailyForge?.alignmentScore || 0,
      founder_email_sent: results.dailyForge?.founderEmailSent || false,
    },
    total_errors: results.errors.length,
  };

  // ── PRINT FINAL REPORT ───────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(72));
  console.log('🔱 GOD MODE COMPLETE — STATUS REPORT');
  console.log('═'.repeat(72));
  console.log(`\n⏱️  Elapsed: ${elapsed}s`);
  console.log('\n📊 HYPERSCALE ENGINE:');
  console.log(`  • Jobs fired:        ${firedCount}/28`);
  console.log(`  • Jobs errored:      ${burstErrors}`);
  console.log(`  • Micro-tasks:       ${totalTasks.toLocaleString()} in queue`);
  console.log('\n🌅 DAILY FORGE PIPELINE:');
  console.log(`  • Status:            ${results.dailyForge?.status || 'unknown'}`);
  console.log(`  • Phases completed:  ${results.dailyForge?.completedCount || '?'}/10`);
  console.log(`  • Phases failed:     ${results.dailyForge?.failedCount || '?'}`);
  console.log(`  • Alignment score:   ${results.dailyForge?.alignmentScore || 0}/100`);
  console.log(`  • Email sent:        ${results.dailyForge?.founderEmailSent ? 'YES' : 'NO'}`);
  console.log('\n📋 CRONS FIRED:');
  results.hyperscale.forEach(r => {
    const icon = r.status === 'fired' ? '✅' : '❌';
    const detail = r.status === 'fired' ? `${r.tasksSpawned} tasks` : r.error;
    console.log(`  ${icon} ${r.job.padEnd(30)} ${detail}`);
  });

  if (results.errors.length > 0) {
    console.log('\n⚠️  ERRORS:');
    results.errors.forEach(e => console.log(`  ❌ ${e.job}: ${e.error}`));
  }

  console.log('\n' + '═'.repeat(72));
  console.log('🔱 THE FULL SWARM AWAKENED. ALL 28 ENGINES FIRED. 🔱');
  console.log('═'.repeat(72) + '\n');

  return results;
}

// Execute
godModeDetonate()
  .then(r => {
    // Write results to JSON file for pickup
    const outPath = process.env.TMPDIR
      ? `${process.env.TMPDIR}/god-mode-results.json`
      : '.tmp/god-mode-results.json';
    require('fs').writeFileSync(outPath, JSON.stringify(r, null, 2));
    console.log(`[god-mode] Results written to ${outPath}`);
    process.exit(0);
  })
  .catch(err => {
    console.error('[god-mode] Fatal:', err);
    process.exit(1);
  });
