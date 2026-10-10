import { useMemo, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { Anchor, ArrowRight, Package, Plus, Ship, TriangleAlert } from 'lucide-react'
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
import { AttentionList } from '../components/alerts-panel'
import { scenarioColor, VesselArt } from '../components/vessel-art'
import { DiscussionBox, InsightCards, SimulatedAiBadge } from '../components/ai-panel'
import { TrendGrid } from '../components/trend-charts'
import { ConnectorStrip } from '../components/connector-strip'
import { PageHeader, ProgressBar, StatTile } from '../components/common'
import { SubmissionHome } from './submission-home'

export function Dashboard() {
  const perspective = useVoms((s) => s.perspective)
  return perspective === 'submission' ? <SubmissionHome /> : <ManagementHome />
}

function ManagementHome() {
  const state = useVoms()
  const session = state.session!
  const calls = visibleCalls(state)
  const { vessels } = state
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

  return (
    <PageShell>
      <PageHeader
        title='Port Operations Dashboard'
        description={
          <>
            {roleById[session.role].name} · {perspectiveMeta.management.label} · {session.scopeLabel} · updated {fmtShort(new Date().toISOString())}
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

      <div className='grid grid-cols-2 gap-3 xl:grid-cols-4'>
        <StatTile tone='blue' label='Expected vessels' value={expected.length} hint={expected[0] ? `Next ETA ${fmtRelative(expected[0].events.eta!.time)}` : 'None scheduled'} icon={Ship} onClick={() => navigate({ to: '/vessel-calls', search: { status: 'expected' } })} />
        <StatTile tone='green' label='Vessels at berth' value={atBerth.length} hint={`${berths.length} berths in scope`} icon={Anchor} onClick={() => navigate({ to: '/berths' })} />
        <StatTile tone='amber' label='Cargo operations' value={working.length} hint='In progress now' icon={Package} onClick={() => navigate({ to: '/vessel-calls', search: { status: 'operations' } })} />
        <StatTile tone='red' label='Pending verification' value={pending.length} hint='Calls with unverified records' icon={TriangleAlert} onClick={() => navigate({ to: '/vessel-calls', search: { status: 'pending' } })} />
      </div>

      <div className='grid gap-4 xl:grid-cols-5'>
        <Card className='gap-0 py-0 xl:col-span-3'>
          <CardHeader className='border-b py-4'>
            <CardTitle>Cargo operations progress</CardTitle>
            <CardDescription>Actual vs declared quantity per cargo line, in each commodity&apos;s own unit.</CardDescription>
          </CardHeader>
          <CardContent className='px-0'>
            {working.length === 0 && <p className='p-6 text-sm text-muted-foreground'>No cargo operations in progress in your scope.</p>}
            <ul className='divide-y'>
              {working.map((c) => {
                const v = vesselOf(c.vesselId)
                return (
                  <li key={c.id}>
                    <Link to='/vessel-calls/$callId' params={{ callId: c.id }} className='flex gap-3 px-4 py-4 hover:bg-accent/40 sm:gap-4 sm:px-6'>
                      <VesselArt type={c.scenario} className='hidden sm:block' />
                      <div className='grid min-w-0 flex-1 gap-2'>
                        <div className='min-w-0'>
                          <div className='truncate font-semibold'>{v.name}</div>
                          <div className='text-xs text-muted-foreground'>
                            {c.id} · {c.berthId} · {v.typeLabel}
                          </div>
                        </div>
                        {c.cargo.map((l) => {
                          const p = lineProgress(c, l.id)
                          return (
                            <div key={l.id} className='grid items-center gap-x-4 gap-y-1 text-sm md:grid-cols-[minmax(8rem,13rem)_minmax(4rem,1fr)_13.5rem]'>
                              <span className='min-w-0'>
                                {l.commodity} <span className='text-muted-foreground'>— {l.direction}</span>
                              </span>
                              <ProgressBar pct={p.pct} color={scenarioColor[c.scenario]} label={`${l.commodity} progress`} />
                              <span className='text-xs whitespace-nowrap tabular-nums text-muted-foreground md:text-end md:text-sm'>
                                <span className='font-medium text-foreground'>{fmtNum(p.pct)}%</span> · {fmtQty(p.done, l.unit)} / {fmtQty(l.declared, l.unit)}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </CardContent>
        </Card>

        <div className='grid h-fit gap-4 xl:col-span-2'>
          <Card>
            <CardHeader>
              <CardTitle>Attention required</CardTitle>
              <CardDescription>Rule-based flags from recorded data — review flags, not proof of error.</CardDescription>
            </CardHeader>
            <CardContent>
              <AttentionList limit={5} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Berth status</CardTitle>
              <CardDescription>{berths.length} placeholder berths — subject to SBMA facility register validation.</CardDescription>
              <CardAction>
                <Button variant='ghost' size='sm' asChild>
                  <Link to='/berths'>
                    Board <ArrowRight />
                  </Link>
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <div className='grid grid-cols-3 gap-2 sm:grid-cols-5'>
                {berths.map((b) => (
                  <BerthTile key={b.id} berth={b} state={berthState(b, calls)} occupant={berthOccupant(b.id, calls)} compact />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>AI insights</CardTitle>
          <CardDescription>Material deviations in your scope, with period, source and validation status.</CardDescription>
          <div>
            <SimulatedAiBadge />
          </div>
        </CardHeader>
        <CardContent className='grid gap-6 xl:grid-cols-5'>
          <div className='xl:col-span-3'>
            <InsightCards max={4} />
          </div>
          <div className='grid content-start gap-2 xl:col-span-2'>
            <h3 className='text-sm font-semibold'>Discuss with VOMS</h3>
            <DiscussionBox compact />
          </div>
        </CardContent>
      </Card>

      {scopedUnits(state).some((u) => u.metric) && (
        <Card>
          <CardHeader>
            <CardTitle>Daily throughput &amp; traffic — last 14 days</CardTitle>
            <CardDescription>From unit submissions. Each unit keeps its own measurement unit.</CardDescription>
          </CardHeader>
          <CardContent>
            <TrendGrid units={scopedUnits(state)} />
          </CardContent>
        </Card>
      )}

      <div className='grid gap-4 lg:grid-cols-3'>
        <Card>
          <CardHeader>
            <CardTitle>Expected arrivals</CardTitle>
            <CardDescription>Ordered by ETA.</CardDescription>
          </CardHeader>
          <CardContent className='grid gap-2'>
            {expected.length === 0 && <p className='text-sm text-muted-foreground'>No expected arrivals.</p>}
            {expected.map((c) => (
              <Link key={c.id} to='/vessel-calls/$callId' params={{ callId: c.id }} className='flex items-center gap-3 rounded-md border p-2 text-sm hover:bg-accent/50'>
                <VesselArt type={c.scenario} className='h-9 w-12' />
                <div className='min-w-0 flex-1'>
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
        <Card>
          <CardHeader>
            <CardTitle>Vessel turnaround</CardTitle>
            <CardDescription>ATA → ATD in hours (KPI-001), split by event interval.</CardDescription>
          </CardHeader>
          <CardContent>
            <TurnaroundChart calls={calls} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Berth occupancy — 7 days</CardTitle>
            <CardDescription>All Fast → Last Line hours as a share of the period.</CardDescription>
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
