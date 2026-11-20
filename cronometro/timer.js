'use strict';

/**
 * LapTimer: collects lap durations (in milliseconds) and reports statistics.
 */
class LapTimer {
  constructor() {
    this._laps = [];
  }

  /**
   * Records a lap. `ms` must be a positive, finite number.
   * Throws TypeError for non-numbers and RangeError for NaN, Infinity, zero or negatives.
   * Invalid input leaves the state untouched. Returns the recorded value.
   */
  recordLap(ms) {
    if (typeof ms !== 'number') {
      throw new TypeError('lap duration must be a number');
    }
    if (!Number.isFinite(ms) || ms <= 0) {
      throw new RangeError('lap duration must be a positive finite number');
    }
    this._laps.push(ms);
    return ms;
  }

  /** Clears all recorded laps. */
  reset() {
    this._laps = [];
  }

  /**
   * Returns { count, totalMs, bestMs }. With no laps: { count: 0, totalMs: 0, bestMs: null }.
   * Note: totalMs may be Infinity if the sum of extreme finite laps (near Number.MAX_VALUE) overflows.
   */
  stats() {
    const count = this._laps.length;
    if (count === 0) return { count: 0, totalMs: 0, bestMs: null };
    let totalMs = 0;
    let bestMs = Infinity;
    for (const lap of this._laps) {
      totalMs += lap;
      if (lap < bestMs) bestMs = lap;
    }
    return { count, totalMs, bestMs };
  }
}

module.exports = { LapTimer };
