import { useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import { CalendarClock, Clock, Download, FileText, Gauge, Hourglass, ShieldCheck, Timer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageShell } from '@/components/layout/page-shell'
import { berthOccupancyHours, etaVariance, HOUR, productivity, turnaround } from '../calc'
import { fmtHours, fmtNum, fmtShort } from '../format'
import { can } from '../roles'
import { useVoms, visibleCalls } from '../store'
import { downloadCsv } from '../lib-export'
import { BerthUtilizationChart, TurnaroundChart } from '../components/charts'
import { PageHeader, StatTile, StatusBadge } from '../components/common'
import { scenarioLabel } from './vessel-calls'

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : undefined)

export function Reports() {
  const state = useVoms()
  const calls = visibleCalls(state)
  const { berths, vessels, role } = state
  const vesselOf = (id: string) => vessels.find((v) => v.id === id)!
  const departed = calls.filter((c) => c.events.atd)

  const kpi = useMemo(() => {
    const t = departed.map(turnaround)
    const etaVar = calls.map(etaVariance).filter((v): v is number => v !== undefined)
    const movement = calls.flatMap((c) => Object.entries(c.events).filter(([k]) => k !== 'eta' && k !== 'etd').map(([, e]) => e!))
    const prod = calls.flatMap((c) => c.production)
    const to = Date.now()
    const from = to - 7 * 24 * HOUR
    const occ = berths.reduce((s, b) => s + berthOccupancyHours(b.id, calls, from, to), 0)
    return {
      turnaround: avg(t.map((x) => x.total!).filter(Boolean)),
      waiting: avg(t.map((x) => x.waiting!).filter((x) => x !== undefined)),
      atBerth: avg(t.map((x) => x.atBerth!).filter((x) => x !== undefined)),
      etaWithin2h: etaVar.length ? (etaVar.filter((v) => Math.abs(v) <= 2).length / etaVar.length) * 100 : undefined,
      verified: movement.length + prod.length ? ((movement.filter((e) => e.verifiedBy).length + prod.filter((p) => p.status === 'verified').length) / (movement.length + prod.length)) * 100 : undefined,
      utilization: (occ / (berths.length * 7 * 24)) * 100,
    }
  }, [calls, departed, berths])

  const exportCsv = () =>
    downloadCsv(`voms-vessel-calls-${new Date().toISOString().slice(0, 10)}.csv`, [
      ['Vessel Call ID', 'Vessel', 'IMO', 'Type', 'Berth', 'ETA', 'ATA', 'All Fast', 'Last Line', 'ATD', 'Waiting h', 'At berth h', 'Turnaround h', 'Cargo', 'Data source note'],
      ...calls.map((c) => {
        const v = vesselOf(c.vesselId)
        const t = turnaround(c)
        return [
          c.id,
          v.name,
          v.imo,
          scenarioLabel[c.scenario],
          c.berthId,
          c.events.eta?.time,
          c.events.ata?.time,
          c.events.allFast?.time,
          c.events.lastLine?.time,
          c.events.atd?.time,
          t.waiting?.toFixed(2),
          t.atBerth?.toFixed(2),
          t.total?.toFixed(2),
          c.cargo.map((l) => `${l.commodity} ${l.direction} ${l.declared} ${l.unit}`).join('; '),
          'SIMULATED DEMO DATA',
        ]
      }),
    ])

  return (
    <PageShell>
      <PageHeader
        title='KPIs & Reports'
        description='Indicators calculated from recorded events (BRD Section 4). Baselines and targets are TBC — figures here are simulated.'
        actions={
          can(role, 'report.export') && (
            <Button variant='outline' onClick={exportCsv}>
              <Download /> Export CSV
            </Button>
          )
        }
      />

      <div className='grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6'>
        <StatTile label='Avg turnaround' value={fmtHours(kpi.turnaround)} hint='ATA → ATD · KPI-001' icon={Timer} />
        <StatTile label='Avg waiting + berthing' value={fmtHours(kpi.waiting)} hint='ATA → All Fast' icon={Hourglass} />
        <StatTile label='Avg time at berth' value={fmtHours(kpi.atBerth)} hint='All Fast → Last Line' icon={Clock} />
        <StatTile label='Berth utilization' value={`${fmtNum(kpi.utilization, 1)}%`} hint='15 berths · last 7 days' icon={Gauge} />
        <StatTile label='Arrivals within ±2 h of ETA' value={kpi.etaWithin2h === undefined ? '—' : `${fmtNum(kpi.etaWithin2h)}%`} hint='Schedule reliability' icon={CalendarClock} />
        <StatTile label='Records verified' value={kpi.verified === undefined ? '—' : `${fmtNum(kpi.verified)}%`} hint='Events + production' icon={ShieldCheck} />
      </div>

      <div className='grid gap-4 lg:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle>Vessel turnaround</CardTitle>
            <CardDescription>Last eight departures, split by event interval.</CardDescription>
          </CardHeader>
          <CardContent>
            <TurnaroundChart calls={calls} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Berth occupancy — last 7 days</CardTitle>
            <CardDescription>All Fast → Last Line hours as a share of the period.</CardDescription>
          </CardHeader>
          <CardContent>
            <BerthUtilizationChart berths={berths} calls={calls} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Integrated Vessel Call Reports</CardTitle>
          <CardDescription>One reconciled report per Vessel Call ID: arrival, berth, cargo, incidents and departure. Table view of the KPIs above.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='overflow-x-auto rounded-md border'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vessel Call</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className='text-end'>Waiting</TableHead>
                  <TableHead className='text-end'>At berth</TableHead>
                  <TableHead className='text-end'>Turnaround</TableHead>
                  <TableHead className='text-end'>Gross productivity</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {calls.map((c) => {
                  const t = turnaround(c)
                  return (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div className='font-medium'>{c.id}</div>
                        <div className='text-xs text-muted-foreground'>
                          {vesselOf(c.vesselId).name} · {c.events.atd ? `ATD ${fmtShort(c.events.atd.time)}` : `ETA ${fmtShort(c.events.eta?.time)}`}
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge call={c} />
                      </TableCell>
                      <TableCell className='text-end tabular-nums'>{fmtHours(t.waiting)}</TableCell>
                      <TableCell className='text-end tabular-nums'>{fmtHours(t.atBerth)}</TableCell>
                      <TableCell className='text-end tabular-nums'>{fmtHours(t.total)}</TableCell>
                      <TableCell className='text-end text-xs tabular-nums'>
                        {productivity(c)
                          .map((p) => `${fmtNum(p.gross, 1)} ${p.unit}/h`)
                          .join(' · ') || '—'}
                      </TableCell>
                      <TableCell className='text-end'>
                        <Button size='sm' variant='ghost' asChild>
                          <Link to='/reports/$callId' params={{ callId: c.id }}>
                            <FileText /> Report
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </PageShell>
  )
}
