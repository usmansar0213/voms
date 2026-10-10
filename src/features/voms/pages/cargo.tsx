import { useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageShell } from '@/components/layout/page-shell'
import { callStatus, delayHours, lineProgress, productivity } from '../calc'
import { fmtHours, fmtNum, fmtQty } from '../format'
import { useVoms, visibleCalls } from '../store'
import type { Unit } from '../types'
import { EmptyState, PageHeader, ProgressBar, StatusBadge, ToneBadge } from '../components/common'

export function CargoTerminal() {
  const state = useVoms()
  const calls = visibleCalls(state)
  const vesselOf = (id: string) => state.vessels.find((v) => v.id === id)!
  const working = calls.filter((c) => ['at_berth', 'operations', 'ops_completed'].includes(callStatus(c)))

  // Commodity throughput over all visible calls — totals per commodity AND unit, never across units.
  const commodities = useMemo(() => {
    const m = new Map<string, { commodity: string; unit: Unit; direction: string; declared: number; done: number; calls: number }>()
    for (const c of calls) {
      if (c.cancelled) continue
      for (const l of c.cargo) {
        const key = `${l.commodity}|${l.unit}|${l.direction}`
        const cur = m.get(key) ?? { commodity: l.commodity, unit: l.unit, direction: l.direction, declared: 0, done: 0, calls: 0 }
        cur.declared += l.declared
        cur.done += lineProgress(c, l.id).done
        cur.calls += 1
        m.set(key, cur)
      }
    }
    return [...m.values()].sort((a, b) => a.unit.localeCompare(b.unit) || b.done - a.done)
  }, [calls])

  return (
    <PageShell>
      <PageHeader
        title='Cargo & Terminal Operations'
        description='Terminal production attributed to each Vessel Call ID. Units follow the commodity: TEU for containers, MT for dry bulk, KL for liquid cargo.'
      />

      <Card>
        <CardHeader>
          <CardTitle>Vessels alongside</CardTitle>
          <CardDescription>Progress, productivity and delays for calls currently at berth.</CardDescription>
        </CardHeader>
        <CardContent className='grid gap-3 md:grid-cols-2'>
          {working.length === 0 && <EmptyState>No vessels alongside.</EmptyState>}
          {working.map((c) => {
            const prod = productivity(c)
            return (
              <Link key={c.id} to='/vessel-calls/$callId' params={{ callId: c.id }} className='grid gap-2 rounded-lg border p-3 hover:bg-accent/50'>
                <div className='flex flex-wrap items-start justify-between gap-2'>
                  <div className='min-w-0'>
                    <div className='truncate font-semibold'>{vesselOf(c.vesselId).name}</div>
                    <div className='text-xs text-muted-foreground'>
                      {c.id} · {c.berthId}
                    </div>
                  </div>
                  <StatusBadge call={c} />
                </div>
                {c.cargo.map((l) => {
                  const p = lineProgress(c, l.id)
                  return (
                    <div key={l.id} className='grid gap-1'>
                      <div className='flex flex-wrap justify-between gap-2 text-sm'>
                        <span>
                          {l.commodity} — {l.direction}
                        </span>
                        <span className='tabular-nums text-muted-foreground'>
                          {fmtQty(p.done, l.unit)} / {fmtQty(l.declared, l.unit)}
                        </span>
                      </div>
                      <ProgressBar pct={p.pct} label={`${l.commodity} progress`} />
                    </div>
                  )
                })}
                <div className='flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground'>
                  {prod.map((p) => (
                    <span key={p.unit}>
                      Gross {fmtNum(p.gross, 1)} {p.unit}/h · Net {fmtNum(p.net, 1)} {p.unit}/h
                    </span>
                  ))}
                  <span>Delays {fmtHours(delayHours(c))}</span>
                  {c.production.some((p) => p.status !== 'verified') && <ToneBadge tone='warning'>Unverified entries</ToneBadge>}
                </div>
              </Link>
            )
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Commodity summary</CardTitle>
          <CardDescription>All visible vessel calls in the demo period, grouped by commodity, direction and unit.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='overflow-x-auto rounded-md border'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Commodity</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead className='text-end'>Calls</TableHead>
                  <TableHead className='text-end'>Declared</TableHead>
                  <TableHead className='text-end'>Handled</TableHead>
                  <TableHead className='text-end'>Unit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commodities.map((r) => (
                  <TableRow key={`${r.commodity}${r.unit}${r.direction}`}>
                    <TableCell className='font-medium'>{r.commodity}</TableCell>
                    <TableCell className='capitalize'>{r.direction}</TableCell>
                    <TableCell className='text-end tabular-nums'>{r.calls}</TableCell>
                    <TableCell className='text-end tabular-nums'>{fmtNum(r.declared)}</TableCell>
                    <TableCell className='text-end tabular-nums'>{fmtNum(r.done)}</TableCell>
                    <TableCell className='text-end'>{r.unit}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </PageShell>
  )
}
