// PORTIX Port Performance: KPI achievement, actual vs target trend,
// turnaround decomposition, bottlenecks and a link to vessel-level reports.
import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ChevronRight, FileText, Info } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PageShell } from '@/components/layout/page-shell'
import { kpiById, kpis, kpiStatus, kpiTarget, kpiValue, kpiVariancePct, periodLabel, scopeLabel, unitOf, type KpiId, type Scope } from '../../kpi'
import { usePeriod, useVoms } from '../../store'
import { Legend } from '../../components/charts'
import { EmptyState, PageHeader } from '../../components/common'
import { fmtKpi, IllustrativeBadge, KpiStatusPill, KpiTile, KpiTrendChart, PeriodSelector } from '../../components/portix-ui'
import { useScopedData } from './kpi-shared'

const selectCls =
  'h-9 max-w-full min-w-0 rounded-md border border-input bg-card px-2.5 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50'

export function PortPerformance() {
  const history = useVoms((s) => s.history)
  const periods = useVoms((s) => s.periods)
  const period = usePeriod()
  const { scopes } = useScopedData()
  const [picked, setPicked] = useState<Scope | null>(null)
  const scope: Scope | undefined = picked && scopes.includes(picked) ? picked : scopes[0]
  const applicable = useMemo(() => kpis.filter((k) => scope !== 'PORT' || k.portLevel), [scope])
  const [kpiPick, setKpiPick] = useState<KpiId>('KPI-001')
  const trendKpi = applicable.some((k) => k.id === kpiPick) ? kpiPick : (applicable[0]?.id ?? 'KPI-001')

  // ---- Turnaround decomposition (KPI-001 = waiting KPI-002 + remaining) ----
  const decomposition = useMemo(() => {
    if (!scope) return []
    const idx = periods.indexOf(period)
    const lastYear = idx >= 12 ? periods[idx - 12] : undefined
    const row = (label: string, turn: number | null, wait: number | null) =>
      turn === null || wait === null ? null : { label, waiting: wait, remaining: Math.max(0, turn - wait), total: turn }
    return [
      row(`Actual · ${periodLabel(period)}`, kpiValue(history, 'KPI-001', scope, period), kpiValue(history, 'KPI-002', scope, period)),
      row('Illustrative target', kpiTarget(history, 'KPI-001', scope, period), kpiTarget(history, 'KPI-002', scope, period)),
      lastYear ? row(`Same month last year · ${periodLabel(lastYear)}`, kpiValue(history, 'KPI-001', scope, lastYear), kpiValue(history, 'KPI-002', scope, lastYear)) : null,
    ].filter((r): r is NonNullable<typeof r> => r !== null)
  }, [history, periods, period, scope])
  const maxTotal = Math.max(1, ...decomposition.map((d) => d.total))

  // ---- Bottlenecks: worst terminal × KPI variances within scope ----
  const bottlenecks = useMemo(() => {
    if (!scope) return []
    const terms = scope === 'PORT' ? scopes.filter((s) => s !== 'PORT') : [scope]
    return terms
      .flatMap((t) =>
        kpis.map((k) => {
          const value = kpiValue(history, k.id, t, period)
          const target = kpiTarget(history, k.id, t, period)
          return { scope: t, id: k.id, value, target, status: kpiStatus(k.id, value, target), variance: kpiVariancePct(k.id, value, target) }
        })
      )
      .filter((b): b is typeof b & { variance: number } => b.variance !== null && b.variance < 0)
      // Severity first (off target before watch), then variance; caps small-count KPIs at -100% for ranking.
      .sort((a, b) => (a.status === 'critical' ? 0 : 1) - (b.status === 'critical' ? 0 : 1) || Math.max(a.variance, -100) - Math.max(b.variance, -100))
      .slice(0, 3)
  }, [history, period, scope, scopes])

  if (!scope) {
    return (
      <PageShell>
        <PageHeader title='Port Performance' actions={<PeriodSelector />} />
        <EmptyState>No performance scope is available for this session.</EmptyState>
      </PageShell>
    )
  }

  const trendDef = kpiById[trendKpi]

  return (
    <PageShell>
      <PageHeader
        title='Port Performance'
        description={`Strategic KPI achievement for ${scopeLabel(scope)} · ${periodLabel(period)}. Targets are illustrative until approved by SBMA.`}
        actions={
          <>
            {scopes.length > 1 && (
              <label className='inline-flex'>
                <span className='sr-only'>Scope</span>
                <select className={selectCls} value={scope} onChange={(e) => setPicked(e.target.value as Scope)}>
                  {scopes.map((s) => (
                    <option key={s} value={s}>
                      {scopeLabel(s)}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <PeriodSelector />
          </>
        }
      />

      {/* Section 1: KPI tiles */}
      <section aria-labelledby='perf-kpis' className='grid gap-3'>
        <div className='flex flex-wrap items-center gap-2'>
          <h2 id='perf-kpis' className='text-base font-semibold'>
            KPI achievement
          </h2>
          <IllustrativeBadge />
        </div>
        <div className='grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
          {applicable.map((k) => (
            <KpiTile key={k.id} id={k.id} scope={scope} />
          ))}
        </div>
        {scope === 'PORT' && (
          <p className='flex items-start gap-2 text-xs text-muted-foreground'>
            <Info className='mt-0.5 size-3.5 shrink-0' aria-hidden />
            Berth productivity and cargo throughput are reported per terminal (TEU, MT, KL) and are never summed port-wide — select a terminal to see them.
          </p>
        )}
      </section>

      {/* Section 2: Actual vs target */}
      <Card className='min-w-0'>
        <CardHeader>
          <CardTitle>Actual vs target</CardTitle>
          <CardDescription>24-month trend for {scopeLabel(scope)} against the illustrative target.</CardDescription>
        </CardHeader>
        <CardContent className='grid min-w-0 gap-3'>
          <div className='flex flex-wrap items-center gap-2'>
            <label className='inline-flex min-w-0 items-center gap-2 text-sm'>
              <span className='text-muted-foreground'>KPI</span>
              <select className={selectCls} value={trendKpi} onChange={(e) => setKpiPick(e.target.value as KpiId)}>
                {applicable.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.id} · {k.name}
                  </option>
                ))}
              </select>
            </label>
            <Link to='/kpis/$kpiId' params={{ kpiId: trendKpi }} search={{ scope }} className='inline-flex items-center text-sm text-[var(--series-1-ink)] hover:underline'>
              KPI detail <ChevronRight className='size-4' aria-hidden />
            </Link>
          </div>
          <p className='text-xs text-muted-foreground'>
            {trendDef.description} {trendDef.direction === 'lower' ? 'Lower is better.' : 'Higher is better.'}
          </p>
          <KpiTrendChart id={trendKpi} scope={scope} months={24} height='h-72' />
        </CardContent>
      </Card>

      <div className='grid min-w-0 gap-4 lg:grid-cols-2'>
        {/* Section 3: Turnaround decomposition */}
        <Card className='min-w-0'>
          <CardHeader>
            <CardTitle>Variance decomposition — turnaround</CardTitle>
            <CardDescription>
              Turnaround (KPI-001) split into waiting time (KPI-002, ATA → All Fast) and the remaining time in port (All Fast → ATD). Call-weighted monthly averages.
            </CardDescription>
          </CardHeader>
          <CardContent className='grid gap-4'>
            {decomposition.length === 0 ? (
              <EmptyState>No turnaround data for this period.</EmptyState>
            ) : (
              <>
                <Legend
                  items={[
                    { label: 'Waiting (ATA → All Fast)', color: 'var(--series-1)' },
                    { label: 'Remaining (All Fast → ATD)', color: 'var(--series-2)' },
                  ]}
                />
                <ul className='grid gap-3'>
                  {decomposition.map((d) => (
                    <li key={d.label} className='grid min-w-0 gap-1'>
                      <div className='flex flex-wrap items-baseline justify-between gap-x-3 text-sm'>
                        <span className='font-medium'>{d.label}</span>
                        <span className='text-muted-foreground tabular-nums'>{fmtKpi(d.total, 'h')} total</span>
                      </div>
                      <div
                        className='flex h-3 gap-0.5'
                        role='img'
                        aria-label={`${d.label}: waiting ${fmtKpi(d.waiting, 'h')}, remaining ${fmtKpi(d.remaining, 'h')}, total ${fmtKpi(d.total, 'h')}`}
                      >
                        <div className='h-full rounded-s-sm' style={{ width: `${(d.waiting / maxTotal) * 100}%`, background: 'var(--series-1)' }} />
                        <div className='h-full rounded-e-sm' style={{ width: `${(d.remaining / maxTotal) * 100}%`, background: 'var(--series-2)' }} />
                      </div>
                      <div className='flex flex-wrap gap-x-4 text-xs text-muted-foreground tabular-nums'>
                        <span>Waiting {fmtKpi(d.waiting, 'h')}</span>
                        <span>Remaining {fmtKpi(d.remaining, 'h')}</span>
                      </div>
                    </li>
                  ))}
                </ul>
                {decomposition.length >= 2 && (
                  <p className='rounded-md bg-muted/50 p-2 text-sm'>
                    Gap to target: waiting {signed(decomposition[0].waiting - decomposition[1].waiting)} h, remaining{' '}
                    {signed(decomposition[0].remaining - decomposition[1].remaining)} h (positive = slower than target).
                  </p>
                )}
                <p className='text-xs text-muted-foreground'>
                  The target split uses the illustrative waiting-time target; remaining = turnaround target − waiting target. Synthetic data.
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Section 4: Bottlenecks */}
        <Card className='min-w-0'>
          <CardHeader>
            <CardTitle>Bottlenecks</CardTitle>
            <CardDescription>Terminal × KPI combinations furthest below target in {periodLabel(period)} — off-target first, then largest negative variance.</CardDescription>
          </CardHeader>
          <CardContent>
            {bottlenecks.length === 0 ? (
              <EmptyState>All KPIs within scope are at or better than target this month.</EmptyState>
            ) : (
              <ol className='grid gap-2'>
                {bottlenecks.map((b, i) => {
                  const k = kpiById[b.id]
                  const u = unitOf(k, b.scope)
                  return (
                    <li key={`${b.scope}-${b.id}`}>
                      <Link
                        to='/kpis/$kpiId'
                        params={{ kpiId: b.id }}
                        search={{ scope: b.scope }}
                        className='flex min-w-0 items-center gap-3 rounded-lg border p-3 text-sm transition-colors hover:bg-accent/40'
                      >
                        <span className='flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold'>{i + 1}</span>
                        <span className='grid min-w-0 flex-1 gap-0.5'>
                          <span className='font-medium break-words'>
                            {scopeLabel(b.scope)} · {k.short}
                          </span>
                          <span className='text-xs text-muted-foreground tabular-nums'>
                            {fmtKpi(b.value, u)} vs target {fmtKpi(b.target, u)} · {b.variance.toFixed(1)}% vs target
                          </span>
                        </span>
                        <KpiStatusPill status={b.status} className='hidden min-[420px]:inline-flex' />
                        <ChevronRight className='size-4 shrink-0 text-muted-foreground' aria-hidden />
                      </Link>
                    </li>
                  )
                })}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Section 5: Vessel-level reports */}
      <Link
        to='/reports'
        className='flex min-w-0 items-center gap-3 rounded-xl border bg-card p-4 shadow-xs transition-colors hover:bg-accent/40 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none'
      >
        <span className='flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--series-1)]/12 text-[var(--series-1-ink)]'>
          <FileText className='size-5' aria-hidden />
        </span>
        <span className='grid min-w-0 flex-1 gap-0.5'>
          <span className='font-semibold'>Vessel-level performance (operational detail)</span>
          <span className='text-sm text-muted-foreground'>Per-call turnaround intervals, berth occupancy and integrated vessel call reports.</span>
        </span>
        <ChevronRight className='size-5 shrink-0 text-muted-foreground' aria-hidden />
      </Link>
    </PageShell>
  )
}

const signed = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(1)}`
