import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { BellOff, Check, CheckCheck, ClipboardPlus } from 'lucide-react'
import { CreateActionDialog } from './create-action-dialog'
import type { KpiId, Scope } from '../kpi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { fmtRelative, fmtShort } from '../format'
import { unitById } from '../org'
import { can, roleById } from '../roles'
import { useActor, useVoms, visibleAlerts } from '../store'
import type { Alert, AlertCategory, AlertSeverity } from '../types'
import { runAction, ToneBadge } from './common'
import type { Tone } from '../calc'

const sevTone: Record<AlertSeverity, Tone> = { info: 'info', warning: 'warning', serious: 'serious', critical: 'critical' }
export const categoryLabel: Record<AlertCategory, string> = {
  data_anomaly: 'Data anomaly',
  api_failure: 'API / sync',
  missing_submission: 'Missing submission',
  vessel_delay: 'Vessel delay',
  incident: 'Incident',
  environment: 'Environment',
  traffic: 'Traffic',
  kpi_breach: 'KPI breach',
}

export function AlertItem({ alert: a }: { alert: Alert }) {
  const actor = useActor()
  const acknowledge = useVoms((s) => s.acknowledgeAlert)
  const resolve = useVoms((s) => s.resolveAlert)
  const [note, setNote] = useState('')
  const [resolving, setResolving] = useState(false)
  const [creating, setCreating] = useState(false)
  return (
    <li className='grid gap-2 rounded-lg border p-3 text-sm'>
      <div className='flex flex-wrap items-center gap-2'>
        <ToneBadge tone={sevTone[a.severity]}>{a.severity[0].toUpperCase() + a.severity.slice(1)}</ToneBadge>
        <ToneBadge tone='neutral' icon={false}>
          {categoryLabel[a.category]}
        </ToneBadge>
        <span className='ms-auto text-xs text-muted-foreground' title={fmtShort(a.time)}>
          {fmtRelative(a.time)}
        </span>
      </div>
      <div className='font-medium'>{a.title}</div>
      <div className='text-xs text-muted-foreground'>{a.evidence}</div>
      <div className='flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground'>
        <span>Unit: {unitById[a.unitId]?.short}</span>
        {a.callId && (
          <Link to='/vessel-calls/$callId' params={{ callId: a.callId }} className='underline'>
            {a.callId}
          </Link>
        )}
        <span>Owner: {roleById[a.ownerRole].name}</span>
        {a.escalation && <span className='font-medium text-foreground'>Escalation L{a.escalation}</span>}
        {a.kpiId && (
          <Link to='/kpis/$kpiId' params={{ kpiId: a.kpiId }} search={{ scope: ['U-TA', 'U-TB', 'U-TC'].includes(a.unitId) ? a.unitId : 'PORT' }} className='underline'>
            {a.kpiId}
          </Link>
        )}
        <span className='font-medium text-foreground capitalize'>{a.status}</span>
        {a.ackBy && <span>Ack: {a.ackBy}</span>}
        {a.resolution && <span>Resolution: {a.resolution}</span>}
      </div>
      {a.status !== 'resolved' && (
        <div className='flex flex-wrap items-center gap-2'>
          {can(actor, 'action.create') && (
            <Button size='sm' variant='outline' onClick={() => setCreating(true)}>
              <ClipboardPlus /> Create action
            </Button>
          )}
          {a.status === 'open' && can(actor, 'alert.acknowledge') && (
            <Button size='sm' variant='outline' onClick={() => runAction(() => acknowledge(a.id), 'Alert acknowledged')}>
              <Check /> Acknowledge
            </Button>
          )}
          {can(actor, 'alert.resolve') &&
            (resolving ? (
              <div className='flex w-full gap-2'>
                <Input className='h-8' placeholder='Resolution note' value={note} onChange={(e) => setNote(e.target.value)} />
                <Button size='sm' onClick={() => runAction(() => resolve(a.id, note), 'Alert resolved') && setResolving(false)}>
                  Save
                </Button>
              </div>
            ) : (
              <Button size='sm' variant='ghost' onClick={() => setResolving(true)}>
                <CheckCheck /> Resolve
              </Button>
            ))}
        </div>
      )}
      {creating && (
        <CreateActionDialog
          open
          onOpenChange={setCreating}
          draft={{
            origin: { type: 'alert', ref: a.id },
            title: a.title,
            issue: a.evidence,
            kpiId: a.kpiId as KpiId | undefined,
            scope: (['U-TA', 'U-TB', 'U-TC'].includes(a.unitId) ? a.unitId : 'PORT') as Scope,
            priority: a.severity === 'critical' || a.severity === 'serious' ? 'high' : 'medium',
          }}
        />
      )}
    </li>
  )
}

export function AlertsPanel({ limit, showResolved = false }: { limit?: number; showResolved?: boolean }) {
  const state = useVoms()
  const list = visibleAlerts(state)
    .filter((a) => showResolved || a.status !== 'resolved')
    .sort((a, b) => (a.status === 'open' ? 0 : 1) - (b.status === 'open' ? 0 : 1) || b.time.localeCompare(a.time))
  const shown = limit ? list.slice(0, limit) : list
  if (!shown.length)
    return (
      <div className='flex flex-col items-center gap-2 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground'>
        <BellOff className='size-5' />
        No active alerts in your scope.
      </div>
    )
  return (
    <ul className='grid gap-2'>
      {shown.map((a) => (
        <AlertItem key={a.id} alert={a} />
      ))}
      {limit && list.length > limit && (
        <li>
          <Button variant='ghost' size='sm' asChild>
            <Link to='/alerts'>View all {list.length} alerts</Link>
          </Button>
        </li>
      )}
    </ul>
  )
}

const sevPill: Record<AlertSeverity, string> = {
  info: 'bg-[var(--series-1)]/12 text-[var(--series-1-ink)]',
  warning: 'bg-[var(--status-warning)]/22 text-[var(--status-warning-ink)]',
  serious: 'bg-[var(--status-serious)]/20 text-[var(--status-serious-ink)]',
  critical: 'bg-[var(--status-critical)]/15 text-[var(--status-critical-ink)]',
}
const sevLabel: Record<AlertSeverity, string> = { info: 'Low', warning: 'Medium', serious: 'High', critical: 'Critical' }

/** Compact "Attention required" list: severity pill + one line per alert. */
export function AttentionList({ limit = 5 }: { limit?: number }) {
  const state = useVoms()
  const list = visibleAlerts(state)
    .filter((a) => a.status !== 'resolved')
    .sort((a, b) => (a.status === 'open' ? 0 : 1) - (b.status === 'open' ? 0 : 1) || b.time.localeCompare(a.time))
  if (!list.length)
    return (
      <div className='flex flex-col items-center gap-2 rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground'>
        <BellOff className='size-5' />
        No active alerts in your scope.
      </div>
    )
  return (
    <ul className='grid gap-2'>
      {list.slice(0, limit).map((a) => (
        <li key={a.id}>
          <Link
            to={a.callId ? '/vessel-calls/$callId' : '/alerts'}
            params={a.callId ? { callId: a.callId } : undefined}
            className='flex items-start gap-3 rounded-md p-1.5 text-sm hover:bg-accent/60'
          >
            <span className={`w-16 shrink-0 rounded-md px-2 py-0.5 text-center text-xs font-semibold ${sevPill[a.severity]}`}>{sevLabel[a.severity]}</span>
            <span className='min-w-0'>
              {a.callId && <span className='font-medium'>{a.callId} · </span>}
              {a.title}
              {a.status === 'acknowledged' && <span className='text-xs text-muted-foreground'> (acknowledged)</span>}
            </span>
          </Link>
        </li>
      ))}
      {list.length > limit && (
        <li>
          <Button variant='ghost' size='sm' asChild>
            <Link to='/alerts'>View all {list.length} alerts</Link>
          </Button>
        </li>
      )}
    </ul>
  )
}
