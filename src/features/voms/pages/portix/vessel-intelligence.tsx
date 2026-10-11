// Vessel Intelligence (/vessel-intelligence): vessel-centric KPIs, delay Pareto,
// waiting-time trend and a snapshot of current port calls. Movement events come
// from VTMS/PMIS (simulated); PORTIX analyses them and does not control traffic.
import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Anchor, ArrowRight, Activity, Info, LayoutGrid, Ship, type LucideIcon } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { PageShell } from '@/components/layout/page-shell'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DELAY_CATEGORIES } from '../../history'
import { HOUR, callStatus } from '../../calc'
import { fmtHours, fmtShort } from '../../format'
import { kpiStatus, kpiTarget, kpiValue, periodLabel, scopeLabel } from '../../kpi'
import { usePeriod, useVoms, visibleCalls } from '../../store'
import { EmptyState, PageHeader, StatusBadge } from '../../components/common'
import { KpiTile, PeriodSelector, defaultScope, fmtKpi } from '../../components/portix-ui'
import { StatusLegend, StatusMark, TERMINAL_COLOR, TerminalLinesChart, useVisibleTerminals } from './terminal-shared'

const axis = { stroke: 'var(--chart-axis)', fontSize: 11, tickLine: false, axisLine: false } as const

function DelayPareto() {
  const history = useVoms((s) => s.history)
  const period = usePeriod()
  const { terminals } = useVisibleTerminals()
  const data = useMemo(() => {
    const rows = history.filter((r) => r.period === period && terminals.includes(r.unitId))
    const totals = DELAY_CATEGORIES.map((c) => ({ name: c as string, hours: +rows.reduce((a, r) => a + (r.delayByCategoryH[c] ?? 0), 0).toFixed(1) }))
    totals.sort((a, b) => b.hours - a.hours)
    const sum = totals.reduce((a, t) => a + t.hours, 0)
    let cum = 0
    return totals.map((t) => {
      cum += t.hours
      return { ...t, sharePct: sum ? (t.hours / sum) * 100 : 0, cumPct: sum ? (cum / sum) * 100 : 0 }
    })
  }, [history, period, terminals])
  const total = data.reduce((a, d) => a + d.hours, 0)

  if (!total) return <EmptyState>No delay hours recorded for this period.</EmptyState>
  return (
    <div className='grid min-w-0 gap-2'>
      <p className='text-sm text-muted-foreground'>
        Total {fmtKpi(total, 'h')} across {terminals.map((t) => scopeLabel(t)).join(', ')}. Labels show hours · cumulative share.
      </p>
      <div className='h-64'>
        <ResponsiveContainer width='100%' height='100%'>
          <BarChart data={data} layout='vertical' margin={{ top: 4, right: 92, left: 4, bottom: 0 }} barCategoryGap='22%'>
            <CartesianGrid horizontal={false} stroke='var(--chart-grid)' />
            <XAxis type='number' {...axis} tickFormatter={(v: number) => fmtKpi(v)} />
            <YAxis type='category' dataKey='name' {...axis} width={96} interval={0} />
            <Tooltip
              cursor={{ fill: 'var(--muted)', opacity: 0.5 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const d = payload[0].payload as (typeof data)[number]
                return (
                  <div className='rounded-md border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md'>
                    <div className='mb-1 font-semibold'>{d.name}</div>
                    <div className='flex gap-3'>
                      <span className='text-muted-foreground'>Delay hours</span>
                      <span className='ms-auto font-medium tabular-nums'>{fmtKpi(d.hours, 'h')}</span>
                    </div>
                    <div className='flex gap-3'>
                      <span className='text-muted-foreground'>Share</span>
                      <span className='ms-auto font-medium tabular-nums'>{d.sharePct.toFixed(1)}%</span>
                    </div>
                    <div className='flex gap-3'>
                      <span className='text-muted-foreground'>Cumulative</span>
                      <span className='ms-auto font-medium tabular-nums'>{d.cumPct.toFixed(0)}%</span>
                    </div>
                  </div>
                )
              }}
            />
            <Bar dataKey='hours' fill='var(--series-1)' radius={[0, 4, 4, 0]} isAnimationActive={false}>
              <LabelList
                dataKey='name'
                position='right'
                fontSize={11}
                fill='var(--foreground)'
                formatter={(name: unknown) => {
                  const d = data.find((x) => x.name === name)
                  return d ? `${fmtKpi(d.hours)} h · ${d.cumPct.toFixed(0)}%` : ''
                }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function WaitingByTerminal() {
  const history = useVoms((s) => s.history)
  const period = usePeriod()
  const { terminals } = useVisibleTerminals()
  return (
    <div className='grid min-w-0 gap-4'>
      <TerminalLinesChart id='KPI-002' terminals={terminals} />
      <div className='min-w-0 overflow-x-auto'>
        <Table className='text-sm'>
          <TableHeader>
            <TableRow>
              <TableHead>Terminal</TableHead>
              <TableHead className='text-end'>{periodLabel(period)}</TableHead>
              <TableHead className='text-end'>Target</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {terminals.map((t) => {
              const v = kpiValue(history, 'KPI-002', t, period)
              const target = kpiTarget(history, 'KPI-002', t, period)
              const st = kpiStatus('KPI-002', v, target)
              return (
                <TableRow key={t}>
                  <TableCell className='whitespace-nowrap'>
                    <span className='inline-flex items-center gap-2 font-medium'>
                      <span className='size-2.5 rounded-sm' style={{ background: TERMINAL_COLOR[t] }} aria-hidden />
                      {scopeLabel(t)}
                    </span>
                  </TableCell>
                  <TableCell className='text-end tabular-nums'>{fmtKpi(v, 'h')}</TableCell>
                  <TableCell className='text-end tabular-nums text-muted-foreground'>{fmtKpi(target, 'h')}</TableCell>
                  <TableCell className='whitespace-nowrap'>
                    <span className='inline-flex items-center gap-1.5'>
                      <StatusMark status={st} />
                      {st === 'good' ? 'On target' : st === 'warning' ? 'Watch' : st === 'critical' ? 'Off target' : 'No target'}
                    </span>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
      <StatusLegend />
    </div>
  )
}

function CallsSnapshot() {
  const state = useVoms()
  const calls = visibleCalls(state)
  const vessels = state.vessels
  const [now] = useState(() => Date.now())
  const { counts, longest } = useMemo(() => {
    const counts = { expected: 0, anchorage: 0, berth: 0, departed: 0 }
    const waiting: { id: string; vessel: string; ata: string; hours: number; berth?: string }[] = []
    for (const c of calls) {
      const s = callStatus(c)
      if (s === 'expected') counts.expected++
      else if (s === 'arrived') {
        counts.anchorage++
        const ata = c.events.ata!.time
        waiting.push({
          id: c.id,
          vessel: vessels.find((v) => v.id === c.vesselId)?.name ?? c.vesselId,
          ata,
          hours: (now - new Date(ata).getTime()) / HOUR,
          berth: c.berthId ?? c.requestedBerthId,
        })
      } else if (s === 'at_berth' || s === 'operations' || s === 'ops_completed') counts.berth++
      else if (s === 'departed') counts.departed++
    }
    waiting.sort((a, b) => b.hours - a.hours)
    return { counts, longest: waiting.slice(0, 5) }
  }, [calls, vessels, now])

  const tiles: { label: string; value: number; icon: LucideIcon; hint: string }[] = [
    { label: 'Expected', value: counts.expected, icon: Ship, hint: 'ETA declared, not yet arrived' },
    { label: 'At anchorage', value: counts.anchorage, icon: Anchor, hint: 'ATA recorded, not yet All Fast' },
    { label: 'At berth / operations', value: counts.berth, icon: Activity, hint: 'All Fast, before departure' },
    { label: 'Departed, awaiting closure', value: counts.departed, icon: LayoutGrid, hint: 'ATD recorded, call not closed' },
  ]

  return (
    <div className='grid min-w-0 gap-4'>
      <div className='grid grid-cols-2 gap-3 lg:grid-cols-4'>
        {tiles.map((t) => (
          <div key={t.label} className='min-w-0 rounded-xl border bg-card p-3 shadow-xs'>
            <div className='flex items-center gap-2 text-sm text-muted-foreground'>
              <t.icon className='size-4 shrink-0' aria-hidden />
              <span className='truncate'>{t.label}</span>
            </div>
            <div className='mt-1 text-2xl font-semibold tabular-nums'>{t.value}</div>
            <div className='text-xs text-muted-foreground'>{t.hint}</div>
          </div>
        ))}
      </div>
      <div className='grid min-w-0 gap-2'>
        <h3 className='text-sm font-semibold'>Longest current waiting (at anchorage)</h3>
        {longest.length === 0 ? (
          <EmptyState>No vessels currently waiting at anchorage.</EmptyState>
        ) : (
          <div className='min-w-0 overflow-x-auto'>
            <Table className='text-sm'>
              <TableHeader>
                <TableRow>
                  <TableHead>Call</TableHead>
                  <TableHead>Vessel</TableHead>
                  <TableHead>ATA</TableHead>
                  <TableHead className='text-end'>Waiting</TableHead>
                  <TableHead>Berth</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {longest.map((w) => {
                  const call = calls.find((c) => c.id === w.id)!
                  return (
                    <TableRow key={w.id}>
                      <TableCell className='whitespace-nowrap'>
                        <Link to='/vessel-calls/$callId' params={{ callId: w.id }} className='font-medium text-primary hover:underline'>
                          {w.id}
                        </Link>
                      </TableCell>
                      <TableCell className='whitespace-nowrap'>{w.vessel}</TableCell>
                      <TableCell className='whitespace-nowrap'>{fmtShort(w.ata)}</TableCell>
                      <TableCell className='text-end whitespace-nowrap tabular-nums'>{fmtHours(w.hours)}</TableCell>
                      <TableCell className='whitespace-nowrap'>{w.berth ?? '—'}</TableCell>
                      <TableCell>
                        <StatusBadge call={call} />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}

const links = [
  { to: '/vessel-calls', label: 'Vessel calls', desc: 'Full list of port calls and their movement events.', icon: Ship },
  { to: '/berths', label: 'Berths & wharves', desc: 'Berth occupancy, planned arrivals and allocation.', icon: LayoutGrid },
  { to: '/operations', label: 'Live operations', desc: 'What is happening in port right now.', icon: Activity },
] as const

export function VesselIntelligence() {
  const session = useVoms((s) => s.session)
  const period = usePeriod()
  const scope = defaultScope(session)

  return (
    <PageShell>
      <PageHeader
        title='Vessel Intelligence'
        description={`Vessel movements, waiting and delays — ${scopeLabel(scope)}, ${periodLabel(period)}.`}
        actions={<PeriodSelector />}
      />

      <div role='note' className='flex items-start gap-2 rounded-lg border bg-[var(--series-1)]/8 px-3 py-2 text-sm'>
        <Info className='mt-0.5 size-4 shrink-0 text-[var(--series-1-ink)]' aria-hidden />
        <p className='min-w-0'>Movement events come from VTMS/PMIS (simulated). PORTIX analyses them; it does not control vessel traffic.</p>
      </div>

      <div className='grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4'>
        <KpiTile id='KPI-001' scope={scope} />
        <KpiTile id='KPI-002' scope={scope} />
        <KpiTile id='KPI-009' scope={scope} />
        <KpiTile id='KPI-006' scope={scope} />
      </div>

      <div className='grid min-w-0 gap-4 lg:grid-cols-2'>
        <Card className='min-w-0'>
          <CardHeader>
            <CardTitle>Delay Pareto</CardTitle>
            <CardDescription>Delay hours by category, {periodLabel(period)}, sorted largest first.</CardDescription>
          </CardHeader>
          <CardContent className='min-w-0'>
            <DelayPareto />
          </CardContent>
        </Card>
        <Card className='min-w-0'>
          <CardHeader>
            <CardTitle>Waiting time by terminal</CardTitle>
            <CardDescription>KPI-002 · ATA → All Fast, 12 months to {periodLabel(period)}.</CardDescription>
          </CardHeader>
          <CardContent className='min-w-0'>
            <WaitingByTerminal />
          </CardContent>
        </Card>
      </div>

      <Card className='min-w-0'>
        <CardHeader>
          <CardTitle>Current port calls</CardTitle>
          <CardDescription>Live snapshot of calls in your scope (not tied to the selected month).</CardDescription>
        </CardHeader>
        <CardContent className='min-w-0'>
          <CallsSnapshot />
        </CardContent>
      </Card>

      <div className='grid min-w-0 gap-3 md:grid-cols-3'>
        {links.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            className='group flex min-w-0 items-start gap-3 rounded-xl border bg-card p-4 shadow-xs transition-colors hover:bg-accent/40 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none'
          >
            <l.icon className='mt-0.5 size-5 shrink-0 text-[var(--series-1-ink)]' aria-hidden />
            <span className='min-w-0 flex-1'>
              <span className='block font-semibold'>{l.label}</span>
              <span className='block text-sm text-muted-foreground'>{l.desc}</span>
            </span>
            <ArrowRight className='size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5' aria-hidden />
          </Link>
        ))}
      </div>
    </PageShell>
  )
}
