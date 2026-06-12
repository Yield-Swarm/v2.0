/**
 * middleware/council-engine.js — Engineering task routing through Council weighted vote.
 * Owns: intercept engineering tasks, route through councilReview, tag outcome.
 * Does NOT own: vote tallying (lib/council-engine-protocol.js), route handlers.
 *
 * Behavior:
 *   - tag=engineering tasks → councilReview before execution
 *   - BLOCKED → reject immediately with 403
 *   - ESCALATED → allow execution with warning flag
 *   - APPROVED → proceed
 *   - PENDING (review in progress) → allow with queued flag
 *
 * Works as Express middleware for POST /api/tasks and via standalone review endpoint.
 */

'use strict';

const { councilReview } = require('../lib/council-engine-protocol');

/**
 * Middleware: routes an incoming task through Council review.
 * Attaches: req.councilReview { outcome, approved, blocked, escalated, votes[] }
 */
async function councilReviewMiddleware(req, res, next) {
  // Only review tag=engineering tasks
  if (req.body?.tag !== 'engineering') return next();

  const task = {
    task_id: req.body.task_id || req.body.id,
    title: req.body.title || req.body.description || 'Unnamed task',
    description: req.body.description || '',
    tag: req.body.tag,
    tags: req.body.tags || [],
    priority: req.body.priority || 'medium',
  };

  try {
    const review = await councilReview(task);
    req.councilReview = review;

    if (review.blocked) {
      console.log(`[council-engine] BLOCKED task ${task.task_id}: Odin veto`);
      return res.status(403).json({
        error: 'Council veto — task blocked',
        reason: 'Odin has cast a hard veto on this engineering task.',
        review: {
          outcome: review.outcome,
          yesWeight: review.yesWeight,
          noWeight: review.noWeight,
          threshold: review.threshold,
          odinVeto: review.odinVeto,
        },
      });
    }

    if (!review.approved) {
      // Flag for escalation but allow execution with warning
      req.body.councilEscalated = true;
      req.body.councilWarning = `Council review: ${review.outcome} (${review.yesWeight}/${review.threshold} yes weight)`;
      console.log(`[council-engine] ESCALATED task ${task.task_id}: ${review.yesWeight}/${review.threshold}`);
    }

    // Attach review summary to body for task creation
    req.body.councilApproved = review.approved;
    req.body.councilOutcome = review.outcome;
    req.body.councilVotesCount = review.votes?.length || 0;
    req.body.councilReviewId = review.reviewId;
    req.body.councilDurationMs = review.durationMs;

    next();
  } catch (err) {
    console.error('[council-engine] review failed:', err.message);
    // Don't block task on review failure — log and proceed
    req.body.councilError = err.message;
    next();
  }
}

module.exports = { councilReviewMiddleware };