// audit_requires.js — audit all route require() chains
const checks = [
  // Files used WITHOUT __rtr() wrapper — crash if missing or wrong type
  ['./routes/membership', ['adminUpdateTreasury', 'adminAddInvoice', 'adminAssignMiner']],
  ['./routes/founder', 'router'],
  ['./routes/paine-onboarding', 'router'],
  ['./routes/geod-crons', 'router'],
  ['./routes/revenue-analytics', 'router'],
  ['./routes/agent-consciousness', 'router'],
  ['./routes/kairos-conductor', 'router'],
  ['./routes/defi-strategies', 'router'],
  ['./routes/earning', 'router'],
  ['./routes/akash-llm', 'router'],
  ['./routes/agent-marketplace', 'router'],
  ['./routes/plotra-agents', 'router'],
  ['./routes/agent-metals', 'router'],
  ['./routes/agent-bittensor', 'router'],
  ['./routes/admin-bittensor', 'router'],
  ['./routes/helix', 'router'],
  ['./routes/fiduciary', 'router'],
  ['./routes/council-market', 'router'],
  ['./routes/battle-crons', 'router'],
  ['./routes/eternal-crown', 'router'],
  ['./routes/scheduler-admin', 'router'],
  ['./routes/chain-manifest', 'router'],
  ['./routes/tokenomics', 'router'],
  ['./routes/llm-router', 'router'],
  ['./routes/seven-pillars', 'router'],
  ['./routes/telemetry-suite', 'router'],
  ['./routes/admin-replication-engine', 'router'],
  ['./routes/gen1-replication', 'router'],
  ['./routes/helix-battlechain', 'router'],
  ['./routes/chain-rpc', 'router'],
  ['./routes/dual-mining', 'router'],
  ['./routes/listen', 'router'],
  ['./routes/depin-nodes', 'router'],
  ['./routes/admin-node-network', 'router'],
  ['./routes/mobile-mining', 'router'],
  ['./routes/marketing-cron', 'router'],
  ['./routes/crown-kaleidoscope', 'router'],
  ['./routes/admin-wallet-audit', 'router'],
  ['./routes/master-sweep', 'router'],
  ['./routes/shard-replicator', 'router'],
  ['./routes/swarm-coins', 'router'],
  ['./routes/blockchain-pay', 'router'],
  ['./routes/agentmail', 'router'],
  ['./routes/lp-claims', 'router'],
  ['./routes/admin-cross-cloud', 'router'],
  ['./routes/revenue-unified', 'router'],
  ['./routes/agent-cohort', 'router'],
  ['./routes/sovereignty-crons', 'router'],
  ['./routes/admin-performance', 'router'],
  ['./routes/admin-agent-registration', 'router'],
  ['./routes/agent-autonomy', 'router'],
  ['./routes/coinjoin', 'router'],
  ['./routes/swarm-nodes', 'router'],
  ['./routes/cross-chain-harvest', 'router'],
  ['./routes/mining-live', 'router'],
  ['./routes/mining-crons', 'router'],
  ['./routes/bounty-hunter', 'router'],
  ['./routes/immunefi', 'router'],
  ['./routes/bounty-scout', 'router'],
  ['./routes/zec-harvester', 'router'],
  ['./routes/algorithm-stacks', 'router'],
  ['./routes/custom-bridge', 'router'],
  ['./routes/pay', 'router'],
  ['./routes/governance-weights', 'router'],
  ['./routes/swarm-crons', 'router'],
  ['./routes/prosperity-crons', 'router'],
  ['./routes/docs-pages', 'router'],
  ['./routes/identity-claim', 'router'],
  ['./routes/cohort-registry', 'router'],
  ['./routes/alpha-scanner', 'router'],
  ['./routes/provider-arbitrage', 'router'],
  ['./routes/rng-expansion', 'router'],
  ['./routes/council-swarm-response', 'router'],
  ['./routes/runic', 'router'],
  ['./routes/runic-codex-v2', 'router'],
  ['./routes/pipeshard', 'router'],
  ['./routes/cron-helix', 'router'],
  ['./routes/vm-genesis', 'router'],
  ['./routes/shard-hunt', 'router'],
  ['./routes/polsia-webhooks', 'router'],
  ['./routes/task-notifications', 'router'],
  ['./routes/env-shield', 'router'],
  ['./routes/notifications', 'router'],
  ['./routes/auto-claim', 'router'],
  ['./routes/ton-tao-harvester', 'router'],
  ['./routes/social-earnings', 'router'],
  ['./routes/social-media', 'router'],
  ['./routes/admin-crystal', 'router'],
  ['./routes/pentest', 'router'],
  ['./routes/environment-admin', 'router'],
  ['./routes/admin-provider-harvest', 'router'],
  ['./routes/geod-crown', 'router'],
  ['./routes/mal', 'router'],
  ['./routes/admin-agent-audit', 'router'],
  ['./routes/risk-swarms', 'router'],
  ['./routes/admin-provider-analytics', 'router'],
  ['./routes/admin-council-mega-ballot', 'router'],
  ['./routes/admin-status-pages', 'router'],
  ['./routes/helix-core', 'router'],
  ['./routes/cron-registry', 'router'],
  ['./routes/admin-filesystem', 'router'],
  ['./routes/admin-swarm-study', 'router'],
  ['./routes/admin-data-transfer', 'router'],
  ['./routes/tokens-launch', 'router'],
  ['./routes/subdimensional-crons', 'router'],
  ['./routes/apollo', 'router'],
  ['./routes/admin-stubs', 'router'],
  ['./routes/prompt-shield', 'router'],
  ['./routes/web-fragments', 'router'],
  ['./routes/sprint-thirty', 'router'],
  ['./routes/mimir-prosperity', 'router'],
  ['./routes/mimir-drip', 'router'],
  ['./routes/mimir-agents', 'router'],
  ['./routes/deity-swarm', 'router'],
  ['./routes/sovereign-compiler', 'router'],
  ['./routes/admin-builds', 'router'],
  ['./routes/sovereign-stack', 'router'],
  ['./routes/sovereign-deployments', 'router'],
  ['./routes/admin-architecture', 'router'],
  ['./routes/random-shard-drops', 'router'],
  ['./routes/shard-deconstruction', 'router'],
  ['./routes/block-flow', 'router'],
  ['./routes/yield-loop', 'router'],
  ['./routes/network-distribution', 'router'],
  ['./routes/mac-mini-arena', 'router'],
  ['./routes/duna-entities', 'router'],
  ['./routes/mining-pool', 'router'],
  ['./routes/council-loop', 'router'],
  ['./routes/devops-repair', 'router'],
  ['./routes/admin-pow-core', 'router'],
  ['./routes/divine-product-forge', 'router'],
  ['./routes/polsia-divine', 'router'],
  ['./routes/genetic-algorithm', 'router'],
  ['./routes/knowledge-graph', 'router'],
  ['./routes/prophecy-engine', 'router'],
  ['./routes/neural-mesh', 'router'],
  ['./routes/inspire-mesh', 'router'],
  ['./routes/omniscient', 'router'],
  ['./routes/tidal-rebalance', 'router'],
  ['./routes/admin-eternal-shards', 'router'],
  ['./routes/shards-public', 'router'],
  ['./routes/aeternum', 'router'],
  ['./routes/admin-home', 'router'],
  ['./routes/admin-settings', 'router'],
  ['./routes/admin-treasury', 'router'],
  ['./routes/treasury-live', 'router'],
  ['./routes/treasury-ops', 'router'],
  ['./routes/blog', 'router'],
  ['./routes/admin-commitments', 'router'],
  ['./routes/security-audit', 'router'],
  ['./routes/admin-revenue', 'router'],
  ['./routes/admin-crm', 'router'],
  ['./routes/cx-monitor', 'router'],
  ['./routes/admin-cx', 'router'],
  ['./routes/admin-env-audit', 'router'],
  ['./routes/api-gateway-admin', 'router'],
  ['./routes/api-health', 'router'],
  ['./routes/admin-db-health', 'router'],
  ['./routes/system-health', 'router'],
  ['./routes/admin-pm2-status', 'router'],
  ['./routes/atomic-pulse', 'router'],
  ['./routes/raydium-lp-deploy', 'router'],
  ['./routes/admin-blockchain', 'router'],
  ['./routes/admin-filesystem', 'router'],
];

let crashes = 0;
let undefined = 0;
let ok = 0;

for (const [file, expected] of checks) {
  try {
    const m = require(file);
    if (expected === 'router') {
      // Accept: module.exports = router (function), or module.exports = { router }
      const r = (m && m.router) ? m.router : m;
      if (typeof r !== 'function') {
        console.log('UNDEFINED: ' + file + ' — no .router, got keys: [' + Object.keys(m||{}).join(',') + ']');
        undefined++;
      } else {
        ok++;
      }
    } else if (Array.isArray(expected)) {
      // Check named exports (e.g. membershipModule.adminUpdateTreasury)
      for (const n of expected) {
        if (m[n] === undefined) {
          console.log('UNDEFINED: ' + file + '::' + n);
          undefined++;
        } else {
          ok++;
        }
      }
    }
  } catch(e) {
    console.log('CRASH: ' + file + ' — ' + e.message.split('\n')[0]);
    crashes++;
  }
}

console.log('\n=== SUMMARY ===');
console.log('OK: ' + ok + ' | UNDEFINED: ' + undefined + ' | CRASH: ' + crashes);