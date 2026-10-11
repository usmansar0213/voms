// Terminal Intelligence (/terminals): benchmark of terminal KPIs, trends for
// normalised KPIs and per-terminal throughput/productivity. Peer terminals are
// only named for port-wide sessions (data-sharing policy — illustrative).
import { useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowRight, ShieldCheck } from 'lucide-react'
import { PageShell } from '@/components/layout/page-shell'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import type { TerminalId } from '../../history'
import { kpiById, kpiStatus, kpiTarget, kpiValue, periodLabel, scopeLabel, unitOf, type KpiId, type KpiStatus, type Scope } from '../../kpi'
import { usePeriod, useVoms } from '../../store'
import { EmptyState, PageHeader } from '../../components/common'
import { IllustrativeBadge, KpiTile, PeriodSelector, fmtKpi } from '../../components/portix-ui'
import { StatusLegend, StatusMark, TERMINAL_COLOR, TerminalLinesChart, useVisibleTerminals } from './terminal-shared'

const BENCH_KPIS: KpiId[] = ['KPI-001', 'KPI-002', 'KPI-003', 'KPI-004', 'KPI-005', 'KPI-008', 'KPI-009']
/** KPIs comparable across terminals (same unit) — the only ones a port average is shown for. */
const NORMALISED: KpiId[] = ['KPI-001', 'KPI-002', 'KPI-003', 'KPI-008', 'KPI-009']
const TREND_KPIS: KpiId[] = ['KPI-001', 'KPI-002', 'KPI-003']

interface Cell {
  id: KpiId
  value: number | null
  target: number | null
  status: KpiStatus
  unit: string
}

interface BenchRow {
  scope: Scope
  label: string
  cells: Cell[]
  onTarget: number
  rank: number | null
}

export function TerminalIntelligence() {
  const history = useVoms((s) => s.history)
  const period = usePeriod()
  const { portWide, terminals } = useVisibleTerminals()
  const showPortAverage = !portWide && terminals.length > 0

  const rows = useMemo<BenchRow[]>(() => {
    const cellsFor = (scope: Scope, ids: KpiId[]) =>
      BENCH_KPIS.map((id) => {
        const k = kpiById[id]
        if (!ids.includes(id)) return { id, value: null, target: null, status: 'na' as KpiStatus, unit: '' }
        const value = kpiValue(history, id, scope, period)
        const target = kpiTarget(history, id, scope, period)
        return { id, value, target, status: kpiStatus(id, value, target), unit: unitOf(k, scope) }
      })
    const terms = terminals.map((t) => {
      const cells = cellsFor(t, BENCH_KPIS)
      return { scope: t as Scope, label: scopeLabel(t), cells, onTarget: cells.filter((c) => c.status === 'good').length, rank: null as number | null }
    })
    const sorted = [...terms].sort((a, b) => b.onTarget - a.onTarget)
    for (const r of terms) r.rank = 1 + sorted.filter((x) => x.onTarget > r.onTarget).length
    const out: BenchRow[] = [...terms].sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))
    if (showPortAverage) {
      const cells = cellsFor('PORT', NORMALISED)
      out.push({ scope: 'PORT', label: 'Port average', cells, onTarget: cells.filter((c) => c.status === 'good').length, rank: null })
    }
    return out
  }, [history, period, terminals, showPortAverage])

  return (
    <PageShell>
      <PageHeader
        title='Terminal Intelligence'
        description={`Terminal benchmarking for ${periodLabel(period)} — analysed from terminal TOS and daily reports (simulated).`}
        actions={<PeriodSelector />}
      />

      {terminals.length === 0 ? (
        <EmptyState>Your session has no terminal in scope.</EmptyState>
      ) : (
        <>
          {showPortAverage && (
            <div role='note' className='flex items-start gap-2 rounded-lg border border-dashed bg-muted/40 px-3 py-2 text-sm text-muted-foreground'>
              <ShieldCheck className='mt-0.5 size-4 shrink-0' aria-hidden />
              <p className='min-w-0'>
                Peer terminals are not shown individually (data-sharing policy — illustrative). The port average covers all terminals for KPIs with a common unit only.
              </p>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Benchmark</CardTitle>
              <CardDescription>
                {periodLabel(period)} values against illustrative targets. Rank = number of KPIs on target (ties share a rank). Productivity and throughput use each terminal’s own unit.
              </CardDescription>
            </CardHeader>
            <CardContent className='grid min-w-0 gap-3'>
              <div className='flex flex-wrap items-center justify-between gap-2'>
                <StatusLegend />
                <IllustrativeBadge />
              </div>
              <div className='min-w-0 overflow-x-auto'>
                <Table className='text-sm'>
                  <TableHeader>
                    <TableRow>
                      <TableHead className='w-12'>Rank</TableHead>
                      <TableHead>Terminal</TableHead>
                      {BENCH_KPIS.map((id) => (
                        <TableHead key={id} className='text-end whitespace-nowrap'>
                          <span className='block'>{kpiById[id].short}</span>
                          <span className='block text-[11px] font-normal text-muted-foreground'>{id}</span>
                        </TableHead>
                      ))}
                      <TableHead className='text-end whitespace-nowrap'>On target</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={r.scope} className={cn(r.scope === 'PORT' && 'bg-muted/40 italic')}>
                        <TableCell className='tabular-nums'>{r.rank ?? '—'}</TableCell>
                        <TableCell className='whitespace-nowrap'>
                          <span className='inline-flex items-center gap-2 font-medium'>
                            <span
                              className={cn('size-2.5 rounded-sm', r.scope === 'PORT' && 'border border-dashed border-muted-foreground')}
                              style={{ background: r.scope === 'PORT' ? 'transparent' : TERMINAL_COLOR[r.scope as TerminalId] }}
                              aria-hidden
                            />
                            {r.label}
                          </span>
                        </TableCell>
                        {r.cells.map((c) => (
                          <TableCell key={c.id} className='text-end whitespace-nowrap tabular-nums'>
                            {c.value === null ? (
                              <span className='text-muted-foreground' title='Not comparable across units'>
                                n/a
                              </span>
                            ) : (
                              <span className='inline-flex items-center justify-end gap-1.5' title={`Target ${fmtKpi(c.target, c.unit)}`}>
                                {fmtKpi(c.value, c.unit)}
                                <StatusMark status={c.status} />
                              </span>
                            )}
                          </TableCell>
                        ))}
                        <TableCell className='text-end tabular-nums'>
                          {r.onTarget} / {r.scope === 'PORT' ? NORMALISED.length : BENCH_KPIS.length}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <section className='grid min-w-0 gap-3'>
            <h2 className='text-base font-semibold'>Trends — comparable KPIs</h2>
            <div className='grid min-w-0 gap-4 lg:grid-cols-3'>
              {TREND_KPIS.map((id) => (
                <Card key={id} className='min-w-0'>
                  <CardHeader>
                    <CardTitle>{kpiById[id].short}</CardTitle>
                    <CardDescription>
                      {id} · {unitOf(kpiById[id], 'PORT')} · 12 months to {periodLabel(period)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className='min-w-0'>
                    <TerminalLinesChart id={id} terminals={terminals} portAverage={showPortAverage} />
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <section className='grid min-w-0 gap-3'>
            <h2 className='text-base font-semibold'>Throughput & productivity</h2>
            <div className='grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3'>
              {terminals.map((t) => (
                <Card key={t} className='min-w-0'>
                  <CardHeader>
                    <CardTitle className='flex items-center gap-2'>
                      <span className='size-2.5 rounded-sm' style={{ background: TERMINAL_COLOR[t] }} aria-hidden />
                      {scopeLabel(t)}
                    </CardTitle>
                    <CardDescription>In the terminal’s own units — not summed across terminals.</CardDescription>
                  </CardHeader>
                  <CardContent className='grid min-w-0 gap-3'>
                    <KpiTile id='KPI-005' scope={t} />
                    <KpiTile id='KPI-004' scope={t} />
                    <Link to='/cargo' className='inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline'>
                      Cargo operations detail <ArrowRight className='size-4' aria-hidden />
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </>
      )}
    </PageShell>
  )
}
