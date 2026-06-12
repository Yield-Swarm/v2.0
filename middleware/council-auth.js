/**
 * middleware/council-auth.js — Verifies requester is a seated Council agent.
 * Used to gate sensitive operations (treasury execute, spawn, etc).
 */

'use strict';

const { pool } = require('../db/index');
const dbCouncil14 = require('../db/council-14-seats');

/**
 * Middleware: requireCouncilMember
 * Looks up holder_agent_id on the request from Authorization header or req.agentId.
 * If the agent holds a seated Council position → next()
 * If not → 403 Forbidden
 */
function requireCouncilMember(req, res, next) {
  // Agent ID comes from JWT/session/header
  const agentId = parseInt(req.headers['x-agent-id'] || req.body?.agentId || req.query?.agentId);
  if (!agentId) {
    return res.status(401).json({ ok: false, error: 'Agent ID required for Council operations' });
  }

  dbCouncil14.verifyCouncilMember(pool, agentId)
    .then(seat => {
      if (!seat) {
        return res.status(403).json({
          ok: false,
          error: 'Council member only. Unauthorized request.',
        });
      }
      req.councilSeat = seat;
      next();
    })
    .catch(err => {
      res.status(500).json({ ok: false, error: err.message });
    });
}

/**
 * Middleware: requireSeat
 * Requires a specific seat to be held (e.g. FORGE for treasury execution)
 * @param {string|number} seatNameOrId — seat name like 'FORGE' or numeric seat ID
 */
function requireSeat(seatNameOrId) {
  return (req, res, next) => {
    const agentId = parseInt(req.headers['x-agent-id'] || req.body?.agentId || req.query?.agentId);
    if (!agentId) {
      return res.status(401).json({ ok: false, error: 'Agent ID required' });
    }

    dbCouncil14.verifyCouncilMember(pool, agentId)
      .then(seat => {
        if (!seat) {
          return res.status(403).json({ ok: false, error: 'Council member required' });
        }
        const matches = typeof seatNameOrId === 'string'
          ? seat.seat_name === seatNameOrId
          : seat.id === seatNameOrId;
        if (!matches) {
          return res.status(403).json({
            ok: false,
            error: `Seat '${seatNameOrId}' required. You hold: '${seat.seat_name}'`,
          });
        }
        req.councilSeat = seat;
        next();
      })
      .catch(err => res.status(500).json({ ok: false, error: err.message }));
  };
}

/**
 * Optional middleware: attachCouncilSeat
 * Attaches seat info to request if agent is a Council member (doesn't block if not)
 */
function attachCouncilSeat(req, res, next) {
  const agentId = parseInt(req.headers['x-agent-id'] || req.body?.agentId || req.query?.agentId);
  if (!agentId) { return next(); }

  dbCouncil14.verifyCouncilMember(pool, agentId)
    .then(seat => {
      req.councilSeat = seat || null;
      next();
    })
    .catch(() => { req.councilSeat = null; next(); });
}

module.exports = {
  requireCouncilMember,
  requireSeat,
  attachCouncilSeat,
};