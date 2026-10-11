// Shared PORTIX building blocks: KPI tile, trend chart with target, period
// selector, status pill, KPI value formatting and scope helpers.
import { useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowDownRight, ArrowUpRight, CalendarRange, Minus } from 'lucide-react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { cn } from '@/lib/utils'
import {
  kpiById,
  kpiSeries,
  kpiStatus,
  kpiTarget,
  kpiValue,
  kpiVariancePct,
  periodLabel,
  periodShort,
  previousPeriod,
  unitOf,
  type KpiId,
  type KpiStatus,
  type Scope,
} from '../kpi'
import { isPortWide } from '../org'
import { usePeriod, useVoms } from '../store'
import type { Session } from '../types'
import { Legend } from './charts'

// ---- Formatting ------------------------------------------------------------

export function fmtKpi(v: number | null | undefined, unit = '') {
  if (v === null || v === undefined || Number.isNaN(v)) return '—'
  const abs = Math.abs(v)
  const n = abs >= 100000 ? `${(v / 1000).toLocaleString('en-US', { maximumFractionDigits: 0 })}k` : abs >= 1000 ? Math.round(v).toLocaleString('en-US') : abs >= 100 ? Math.round(v).toString() : (+v.toFixed(1)).toString()
  return unit ? `${n} ${unit}`.replace(' %', '%') : n
}

// ---- Status --------------------------------------------------------------

const statusMeta: Record<KpiStatus, { label: string; cls: string; dot: string }> = {
  good: { label: 'On target', cls: 'bg-[var(--status-good)]/12 text-[var(--status-good-ink)]', dot: 'bg-[var(--status-good)]' },
  warning: { label: 'Watch', cls: 'bg-[var(--status-warning)]/20 text-[var(--status-warning-ink)]', dot: 'bg-[var(--status-warning)]' },
  critical: { label: 'Off target', cls: 'bg-[var(--status-critical)]/12 text-[var(--status-critical-ink)]', dot: 'bg-[var(--status-critical)]' },
  na: { label: 'No target', cls: 'bg-muted text-muted-foreground', dot: 'bg-muted-foreground/40' },
}

export function KpiStatusPill({ status, className }: { status: KpiStatus; className?: string }) {
  const m = statusMeta[status]
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap', m.cls, className)}>
      <span className={cn('size-1.5 rounded-full', m.dot)} aria-hidden />
      {m.label}
    </span>
  )
}

export function IllustrativeBadge({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-full border border-dashed px-2 py-0.5 text-[11px] text-muted-foreground', className)} title='Targets are illustrative until approved by SBMA'>
      Illustrative target
    </span>
  )
}

// ---- Period selector -----------------------------------------------------

export function PeriodSelector({ className }: { className?: string }) {
  const periods = useVoms((s) => s.periods)
  const setPeriod = useVoms((s) => s.setPeriod)
  const period = usePeriod()
  return (
    <label className={cn('relative inline-flex items-center', className)}>
      <CalendarRange className='pointer-events-none absolute start-2.5 size-4 text-muted-foreground' aria-hidden />
      <span className='sr-only'>Reporting month</span>
      <select
        value={period}
        onChange={(e) => setPeriod(e.target.value)}
        className='h-9 appearance-none rounded-md border border-input bg-card ps-8 pe-7 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50'
      >
        {[...periods].reverse().map((p) => (
          <option key={p} value={p}>
            {periodLabel(p)}
          </option>
        ))}
      </select>
    </label>
  )
}

// ---- Scope helpers ---------------------------------------------------------

/** Scopes a session may view in PORTIX executive pages (port-wide and/or terminals). */
export function sessionScopes(session: Session | null): Scope[] {
  if (!session) return []
  if (isPortWide(session)) return ['PORT', 'U-TA', 'U-TB', 'U-TC']
  return (['U-TA', 'U-TB', 'U-TC'] as Scope[]).filter((t) => session.scopeUnitIds.includes(t as string))
}

/** Default scope for a session: port-wide when allowed, otherwise its first terminal. */
export const defaultScope = (session: Session | null): Scope => sessionScopes(session)[0] ?? 'PORT'

// ---- KPI tile ----------------------------------------------------------------

export function useKpiPoint(id: KpiId, scope: Scope) {
  const history = useVoms((s) => s.history)
  const periods = useVoms((s) => s.periods)
  const period = usePeriod()
  return useMemo(() => {
    const value = kpiValue(history, id, scope, period)
    const target = kpiTarget(history, id, scope, period)
    const prev = previousPeriod(periods, period)
    const prevValue = prev ? kpiValue(history, id, scope, prev) : null
    const idx = periods.indexOf(period)
    const spark = kpiSeries(history, periods.slice(Math.max(0, idx - 11), idx + 1), id, scope)
    return { period, value, target, prevValue, status: kpiStatus(id, value, target), variance: kpiVariancePct(id, value, target), spark }
  }, [history, periods, period, id, scope])
}

function Sparkline({ data }: { data: { value: number | null }[] }) {
  const vals = data.map((d) => d.value).filter((v): v is number => v !== null)
  if (vals.length < 2) return null
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const w = 88
  const h = 26
  const pts = vals.map((v, i) => `${(i / (vals.length - 1)) * w},${h - 2 - ((v - min) / (max - min || 1)) * (h - 4)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className='h-6 w-[88px]' aria-hidden>
      <polyline points={pts} fill='none' stroke='var(--series-1)' strokeWidth='2' strokeLinejoin='round' strokeLinecap='round' />
    </svg>
  )
}

/** KPI achievement tile: value, target, variance vs target, change vs previous month, sparkline. */
export function KpiTile({ id, scope, to = true }: { id: KpiId; scope: Scope; to?: boolean }) {
  const k = kpiById[id]
  const p = useKpiPoint(id, scope)
  const unit = unitOf(k, scope)
  const delta = p.value !== null && p.prevValue !== null ? p.value - p.prevValue : null
  const better = delta === null ? null : k.direction === 'lower' ? delta < 0 : delta > 0
  const body = (
    <div className='flex h-full min-w-0 flex-col gap-2 rounded-xl border bg-card p-3 shadow-xs transition-colors hover:bg-accent/40 sm:p-4'>
      <div className='flex items-start justify-between gap-2'>
        <span className='text-sm text-muted-foreground'>{k.short}</span>
        <KpiStatusPill status={p.status} />
      </div>
      <div className='flex items-end justify-between gap-2'>
        <span className='text-2xl leading-tight font-semibold tabular-nums'>{fmtKpi(p.value, unit)}</span>
        <Sparkline data={p.spark} />
      </div>
      <div className='flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground'>
        <span>Target {fmtKpi(p.target, unit)}</span>
        {delta !== null && (
          <span className={cn('inline-flex items-center gap-0.5', better ? 'text-[var(--status-good-ink)]' : 'text-[var(--status-critical-ink)]')}>
            {delta === 0 ? <Minus className='size-3' /> : delta > 0 ? <ArrowUpRight className='size-3' /> : <ArrowDownRight className='size-3' />}
            {fmtKpi(Math.abs(delta), unit)} vs prior month
          </span>
        )}
      </div>
    </div>
  )
  if (!to) return body
  return (
    <Link to='/kpis/$kpiId' params={{ kpiId: id }} search={{ scope }} className='block min-w-0 rounded-xl focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none'>
      {body}
    </Link>
  )
}

// ---- Trend chart (actual vs target) ------------------------------------------

const axis = { stroke: 'var(--chart-axis)', fontSize: 11, tickLine: false, axisLine: false } as const

export function KpiTrendChart({ id, scope, months = 12, height = 'h-64' }: { id: KpiId; scope: Scope; months?: number; height?: string }) {
  const history = useVoms((s) => s.history)
  const periods = useVoms((s) => s.periods)
  const period = usePeriod()
  const k = kpiById[id]
  const unit = unitOf(k, scope)
  const data = useMemo(() => {
    const idx = periods.indexOf(period)
    return kpiSeries(history, periods.slice(Math.max(0, idx - months + 1), idx + 1), id, scope).map((d) => ({ ...d, label: periodShort(d.period) }))
  }, [history, periods, period, id, scope, months])
  return (
    <div className='grid gap-3'>
      <Legend
        items={[
          { label: `Actual (${unit || 'value'})`, color: 'var(--series-1)' },
          { label: 'Illustrative target', color: 'var(--chart-axis)' },
        ]}
      />
      <div className={height}>
        <ResponsiveContainer width='100%' height='100%'>
          <LineChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke='var(--chart-grid)' />
            <XAxis dataKey='label' {...axis} interval='preserveStartEnd' minTickGap={18} />
            <YAxis {...axis} width={52} tickFormatter={(v: number) => fmtKpi(v)} domain={['auto', 'auto']} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const d = payload[0].payload as (typeof data)[number]
                return (
                  <div className='rounded-md border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md'>
                    <div className='mb-1 font-semibold'>{periodLabel(d.period)}</div>
                    <div>Actual: {fmtKpi(d.value, unit)}</div>
                    <div className='text-muted-foreground'>Target: {fmtKpi(d.target, unit)}</div>
                    <div className='mt-1'>
                      <KpiStatusPill status={d.status} />
                    </div>
                  </div>
                )
              }}
            />
            <Line dataKey='target' stroke='var(--chart-axis)' strokeDasharray='5 4' strokeWidth={1.5} dot={false} isAnimationActive={false} />
            <Line dataKey='value' stroke='var(--series-1)' strokeWidth={2} dot={{ r: 3, strokeWidth: 0, fill: 'var(--series-1)' }} activeDot={{ r: 5 }} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
