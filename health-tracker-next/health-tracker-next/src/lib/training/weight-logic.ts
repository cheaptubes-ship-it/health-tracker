export function parseRirFromRepGoal(repGoal: string | null): number | null {
  if (!repGoal) return null
  const m = String(repGoal).trim().match(/^(\d+)\s*\//)
  if (!m) return null
  const n = Number(m[1])
  return Number.isFinite(n) ? n : null
}

export function oneRmFromTenRm(tenRm: number) {
  // Epley estimate: 1RM = w * (1 + reps/30)
  return tenRm * (1 + 10 / 30)
}

export function weightForRepsToFailure(oneRm: number, repsToFailure: number) {
  // Invert Epley: w = 1RM / (1 + reps/30)
  return oneRm / (1 + repsToFailure / 30)
}

export function roundToNearest(value: number, step: number) {
  if (!Number.isFinite(value) || !Number.isFinite(step) || step <= 0) return value
  return Math.round(value / step) * step
}

export function plannedWeightFromTenRm(params: {
  tenRmWeight: number | null
  repGoal: string | null
  unit?: 'lb' | 'kg'
  deloadPhase?: 'half_weight' | 'half_weight_half_volume' | null
}) {
  const { tenRmWeight, repGoal, unit = 'lb', deloadPhase } = params
  if (tenRmWeight == null) return null
  const ten = Number(tenRmWeight)
  if (!Number.isFinite(ten) || ten <= 0) return null

  const rir = parseRirFromRepGoal(repGoal) ?? 2

  // Assumption:
  // - You will typically perform ~10 reps per set.
  // - Rep goal like "3/fail" is interpreted as RIR=3.
  // - Therefore estimated reps-to-failure = 10 + RIR.
  const repsToFailure = 10 + Math.max(0, Math.min(6, rir))

  const oneRm = oneRmFromTenRm(ten)
  let w = weightForRepsToFailure(oneRm, repsToFailure)

  // Deload: half weight (both phases)
  if (deloadPhase === 'half_weight' || deloadPhase === 'half_weight_half_volume') {
    w = w * 0.5
  }

  // Round to sensible plate jumps
  const step = unit === 'kg' ? 1 : 2.5
  return roundToNearest(w, step)
}
