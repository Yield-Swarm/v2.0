// sentry.client.config.js — Sentry client-side initialization for browser
// This file is loaded in EJS templates as a raw script that initializes Sentry in the browser
// Owns: client-side JS error capture, browser performance monitoring
// Does NOT own: server-side errors (see sentry.server.config.js)
// Injected into: views/partials/nav.ejs or layout templates

// This module exports the Sentry CDN loader script tag + inline config
// Usage in EJS: <%- include('sentry-client-snippet', { sentryDsn: process.env.SENTRY_DSN }) %>
// Or inline in layout: <script>/* Sentry init code here */</script>

module.exports = {
  /**
   * Returns the HTML snippet to inject Sentry browser SDK.
   * Usage: <script><%- sentryBrowserSnippet(env.SENTRY_DSN) %></script>
   * @param {string|undefined} dsn - Sentry DSN from server environment
   * @returns {string} JavaScript code to initialize Sentry in browser
   */
  browserSnippet(dsn) {
    if (!dsn) {
      return `// Sentry DSN not configured — browser error tracking disabled
        console.log('[Sentry] SENTRY_DSN not set — client-side error tracking disabled');`;
    }

    // Extract just the public key portion from the DSN (format: https://key@sentry.io/project)
    const publicKey = dsn.split('@')[0].replace('https://', '');

    return `
(function() {
  // Check if Sentry is already loaded to avoid double init
  if (window.Sentry) return;

  // Inject Sentry CDN loader
  var script = document.createElement('script');
  script.src = 'https://browser.sentry-cdn.com/7.115.2/bundle.min.js';
  script.crossorigin = 'anonymous';
  script.onload = function() {
    // Initialize after script loads
    window.Sentry.init({
      dsn: '${dsn}',
      environment: '${process.env.NODE_ENV || 'development'}',
      // Normal release tracking
      release: '${process.env.RENDER_GIT_COMMIT || process.env.HEROKU_SLUG_COMMIT || 'unknown'}',
      // 20% sample rate in production to reduce noise
      tracesSampleRate: '${process.env.NODE_ENV === 'production' ? '0.2' : '1.0'}',
      // Default integrations with some customizations
      defaultIntegrations: true,
      // Strip sensitive query params from error URLs
      beforeSend(event) {
        if (event.request && event.request.url) {
          event.request.url = event.request.url.replace(/([?&])(key|token|secret|password|auth)=[^&]*/g, '$1[REDACTED]');
        }
        return event;
      },
    });
    console.log('[Sentry] Client-side monitoring initialized');
  };
  script.onerror = function() {
    console.warn('[Sentry] Failed to load browser SDK — error tracking disabled');
  };
  document.head.appendChild(script);
})();
`.trim();
  }
};