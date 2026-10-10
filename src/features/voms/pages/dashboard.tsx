import { useMemo, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { Anchor, ArrowRight, ClipboardCheck, Package, Plus, Ship } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PageShell } from '@/components/layout/page-shell'
import { berthOccupant, berthState, callStatus, lineProgress } from '../calc'
import { fmtNum, fmtQty, fmtRelative, fmtShort } from '../format'
import { perspectiveMeta, scopeBerths } from '../org'
import { roleById } from '../roles'
import { scopedUnits } from '../ai'
import { useCan, useVoms, visibleCalls, visibleConnectors } from '../store'
import { BerthUtilizationChart, TurnaroundChart } from '../components/charts'
import { BerthTile } from '../components/berth-tile'
import { NewCallDialog } from '../components/dialogs'
import { AlertsPanel } from '../components/alerts-panel'
import { DiscussionBox, InsightCards, SimulatedAiBadge } from '../components/ai-panel'
import { TrendGrid } from '../components/trend-charts'
import { ConnectorStrip } from '../components/connector-strip'
import { PageHeader, ProgressBar, StatTile, StatusBadge } from '../components/common'
import { SubmissionHome } from './submission-home'

export function Dashboard() {
  const perspective = useVoms((s) => s.perspective)
  return perspective === 'submission' ? <SubmissionHome /> : <ManagementHome />
}

function ManagementHome() {
  const state = useVoms()
  const session = state.session!
  const calls = visibleCalls(state)
  const { vessels, incidents } = state
  const berthIds = scopeBerths(session)
  const berths = berthIds ? state.berths.filter((b) => berthIds.includes(b.id)) : state.berths
  const navigate = useNavigate()
  const canCreate = useCan('call.create')
  const [newOpen, setNewOpen] = useState(false)
  const vesselOf = (id: string) => vessels.find((v) => v.id === id)!

  const byStatus = useMemo(() => {
    const m: Record<string, typeof calls> = {}
    for (const c of calls) (m[callStatus(c)] ??= []).push(c)
    return m
  }, [calls])

  const expected = (byStatus.expected ?? []).sort((a, b) => a.events.eta!.time.localeCompare(b.events.eta!.time))
  const atBerth = calls.filter((c) => c.events.allFast && !c.events.lastLine)
  const working = byStatus.operations ?? []
  const pending = calls.filter(
    (c) =>
      !c.closure &&
      (Object.entries(c.events).some(([k, e]) => k !== 'eta' && k !== 'etd' && !e!.verifiedBy) ||
        c.production.some((p) => p.status !== 'verified') ||
        (c.finalTally && !c.finalTally.verifiedBy))
  )
  const openIncidents = incidents.filter((i) => i.status !== 'closed' && calls.some((c) => c.id === i.callId))

  return (
    <PageShell>
      <PageHeader
        title={`${roleById[session.role].name} — Management`}
        description={
          <>
            {perspectiveMeta.management.label} · scope: {session.scopeLabel} · updated {fmtShort(new Date().toISOString())}
          </>
        }
        actions={
          canCreate && (
            <Button onClick={() => setNewOpen(true)}>
              <Plus /> New pre-arrival notice
            </Button>
          )
        }
      />

      <ConnectorStrip connectors={visibleConnectors(state)} />

      <div className='grid grid-cols-2 gap-3 lg:grid-cols-4'>
        <StatTile label='Expected vessels' value={expected.length} hint={expected[0] ? `Next ETA ${fmtRelative(expected[0].events.eta!.time)}` : 'None scheduled'} icon={Ship} onClick={() => navigate({ to: '/vessel-calls', search: { status: 'expected' } })} />
        <StatTile label='Vessels at berth' value={atBerth.length} hint={`${berths.length} berths in scope`} icon={Anchor} onClick={() => navigate({ to: '/berths' })} />
        <StatTile label='Cargo operations' value={working.length} hint={`${openIncidents.length} open incident(s)`} icon={Package} onClick={() => navigate({ to: '/vessel-calls', search: { status: 'operations' } })} />
        <StatTile label='Pending verification' value={pending.length} hint='Calls with unverified records' icon={ClipboardCheck} onClick={() => navigate({ to: '/vessel-calls', search: { status: 'pending' } })} />
      </div>

      <div className='grid gap-4 lg:grid-cols-3'>
        <Card className='lg:col-span-2'>
          <CardHeader>
            <CardTitle>AI insights</CardTitle>
            <CardDescription>Material deviations in your scope, with period, source and validation status.</CardDescription>
            <div>
              <SimulatedAiBadge />
            </div>
          </CardHeader>
          <CardContent className='grid gap-4'>
            <InsightCards max={4} />
            <div className='grid gap-2 border-t pt-4'>
              <h3 className='text-sm font-semibold'>Discuss with VOMS</h3>
              <DiscussionBox compact />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Alerts</CardTitle>
            <CardDescription>Scoped to your role and organization. An anomaly is a review flag, not proof of error.</CardDescription>
          </CardHeader>
          <CardContent>
            <AlertsPanel limit={5} />
          </CardContent>
        </Card>
      </div>

      {scopedUnits(state).some((u) => u.metric) && (
        <Card>
          <CardHeader>
            <CardTitle>Daily throughput & traffic — last 14 days</CardTitle>
            <CardDescription>From unit submissions. Each unit keeps its own measurement unit.</CardDescription>
          </CardHeader>
          <CardContent>
            <TrendGrid units={scopedUnits(state)} />
          </CardContent>
        </Card>
      )}

      <div className='grid gap-4 lg:grid-cols-3'>
        <Card className='lg:col-span-2'>
          <CardHeader>
            <CardTitle>Cargo operations progress</CardTitle>
            <CardDescription>Actual vs declared quantity per cargo line, in each commodity's own unit.</CardDescription>
          </CardHeader>
          <CardContent className='grid gap-4'>
            {working.length === 0 && <p className='text-sm text-muted-foreground'>No cargo operations in progress in your scope.</p>}
            {working.map((c) => (
              <Link key={c.id} to='/vessel-calls/$callId' params={{ callId: c.id }} className='grid gap-2 rounded-lg border p-3 hover:bg-accent/50'>
                <div className='flex flex-wrap items-center justify-between gap-2'>
                  <div className='min-w-0'>
                    <div className='truncate font-semibold'>{vesselOf(c.vesselId).name}</div>
                    <div className='text-xs text-muted-foreground'>
                      {c.id} · {c.berthId} · {vesselOf(c.vesselId).typeLabel}
                    </div>
                  </div>
                  <StatusBadge call={c} />
                </div>
                {c.cargo.map((l) => {
                  const p = lineProgress(c, l.id)
                  return (
                    <div key={l.id} className='grid gap-1'>
                      <div className='flex flex-wrap justify-between gap-x-3 text-sm'>
                        <span>
                          {l.commodity} — {l.direction}
                        </span>
                        <span className='tabular-nums'>
                          <span className='font-semibold'>{fmtNum(p.pct)}%</span>
                          <span className='text-muted-foreground'> · {fmtQty(p.done, l.unit)} / {fmtQty(l.declared, l.unit)}</span>
                        </span>
                      </div>
                      <ProgressBar pct={p.pct} label={`${l.commodity} progress`} />
                    </div>
                  )
                })}
              </Link>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Expected arrivals</CardTitle>
            <CardDescription>Ordered by ETA.</CardDescription>
          </CardHeader>
          <CardContent className='grid gap-2'>
            {expected.length === 0 && <p className='text-sm text-muted-foreground'>No expected arrivals.</p>}
            {expected.map((c) => (
              <Link key={c.id} to='/vessel-calls/$callId' params={{ callId: c.id }} className='flex items-center justify-between gap-2 rounded-md border p-2 text-sm hover:bg-accent/50'>
                <div className='min-w-0'>
                  <div className='truncate font-medium'>{vesselOf(c.vesselId).name}</div>
                  <div className='text-xs text-muted-foreground'>
                    {c.id} · req. {c.requestedBerthId ?? '—'}
                  </div>
                </div>
                <div className='shrink-0 text-end text-xs'>
                  <div className='font-medium tabular-nums'>{fmtShort(c.events.eta!.time)}</div>
                  <div className='text-muted-foreground'>{fmtRelative(c.events.eta!.time)}</div>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Berth status</CardTitle>
          <CardDescription>Placeholder berths in your scope — subject to SBMA facility register validation.</CardDescription>
          <CardAction>
            <Button variant='ghost' size='sm' asChild>
              <Link to='/berths'>
                Board <ArrowRight />
              </Link>
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-8'>
            {berths.map((b) => (
              <BerthTile key={b.id} berth={b} state={berthState(b, calls)} occupant={berthOccupant(b.id, calls)} compact />
            ))}
          </div>
        </CardContent>
      </Card>

      <div className='grid gap-4 lg:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle>Vessel turnaround — recent departures</CardTitle>
            <CardDescription>ATA → ATD in hours (KPI-001), split by event interval.</CardDescription>
          </CardHeader>
          <CardContent>
            <TurnaroundChart calls={calls} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Berth occupancy — last 7 days</CardTitle>
            <CardDescription>Share of hours occupied (All Fast → Last Line) per berth.</CardDescription>
          </CardHeader>
          <CardContent>
            <BerthUtilizationChart berths={berths} calls={calls} />
          </CardContent>
        </Card>
      </div>

      <p className='text-xs text-muted-foreground'>All figures are synthetic. No live connection to SBMA, AIS or terminal systems.</p>
      {newOpen && <NewCallDialog open={newOpen} onOpenChange={setNewOpen} />}
    </PageShell>
  )
}
