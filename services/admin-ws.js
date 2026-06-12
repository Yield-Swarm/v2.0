let lastTiming = null;

function recordTiming(path, ms) {
  lastTiming = { path, ms, ts: Date.now() };
}

function getLastTiming() {
  return lastTiming;
}

module.exports = { recordTiming, getLastTiming };
