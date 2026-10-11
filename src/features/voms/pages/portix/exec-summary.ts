// Pure, rule-based helpers for the PORTIX Executive Overview: risk ranking,
// management-action summary and the simulated executive summary (verified
// facts → interpretation → proposed actions). No React, no store access, so
// everything here can be unit-tested with synthetic inputs.
import { TERMINAL_IDS, type MonthlyRecord, type TerminalId } from '../../history'
import { kpiById, kpiStatus, kpiTarget, kpiValue, kpiVariancePct, periodLabel, previousPeriod, scopeLabel, unitOf, type KpiId, type Scope } from '../../kpi'
import type { ActionPriority, ActionStatus, Alert, AlertSeverity, ManagementAction } from '../../types'

// ---- Shared helpers --------------------------------------------------------

const fmt = (v: number) => (Math.abs(v) >= 1000 ? Math.round(v).toLocaleString('en-US') : String(+v.toFixed(1)))
const withUnit = (v: number, unit: string) => (unit === '%' ? `${fmt(v)}%` : unit ? `${fmt(v)} ${unit}` : fmt(v))

export const isTerminal = (id: string): id is TerminalId => (TERMINAL_IDS as readonly string[]).includes(id)

/** Terminals covered by a scope, restricted to the scopes the session may view. */
export function terminalsInScope(scope: Scope, allowed: Scope[]): TerminalId[] {
  if (scope !== 'PORT') return allowed.includes(scope) ? [scope] : []
  return allowed.filter(isTerminal)
}

// ---- Risks ---------------------------------------------------------------------

const sevRank: Record<AlertSeverity, number> = { critical: 4, serious: 3, warning: 2, info: 1 }

/** Open / acknowledged alerts in scope, sorted by severity, then escalation, then newest. */
export function topRisks(alerts: Alert[], scope: Scope): Alert[] {
  return alerts
    .filter((a) => a.status !== 'resolved' && (scope === 'PORT' || a.unitId === scope))
    .sort((a, b) => sevRank[b.severity] - sevRank[a.severity] || (b.escalation ?? 1) - (a.escalation ?? 1) || b.time.localeCompare(a.time))
}

/** Action scope for an alert: the terminal when the alert is terminal-specific, else port-wide. */
export const alertScope = (a: Alert): Scope => (isTerminal(a.unitId) ? a.unitId : 'PORT')

// ---- Management actions ------------------------------------------------------

const OPEN: ActionStatus[] = ['proposed', 'in_progress', 'blocked']
export const isOverdue = (a: ManagementAction, today: string) => OPEN.includes(a.status) && a.dueDate < today

export function actionsInScope(actions: ManagementAction[], scope: Scope): ManagementAction[] {
  return scope === 'PORT' ? actions : actions.filter((a) => a.scope === scope)
}

export function actionSummary(actions: ManagementAction[], today: string) {
  const counts: Record<'proposed' | 'in_progress' | 'blocked' | 'done', number> = { proposed: 0, in_progress: 0, blocked: 0, done: 0 }
  for (const a of actions) if (a.status in counts) counts[a.status as keyof typeof counts]++
  const overdue = actions.filter((a) => isOverdue(a, today))
  const urgent = actions
    .filter((a) => OPEN.includes(a.status))
    .sort((a, b) => Number(isOverdue(b, today)) - Number(isOverdue(a, today)) || a.dueDate.localeCompare(b.dueDate))
    .slice(0, 5)
  return { counts, overdue: overdue.length, urgent }
}

// ---- Executive summary -----------------------------------------------------

export interface SummaryFact {
  text: string
  /** Citation, e.g. "KPI-002 · Terminal B · Sep 2026". */
  source: string
}

export interface SummaryInterpretation {
  text: string
  basis: string
}

export interface ProposedAction {
  title: string
  issue: string
  recommendedAction: string
  kpiId?: KpiId
  scope: Scope
  priority: ActionPriority
}

export interface ExecSummary {
  facts: SummaryFact[]
  interpretation: SummaryInterpretation[]
  proposals: ProposedAction[]
}

export interface ExecSummaryInput {
  history: MonthlyRecord[]
  periods: string[]
  period: string
  /** Selected scope (PORT or a terminal). */
  scope: Scope
  /** Scopes the session may view; terminals outside this list are never analysed. */
  scopes: Scope[]
  alerts: Alert[]
  actions: ManagementAction[]
  /** yyyy-MM-dd, for overdue detection. */
  today: string
}

/** KPIs scanned for off-target readings and month-on-month change. */
const SCANNED: KpiId[] = ['KPI-001', 'KPI-002', 'KPI-003', 'KPI-004', 'KPI-005', 'KPI-006', 'KPI-008', 'KPI-009']

const cite = (id: KpiId, t: Scope, period: string) => `${id} · ${scopeLabel(t)} · ${periodLabel(period)}`

/** Consecutive month-on-month deteriorations of a KPI ending at `period`. */
export function worseningStreak(history: MonthlyRecord[], periods: string[], id: KpiId, scope: Scope, period: string) {
  const k = kpiById[id]
  let n = 0
  for (let i = periods.indexOf(period); i > 0; i--) {
    const cur = kpiValue(history, id, scope, periods[i])
    const prev = kpiValue(history, id, scope, periods[i - 1])
    if (cur === null || prev === null) break
    const worse = k.direction === 'lower' ? cur > prev : cur < prev
    if (!worse) break
    n++
  }
  return n
}

/** Delay categories for a terminal in a period, largest first, with share of total. */
export function delayBreakdown(history: MonthlyRecord[], t: TerminalId, period: string) {
  const rec = history.find((r) => r.unitId === t && r.period === period)
  if (!rec) return []
  const total = Object.values(rec.delayByCategoryH).reduce((a, b) => a + b, 0) || 1
  return Object.entries(rec.delayByCategoryH)
    .map(([category, hours]) => ({ category, hours, share: hours / total }))
    .sort((a, b) => b.hours - a.hours)
}

export function generateExecSummary(input: ExecSummaryInput): ExecSummary {
  const { history, periods, period, scope, scopes, today } = input
  const terminals = terminalsInScope(scope, scopes)
  const prev = previousPeriod(periods, period)
  const pl = periodLabel(period)
  const facts: SummaryFact[] = []
  const interpretation: SummaryInterpretation[] = []
  const proposals: ProposedAction[] = []

  // 1. KPIs off target -------------------------------------------------------
  const readings = terminals.flatMap((t) =>
    SCANNED.map((id) => {
      const value = kpiValue(history, id, t, period)
      const target = kpiTarget(history, id, t, period)
      return { id, t, value, target, status: kpiStatus(id, value, target), variance: kpiVariancePct(id, value, target) }
    })
  )
  const off = readings.filter((r) => r.status === 'critical').sort((a, b) => (a.variance ?? 0) - (b.variance ?? 0))
  const watch = readings.filter((r) => r.status === 'warning')
  facts.push({
    text: `${off.length} of ${readings.length} KPI readings are off target and ${watch.length} on watch in ${pl} (illustrative targets).`,
    source: `KPI register · ${scopeLabel(scope)} · ${pl}`,
  })
  for (const r of off.slice(0, 3)) {
    const k = kpiById[r.id]
    const unit = unitOf(k, r.t)
    facts.push({
      text: `${k.short} at ${scopeLabel(r.t)}: ${withUnit(r.value!, unit)} vs target ${withUnit(r.target!, unit)} (${fmt(Math.abs(r.variance ?? 0))}% ${k.direction === 'lower' ? 'above' : 'below'} target).`,
      source: cite(r.id, r.t, period),
    })
  }

  // 2. Biggest change vs prior month (direction-aware) -------------------------
  if (prev) {
    const changes = terminals.flatMap((t) =>
      SCANNED.map((id) => {
        const cur = kpiValue(history, id, t, period)
        const before = kpiValue(history, id, t, prev)
        if (cur === null || before === null || before === 0) return null
        const pct = ((cur - before) / Math.abs(before)) * 100
        const worse = kpiById[id].direction === 'lower' ? pct > 0 : pct < 0
        return { id, t, cur, before, pct, worse }
      }).filter((c): c is NonNullable<typeof c> => c !== null && c.pct !== 0)
    )
    const pick = changes.filter((c) => c.worse).sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))[0] ?? changes.sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))[0]
    if (pick) {
      const k = kpiById[pick.id]
      const unit = unitOf(k, pick.t)
      facts.push({
        text: `Largest ${pick.worse ? 'deterioration' : 'change'} vs prior month: ${k.short} at ${scopeLabel(pick.t)} ${pick.pct > 0 ? 'rose' : 'fell'} from ${withUnit(pick.before, unit)} to ${withUnit(pick.cur, unit)} (${pick.pct > 0 ? '+' : '−'}${fmt(Math.abs(pick.pct))}%).`,
        source: `${pick.id} · ${scopeLabel(pick.t)} · ${pl} vs ${periodLabel(prev)}`,
      })
    }
  }

  // 3. Open high-severity alerts ---------------------------------------------
  const risks = topRisks(input.alerts, scope).filter((a) => a.severity === 'serious' || a.severity === 'critical')
  const escalated = risks.filter((a) => (a.escalation ?? 1) >= 2).length
  facts.push({
    text:
      risks.length === 0
        ? 'No open serious or critical alerts.'
        : `${risks.length} open serious/critical alert${risks.length === 1 ? '' : 's'}${escalated ? `, ${escalated} escalated to level 2 or above` : ''}; highest: “${risks[0].title}”.`,
    source: `Alerts register · ${scopeLabel(scope)} · current`,
  })

  // 4. Overdue management actions ------------------------------------------------
  const scopedActions = actionsInScope(input.actions, scope)
  const overdue = scopedActions.filter((a) => isOverdue(a, today)).sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  facts.push({
    text:
      overdue.length === 0
        ? 'No management actions are overdue.'
        : `${overdue.length} management action${overdue.length === 1 ? ' is' : 's are'} overdue; oldest ${overdue[0].id} (“${overdue[0].title}”) was due ${overdue[0].dueDate}.`,
    source: `Management actions register · ${scopeLabel(scope)} · as of ${today}`,
  })

  // ---- Interpretation rules (inferred) -------------------------------------------
  for (const t of terminals) {
    const streak = worseningStreak(history, periods, 'KPI-002', t, period)
    const waitStatus = kpiStatus('KPI-002', kpiValue(history, 'KPI-002', t, period), kpiTarget(history, 'KPI-002', t, period))
    if (streak < 3 || waitStatus === 'good') continue
    const now = delayBreakdown(history, t, period)
    // Compare delay mix with the same month a year earlier to neutralise seasonality (typhoon months).
    const ly = periods[periods.indexOf(period) - 12]
    const before = ly ? delayBreakdown(history, t, ly) : []
    const shift = now
      .map((c) => ({ ...c, prevShare: before.find((b) => b.category === c.category)?.share ?? 0 }))
      .sort((a, b) => b.share - b.prevShare - (a.share - a.prevShare))
    const driver = before.length ? shift[0] : [...shift].sort((a, b) => b.share - a.share)[0]
    const top = now[0]
    const util = kpiValue(history, 'KPI-003', t, period)
    const pct = (x: number) => `${Math.round(x * 100)}%`
    if (!driver) continue
    if (driver.category === 'Awaiting berth') {
      interpretation.push({
        text: `Berth congestion is likely at ${scopeLabel(t)}: waiting time has worsened ${streak} months in a row and “Awaiting berth” is the fastest-growing delay category (${pct(driver.share)} of recorded delay vs ${pct(driver.prevShare)} a year earlier${top && top.category !== driver.category ? `; “${top.category}” remains the largest, as is seasonal` : ''})${util !== null ? `, with berth utilization at ${fmt(util)}%` : ''}.`,
        basis: `KPI-002, KPI-003 and delay log · ${scopeLabel(t)} · ${pl}${ly ? ` vs ${periodLabel(ly)}` : ''}`,
      })
      proposals.push({
        title: `Relieve berth congestion at ${scopeLabel(t)}`,
        issue: `Waiting time (KPI-002) at ${scopeLabel(t)} has worsened ${streak} consecutive months; “Awaiting berth” delay share rose to ${pct(driver.share)} in ${pl}.`,
        recommendedAction: `Review berth window allocation and arrival sequencing with ${scopeLabel(t)} and the Harbor Master; assess temporary use of alternative berths and report the effect on KPI-002 next month.`,
        kpiId: 'KPI-002',
        scope: t,
        priority: 'high',
      })
    } else {
      interpretation.push({
        text: `Waiting time at ${scopeLabel(t)} has worsened ${streak} months in a row; the delay category growing most is “${driver.category}” (${pct(driver.share)} of recorded delay), so the cause is likely ${driver.category === 'Weather' ? 'weather rather than berth capacity' : 'operational rather than berth capacity'}.`,
        basis: `KPI-002 and delay log · ${scopeLabel(t)} · ${pl}`,
      })
      proposals.push({
        title: `Investigate rising waiting time at ${scopeLabel(t)}`,
        issue: `Waiting time (KPI-002) at ${scopeLabel(t)} has worsened ${streak} consecutive months; main delay driver “${driver.category}”.`,
        recommendedAction: `Root-cause review of “${driver.category}” delays with ${scopeLabel(t)}; agree mitigation and track KPI-002 for the next two months.`,
        kpiId: 'KPI-002',
        scope: t,
        priority: 'medium',
      })
    }
  }

  for (const t of terminals) {
    const series = periods.slice(0, periods.indexOf(period) + 1).slice(-3)
    const offMonths = series.filter((p) => kpiStatus('KPI-008', kpiValue(history, 'KPI-008', t, p), kpiTarget(history, 'KPI-008', t, p)) !== 'good').length
    if (offMonths < 2) continue
    interpretation.push({
      text: `Reporting discipline gap at ${scopeLabel(t)}: data timeliness has been below target in ${offMonths} of the last 3 months, so ${scopeLabel(t)} KPI figures may be incomplete or revised later.`,
      basis: `KPI-008 · ${scopeLabel(t)} · ${series.map(periodLabel).join(', ')}`,
    })
    proposals.push({
      title: `Restore report timeliness at ${scopeLabel(t)}`,
      issue: `Data timeliness (KPI-008) at ${scopeLabel(t)} below target in ${offMonths} of the last 3 months.`,
      recommendedAction: `Agree a reporting recovery plan with ${scopeLabel(t)} (named data steward, daily submission check, API feed where possible) and review progress in two weeks.`,
      kpiId: 'KPI-008',
      scope: t,
      priority: 'medium',
    })
  }

  if (interpretation.length === 0) {
    interpretation.push({
      text: 'No sustained adverse trend (3+ consecutive months) was detected in this scope; current deviations look like month-to-month variation.',
      basis: `KPI-002, KPI-008 trend scan · ${scopeLabel(scope)} · ${pl}`,
    })
  }

  // Fallback / top-up proposal: the worst off-target KPI not already covered.
  for (const r of off) {
    if (proposals.length >= 3) break
    if (proposals.some((p) => p.kpiId === r.id && p.scope === r.t)) continue
    const k = kpiById[r.id]
    const unit = unitOf(k, r.t)
    proposals.push({
      title: `Recover ${k.short.toLowerCase()} at ${scopeLabel(r.t)}`,
      issue: `${k.short} (${r.id}) at ${scopeLabel(r.t)} was ${withUnit(r.value!, unit)} in ${pl} vs illustrative target ${withUnit(r.target!, unit)}.`,
      recommendedAction: `Review ${k.short.toLowerCase()} drivers with the KPI owner (${k.owner}) and ${scopeLabel(r.t)}; agree corrective measures and a recovery date.`,
      kpiId: r.id,
      scope: r.t,
      priority: 'medium',
    })
  }

  return { facts, interpretation, proposals: proposals.slice(0, 3) }
}
