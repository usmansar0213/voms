import { format } from 'date-fns'
import { Link } from '@tanstack/react-router'
import { AlertTriangle, CheckCircle2, Clock, FileStack, PlugZap, Upload, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PageShell } from '@/components/layout/page-shell'
import { callStatus, eventLabels, nextEvent } from '../calc'
import { fmtRelative, fmtShort } from '../format'
import { homeUnit, perspectiveMeta, unitById } from '../org'
import { roleById } from '../roles'
import { templatesFor } from '../submissions'
import { useVoms, visibleAlerts, visibleCalls, visibleConnectors, visibleSubmissions } from '../store'
import type { VesselCall } from '../types'
import { AlertsPanel } from '../components/alerts-panel'
import { ConnectorStrip } from '../components/connector-strip'
import { EmptyState, PageHeader, StatTile, StatusBadge } from '../components/common'
import { SubmissionStatusBadge } from './submissions'

function TaskRow({ call, text }: { call: VesselCall; text: string }) {
  const vessel = useVoms((s) => s.vessels.find((v) => v.id === call.vesselId))
  return (
    <Link to='/vessel-calls/$callId' params={{ callId: call.id }} className='flex flex-wrap items-center justify-between gap-2 rounded-md border p-2 text-sm hover:bg-accent/50'>
      <div className='min-w-0'>
        <div className='truncate font-medium'>{vessel?.name}</div>
        <div className='text-xs text-muted-foreground'>
          {call.id} · {text}
        </div>
      </div>
      <StatusBadge call={call} />
    </Link>
  )
}

function RoleTasks() {
  const state = useVoms()
  const role = state.role
  const calls = visibleCalls(state).filter((c) => !c.closure && !c.cancelled)
  let title = 'Operational tasks'
  let items: { call: VesselCall; text: string }[] = []
  if (role === 'port_control') {
    title = 'Movement events to record'
    items = calls.filter((c) => nextEvent(c) && !['opsStart', 'opsEnd'].includes(nextEvent(c)!)).map((c) => ({ call: c, text: `next: ${eventLabels[nextEvent(c)!]}` }))
  } else if (role === 'harbor_master') {
    title = 'Berth allocation & safety'
    items = calls.filter((c) => !c.berthId).map((c) => ({ call: c, text: `requested ${c.requestedBerthId ?? '—'} — berth not assigned` }))
  } else if (role === 'terminal_operator') {
    title = 'Terminal reporting tasks'
    items = calls
      .filter((c) => ['at_berth', 'operations', 'ops_completed'].includes(callStatus(c)))
      .map((c) => ({
        call: c,
        text: callStatus(c) === 'at_berth' ? 'record cargo operations start' : callStatus(c) === 'operations' ? 'report production & delays' : c.finalTally ? 'final tally submitted' : 'submit final tally',
      }))
  } else if (role === 'shipping_agent') {
    title = 'Own vessel calls'
    items = calls.filter((c) => !c.events.atd).map((c) => ({ call: c, text: c.events.ata ? 'in port' : `ETA ${fmtShort(c.events.eta?.time)} — keep ETA updated` }))
  }
  if (role === 'management' || role === 'admin') return null
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Operational entries for your role, linked to Vessel Call IDs.</CardDescription>
      </CardHeader>
      <CardContent className='grid gap-2'>
        {items.length === 0 ? <EmptyState>Nothing pending.</EmptyState> : items.slice(0, 6).map((i) => <TaskRow key={i.call.id} {...i} />)}
      </CardContent>
    </Card>
  )
}

export function SubmissionHome() {
  const state = useVoms()
  const session = state.session!
  const unitId = homeUnit(session.orgId, session.role)
  const subs = visibleSubmissions(state)
  const conns = visibleConnectors(state)
  const anomalies = visibleAlerts(state).filter((a) => a.category === 'data_anomaly' && a.status !== 'resolved')
  const since = Date.now() - 30 * 86_400_000
  const recent = subs.filter((s) => Date.parse(s.receivedAt) > since)
  const count = (st: string[]) => recent.filter((s) => st.includes(s.status)).length
  const lastSync = conns.map((c) => c.lastSuccess).sort().reverse()[0]
  const today = format(new Date(), 'yyyy-MM-dd')
  const required = templatesFor(unitId).map((t) => {
    const latest = subs.filter((s) => s.reportType === t.reportType).sort((a, b) => b.reportDate.localeCompare(a.reportDate))[0]
    return { t, latest, done: latest && latest.reportDate >= today && latest.status !== 'rejected' }
  })

  return (
    <PageShell>
      <PageHeader
        title={`${roleById[session.role].name} — Submission`}
        description={
          <>
            {perspectiveMeta.submission.label} · {unitById[unitId].name}
          </>
        }
        actions={
          <Button asChild>
            <Link to='/submissions' search={{ upload: true }}>
              <Upload /> Upload report
            </Link>
          </Button>
        }
      />

      <ConnectorStrip connectors={conns} />

      <div className='grid grid-cols-2 gap-3 lg:grid-cols-4'>
        <StatTile label='Files submitted (30 days)' value={recent.length} hint={`${recent.filter((s) => s.channel === 'api').length} via API`} icon={FileStack} />
        <StatTile label='Accepted' value={count(['approved'])} hint='Approved & published' icon={CheckCircle2} />
        <StatTile label='Pending' value={count(['review', 'submitted'])} hint='In review or awaiting approval' icon={Clock} />
        <StatTile label='Rejected / returned' value={count(['rejected'])} hint='Needs correction' icon={XCircle} />
      </div>
      {conns.length > 0 && (
        <div className='grid grid-cols-2 gap-3 lg:grid-cols-4'>
          <StatTile label='API deliveries (24 h)' value={conns.reduce((a, c) => a + c.success24h, 0)} hint={`${conns.reduce((a, c) => a + c.failure24h, 0)} failed`} icon={PlugZap} />
          <StatTile label='Last successful sync' value={lastSync ? fmtRelative(lastSync).replace(' ago', '') : '—'} hint='ago' icon={Clock} />
          <StatTile label='Mapping errors' value={conns.reduce((a, c) => a + c.mappingErrors.length, 0)} hint={`${conns.reduce((a, c) => a + c.retryQueue, 0)} queued for retry`} icon={AlertTriangle} />
          <StatTile label='Open anomalies' value={anomalies.length} hint='Review flags on submitted data' icon={AlertTriangle} />
        </div>
      )}

      <div className='grid gap-4 lg:grid-cols-3'>
        <Card className='lg:col-span-2'>
          <CardHeader>
            <CardTitle>Required submissions</CardTitle>
            <CardDescription>Report types for {unitById[unitId].short}. Frequencies are illustrative and subject to SBMA approval.</CardDescription>
          </CardHeader>
          <CardContent className='grid gap-2'>
            {required.map(({ t, latest, done }) => (
              <div key={t.id} className='flex flex-wrap items-center justify-between gap-2 rounded-md border p-2 text-sm'>
                <div>
                  <div className='font-medium'>{t.reportType}</div>
                  <div className='text-xs text-muted-foreground'>
                    {t.format.toUpperCase()} · last: {latest ? `${latest.reportDate} (${latest.status})` : 'none'}
                  </div>
                </div>
                {done ? (
                  <SubmissionStatusBadge status={latest!.status} />
                ) : (
                  <Button size='sm' asChild>
                    <Link to='/submissions' search={{ upload: true }}>
                      <Upload /> Submit today
                    </Link>
                  </Button>
                )}
              </div>
            ))}
            <div className='mt-2'>
              <h3 className='mb-2 text-sm font-semibold'>Submission history</h3>
              {subs.length === 0 ? (
                <EmptyState>No submissions yet.</EmptyState>
              ) : (
                <ul className='divide-y rounded-md border'>
                  {subs.slice(0, 6).map((s) => (
                    <li key={s.id}>
                      <Link to='/submissions/$subId' params={{ subId: s.id }} className='flex flex-wrap items-center gap-2 p-2 text-sm hover:bg-accent/50'>
                        <span className='min-w-0 flex-1 truncate'>
                          <span className='font-medium'>{s.fileName}</span>
                          <span className='block text-xs text-muted-foreground'>
                            {s.reportType} · {s.channel === 'api' ? 'API' : 'Upload'} · {fmtShort(s.receivedAt)}
                          </span>
                        </span>
                        <SubmissionStatusBadge status={s.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Alerts for your unit</CardTitle>
            <CardDescription>Data exceptions you can acknowledge; resolution sits with management.</CardDescription>
          </CardHeader>
          <CardContent>
            <AlertsPanel limit={4} />
          </CardContent>
        </Card>
      </div>

      <RoleTasks />
    </PageShell>
  )
}
