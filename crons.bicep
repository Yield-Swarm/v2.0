/*
  azure/crons.bicep
  ─────────────────────────────────────────────────────────────────────────────
  Creates one Azure Logic App (Consumption tier) per cron job.
  Each Logic App has a Recurrence trigger matching the polsia.toml schedule,
  then an HTTP action that POSTs to POST /api/crons/<jobName> on the Azure
  App Service with Authorization: Bearer <CRON_SECRET>.

  DEPLOY:
    az deployment group create \
      --resource-group yieldswarm-rg \
      --template-file azure/crons.bicep \
      --parameters appServiceUrl=https://yieldswarm.azurewebsites.net \
                   cronSecret=<CRON_SECRET value from Render env>

  COST:
    Consumption Logic Apps: $0.000025 per action execution.
    105 Logic Apps × average 48 runs/day × 2 actions each × $0.000025 = ~$0.25/day.

  ARCHITECTURE NOTE:
    These Logic Apps call POST /api/crons/:jobName on the Express app, which
    forks node jobs/*.js as a child process. The HTTP response is 202 Accepted
    (fire-and-forget). Run History in the Azure portal shows each trigger execution.
*/

@description('Azure App Service URL after DNS cutover, e.g. https://yieldswarm.azurewebsites.net')
param appServiceUrl string

@description('CRON_SECRET value — same env var set on the App Service')
@secure()
param cronSecret string

@description('Azure region for all Logic Apps')
param location string = resourceGroup().location

// ─────────────────────────────────────────────────────────────────────────────
// Helper: the 6 critical ElizaOS agent crons get an additional tag so they
// can be filtered in the Azure portal: Tag: ElizaOsAgent = true.
// ─────────────────────────────────────────────────────────────────────────────

// ── Every-minute crons ───────────────────────────────────────────────────────
module blockRenderer1m 'modules/logicapp-cron.bicep' = {
  name: 'la-block-renderer-1m'
  params: {
    jobName: 'block-renderer-1m'
    appServiceUrl: appServiceUrl
    cronSecret: cronSecret
    location: location
    intervalMinutes: 1
    frequencyUnit: 'Minute'
  }
}

module blockRendererU20 'modules/logicapp-cron.bicep' = {
  name: 'la-block-renderer-u20'
  params: {
    jobName: 'block-renderer-u20'
    appServiceUrl: appServiceUrl
    cronSecret: cronSecret
    location: location
    intervalMinutes: 1
    frequencyUnit: 'Minute'
  }
}

module codexEnforcer1m 'modules/logicapp-cron.bicep' = {
  name: 'la-codex-enforcer-1m'
  params: {
    jobName: 'codex-enforcer-1m'
    appServiceUrl: appServiceUrl
    cronSecret: cronSecret
    location: location
    intervalMinutes: 1
    frequencyUnit: 'Minute'
  }
}

module helixBlockProducer 'modules/logicapp-cron.bicep' = {
  name: 'la-helix-block-producer'
  params: {
    jobName: 'helix-block-producer'
    appServiceUrl: appServiceUrl
    cronSecret: cronSecret
    location: location
    intervalMinutes: 1
    frequencyUnit: 'Minute'
  }
}

module helixBlockSync 'modules/logicapp-cron.bicep' = {
  name: 'la-helix-block-sync'
  params: {
    jobName: 'helix-block-sync'
    appServiceUrl: appServiceUrl
    cronSecret: cronSecret
    location: location
    intervalMinutes: 1
    frequencyUnit: 'Minute'
  }
}

module miningPoolRewards 'modules/logicapp-cron.bicep' = {
  name: 'la-mining-pool-rewards'
  params: {
    jobName: 'mining-pool-rewards'
    appServiceUrl: appServiceUrl
    cronSecret: cronSecret
    location: location
    intervalMinutes: 1
    frequencyUnit: 'Minute'
  }
}

module powShardLoop 'modules/logicapp-cron.bicep' = {
  name: 'la-pow-shard-loop'
  params: {
    jobName: 'pow-shard-loop'
    appServiceUrl: appServiceUrl
    cronSecret: cronSecret
    location: location
    intervalMinutes: 1
    frequencyUnit: 'Minute'
  }
}

module yswarmCoinEmit 'modules/logicapp-cron.bicep' = {
  name: 'la-yswarm-coin-emit'
  params: {
    jobName: 'yswarm-coin-emit'
    appServiceUrl: appServiceUrl
    cronSecret: cronSecret
    location: location
    intervalMinutes: 1
    frequencyUnit: 'Minute'
  }
}

module ysBondCurveMonitor 'modules/logicapp-cron.bicep' = {
  name: 'la-ys-bond-curve-monitor'
  params: {
    jobName: 'ys-bond-curve-monitor'
    appServiceUrl: appServiceUrl
    cronSecret: cronSecret
    location: location
    intervalMinutes: 1
    frequencyUnit: 'Minute'
  }
}

module ysPriceFeedAlert 'modules/logicapp-cron.bicep' = {
  name: 'la-ys-price-feed-alert'
  params: {
    jobName: 'ys-price-feed-alert'
    appServiceUrl: appServiceUrl
    cronSecret: cronSecret
    location: location
    intervalMinutes: 1
    frequencyUnit: 'Minute'
  }
}

// ── Every 2 minutes ──────────────────────────────────────────────────────────

module throrDefense 'modules/logicapp-cron.bicep' = {
  name: 'la-thror-defense'
  params: {
    jobName: 'thror-defense'
    appServiceUrl: appServiceUrl
    cronSecret: cronSecret
    location: location
    intervalMinutes: 2
    frequencyUnit: 'Minute'
  }
}

module shardReassembler 'modules/logicapp-cron.bicep' = {
  name: 'la-shard-reassembler-2m'
  params: {
    jobName: 'shard-reassembler-2m'
    appServiceUrl: appServiceUrl
    cronSecret: cronSecret
    location: location
    intervalMinutes: 2
    frequencyUnit: 'Minute'
  }
}

// ── Every 5 minutes — CRITICAL ElizaOS agents ────────────────────────────────

module agentHeartbeat 'modules/logicapp-cron.bicep' = {
  name: 'la-agent-heartbeat'
  params: {
    jobName: 'agent-heartbeat'
    appServiceUrl: appServiceUrl
    cronSecret: cronSecret
    location: location
    intervalMinutes: 5
    frequencyUnit: 'Minute'
    tags: { ElizaOsAgent: 'true', Agents: 'minewatch,netmap,shieldroute,yieldforge,bridgeguard,granthunter' }
  }
}

module councilEngineReview 'modules/logicapp-cron.bicep' = {
  name: 'la-council-engine-review'
  params: {
    jobName: 'council-engine-review'
    appServiceUrl: appServiceUrl
    cronSecret: cronSecret
    location: location
    intervalMinutes: 5
    frequencyUnit: 'Minute'
  }
}

module helixL2Sync 'modules/logicapp-cron.bicep' = {
  name: 'la-helix-l2-sync'
  params: {
    jobName: 'helix-l2-sync'
    appServiceUrl: appServiceUrl
    cronSecret: cronSecret
    location: location
    intervalMinutes: 5
    frequencyUnit: 'Minute'
    tags: { ElizaOsAgent: 'true', Agents: 'shieldroute' }
  }
}

module helixNodeHealth 'modules/logicapp-cron.bicep' = {
  name: 'la-helix-node-health'
  params: {
    jobName: 'helix-node-health'
    appServiceUrl: appServiceUrl
    cronSecret: cronSecret
    location: location
    intervalMinutes: 5
    frequencyUnit: 'Minute'
  }
}

module helixValidatorHealth 'modules/logicapp-cron.bicep' = {
  name: 'la-helix-validator-health'
  params: {
    jobName: 'helix-validator-health'
    appServiceUrl: appServiceUrl
    cronSecret: cronSecret
    location: location
    intervalMinutes: 5
    frequencyUnit: 'Minute'
    tags: { ElizaOsAgent: 'true', Agents: 'shieldroute,bridgeguard' }
  }
}

module kimi50TradingCycle 'modules/logicapp-cron.bicep' = {
  name: 'la-kimi50-trading-cycle'
  params: {
    jobName: 'kimi50-trading-cycle'
    appServiceUrl: appServiceUrl
    cronSecret: cronSecret
    location: location
    intervalMinutes: 5
    frequencyUnit: 'Minute'
    tags: { ElizaOsAgent: 'true', Agents: 'yieldforge' }
  }
}

module mayhemStriker2Watchdog 'modules/logicapp-cron.bicep' = {
  name: 'la-mayhem-striker-2-watchdog'
  params: {
    jobName: 'mayhem-striker-2-watchdog'
    appServiceUrl: appServiceUrl
    cronSecret: cronSecret
    location: location
    intervalMinutes: 5
    frequencyUnit: 'Minute'
  }
}

module miningHashratePoll 'modules/logicapp-cron.bicep' = {
  name: 'la-mining-hashrate-poll'
  params: {
    jobName: 'mining-hashrate-poll'
    appServiceUrl: appServiceUrl
    cronSecret: cronSecret
    location: location
    intervalMinutes: 5
    frequencyUnit: 'Minute'
    tags: { ElizaOsAgent: 'true', Agents: 'minewatch' }
  }
}

module taoWalletPoll 'modules/logicapp-cron.bicep' = {
  name: 'la-tao-wallet-poll'
  params: {
    jobName: 'tao-wallet-poll'
    appServiceUrl: appServiceUrl
    cronSecret: cronSecret
    location: location
    intervalMinutes: 5
    frequencyUnit: 'Minute'
  }
}

module tradingComEmailFetcher 'modules/logicapp-cron.bicep' = {
  name: 'la-trading-com-email-fetcher'
  params: {
    jobName: 'trading-com-email-fetcher'
    appServiceUrl: appServiceUrl
    cronSecret: cronSecret
    location: location
    intervalMinutes: 5
    frequencyUnit: 'Minute'
  }
}

// ── Every 7 minutes ──────────────────────────────────────────────────────────

module cosmosAtomicCycle 'modules/logicapp-cron.bicep' = {
  name: 'la-cosmos-atomic-cycle'
  params: {
    jobName: 'cosmos-atomic-cycle'
    appServiceUrl: appServiceUrl
    cronSecret: cronSecret
    location: location
    intervalMinutes: 7
    frequencyUnit: 'Minute'
    tags: { ElizaOsAgent: 'true', Agents: 'yieldforge' }
  }
}

module councilGovernancePulse 'modules/logicapp-cron.bicep' = {
  name: 'la-council-governance-pulse'
  params: {
    jobName: 'council-governance-pulse'
    appServiceUrl: appServiceUrl
    cronSecret: cronSecret
    location: location
    intervalMinutes: 7
    frequencyUnit: 'Minute'
  }
}

module helixAgentBalanceSweep 'modules/logicapp-cron.bicep' = {
  name: 'la-helix-agent-balance-sweep'
  params: {
    jobName: 'helix-agent-balance-sweep'
    appServiceUrl: appServiceUrl
    cronSecret: cronSecret
    location: location
    intervalMinutes: 7
    frequencyUnit: 'Minute'
  }
}

module kalediscopeSopCosmos 'modules/logicapp-cron.bicep' = {
  name: 'la-kalediscope-sop-cosmos-sync'
  params: {
    jobName: 'kalediscope-sop-cosmos-sync'
    appServiceUrl: appServiceUrl
    cronSecret: cronSecret
    location: location
    intervalMinutes: 7
    frequencyUnit: 'Minute'
  }
}

module marketingBroadcast 'modules/logicapp-cron.bicep' = {
  name: 'la-marketing-broadcast-cosmos-sync'
  params: {
    jobName: 'marketing-broadcast-cosmos-sync'
    appServiceUrl: appServiceUrl
    cronSecret: cronSecret
    location: location
    intervalMinutes: 7
    frequencyUnit: 'Minute'
  }
}

module pumpFunGraduationWatcher 'modules/logicapp-cron.bicep' = {
  name: 'la-pump-fun-graduation-watcher'
  params: {
    jobName: 'pump-fun-graduation-watcher'
    appServiceUrl: appServiceUrl
    cronSecret: cronSecret
    location: location
    intervalMinutes: 7
    frequencyUnit: 'Minute'
  }
}

module yieldAlertPulse 'modules/logicapp-cron.bicep' = {
  name: 'la-yield-alert-pulse-cosmos-sync'
  params: {
    jobName: 'yield-alert-pulse-cosmos-sync'
    appServiceUrl: appServiceUrl
    cronSecret: cronSecret
    location: location
    intervalMinutes: 7
    frequencyUnit: 'Minute'
  }
}

module ysMarketingBroadcast 'modules/logicapp-cron.bicep' = {
  name: 'la-ys-marketing-broadcast'
  params: {
    jobName: 'ys-marketing-broadcast'
    appServiceUrl: appServiceUrl
    cronSecret: cronSecret
    location: location
    intervalMinutes: 7
    frequencyUnit: 'Minute'
  }
}

// ── Every 10 minutes ─────────────────────────────────────────────────────────

module emailForwardRetry 'modules/logicapp-cron.bicep' = {
  name: 'la-email-forward-retry'
  params: {
    jobName: 'email-forward-retry'
    appServiceUrl: appServiceUrl
    cronSecret: cronSecret
    location: location
    intervalMinutes: 10
    frequencyUnit: 'Minute'
  }
}

module helixMultiBridgeHealth 'modules/logicapp-cron.bicep' = {
  name: 'la-helix-multi-bridge-health'
  params: {
    jobName: 'helix-multi-bridge-health'
    appServiceUrl: appServiceUrl
    cronSecret: cronSecret
    location: location
    intervalMinutes: 10
    frequencyUnit: 'Minute'
    tags: { ElizaOsAgent: 'true', Agents: 'bridgeguard' }
  }
}

module zecPriceSync 'modules/logicapp-cron.bicep' = {
  name: 'la-zec-price-sync'
  params: {
    jobName: 'zec-price-sync'
    appServiceUrl: appServiceUrl
    cronSecret: cronSecret
    location: location
    intervalMinutes: 10
    frequencyUnit: 'Minute'
  }
}

// ── Every 15 minutes ─────────────────────────────────────────────────────────

module blueforgeSync 'modules/logicapp-cron.bicep' = {
  name: 'la-blueforge-mining-sync'
  params: {
    jobName: 'blueforge-mining-sync'
    appServiceUrl: appServiceUrl
    cronSecret: cronSecret
    location: location
    intervalMinutes: 15
    frequencyUnit: 'Minute'
  }
}

module eternalHelixSuperCycle 'modules/logicapp-cron.bicep' = {
  name: 'la-eternal-helix-super-cycle'
  params: {
    jobName: 'eternal-helix-super-cycle'
    appServiceUrl: appServiceUrl
    cronSecret: cronSecret
    location: location
    intervalMinutes: 15
    frequencyUnit: 'Minute'
  }
}

module goldPriceFetch 'modules/logicapp-cron.bicep' = {
  name: 'la-gold-price-fetch'
  params: {
    jobName: 'gold-price-fetch'
    appServiceUrl: appServiceUrl
    cronSecret: cronSecret
    location: location
    intervalMinutes: 15
    frequencyUnit: 'Minute'
  }
}

module portfolioScan 'modules/logicapp-cron.bicep' = {
  name: 'la-portfolio-scan'
  params: {
    jobName: 'portfolio-scan'
    appServiceUrl: appServiceUrl
    cronSecret: cronSecret
    location: location
    intervalMinutes: 15
    frequencyUnit: 'Minute'
  }
}

module taoSubnetHarvest 'modules/logicapp-cron.bicep' = {
  name: 'la-tao-subnet-harvest'
  params: {
    jobName: 'tao-subnet-harvest'
    appServiceUrl: appServiceUrl
    cronSecret: cronSecret
    location: location
    intervalMinutes: 15
    frequencyUnit: 'Minute'
  }
}

module vaultRiskSnapshot 'modules/logicapp-cron.bicep' = {
  name: 'la-vault-risk-snapshot'
  params: {
    jobName: 'vault-risk-snapshot'
    appServiceUrl: appServiceUrl
    cronSecret: cronSecret
    location: location
    intervalMinutes: 15
    frequencyUnit: 'Minute'
    tags: { ElizaOsAgent: 'true', Agents: 'yieldforge' }
  }
}

module yslrBlockScan 'modules/logicapp-cron.bicep' = {
  name: 'la-yslr-block-scan'
  params: {
    jobName: 'yslr-block-scan'
    appServiceUrl: appServiceUrl
    cronSecret: cronSecret
    location: location
    intervalMinutes: 15
    frequencyUnit: 'Minute'
  }
}

// ── Every 30 minutes ─────────────────────────────────────────────────────────

module mayhemStriker1 'modules/logicapp-cron.bicep' = {
  name: 'la-mayhem-striker-1-watchdog'
  params: {
    jobName: 'mayhem-striker-1-watchdog'
    appServiceUrl: appServiceUrl
    cronSecret: cronSecret
    location: location
    intervalMinutes: 10
    frequencyUnit: 'Minute'
  }
}

module miningPayoutCheck 'modules/logicapp-cron.bicep' = {
  name: 'la-mining-payout-check'
  params: {
    jobName: 'mining-payout-check'
    appServiceUrl: appServiceUrl
    cronSecret: cronSecret
    location: location
    intervalMinutes: 30
    frequencyUnit: 'Minute'
  }
}

module pumpSniperMonitor 'modules/logicapp-cron.bicep' = {
  name: 'la-pump-sniper-monitor'
  params: {
    jobName: 'pump-sniper-monitor'
    appServiceUrl: appServiceUrl
    cronSecret: cronSecret
    location: location
    intervalMinutes: 30
    frequencyUnit: 'Minute'
  }
}

module twitterEngagementMonitor 'modules/logicapp-cron.bicep' = {
  name: 'la-twitter-engagement-monitor'
  params: {
    jobName: 'twitter-engagement-monitor'
    appServiceUrl: appServiceUrl
    cronSecret: cronSecret
    location: location
    intervalMinutes: 30
    frequencyUnit: 'Minute'
  }
}

module yggdrasilPulse 'modules/logicapp-cron.bicep' = {
  name: 'la-yggdrasil-pulse'
  params: {
    jobName: 'yggdrasil-pulse'
    appServiceUrl: appServiceUrl
    cronSecret: cronSecret
    location: location
    intervalMinutes: 30
    frequencyUnit: 'Minute'
  }
}

module yieldKolTweetBlast 'modules/logicapp-cron.bicep' = {
  name: 'la-yield-kol-tweet-blast'
  params: {
    jobName: 'yield-kol-tweet-blast'
    appServiceUrl: appServiceUrl
    cronSecret: cronSecret
    location: location
    intervalMinutes: 30
    frequencyUnit: 'Minute'
  }
}
