/**
 * Mirrors backend/src/main/java/com/schoolsystem/service/BillingRules.java.
 * Used only to show estimates before confirming; the backend always computes the real amounts.
 * Keep these in sync if the backend values change.
 */
export const MAX_UNITS = 24
export const COST_PER_UNIT = 1000
export const DOWNPAYMENT = 1000
export const FULL_PAYMENT_DISCOUNT = 0.05

/** Estimated cost for a number of units under each payment plan. */
export function estimateCost(units) {
  const total = units * COST_PER_UNIT
  const fullPlan = Math.round(total * (1 - FULL_PAYMENT_DISCOUNT) * 100) / 100
  const perQuarter = Math.max(total - DOWNPAYMENT, 0) / 4
  return { total, fullPlan, discount: total - fullPlan, perQuarter }
}

