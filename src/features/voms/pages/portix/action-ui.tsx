// Shared building blocks for the PORTIX Management Action Tracker.
import { format } from 'date-fns'
import { AlarmClock, BellRing, CalendarDays, Gauge, Lightbulb, UserPen, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Tone } from '../../calc'
import { ToneBadge } from '../../components/common'
import { kpiById, kpiValue, type KpiId, type Scope } from '../../kpi'
import type { MonthlyRecord } from '../../history'
import type { ActionPriority, ActionStatus, ManagementAction } from '../../types'

export const statusMeta: Record<ActionStatus, { label: string; tone: Tone }> = {
  proposed: { label: 'Proposed', tone: 'neutral' },
  in_progress: { label: 'In progress', tone: 'active' },
  blocked: { label: 'Blocked', tone: 'serious' },
  done: { label: 'Done · awaiting review', tone: 'info' },
  closed: { label: 'Closed', tone: 'good' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
}

export const ALL_STATUSES: ActionStatus[] = ['proposed', 'in_progress', 'blocked', 'done', 'closed', 'cancelled']
export const OPEN_STATUSES: ActionStatus[] = ['proposed', 'in_progress', 'blocked']

const priorityTone: Record<ActionPriority, Tone> = { high: 'critical', medium: 'warning', low: 'info' }
export const priorityLabel: Record<ActionPriority, string> = { high: 'High', medium: 'Medium', low: 'Low' }
export const priorityRank: Record<ActionPriority, number> = { high: 0, medium: 1, low: 2 }

export function ActionStatusBadge({ status, className }: { status: ActionStatus; className?: string }) {
  const m = statusMeta[status]
  return (
    <ToneBadge tone={m.tone} className={className}>
      {m.label}
    </ToneBadge>
  )
}

export function PriorityBadge({ priority, className }: { priority: ActionPriority; className?: string }) {
  return (
    <ToneBadge tone={priorityTone[priority]} className={className}>
      {priorityLabel[priority]} priority
    </ToneBadge>
  )
}

export const todayStr = () => format(new Date(), 'yyyy-MM-dd')

export const isOverdue = (a: ManagementAction, today = todayStr()) => OPEN_STATUSES.includes(a.status) && a.dueDate < today

export const fmtDue = (d: string) => format(new Date(`${d}T00:00:00`), 'dd MMM yyyy')

/** Due date with an explicit "Overdue" label and icon (never colour only). */
export function DueDate({ action, className }: { action: ManagementAction; className?: string }) {
  const overdue = isOverdue(action)
  return (
    <span className={cn('inline-flex items-center gap-1 whitespace-nowrap', overdue && 'font-semibold text-[var(--status-critical-ink)]', className)}>
      {overdue ? <AlarmClock className='size-3.5 shrink-0' aria-hidden /> : <CalendarDays className='size-3.5 shrink-0 text-muted-foreground' aria-hidden />}
      {overdue ? 'Overdue · ' : 'Due '}
      {fmtDue(action.dueDate)}
    </span>
  )
}

export const originMeta: Record<ManagementAction['origin']['type'], { label: string; icon: LucideIcon }> = {
  alert: { label: 'Alert', icon: BellRing },
  kpi: { label: 'KPI', icon: Gauge },
  insight: { label: 'AI insight', icon: Lightbulb },
  manual: { label: 'Manual', icon: UserPen },
}

export function OriginTag({ origin, className }: { origin: ManagementAction['origin']; className?: string }) {
  const m = originMeta[origin.type]
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs text-muted-foreground', className)}>
      <m.icon className='size-3.5 shrink-0' aria-hidden />
      {m.label}
      {origin.ref && origin.type !== 'manual' ? ` · ${origin.ref}` : ''}
    </span>
  )
}

export type Assessment = 'improved' | 'no_change' | 'worsened'
export const assessmentLabel: Record<Assessment, string> = { improved: 'Improved', no_change: 'No change', worsened: 'Worsened' }
export const assessmentTone: Record<Assessment, Tone> = { improved: 'good', no_change: 'neutral', worsened: 'critical' }

/**
 * Direction-aware comparison of a current KPI value against the baseline.
 * Changes within 1% of the baseline count as "no change".
 */
export function kpiDelta(kpiId: KpiId, baseline: number | null | undefined, current: number | null | undefined) {
  if (baseline === null || baseline === undefined || current === null || current === undefined) return null
  const k = kpiById[kpiId]
  const delta = current - baseline
  const pct = baseline !== 0 ? (delta / Math.abs(baseline)) * 100 : null
  const threshold = Math.abs(baseline) * 0.01
  const assessment: Assessment =
    Math.abs(delta) <= threshold ? 'no_change' : (k.direction === 'lower' ? delta < 0 : delta > 0) ? 'improved' : 'worsened'
  return { delta, pct, assessment }
}

export const currentKpi = (history: MonthlyRecord[], a: ManagementAction, period: string) =>
  a.kpiId ? kpiValue(history, a.kpiId as KpiId, a.scope as Scope, period) : null
