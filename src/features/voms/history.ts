// Synthetic monthly history (24 complete months) per terminal for PORTIX
// executive views. Deterministic, illustrative only — not SBMA data.
import { format, subMonths } from 'date-fns'

export const TERMINAL_IDS = ['U-TA', 'U-TB', 'U-TC'] as const
export type TerminalId = (typeof TERMINAL_IDS)[number]

export interface MonthlyRecord {
  unitId: TerminalId
  period: string // yyyy-MM
  calls: number
  throughput: number // TEU (A), MT (B), KL (C)
  turnaroundH: number // ATA → ATD, mean per call
  waitingH: number // ATA → All Fast, mean per call
  utilizationPct: number // berth occupancy share
  productivity: number // moves/h (A), MT/h (B), KL/h (C) — gross berth productivity
  incidents: number // safety, security & environmental
  timelinessPct: number // daily reports received on time
  reliabilityPct: number // arrivals within ±2 h of ETA
  delayByCategoryH: Record<string, number>
}

export const DELAY_CATEGORIES = ['Weather', 'Equipment', 'Awaiting berth', 'Cargo / trucks', 'Labour', 'Documentation'] as const

const noise = (i: number, seed: number) => {
  const x = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453
  return x - Math.floor(x) - 0.5
}

/** Months in the history, oldest first; the latest complete month is last. */
export function historyPeriods(now = new Date(), months = 24): string[] {
  return Array.from({ length: months }, (_, i) => format(subMonths(now, months - i), 'yyyy-MM'))
}

const profile: Record<TerminalId, { calls: number; perCall: number; turn: number; wait: number; util: number; prod: number; seed: number }> = {
  'U-TA': { calls: 22, perCall: 930, turn: 25, wait: 2.3, util: 66, prod: 52, seed: 11 },
  'U-TB': { calls: 14, perCall: 18200, turn: 60, wait: 5.6, util: 72, prod: 610, seed: 22 },
  'U-TC': { calls: 12, perCall: 7900, turn: 29, wait: 2.6, util: 54, prod: 470, seed: 33 },
}

export function buildHistory(now = new Date()): MonthlyRecord[] {
  const periods = historyPeriods(now)
  const out: MonthlyRecord[] = []
  for (const unitId of TERMINAL_IDS) {
    const p = profile[unitId]
    periods.forEach((period, i) => {
      const month = Number(period.slice(5, 7))
      const typhoon = month >= 7 && month <= 10 ? 1 : 0 // seasonal weather impact
      const growth = unitId === 'U-TA' ? 1 + i * 0.006 : 1 // container volumes growing
      const recent = i >= periods.length - 4 ? 1 : 0 // last 4 months
      // Story lines: Terminal B waiting time deteriorates recently (berth congestion);
      // Terminal C report timeliness drops recently; Terminal A productivity improves.
      const bCongestion = unitId === 'U-TB' && recent ? 1 + (i - (periods.length - 5)) * 0.18 : 1
      const calls = Math.max(4, Math.round(p.calls * growth * (1 - 0.08 * typhoon) + noise(i, p.seed) * 4))
      const throughput = Math.round(calls * p.perCall * (1 + noise(i, p.seed + 1) * 0.12))
      const waitingH = +(p.wait * bCongestion * (1 + 0.25 * typhoon) * (1 + noise(i, p.seed + 2) * 0.3)).toFixed(1)
      const turnaroundH = +(p.turn * (1 + 0.06 * typhoon) * (1 + noise(i, p.seed + 3) * 0.12) + (waitingH - p.wait)).toFixed(1)
      const utilizationPct = +Math.min(95, p.util * growth * (1 + noise(i, p.seed + 4) * 0.12) + (unitId === 'U-TB' && recent ? 6 : 0)).toFixed(1)
      const productivity = Math.round(p.prod * (unitId === 'U-TA' ? 1 + i * 0.004 : 1) * (1 - 0.07 * typhoon) * (1 + noise(i, p.seed + 5) * 0.1))
      const incidents = Math.max(0, Math.round(0.6 + noise(i, p.seed + 6) * 2.2 + (unitId === 'U-TB' && month === 8 ? 2 : 0)))
      const timelinessPct = +Math.min(100, (unitId === 'U-TC' && recent ? 84 : 96) + noise(i, p.seed + 7) * 6).toFixed(1)
      const reliabilityPct = +Math.min(100, 82 - 6 * typhoon + noise(i, p.seed + 8) * 10).toFixed(1)
      const totalDelay = Math.max(4, calls * (waitingH * 0.6 + 2) * (1 + noise(i, p.seed + 9) * 0.2))
      const weights = [0.18 + 0.22 * typhoon, 0.2, unitId === 'U-TB' && recent ? 0.34 : 0.14, 0.16, 0.1, 0.08]
      const wsum = weights.reduce((a, b) => a + b, 0)
      const delayByCategoryH = Object.fromEntries(DELAY_CATEGORIES.map((c, k) => [c, +((totalDelay * weights[k]) / wsum).toFixed(1)]))
      out.push({ unitId, period, calls, throughput, turnaroundH, waitingH, utilizationPct, productivity, incidents, timelinessPct, reliabilityPct, delayByCategoryH })
    })
  }
  return out
}
