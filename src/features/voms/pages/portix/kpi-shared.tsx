// Small helpers shared by the PORTIX KPI pages (registry, detail, performance).
import { useMemo } from 'react'
import { AlertTriangle, CheckCircle2, Minus, OctagonAlert, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { kpiById, unitOf, type KpiDefinition, type KpiId, type KpiStatus, type Scope } from '../../kpi'
import { useVoms, visibleActions, visibleAlerts } from '../../store'
import { sessionScopes } from '../../components/portix-ui'
import type { TerminalId } from '../../history'

export const statusText: Record<KpiStatus, string> = { good: 'On target', warning: 'Watch', critical: 'Off target', na: 'No target' }

const statusIcon: Record<KpiStatus, { icon: LucideIcon; cls: string }> = {
  good: { icon: CheckCircle2, cls: 'text-[var(--status-good-ink)]' },
  warning: { icon: AlertTriangle, cls: 'text-[var(--status-warning-ink)]' },
  critical: { icon: OctagonAlert, cls: 'text-[var(--status-critical-ink)]' },
  na: { icon: Minus, cls: 'text-muted-foreground' },
}

export const terminalLetter = (s: Scope) => (s === 'PORT' ? 'Port' : s.replace('U-T', ''))

/** Compact per-terminal status marker: letter + shape-coded icon (never colour-only). */
export function TerminalStatusDot({ scope, status }: { scope: Scope; status: KpiStatus }) {
  const m = statusIcon[status]
  const label = `${scope === 'PORT' ? 'Port-wide' : `Terminal ${terminalLetter(scope)}`}: ${statusText[status]}`
  return (
    <span title={label} aria-label={label} role='img' className='inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[11px] font-medium'>
      <span aria-hidden>{terminalLetter(scope)}</span>
      <m.icon className={cn('size-3', m.cls)} aria-hidden />
    </span>
  )
}

/** Unit label; port-wide for multi-unit KPIs lists each terminal's unit. */
export function unitText(k: KpiDefinition, scope: Scope) {
  if (typeof k.unit === 'string') return k.unit
  if (scope !== 'PORT') return k.unit[scope]
  return Object.values(k.unit).join(' / ')
}

export const directionText = (k: KpiDefinition) => (k.direction === 'lower' ? 'Lower is better' : 'Higher is better')

export function toleranceText(k: KpiDefinition) {
  const f = (t: number) => (k.tolerance === 'relative' ? `${Math.round(t * 100)}% of target` : `${t} ${unitOf(k, 'U-TA') === '%' ? 'pts' : unitOf(k, 'U-TA')}`)
  const side = k.direction === 'lower' ? 'above' : 'below'
  return `On target while within ${f(k.amber)} ${side} target; Watch up to ${f(k.red)} ${side}; Off target beyond that.`
}

export const terminalScopes = (scopes: Scope[]) => scopes.filter((s): s is TerminalId => s !== 'PORT')

/** Session-scoped data (stable references via useMemo, avoids new-array selectors). */
export function useScopedData() {
  const session = useVoms((s) => s.session)
  const alerts = useVoms((s) => s.alerts)
  const actions = useVoms((s) => s.actions)
  return useMemo(
    () => ({
      session,
      scopes: sessionScopes(session),
      alerts: visibleAlerts({ session, alerts }),
      actions: visibleActions({ session, actions }),
    }),
    [session, alerts, actions]
  )
}

export const isKpiId = (id: string): id is KpiId => id in kpiById
