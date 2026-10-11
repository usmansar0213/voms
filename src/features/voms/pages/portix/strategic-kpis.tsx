// PORTIX Strategic KPI registry: all KPI definitions with current value,
// illustrative target and status for the selected reporting month.
import { useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import { ChevronRight, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageShell } from '@/components/layout/page-shell'
import { kpis, kpiStatus, kpiTarget, kpiValue, periodLabel, scopeLabel, unitOf, type KpiId, type KpiStatus, type Scope } from '../../kpi'
import { usePeriod, useVoms } from '../../store'
import { EmptyState, PageHeader } from '../../components/common'
import { fmtKpi, IllustrativeBadge, KpiStatusPill, PeriodSelector } from '../../components/portix-ui'
import { directionText, terminalScopes, TerminalStatusDot, unitText, useScopedData } from './kpi-shared'

interface Row {
  id: KpiId
  value: number | null
  target: number | null
  status: KpiStatus
  perTerminalOnly: boolean
  terminals: { scope: Scope; status: KpiStatus }[]
}

export function StrategicKpis() {
  const history = useVoms((s) => s.history)
  const period = usePeriod()
  const { scopes } = useScopedData()
  const scope: Scope = scopes[0] ?? 'PORT'
  const terminals = useMemo(() => terminalScopes(scopes), [scopes])

  const rows = useMemo<Row[]>(
    () =>
      kpis.map((k) => {
        const perTerminalOnly = scope === 'PORT' && !k.portLevel
        const value = kpiValue(history, k.id, scope, period)
        const target = kpiTarget(history, k.id, scope, period)
        return {
          id: k.id,
          value,
          target,
          status: kpiStatus(k.id, value, target),
          perTerminalOnly,
          terminals: terminals.map((t) => ({ scope: t, status: kpiStatus(k.id, kpiValue(history, k.id, t, period), kpiTarget(history, k.id, t, period)) })),
        }
      }),
    [history, period, scope, terminals]
  )

  const kpiOf = (id: KpiId) => kpis.find((k) => k.id === id)!
  const valueCell = (r: Row) => (r.perTerminalOnly ? <span className='text-muted-foreground'>Per terminal</span> : fmtKpi(r.value, unitOf(kpiOf(r.id), scope)))
  const targetCell = (r: Row) => (r.perTerminalOnly ? <span className='text-muted-foreground'>Per terminal</span> : fmtKpi(r.target, unitOf(kpiOf(r.id), scope)))

  return (
    <PageShell>
      <PageHeader
        title='Strategic KPIs'
        description={`KPI registry — definitions, owners and achievement for ${periodLabel(period)} · ${scopeLabel(scope)}.`}
        actions={<PeriodSelector />}
      />

      <div role='note' className='flex items-start gap-2 rounded-lg border border-dashed bg-muted/40 p-3 text-sm text-muted-foreground'>
        <Info className='mt-0.5 size-4 shrink-0' aria-hidden />
        <p className='min-w-0'>
          Targets are illustrative until approved by SBMA; definitions v0.1 from BRD Section 4. Throughput and berth productivity use each terminal’s own unit and are
          never summed port-wide. <IllustrativeBadge className='ms-1' />
        </p>
      </div>

      {!scopes.length ? (
        <EmptyState>No KPI scope is available for this session.</EmptyState>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>KPI registry</CardTitle>
            <CardDescription>
              Current value, target and status shown for {scopeLabel(scope)}
              {terminals.length > 0 && '; markers show the status of each terminal'}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Desktop table */}
            <div className='hidden overflow-x-auto rounded-md border lg:block'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>KPI</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Direction</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead className='text-end'>Current</TableHead>
                    <TableHead className='text-end'>Target</TableHead>
                    <TableHead>Status</TableHead>
                    {terminals.length > 0 && <TableHead>Terminals</TableHead>}
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => {
                    const k = kpiOf(r.id)
                    return (
                      <TableRow key={r.id}>
                        <TableCell className='font-mono text-xs'>{k.id}</TableCell>
                        <TableCell className='max-w-64 whitespace-normal'>
                          <div className='font-medium'>{k.name}</div>
                          <div className='text-xs text-muted-foreground'>{k.description}</div>
                        </TableCell>
                        <TableCell className='text-xs'>{unitText(k, scope)}</TableCell>
                        <TableCell className='text-xs'>{directionText(k)}</TableCell>
                        <TableCell className='max-w-40 text-xs whitespace-normal'>{k.owner}</TableCell>
                        <TableCell className='text-xs'>{k.frequency}</TableCell>
                        <TableCell className='text-end font-medium tabular-nums'>{valueCell(r)}</TableCell>
                        <TableCell className='text-end text-muted-foreground tabular-nums'>{targetCell(r)}</TableCell>
                        <TableCell>{r.perTerminalOnly ? <span className='text-xs text-muted-foreground'>See terminals</span> : <KpiStatusPill status={r.status} />}</TableCell>
                        {terminals.length > 0 && (
                          <TableCell>
                            <div className='flex gap-1'>
                              {r.terminals.map((t) => (
                                <TerminalStatusDot key={t.scope} scope={t.scope} status={t.status} />
                              ))}
                            </div>
                          </TableCell>
                        )}
                        <TableCell className='text-end'>
                          <Button size='sm' variant='ghost' asChild>
                            <Link to='/kpis/$kpiId' params={{ kpiId: k.id }} search={{ scope: r.perTerminalOnly ? terminals[0] : scope }}>
                              Detail <ChevronRight />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile / tablet cards */}
            <ul className='grid gap-3 sm:grid-cols-2 lg:hidden'>
              {rows.map((r) => {
                const k = kpiOf(r.id)
                return (
                  <li key={r.id} className='min-w-0'>
                    <Link
                      to='/kpis/$kpiId'
                      params={{ kpiId: k.id }}
                      search={{ scope: r.perTerminalOnly ? terminals[0] : scope }}
                      className='grid min-w-0 gap-2 rounded-lg border bg-card p-3 text-sm transition-colors hover:bg-accent/40 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none'
                    >
                      <div className='flex items-start justify-between gap-2'>
                        <div className='min-w-0'>
                          <div className='font-mono text-xs text-muted-foreground'>{k.id}</div>
                          <div className='font-medium'>{k.name}</div>
                        </div>
                        {r.perTerminalOnly ? <span className='text-xs text-muted-foreground'>Per terminal</span> : <KpiStatusPill status={r.status} />}
                      </div>
                      <div className='flex flex-wrap items-baseline gap-x-3 gap-y-0.5'>
                        <span className='text-lg font-semibold tabular-nums'>{valueCell(r)}</span>
                        {!r.perTerminalOnly && <span className='text-xs text-muted-foreground'>Target {targetCell(r)}</span>}
                      </div>
                      <div className='text-xs text-muted-foreground'>
                        {unitText(k, scope)} · {directionText(k)} · {k.frequency}
                      </div>
                      <div className='text-xs text-muted-foreground'>Owner: {k.owner}</div>
                      {terminals.length > 0 && (
                        <div className='flex flex-wrap gap-1'>
                          {r.terminals.map((t) => (
                            <TerminalStatusDot key={t.scope} scope={t.scope} status={t.status} />
                          ))}
                        </div>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </PageShell>
  )
}
