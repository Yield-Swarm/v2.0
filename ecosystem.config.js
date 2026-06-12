// ecosystem.config.js — PM2 cluster configuration for YieldSwarm
// Azure VM: pm2 start ecosystem.config.js --env production && pm2 save && pm2 startup
// Render:   render.yaml healthCheckPath: /health, PORT env var, POLSIA_IN_PROCESS_CRONS_ENABLED=false
//
// Telegram Swarm Bot (@AdmLLMYSRLbot): TELEGRAM_BOT_TOKEN + TELEGRAM_ALLOWED_CHAT_ID set on Render
// Webhook activation: POST https://yieldswarm.polsia.app/api/telegram-swarm/set-webhook
//
// Dual-cluster strategy:
//   Azure VM   — POLSIA_IN_PROCESS_CRONS_ENABLED=false (crons via polsia.toml → Blaxel trigger)
//   Render     — active executor (crons fire here via polsia.toml during shadow migration)
//   Blaxel     — receives same deploy, polsia.toml crons synced as disabled triggers until cutover

module.exports = {
  apps: [
    {
      name: 'yieldswarm',
      script: './server.js',
      instances: 4,               // cluster mode × 4 (was 2)
      exec_mode: 'cluster',
      max_memory_restart: '1G',   // restart if > 1GB RAM per worker
      node_args: '--max-old-space-size=900 --expose-gc',
      // PM2 ready protocol — server.js calls pm2.trigger('yieldswarm', 'ready') after boot
      wait_ready: true,
      shutdown_target: 8000,
      // Dead Man's Switch: crash-resistant config
      max_restarts: 10,           // max 10 auto-restarts in 1h window
      restart_delay: 2000,        // 2s between restart attempts
      exp_backoff_restart_delay: 100,
      min_uptime: '10s',          // must stay up 10s to count as successful start
      kill_timeout: 10000,
      listen_timeout: 8000,
      kill_retry: 3,
      // Daily 3am memory refresh — prevent long-running OOM accumulation
      cron_restart: '0 3 * * *',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        POLSIA_IN_PROCESS_CRONS_ENABLED: process.env.RENDER ? 'true' : 'false',
        UD_WIRE_BOOT: 'true',  // one-time: fires UD domain wire on next deploy, self-disarms
      },
      error_file: '/var/log/yieldswarm/err.log',
      out_file: '/var/log/yieldswarm/out.log',
      log_file: '/var/log/yieldswarm/combined.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      // Run routes guard on every restart — deletes orphan shadow stubs before Express starts
      post_update: ['node jobs/routes-guard.js'],
    },
  ],
};