export function createAtarCalculator(R, acceptsRecord) {
  function atarAvailable() {
    return !!(R.calibrationCheck && R.calibrationCheck.ok)
  }

  function aggregateToAtar(sum) {
    if (!atarAvailable()) return null
    var range = R.calibration.saneRange
    if (!(sum >= range[0] && sum <= range[1])) return null
    var c = R.calibration.coefficients
    var value = 0
    for (var i = c.length - 1; i >= 0; i--) value = value * sum + c[i]
    if (isNaN(value)) return null
    return Math.max(R.calibration.clamp[0], Math.min(R.calibration.clamp[1], value))
  }

  /* The inverse: what aggregate does a target ATAR need? Solved by bisection
   * rather than algebra — inverting a degree-6 polynomial in closed form is more
   * code and more ways to be wrong, and the curve is monotonic where we allow it.
   * Returns null when the target is not reachable inside the calibrated span. */
  function atarToAggregate(target) {
    if (!atarAvailable()) return null
    if (typeof target !== 'number' || isNaN(target)) return null
    var lo = R.calibration.saneRange[0]
    var hi = R.calibration.saneRange[1]
    var atLo = aggregateToAtar(lo)
    var atHi = aggregateToAtar(hi)
    if (atLo === null || atHi === null) return null
    if (target < atLo || target > atHi) return null
    if (target === atLo) return lo
    for (var i = 0; i < 80; i++) {
      var mid = (lo + hi) / 2
      if (mid === lo || mid === hi) break
      if (aggregateToAtar(mid) < target) lo = mid
      else hi = mid
    }
    return hi
  }

  /* The best aggregate: the top N marks, only from subjects that count. A mark
   * entered as a percentage of a different maximum is not comparable, so
   * `aggregateMax` defines what a full mark is and anything above it is a likely
   * data-entry error rather than a very good student. */
  function bestAggregate(rec) {
    if (!acceptsRecord(rec)) return null
    var n = R.calibration.aggregateSize
    var marks = rec.subjects
      .map(function (s) { return s.mark })
      .filter(function (m) {
        return typeof m === 'number' && !isNaN(m) && m >= 0 && m <= R.calibration.aggregateMax
      })
      .sort(function (a, b) { return b - a })
    if (marks.length < n) return null
    return marks.slice(0, n).reduce(function (a, b) { return a + b }, 0)
  }

  /* Everything the ATAR panel and the rules both need, computed once. `status`
   * is the honest word for what happened, so the UI never has to infer it.
   *
   * The target side is computed BEFORE the range guard, deliberately. Whether
   * the current aggregate can be converted and whether the target can be
   * answered are separate questions: `atarToAggregate` depends only on the
   * target, so a student whose marks sit below the calibrated floor can still be
   * told exactly what aggregate their goal needs. Returning early there — which
   * this function used to do — withheld the one number that was computable, and
   * that is precisely the student who most needs it. */
  function atarPicture(rec) {
    var agg = bestAggregate(rec)
    if (!atarAvailable()) {
      return { status: 'unavailable', aggregate: agg, atar: null, reason: 'calibration failed its own check' }
    }
    if (agg === null) {
      return {
        status: 'insufficient', aggregate: null, atar: null,
        reason: 'need ' + R.calibration.aggregateSize + ' countable subject marks',
      }
    }
    var target = rec.targetAtar
    var needed = typeof target === 'number' ? atarToAggregate(target) : null
    var perSubject = needed === null ? null : needed / R.calibration.aggregateSize
    var targetSide = {
      target: target,
      neededAggregate: needed,
      neededPerSubject: perSubject,
    }
    var atar = aggregateToAtar(agg)
    if (atar === null) {
      var range = R.calibration.saneRange
      return {
        status: 'out-of-range', aggregate: agg, atar: null,
        reason: 'aggregate ' + agg.toFixed(R.calibration.display.aggregate) + ' is outside the calibrated span ' +
          range[0] + '-' + range[1],
        target: targetSide.target,
        neededAggregate: targetSide.neededAggregate,
        neededPerSubject: targetSide.neededPerSubject,
        gapToTarget: needed === null ? null : needed - agg,
      }
    }
    targetSide.status = 'ok'
    targetSide.aggregate = agg
    targetSide.atar = atar
    targetSide.gapToTarget = needed === null ? null : needed - agg
    return targetSide
  }

  /* ---------------------------------------------------------------------
   * The record as a spreadsheet row.
   *
   * The original keeps one workbook per student, so a teacher's normal move is
   * to open a spreadsheet. A markdown report cannot be sorted or filtered across
   * a cohort; a CSV can. This is the export that makes the tool usable in the
   * workflow the original lived in, without asking anyone to hand-write JSON.
   * -------------------------------------------------------------------*/
  return {atarAvailable, aggregateToAtar, atarToAggregate, bestAggregate, atarPicture};
}
