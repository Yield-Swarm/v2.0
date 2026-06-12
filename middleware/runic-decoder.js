// middleware/runic-decoder.js — Owns: X-Runic header detection, route decoding, backward-compat pass-through.
// Does NOT own: DSL forge logic (services/runic-dsl-engine.js), DB queries (db/runic.js).

'use strict';

const { decodeRunicRoute } = require('../services/runic-dsl-engine');

/**
 * runicDecoder — intercepts requests with X-Runic: true header.
 * Decodes the anagram route → original route, then re-routes internally.
 * Backward compatible: non-Runic requests pass through untouched.
 *
 * WHY: Allows swarm agents to communicate using Runic DSL while the server
 * executes normal Express route handlers. External readers see only Runic noise.
 */
async function runicDecoder(req, res, next) {
  if (req.headers['x-runic'] !== 'true') return next();

  const runicRoute = req.headers['x-runic-target'] || req.path;
  const runicVerb  = req.headers['x-runic-verb']   || req.method;

  try {
    const decoded = await decodeRunicRoute(runicRoute, runicVerb);
    if (decoded) {
      // Rewrite the URL to the decoded original route
      const originalUrl = decoded.target;
      req.runicDecoded = {
        original:    decoded.original,
        runic_route: runicRoute,
        runic_verb:  runicVerb,
        cycle:       decoded.cycle_layer,
      };
      // Internal reroute: update req.url so downstream routing picks the real endpoint
      req.url = originalUrl;
      req.method = decoded.verb;
      res.setHeader('X-Runic-Decoded', 'true');
      res.setHeader('X-Runic-Cycle', decoded.cycle_layer || 'unknown');
    }
    // If no DB match — pass through (could be a new command not yet forged)
  } catch (err) {
    // Decode failure is non-fatal — pass through normally
    console.error('[runic-decoder] decode error:', err.message);
  }

  next();
}

module.exports = { runicDecoder };
