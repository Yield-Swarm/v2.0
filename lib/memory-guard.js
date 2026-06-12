// lib/memory-guard.js — OOM protection via setInterval monkey-patch
// MUST be first require in server.js

const originalSetInterval = global.setInterval;
const intervals = new Map(); // id -> { fn, ms, created }
let globalId = 1;

/**
 * Monkey-patch setInterval to track all intervals for leak detection and cleanup.
 * Exposes: global.getIntervalCount() and global.clearAllIntervals()
 */
function installMemoryGuard() {
  global.setInterval = function(fn, ms, ...args) {
    const id = globalId++;
    const wrapped = () => {
      try {
        fn.apply(this, args);
      } catch (err) {
        console.error('[memory-guard] interval error:', err.message);
      }
    };
    const timer = originalSetInterval(wrapped, ms);
    intervals.set(id, { timer, fn: fn.toString().slice(0, 200), ms, created: Date.now() });
    // Return the real timer so .unref() works
    return timer;
  };

  global.clearInterval = function(id) {
    if (typeof id === 'object' && id !== null) {
      // Clear by timer object (from native setInterval)
      originalClearInterval(id);
      // Also remove from our tracking
      for (const [key, entry] of intervals) {
        if (entry.timer === id) { intervals.delete(key); break; }
      }
      return;
    }
    // Legacy numeric id
    const entry = intervals.get(id);
    if (entry) {
      originalClearInterval(entry.timer);
      intervals.delete(id);
    }
  };

  global.getIntervalCount = () => intervals.size;
  global.clearAllIntervals = () => {
    for (const [id, entry] of intervals) {
      clearInterval(entry.timer);
      intervals.delete(id);
    }
  };

  // Interval leak detection: warn if > 100 intervals
  const _checkInterval = originalSetInterval(() => {
    const count = intervals.size;
    if (count > 100) {
      console.warn(`[memory-guard] ${count} active intervals — possible leak`);
    }
  }, 30000);
  if (_checkInterval.unref) _checkInterval.unref();
}

installMemoryGuard();
module.exports = {};
