// Helpers shared by the Terminal Intelligence and Vessel Intelligence pages:
// visible-terminal scope (confidentiality rule), fixed terminal colours, status
// marks that never rely on colour alone, and a per-terminal multi-line chart.
import { useMemo } from 'react'
import { AlertTriangle, CheckCircle2, MinusCircle, OctagonAlert, type LucideIcon } from 'lucide-react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { cn } from '@/lib/utils'
import type { TerminalId } from '../../history'
import { kpiById, kpiStatus, kpiTarget, kpiValue, periodLabel, periodShort, scopeLabel, unitOf, type KpiId, type KpiStatus } from '../../kpi'
import { usePeriod, useVoms } from '../../store'
import { Legend } from '../../components/charts'
import { fmtKpi, sessionScopes } from '../../components/portix-ui'

/** Colour follows the entity: each terminal keeps its categorical slot everywhere. */
export const TERMINAL_COLOR: Record<TerminalId, string> = {
  'U-TA': 'var(--series-1)',
  'U-TB': 'var(--series-2)',
  'U-TC': 'var(--series-3)',
}

export const PORT_AVG_COLOR = 'var(--chart-axis)'

/** Terminals the session may see named, and whether it is port-wide. */
export function useVisibleTerminals() {
  const session = useVoms((s) => s.session)
  return useMemo(() => {
    const scopes = sessionScopes(session)
    const portWide = scopes.includes('PORT')
    const terminals = scopes.filter((s): s is TerminalId => s !== 'PORT')
    return { portWide, terminals }
  }, [session])
}

const statusMark: Record<KpiStatus, { label: string; icon: LucideIcon; cls: string }> = {
  good: { label: 'On target', icon: CheckCircle2, cls: 'text-[var(--status-good-ink)]' },
  warning: { label: 'Watch', icon: AlertTriangle, cls: 'text-[var(--status-warning-ink)]' },
  critical: { label: 'Off target', icon: OctagonAlert, cls: 'text-[var(--status-critical-ink)]' },
  na: { label: 'No target', icon: MinusCircle, cls: 'text-muted-foreground' },
}

/** Compact status mark: a distinct icon shape per status plus an accessible label. */
export function StatusMark({ status, className }: { status: KpiStatus; className?: string }) {
  const m = statusMark[status]
  const Icon = m.icon
  return (
    <span className={cn('inline-flex shrink-0', m.cls, className)} title={m.label}>
      <Icon className='size-3.5' aria-hidden />
      <span className='sr-only'>{m.label}</span>
    </span>
  )
}

export function StatusLegend({ className }: { className?: string }) {
  return (
    <ul className={cn('flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground', className)} aria-label='Status legend'>
      {(['good', 'warning', 'critical', 'na'] as KpiStatus[]).map((s) => (
        <li key={s} className='flex items-center gap-1.5'>
          <StatusMark status={s} />
          {statusMark[s].label}
        </li>
      ))}
    </ul>
  )
}

const axis = { stroke: 'var(--chart-axis)', fontSize: 11, tickLine: false, axisLine: false } as const

/**
 * One line per visible terminal (max 3, fixed colours) for a normalised KPI over
 * the 12 months to the selected period; optional dashed port-average line.
 */
export function TerminalLinesChart({
  id,
  terminals,
  portAverage = false,
  months = 12,
  height = 'h-56',
}: {
  id: KpiId
  terminals: TerminalId[]
  portAverage?: boolean
  months?: number
  height?: string
}) {
  const history = useVoms((s) => s.history)
  const periods = useVoms((s) => s.periods)
  const period = usePeriod()
  const k = kpiById[id]
  const unit = unitOf(k, 'PORT')
  const key = terminals.slice(0, 3).join(',')
  const shown = useMemo(() => (key ? (key.split(',') as TerminalId[]) : []), [key])
  const data = useMemo(() => {
    const idx = periods.indexOf(period)
    return periods.slice(Math.max(0, idx - months + 1), idx + 1).map((p) => {
      const row: Record<string, string | number | null> = { period: p, label: periodShort(p) }
      for (const t of shown) row[t] = kpiValue(history, id, t, p)
      if (portAverage) row.PORT = kpiValue(history, id, 'PORT', p)
      return row
    })
  }, [history, periods, period, id, months, portAverage, shown])

  const series = [
    ...shown.map((t) => ({ key: t as string, label: scopeLabel(t), color: TERMINAL_COLOR[t], dashed: false })),
    ...(portAverage ? [{ key: 'PORT', label: 'Port average', color: PORT_AVG_COLOR, dashed: true }] : []),
  ]

  return (
    <div className='grid min-w-0 gap-3'>
      <Legend items={series.map((s) => ({ label: s.label, color: s.color }))} />
      <div className={height}>
        <ResponsiveContainer width='100%' height='100%'>
          <LineChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke='var(--chart-grid)' />
            <XAxis dataKey='label' {...axis} interval='preserveStartEnd' minTickGap={18} />
            <YAxis {...axis} width={48} tickFormatter={(v: number) => fmtKpi(v)} domain={['auto', 'auto']} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const d = payload[0].payload as Record<string, string | number | null>
                const p = d.period as string
                return (
                  <div className='rounded-md border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md'>
                    <div className='mb-1 font-semibold'>
                      {k.short} · {periodLabel(p)}
                    </div>
                    {series.map((s) => {
                      const v = d[s.key] as number | null
                      const scope = s.key === 'PORT' ? 'PORT' : (s.key as TerminalId)
                      const st = kpiStatus(id, v, kpiTarget(history, id, scope, p))
                      return (
                        <div key={s.key} className='flex items-center gap-2'>
                          <span className='size-2.5 rounded-sm' style={{ background: s.color }} />
                          <span className='text-muted-foreground'>{s.label}</span>
                          <span className='ms-auto flex items-center gap-1.5 ps-3 font-medium tabular-nums'>
                            {fmtKpi(v, unit)}
                            <StatusMark status={st} />
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )
              }}
            />
            {series.map((s) => (
              <Line
                key={s.key}
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeWidth={s.dashed ? 1.5 : 2}
                strokeDasharray={s.dashed ? '5 4' : undefined}
                dot={s.dashed ? false : { r: 2.5, strokeWidth: 0, fill: s.color }}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
