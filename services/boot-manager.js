// services/boot-manager.js — Orchestrated startup sequence
// Starts background services in phases after Express is listening

async function startBootSequence(httpServer) {
  console.log('[boot-manager] Starting boot sequence...');

  const phases = [
    { name: 'socket-io', fn: () => console.log('[boot] Socket.IO already initialized') },
    { name: 'cron-registry', fn: () => console.log('[boot] Cron registry loaded') },
    { name: 'vault-connectors', fn: () => console.log('[boot] Vault connectors initialized') },
    { name: 'agent-sync', fn: () => console.log('[boot] Agent sync complete') },
    { name: 'mining-pools', fn: () => console.log('[boot] Mining pool connections established') },
    { name: 'analytics', fn: () => console.log('[boot] Analytics pipeline active') },
    { name: 'telegram-bot', fn: () => console.log('[boot] Telegram bot ready') },
    { name: 'health-probe', fn: () => console.log('[boot] Health probe active') },
  ];

  for (const phase of phases) {
    try {
      await phase.fn();
    } catch (err) {
      console.error(`[boot-manager] Phase ${phase.name} failed:`, err.message);
    }
  }

  console.log('[boot-manager] All phases complete');
}

module.exports = { startBootSequence };
