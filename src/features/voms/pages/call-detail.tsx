import { useState } from 'react'
import { getRouteApi, Link } from '@tanstack/react-router'
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  FileText,
  Lock,
  LockOpen,
  Pencil,
  Plus,
  ShieldAlert,
  Timer,
  XCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { PageShell } from '@/components/layout/page-shell'
import {
  callStatus,
  canClose,
  closureChecklist,
  delayHours,
  eventLabels,
  eventOrder,
  lineProgress,
  nextEvent,
  productivity,
  sequenceIssues,
  statusMeta,
  turnaround,
} from '../calc'
import { fmtDateTime, fmtHours, fmtNum, fmtQty, fmtShort } from '../format'
import { can, roleById } from '../roles'
import { useVoms, visibleCalls } from '../store'
import type { EventKey, VesselCall } from '../types'
import { scenarioLabel } from './vessel-calls'
import {
  EmptyState,
  KeyValues,
  ProgressBar,
  runAction,
  SeverityBadge,
  SourceBadge,
  StatusBadge,
  ToneBadge,
} from '../components/common'
import { AssignBerthDialog, DelayDialog, IncidentDialog, ProductionDialog, RecordEventDialog } from '../components/dialogs'

const route = getRouteApi('/_app/vessel-calls/$callId')

const lifecycle = ['expected', 'arrived', 'at_berth', 'operations', 'ops_completed', 'departed', 'closed'] as const

function Stepper({ call }: { call: VesselCall }) {
  const step = statusMeta[callStatus(call)].step
  return (
    <ol className='-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 no-scrollbar sm:mx-0 sm:px-0'>
      {lifecycle.map((s, i) => {
        const done = i < step || (s === 'closed' && step === 6)
        const current = i === step && s !== 'closed'
        return (
          <li key={s} className='flex min-w-[6.5rem] flex-1 flex-col gap-1'>
            <div className={cn('h-1.5 rounded-full', done ? 'bg-[var(--series-1)]' : current ? 'bg-[var(--series-3)]' : 'bg-muted')} />
            <span className={cn('text-[11px] leading-tight', current ? 'font-semibold' : 'text-muted-foreground')}>{statusMeta[s].label}</span>
          </li>
        )
      })}
    </ol>
  )
}

export function CallDetail() {
  const { callId } = route.useParams()
  const state = useVoms()
  const call = visibleCalls(state).find((c) => c.id === callId)
  const [tab, setTab] = useState('overview')

  if (!call) {
    return (
      <PageShell>
        <EmptyState>
          Vessel call {callId} was not found or is not visible to {roleById[state.role].name}.{' '}
          <Link to='/vessel-calls' className='underline'>
            Back to vessel calls
          </Link>
        </EmptyState>
      </PageShell>
    )
  }

  const vessel = state.vessels.find((v) => v.id === call.vesselId)!
  const incidents = state.incidents.filter((i) => i.callId === call.id)

  return (
    <PageShell>
      <div className='grid gap-3'>
        <Button variant='ghost' size='sm' className='w-fit' asChild>
          <Link to='/vessel-calls'>
            <ArrowLeft /> Vessel calls
          </Link>
        </Button>
        <div className='flex flex-wrap items-start justify-between gap-3'>
          <div className='min-w-0'>
            <div className='flex flex-wrap items-center gap-2'>
              <h1 className='text-xl font-bold tracking-tight sm:text-2xl'>{vessel.name}</h1>
              <StatusBadge call={call} />
            </div>
            <p className='text-sm text-muted-foreground'>
              {call.id} · {scenarioLabel[call.scenario]} · IMO {vessel.imo} · Berth {call.berthId ?? 'not assigned'}
            </p>
          </div>
          <Button variant='outline' asChild>
            <Link to='/reports/$callId' params={{ callId: call.id }}>
              <FileText /> Integrated report
            </Link>
          </Button>
        </div>
        <Stepper call={call} />
      </div>

      <NextStep call={call} onGoTo={setTab} />

      <Tabs value={tab} onValueChange={setTab} className='gap-4'>
        <div className='-mx-4 overflow-x-auto px-4 no-scrollbar sm:mx-0 sm:px-0'>
          <TabsList>
            <TabsTrigger value='overview'>Overview</TabsTrigger>
            <TabsTrigger value='movements'>Movements</TabsTrigger>
            <TabsTrigger value='cargo'>Cargo & Terminal</TabsTrigger>
            <TabsTrigger value='incidents'>Incidents{incidents.length ? ` (${incidents.length})` : ''}</TabsTrigger>
            <TabsTrigger value='closure'>Closure</TabsTrigger>
            <TabsTrigger value='audit'>Audit trail</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value='overview'>
          <Overview call={call} />
        </TabsContent>
        <TabsContent value='movements'>
          <Movements call={call} />
        </TabsContent>
        <TabsContent value='cargo'>
          <CargoTab call={call} />
        </TabsContent>
        <TabsContent value='incidents'>
          <IncidentsTab call={call} />
        </TabsContent>
        <TabsContent value='closure'>
          <ClosureTab call={call} />
        </TabsContent>
        <TabsContent value='audit'>
          <AuditTab call={call} />
        </TabsContent>
      </Tabs>
    </PageShell>
  )
}

// ---------------------------------------------------------------------------

function NextStep({ call, onGoTo }: { call: VesselCall; onGoTo: (tab: string) => void }) {
  const role = useVoms((s) => s.role)
  const incidents = useVoms((s) => s.incidents)
  const [dialog, setDialog] = useState<EventKey | 'berth' | 'production' | null>(null)
  const status = callStatus(call)
  const next = nextEvent(call)

  let text = ''
  let action: { label: string; run: () => void; allowed: boolean } | undefined
  if (status === 'closed') text = 'This vessel call is closed. Records are read-only unless reopened with an approved reason.'
  else if ((status === 'arrived' || status === 'expected') && !call.berthId) {
    text = 'No berth assigned yet. The Harbor Master assigns a compatible berth.'
    action = { label: 'Assign berth', run: () => setDialog('berth'), allowed: can(role, 'berth.assign') }
  } else if (status === 'operations') {
    text = 'Cargo operations in progress. The terminal operator records production; SBMA verifies it.'
    action = { label: 'Record production', run: () => setDialog('production'), allowed: can(role, 'production.record') }
  } else if (status === 'departed') {
    text = canClose(call, incidents)
      ? 'Vessel has departed and the closure checklist is satisfied.'
      : 'Vessel has departed. Complete verification before the call can be closed.'
    action = { label: 'Review closure', run: () => onGoTo('closure'), allowed: true }
  } else if (status === 'ops_completed' && call.finalTally && !call.finalTally.verifiedBy) {
    text = 'Final tally submitted by the terminal operator and awaiting SBMA verification.'
    action = { label: 'Review cargo', run: () => onGoTo('cargo'), allowed: true }
  } else if (next) {
    text = `Next expected event: ${eventLabels[next]}.`
    const isTerminal = next === 'opsStart' || next === 'opsEnd'
    action = { label: `Record ${eventLabels[next].split(' (')[0]}`, run: () => setDialog(next), allowed: can(role, 'event.movement') || (isTerminal && role === 'terminal_operator') }
  }

  return (
    <div className='flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--series-1)]/30 bg-[var(--series-1)]/5 p-3'>
      <div className='flex items-start gap-2 text-sm'>
        <Timer className='mt-0.5 size-4 shrink-0 text-[var(--series-1-ink)]' />
        <span>{text}</span>
      </div>
      {action &&
        (action.allowed ? (
          <Button size='sm' onClick={action.run}>
            {action.label}
          </Button>
        ) : (
          <span className='text-xs text-muted-foreground'>
            <Lock className='me-1 inline size-3' />
            Not available to {roleById[role].name}
          </span>
        ))}
      {dialog === 'berth' && <AssignBerthDialog call={call} open onOpenChange={() => setDialog(null)} />}
      {dialog === 'production' && <ProductionDialog call={call} open onOpenChange={() => setDialog(null)} />}
      {dialog && dialog !== 'berth' && dialog !== 'production' && (
        <RecordEventDialog call={call} eventKey={dialog} open onOpenChange={() => setDialog(null)} />
      )}
    </div>
  )
}

function Overview({ call }: { call: VesselCall }) {
  const { vessels, berths, role } = useVoms()
  const vessel = vessels.find((v) => v.id === call.vesselId)!
  const berth = berths.find((b) => b.id === call.berthId)
  const [dialog, setDialog] = useState<'berth' | 'eta' | 'etd' | null>(null)
  const t = turnaround(call)
  const editable = !call.closure
  return (
    <div className='grid gap-4 lg:grid-cols-2'>
      <Card>
        <CardHeader>
          <CardTitle>Vessel call details</CardTitle>
        </CardHeader>
        <CardContent>
          <KeyValues
            items={[
              ['Vessel Call ID', call.id],
              ['Vessel', `${vessel.name} (IMO ${vessel.imo})`],
              ['Vessel type', vessel.typeLabel],
              ['Shipping agent', call.agentId === 'AG-01' ? 'Demo Shipping Agency A' : 'Demo Shipping Agency B'],
              ['Voyage (in / out)', `${call.voyageIn} / ${call.voyageOut}`],
              ['Port call purpose', call.purpose],
              ['Last port', call.lastPort],
              ['Next port', call.nextPort],
              ['Dimensions', `LOA ${vessel.loa} m · beam ${vessel.beam} m · draft ${vessel.draft} m`],
              ['Tonnage', `GT ${fmtNum(vessel.gt)} · DWT ${fmtNum(vessel.dwt)}`],
            ]}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Schedule & berth</CardTitle>
        </CardHeader>
        <CardContent className='grid gap-4'>
          <KeyValues
            items={[
              ['ETA', fmtDateTime(call.events.eta?.time)],
              ['ETD', fmtDateTime(call.events.etd?.time)],
              ['Requested berth', call.requestedBerthId ?? '—'],
              ['Assigned berth', berth ? `${berth.id} (max LOA ${berth.maxLoa} m / draft ${berth.maxDraft} m)` : 'Not assigned'],
              ['Waiting + berthing (ATA → All Fast)', fmtHours(t.waiting)],
              ['Time at berth (All Fast → Last Line)', fmtHours(t.atBerth)],
              ['Turnaround (ATA → ATD)', fmtHours(t.total)],
              ['Delays recorded', fmtHours(delayHours(call))],
            ]}
          />
          {editable && (
            <div className='flex flex-wrap gap-2'>
              {can(role, 'call.updateEta') && !call.events.ata && (
                <Button size='sm' variant='outline' onClick={() => setDialog('eta')}>
                  <Pencil /> Update ETA
                </Button>
              )}
              {can(role, 'call.updateEta') && !call.events.atd && (
                <Button size='sm' variant='outline' onClick={() => setDialog('etd')}>
                  <Pencil /> Update ETD
                </Button>
              )}
              {can(role, 'berth.assign') && !call.events.lastLine && (
                <Button size='sm' variant='outline' onClick={() => setDialog('berth')}>
                  <Pencil /> {call.berthId ? 'Change berth' : 'Assign berth'}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      {dialog === 'berth' && <AssignBerthDialog call={call} open onOpenChange={() => setDialog(null)} />}
      {(dialog === 'eta' || dialog === 'etd') && <RecordEventDialog call={call} eventKey={dialog} open onOpenChange={() => setDialog(null)} />}
    </div>
  )
}

function Movements({ call }: { call: VesselCall }) {
  const role = useVoms((s) => s.role)
  const verifyEvent = useVoms((s) => s.verifyEvent)
  const verifyAll = useVoms((s) => s.verifyAllEvents)
  const [dialog, setDialog] = useState<EventKey | null>(null)
  const issues = sequenceIssues(call)
  const closed = !!call.closure
  const canRecord = (k: EventKey) => !closed && (can(role, 'event.movement') || (role === 'terminal_operator' && (k === 'opsStart' || k === 'opsEnd')))
  const anyUnverified = eventOrder.some((k) => call.events[k] && !call.events[k]!.verifiedBy)
  return (
    <Card>
      <CardHeader>
        <CardTitle>Movement events</CardTitle>
        <CardDescription>Actual times recorded against the Vessel Call ID. Recorder and verifier must be different roles.</CardDescription>
        {can(role, 'event.verify') && anyUnverified && !closed && (
          <CardAction>
            <Button size='sm' variant='outline' onClick={() => runAction(() => verifyAll(call.id), 'Events verified')}>
              <ClipboardCheck /> Verify all
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className='grid gap-3'>
        {issues.length > 0 && (
          <div className='rounded-md border border-[var(--status-serious)]/50 bg-[var(--status-serious)]/10 p-3 text-sm'>
            <span className='font-medium text-[var(--status-serious-ink)]'>Sequence check: </span>
            {issues.join('; ')}
          </div>
        )}
        <ol className='relative grid gap-0'>
          {eventOrder.map((k, i) => {
            const ev = call.events[k]
            return (
              <li key={k} className='grid grid-cols-[1.5rem_1fr] gap-3'>
                <div className='flex flex-col items-center'>
                  {ev ? (
                    ev.verifiedBy ? (
                      <CheckCircle2 className='size-5 text-[var(--status-good)]' aria-label='Verified' />
                    ) : (
                      <Circle className='size-5 fill-[var(--series-1)]/20 text-[var(--series-1)]' aria-label='Recorded, not verified' />
                    )
                  ) : (
                    <Circle className='size-5 text-muted-foreground/40' aria-label='Not recorded' />
                  )}
                  {i < eventOrder.length - 1 && <div className='w-px flex-1 bg-border' />}
                </div>
                <div className='flex flex-wrap items-start justify-between gap-2 pb-4'>
                  <div className='min-w-0'>
                    <div className='font-medium'>{eventLabels[k]}</div>
                    {ev ? (
                      <div className='mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground'>
                        <span className='font-medium text-foreground tabular-nums'>{fmtDateTime(ev.time)}</span>
                        <SourceBadge source={ev.source} />
                        <span>by {roleById[ev.recordedBy].short}</span>
                        {ev.verifiedBy ? (
                          <ToneBadge tone='good'>Verified by {roleById[ev.verifiedBy].short}</ToneBadge>
                        ) : (
                          <ToneBadge tone='warning'>Pending verification</ToneBadge>
                        )}
                      </div>
                    ) : (
                      <div className='text-xs text-muted-foreground'>Not recorded</div>
                    )}
                    {ev?.remarks && <div className='mt-1 text-xs'>“{ev.remarks}”</div>}
                  </div>
                  <div className='flex gap-2'>
                    {canRecord(k) && (
                      <Button size='sm' variant={ev ? 'ghost' : 'outline'} onClick={() => setDialog(k)}>
                        {ev ? <Pencil /> : <Plus />}
                        {ev ? 'Amend' : 'Record'}
                      </Button>
                    )}
                    {ev && !ev.verifiedBy && can(role, 'event.verify') && !closed && (
                      <Button size='sm' variant='outline' onClick={() => runAction(() => verifyEvent(call.id, k), 'Event verified')}>
                        <Check /> Verify
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      </CardContent>
      {dialog && <RecordEventDialog call={call} eventKey={dialog} open onOpenChange={() => setDialog(null)} />}
    </Card>
  )
}

function CargoTab({ call }: { call: VesselCall }) {
  const { role, verifyProduction, endDelay, submitTally, verifyTally } = useVoms()
  const [selected, setSelected] = useState<string[]>([])
  const [dialog, setDialog] = useState<'production' | 'delay' | null>(null)
  const status = callStatus(call)
  const closed = !!call.closure
  const prod = productivity(call)
  const unverified = call.production.filter((p) => p.status !== 'verified')
  return (
    <div className='grid gap-4'>
      <Card>
        <CardHeader>
          <CardTitle>Cargo progress</CardTitle>
          <CardDescription>Declared by the shipping agent; actual quantities reported by the terminal operator.</CardDescription>
          {can(role, 'production.record') && status === 'operations' && (
            <CardAction>
              <Button size='sm' onClick={() => setDialog('production')}>
                <Plus /> Production
              </Button>
            </CardAction>
          )}
        </CardHeader>
        <CardContent className='grid gap-4'>
          {call.cargo.map((l) => {
            const p = lineProgress(call, l.id)
            return (
              <div key={l.id} className='grid gap-1.5'>
                <div className='flex flex-wrap items-center justify-between gap-2 text-sm'>
                  <span className='font-medium'>
                    {l.commodity} — {l.direction}
                    {l.dangerous && (
                      <ToneBadge tone='serious' className='ms-2'>
                        Dangerous goods
                      </ToneBadge>
                    )}
                  </span>
                  <span className='tabular-nums'>
                    <span className='font-semibold'>{fmtNum(p.pct)}%</span>{' '}
                    <span className='text-muted-foreground'>
                      {fmtQty(p.done, l.unit)} of {fmtQty(l.declared, l.unit)} · remaining {fmtQty(p.remaining, l.unit)}
                    </span>
                  </span>
                </div>
                <ProgressBar pct={p.pct} label={`${l.commodity} progress`} />
                <div className='text-xs text-muted-foreground'>
                  {l.category} · verified {fmtQty(p.verified, l.unit)}
                  {p.variance > 0 && ` · exceeds declared by ${fmtQty(p.variance, l.unit)} (discrepancy review)`}
                </div>
              </div>
            )
          })}
          {prod.length > 0 && (
            <div className='grid gap-2 rounded-md bg-muted/50 p-3 text-sm sm:grid-cols-2'>
              {prod.map((p) => (
                <div key={p.unit}>
                  <div className='text-xs text-muted-foreground'>Productivity ({p.unit})</div>
                  <div className='tabular-nums'>
                    Gross <span className='font-semibold'>{fmtNum(p.gross, 1)}</span> {p.unit}/h · Net{' '}
                    <span className='font-semibold'>{fmtNum(p.net, 1)}</span> {p.unit}/h
                  </div>
                  <div className='text-xs text-muted-foreground'>
                    {fmtHours(p.grossHours)} elapsed, {fmtHours(p.netHours)} net of delays
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Production log</CardTitle>
          <CardDescription>Submitted entries require SBMA verification (segregation of duties).</CardDescription>
          {can(role, 'production.verify') && unverified.length > 0 && !closed && (
            <CardAction>
              <Button
                size='sm'
                variant='outline'
                onClick={() => {
                  const ids = selected.length ? selected : unverified.map((p) => p.id)
                  if (runAction(() => verifyProduction(call.id, ids), `${ids.length} entr${ids.length === 1 ? 'y' : 'ies'} verified`)) setSelected([])
                }}
              >
                <ClipboardCheck /> Verify {selected.length ? `${selected.length} selected` : 'all pending'}
              </Button>
            </CardAction>
          )}
        </CardHeader>
        <CardContent>
          {call.production.length === 0 ? (
            <EmptyState>No production recorded yet.</EmptyState>
          ) : (
            <ul className='divide-y'>
              {[...call.production].reverse().map((p) => {
                const l = call.cargo.find((x) => x.id === p.lineId)!
                const selectable = can(role, 'production.verify') && p.status !== 'verified' && !closed
                return (
                  <li key={p.id} className='flex flex-wrap items-center gap-2 py-2 text-sm'>
                    {selectable && (
                      <Checkbox
                        aria-label='Select entry'
                        checked={selected.includes(p.id)}
                        onCheckedChange={(v) => setSelected((s) => (v ? [...s, p.id] : s.filter((x) => x !== p.id)))}
                      />
                    )}
                    <span className='w-24 tabular-nums text-muted-foreground'>{fmtShort(p.time)}</span>
                    <span className='font-medium tabular-nums'>{fmtQty(p.qty, l.unit)}</span>
                    <span className='text-muted-foreground'>
                      {l.commodity} ({l.direction})
                    </span>
                    <span className='ms-auto flex flex-wrap gap-1.5'>
                      <SourceBadge source={p.source} />
                      {p.status === 'verified' ? <ToneBadge tone='good'>Verified</ToneBadge> : <ToneBadge tone='warning'>Submitted</ToneBadge>}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className='grid gap-4 lg:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle>Delays & stoppages</CardTitle>
            <CardDescription>Total {fmtHours(delayHours(call))}. Categories proposed — subject to SBMA confirmation.</CardDescription>
            {can(role, 'delay.record') && !closed && call.events.ata && (
              <CardAction>
                <Button size='sm' variant='outline' onClick={() => setDialog('delay')}>
                  <Plus /> Delay
                </Button>
              </CardAction>
            )}
          </CardHeader>
          <CardContent>
            {call.delays.length === 0 ? (
              <EmptyState>No delays recorded.</EmptyState>
            ) : (
              <ul className='grid gap-2'>
                {call.delays.map((d) => (
                  <li key={d.id} className='rounded-md border p-2 text-sm'>
                    <div className='flex flex-wrap items-center justify-between gap-2'>
                      <span className='font-medium'>{d.category}</span>
                      {d.end ? (
                        <span className='tabular-nums text-muted-foreground'>{fmtHours((Date.parse(d.end) - Date.parse(d.start)) / 3600_000)}</span>
                      ) : (
                        <ToneBadge tone='warning'>Ongoing</ToneBadge>
                      )}
                    </div>
                    <div className='text-xs text-muted-foreground'>
                      {fmtShort(d.start)} → {d.end ? fmtShort(d.end) : 'now'} {d.remarks && `· ${d.remarks}`}
                    </div>
                    {!d.end && can(role, 'delay.record') && !closed && (
                      <Button size='sm' variant='ghost' className='mt-1' onClick={() => runAction(() => endDelay(call.id, d.id), 'Delay ended')}>
                        End delay now
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Final tally</CardTitle>
            <CardDescription>Submitted by the terminal operator after operations complete; verified by SBMA.</CardDescription>
          </CardHeader>
          <CardContent className='grid gap-3 text-sm'>
            {call.finalTally ? (
              <KeyValues
                items={[
                  ['Submitted', `${fmtDateTime(call.finalTally.at)} by ${roleById[call.finalTally.submittedBy].short}`],
                  ['Verification', call.finalTally.verifiedBy ? `${fmtDateTime(call.finalTally.verifiedAt)} by ${roleById[call.finalTally.verifiedBy].short}` : 'Pending'],
                ]}
              />
            ) : (
              <p className='text-muted-foreground'>Not yet submitted.</p>
            )}
            <div className='flex flex-wrap gap-2'>
              {can(role, 'tally.submit') && !call.finalTally && !closed && (
                <Button size='sm' disabled={!call.events.opsEnd} onClick={() => runAction(() => submitTally(call.id), 'Final tally submitted')}>
                  Submit final tally
                </Button>
              )}
              {can(role, 'tally.verify') && call.finalTally && !call.finalTally.verifiedBy && !closed && (
                <Button size='sm' onClick={() => runAction(() => verifyTally(call.id), 'Final tally verified')}>
                  <Check /> Verify final tally
                </Button>
              )}
            </div>
            {!call.events.opsEnd && can(role, 'tally.submit') && <p className='text-xs text-muted-foreground'>Available once “Cargo operations completed” is recorded.</p>}
          </CardContent>
        </Card>
      </div>
      {dialog === 'production' && <ProductionDialog call={call} open onOpenChange={() => setDialog(null)} />}
      {dialog === 'delay' && <DelayDialog call={call} open onOpenChange={() => setDialog(null)} />}
    </div>
  )
}

function IncidentsTab({ call }: { call: VesselCall }) {
  const { incidents, role } = useVoms()
  const [open, setOpen] = useState(false)
  const list = incidents.filter((i) => i.callId === call.id)
  return (
    <Card>
      <CardHeader>
        <CardTitle>Linked incidents</CardTitle>
        <CardDescription>Safety, security, environmental and dangerous-cargo events for this vessel call.</CardDescription>
        {can(role, 'incident.report') && !call.closure && (
          <CardAction>
            <Button size='sm' onClick={() => setOpen(true)}>
              <ShieldAlert /> Report
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className='grid gap-2'>
        {list.length === 0 && <EmptyState>No incidents linked to this vessel call.</EmptyState>}
        {list.map((i) => (
          <Link key={i.id} to='/incidents' className='grid gap-1 rounded-md border p-3 text-sm hover:bg-accent/50'>
            <div className='flex flex-wrap items-center gap-2'>
              <SeverityBadge severity={i.severity} />
              <span className='font-medium'>{i.id}</span>
              <span className='text-muted-foreground'>{fmtShort(i.time)}</span>
              <ToneBadge tone={i.status === 'closed' ? 'good' : 'warning'} className='ms-auto'>
                {i.status.replace('_', ' ')}
              </ToneBadge>
            </div>
            <div>{i.title}</div>
          </Link>
        ))}
      </CardContent>
      {open && <IncidentDialog callId={call.id} open onOpenChange={setOpen} />}
    </Card>
  )
}

function ClosureTab({ call }: { call: VesselCall }) {
  const { incidents, role, closeCall, reopenCall } = useVoms()
  const [reason, setReason] = useState('')
  const checklist = closureChecklist(call, incidents)
  const ready = canClose(call, incidents)
  return (
    <Card>
      <CardHeader>
        <CardTitle>Vessel call closure</CardTitle>
        <CardDescription>A call is closed only when arrival, cargo and departure records are complete and verified.</CardDescription>
      </CardHeader>
      <CardContent className='grid gap-4'>
        <ul className='grid gap-2'>
          {checklist.map((c) => (
            <li key={c.label} className='flex items-start gap-2 text-sm'>
              {c.ok ? (
                <CheckCircle2 className='mt-0.5 size-4 shrink-0 text-[var(--status-good)]' aria-label='Satisfied' />
              ) : c.blocking ? (
                <XCircle className='mt-0.5 size-4 shrink-0 text-[var(--status-critical)]' aria-label='Blocking' />
              ) : (
                <Circle className='mt-0.5 size-4 shrink-0 text-[var(--status-warning)]' aria-label='Warning' />
              )}
              <span className={cn(!c.ok && c.blocking && 'font-medium')}>{c.label}</span>
            </li>
          ))}
        </ul>
        {call.closure ? (
          <div className='grid gap-3 rounded-md border p-3'>
            <div className='flex items-center gap-2 text-sm'>
              <Lock className='size-4' /> Closed {fmtDateTime(call.closure.at)} by {roleById[call.closure.by].name}
            </div>
            {can(role, 'call.reopen') && (
              <div className='grid gap-2'>
                <Textarea rows={2} placeholder='Reason for reopening (required, recorded in audit trail)' value={reason} onChange={(e) => setReason(e.target.value)} />
                <Button
                  variant='outline'
                  className='w-fit'
                  disabled={!reason.trim()}
                  onClick={() => {
                    if (runAction(() => reopenCall(call.id, reason), 'Vessel call reopened')) setReason('')
                  }}
                >
                  <LockOpen /> Reopen vessel call
                </Button>
              </div>
            )}
          </div>
        ) : can(role, 'call.close') ? (
          <Button className='w-fit' disabled={!ready} onClick={() => runAction(() => closeCall(call.id), 'Vessel call closed')}>
            <Lock /> Close vessel call
          </Button>
        ) : (
          <p className='text-xs text-muted-foreground'>Only the Harbor Master / Authorized Officer can close a vessel call.</p>
        )}
      </CardContent>
    </Card>
  )
}

function AuditTab({ call }: { call: VesselCall }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit trail</CardTitle>
        <CardDescription>Every change is attributed to a role and timestamp. Entries cannot be edited.</CardDescription>
      </CardHeader>
      <CardContent>
        <ol className='grid gap-2'>
          {[...call.audit].reverse().map((a) => (
            <li key={a.id} className='grid grid-cols-[auto_1fr] gap-x-3 text-sm'>
              <span className='w-28 text-xs tabular-nums text-muted-foreground'>{fmtShort(a.time)}</span>
              <span>
                <span className='font-medium'>{a.action}</span> <span className='text-muted-foreground'>· {roleById[a.actor].name}</span>
                {a.detail && <span className='block text-xs text-muted-foreground'>{a.detail}</span>}
              </span>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  )
}
