import { useMemo, useState } from 'react'
import { getRouteApi, Link } from '@tanstack/react-router'
import { ArrowLeft, Ban, CheckCircle2, ClipboardCheck, MessageSquarePlus, OctagonPause, Play, RotateCcw, TrendingDown, TrendingUp, Minus, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { PageShell } from '@/components/layout/page-shell'
import { EmptyState, KeyValues, PageHeader, runAction, ToneBadge } from '../../components/common'
import { Field, NativeSelect } from '../../components/dialogs'
import { fmtKpi, KpiStatusPill } from '../../components/portix-ui'
import { fmtDateTime } from '../../format'
import { kpiById, kpiStatus, kpiTarget, periodLabel, scopeLabel, unitOf, type KpiId, type Scope } from '../../kpi'
import { can, roleById } from '../../roles'
import { useActor, usePeriod, useVoms, visibleActions } from '../../store'
import type { ActionStatus, ManagementAction } from '../../types'
import {
  ActionStatusBadge,
  assessmentLabel,
  assessmentTone,
  currentKpi,
  DueDate,
  kpiDelta,
  OriginTag,
  PriorityBadge,
  statusMeta,
  type Assessment,
} from './action-ui'

const route = getRouteApi('/_app/actions/$actionId')

interface Transition {
  to: ActionStatus
  label: string
  icon: LucideIcon
  variant: 'default' | 'outline' | 'destructive'
  needsNote?: boolean
}

const transitions: Partial<Record<ActionStatus, Transition[]>> = {
  proposed: [
    { to: 'in_progress', label: 'Start work', icon: Play, variant: 'default' },
    { to: 'cancelled', label: 'Cancel action', icon: Ban, variant: 'outline', needsNote: true },
  ],
  in_progress: [
    { to: 'done', label: 'Mark done', icon: CheckCircle2, variant: 'default' },
    { to: 'blocked', label: 'Mark blocked', icon: OctagonPause, variant: 'outline', needsNote: true },
  ],
  blocked: [
    { to: 'in_progress', label: 'Resume (unblock)', icon: Play, variant: 'default' },
    { to: 'cancelled', label: 'Cancel action', icon: Ban, variant: 'outline', needsNote: true },
  ],
  done: [{ to: 'in_progress', label: 'Reopen (back to in progress)', icon: RotateCcw, variant: 'outline' }],
}

export function ActionDetail() {
  const { actionId } = route.useParams()
  const session = useVoms((s) => s.session)
  const allActions = useVoms((s) => s.actions)
  const action = useMemo(() => visibleActions({ session, actions: allActions }).find((a) => a.id === actionId), [session, allActions, actionId])

  if (!action) {
    return (
      <PageShell>
        <PageHeader title='Action not found' />
        <EmptyState>
          <p>
            Action <span className='font-medium'>{actionId}</span> does not exist or is outside your authorized scope.
          </p>
          <Button asChild variant='outline' size='sm' className='mt-3'>
            <Link to='/actions'>
              <ArrowLeft /> Back to Management Actions
            </Link>
          </Button>
        </EmptyState>
      </PageShell>
    )
  }
  // Keyed so local form state resets when navigating between actions.
  return <ActionView key={action.id} action={action} />
}

function ActionView({ action: a }: { action: ManagementAction }) {
  const actor = useActor()
  const session = useVoms((s) => s.session)
  const owner = roleById[a.ownerRole]
  const canUpdate = can(actor, 'action.update')
  const canClose = can(actor, 'action.close')
  const terminal = a.status === 'closed' || a.status === 'cancelled'

  return (
    <PageShell>
      <div className='min-w-0'>
        <Link to='/actions' className='inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground'>
          <ArrowLeft className='size-4' aria-hidden /> Management Actions
        </Link>
      </div>
      <PageHeader title={a.title} description={<span className='tabular-nums'>{a.id}</span>} />
      <div className='flex flex-wrap items-center gap-2'>
        <ActionStatusBadge status={a.status} />
        <PriorityBadge priority={a.priority} />
        <DueDate action={a} className='text-sm' />
      </div>

      <div className='grid min-w-0 gap-4 lg:grid-cols-3 lg:items-start'>
        <div className='grid min-w-0 gap-4 lg:col-span-2'>
          <Card className='gap-4'>
            <CardHeader>
              <CardTitle>Action details</CardTitle>
            </CardHeader>
            <CardContent>
              <KeyValues
                items={[
                  ['Scope', scopeLabel(a.scope as Scope)],
                  ['Owner', <span key='o'>{a.ownerName}<span className='block text-xs font-normal text-muted-foreground'>{owner?.name ?? a.ownerRole}</span></span>],
                  ['Due date', <DueDate key='d' action={a} />],
                  ['Origin', <OriginLink key='g' action={a} />],
                  ['Created by', a.createdBy],
                  ['Created at', fmtDateTime(a.createdAt)],
                ]}
              />
            </CardContent>
          </Card>

          <Card className='gap-3'>
            <CardHeader>
              <CardTitle>Issue (evidence)</CardTitle>
            </CardHeader>
            <CardContent className='text-sm break-words whitespace-pre-line'>{a.issue || <span className='text-muted-foreground'>No issue recorded.</span>}</CardContent>
          </Card>

          <Card className='gap-3'>
            <CardHeader>
              <CardTitle>Recommended action</CardTitle>
            </CardHeader>
            <CardContent className='text-sm break-words whitespace-pre-line'>
              {a.recommendedAction || <span className='text-muted-foreground'>No recommended action recorded.</span>}
            </CardContent>
          </Card>

          {a.kpiId && <KpiEvidence action={a} />}
          {a.status === 'closed' && a.outcome && <OutcomeCard action={a} />}
          {a.status === 'done' && canClose && <OutcomeReview action={a} isOwner={a.ownerName === session?.name} />}
        </div>

        <div className='grid min-w-0 gap-4'>
          {canUpdate && !terminal && <FollowUp action={a} />}
          <FollowUpLog action={a} />
        </div>
      </div>
    </PageShell>
  )
}

function OriginLink({ action: a }: { action: ManagementAction }) {
  const { origin } = a
  if (origin.type === 'alert')
    return (
      <Link to='/alerts' className='inline-flex items-center gap-1 underline underline-offset-2'>
        <OriginTag origin={origin} className='text-sm text-foreground' />
      </Link>
    )
  if (origin.type === 'kpi' && (origin.ref ?? a.kpiId))
    return (
      <Link to='/kpis/$kpiId' params={{ kpiId: (origin.ref ?? a.kpiId)! }} search={{ scope: a.scope }} className='underline underline-offset-2'>
        <OriginTag origin={origin} className='text-sm text-foreground' />
      </Link>
    )
  return <OriginTag origin={origin} className='text-sm text-foreground' />
}

function DeltaText({ kpiId, baseline, current, unit }: { kpiId: KpiId; baseline: number | null | undefined; current: number | null | undefined; unit: string }) {
  const d = kpiDelta(kpiId, baseline, current)
  if (!d) return <span className='text-muted-foreground'>Not comparable (value unavailable)</span>
  const Icon = d.assessment === 'improved' ? TrendingUp : d.assessment === 'worsened' ? TrendingDown : Minus
  const word = d.assessment === 'improved' ? 'better' : d.assessment === 'worsened' ? 'worse' : 'no material change'
  const sign = d.delta > 0 ? '+' : d.delta < 0 ? '−' : '±'
  const dir = kpiById[kpiId].direction === 'lower' ? 'lower is better' : 'higher is better'
  return (
    <span
      className={cn(
        'inline-flex flex-wrap items-center gap-1',
        d.assessment === 'improved' && 'text-[var(--status-good-ink)]',
        d.assessment === 'worsened' && 'text-[var(--status-critical-ink)]'
      )}
    >
      <Icon className='size-4 shrink-0' aria-hidden />
      <span className='font-semibold'>
        {sign}
        {fmtKpi(Math.abs(d.delta), unit)}
        {d.pct !== null && ` (${sign}${Math.abs(d.pct).toFixed(1)}%)`}
      </span>
      <span>· {word}</span>
      <span className='text-xs font-normal text-muted-foreground'>({dir})</span>
    </span>
  )
}

function KpiEvidence({ action: a }: { action: ManagementAction }) {
  const history = useVoms((s) => s.history)
  const period = usePeriod()
  const kpiId = a.kpiId as KpiId
  const scope = a.scope as Scope
  const k = kpiById[kpiId]
  if (!k) return null
  const unit = unitOf(k, scope)
  const current = currentKpi(history, a, period)
  const target = kpiTarget(history, kpiId, scope, period)
  const status = kpiStatus(kpiId, current, target)

  return (
    <Card className='gap-4'>
      <CardHeader>
        <CardTitle>KPI evidence</CardTitle>
        <CardDescription>
          <Link to='/kpis/$kpiId' params={{ kpiId }} search={{ scope: a.scope }} className='underline underline-offset-2'>
            {k.id} · {k.name}
          </Link>{' '}
          — {scopeLabel(scope)}
        </CardDescription>
      </CardHeader>
      <CardContent className='grid gap-4 text-sm'>
        <dl className='grid grid-cols-2 gap-3 sm:grid-cols-3'>
          <div className='min-w-0 rounded-lg border p-3'>
            <dt className='text-xs text-muted-foreground'>Baseline{a.baseline ? ` · ${periodLabel(a.baseline.period)}` : ''}</dt>
            <dd className='text-lg font-semibold tabular-nums'>{fmtKpi(a.baseline?.value, unit)}</dd>
          </div>
          <div className='min-w-0 rounded-lg border p-3'>
            <dt className='text-xs text-muted-foreground'>Current · {periodLabel(period)}</dt>
            <dd className='text-lg font-semibold tabular-nums'>{fmtKpi(current, unit)}</dd>
          </div>
          <div className='col-span-2 min-w-0 rounded-lg border p-3 sm:col-span-1'>
            <dt className='text-xs text-muted-foreground'>Target (illustrative)</dt>
            <dd className='flex flex-wrap items-center gap-2'>
              <span className='text-lg font-semibold tabular-nums'>{fmtKpi(target, unit)}</span>
              <KpiStatusPill status={status} />
            </dd>
          </div>
        </dl>
        <div>
          <div className='text-xs text-muted-foreground'>Change since baseline</div>
          <DeltaText kpiId={kpiId} baseline={a.baseline?.value} current={current} unit={unit} />
        </div>
        {current === null && scope === 'PORT' && !k.portLevel && (
          <p className='text-xs text-muted-foreground'>This KPI has terminal-specific units, so no port-wide value is calculated.</p>
        )}
      </CardContent>
    </Card>
  )
}

function FollowUp({ action: a }: { action: ManagementAction }) {
  const addActionNote = useVoms((s) => s.addActionNote)
  const setActionStatus = useVoms((s) => s.setActionStatus)
  const [note, setNote] = useState('')
  const options = transitions[a.status] ?? []
  const hasNote = note.trim().length > 0

  const change = (t: Transition) => {
    if (runAction(() => setActionStatus(a.id, t.to, note.trim()), `${a.id} → ${statusMeta[t.to].label}`)) setNote('')
  }

  return (
    <Card className='gap-3'>
      <CardHeader>
        <CardTitle>Add follow-up</CardTitle>
        <CardDescription>Record progress, or add a note and change the status. Blocking or cancelling requires a note.</CardDescription>
      </CardHeader>
      <CardContent className='grid gap-3'>
        <Field label='Follow-up note'>
          <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder='What happened, what is next, who is involved…' />
        </Field>
        <Button
          variant='secondary'
          disabled={!hasNote}
          onClick={() => {
            if (runAction(() => addActionNote(a.id, note.trim()), 'Follow-up added')) setNote('')
          }}
        >
          <MessageSquarePlus /> Add follow-up
        </Button>
        {options.length > 0 && (
          <div className='grid gap-2 border-t pt-3'>
            <div className='text-xs font-medium text-muted-foreground'>Change status</div>
            <div className='flex flex-wrap gap-2'>
              {options.map((t) => (
                <Button
                  key={t.to}
                  size='sm'
                  variant={t.variant}
                  disabled={t.needsNote && !hasNote}
                  title={t.needsNote && !hasNote ? 'Write a note explaining the change first' : undefined}
                  onClick={() => change(t)}
                >
                  <t.icon /> {t.label}
                </Button>
              ))}
            </div>
            {options.some((t) => t.needsNote) && !hasNote && <p className='text-xs text-muted-foreground'>Write a note above to enable blocking or cancelling.</p>}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function FollowUpLog({ action: a }: { action: ManagementAction }) {
  const updates = [...a.updates].sort((x, y) => y.time.localeCompare(x.time))
  return (
    <Card className='gap-3'>
      <CardHeader>
        <CardTitle>Follow-up log</CardTitle>
        <CardDescription>{a.updates.length} entries · newest first</CardDescription>
      </CardHeader>
      <CardContent>
        <ol className='relative grid gap-4 border-s ps-4'>
          {updates.map((u, i) => (
            <li key={`${u.time}-${i}`} className='relative min-w-0 text-sm'>
              <span className='absolute -start-[1.3rem] top-1.5 size-2.5 rounded-full border-2 border-background bg-muted-foreground' aria-hidden />
              <div className='flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground'>
                <time dateTime={u.time}>{fmtDateTime(u.time)}</time>
                <span>· {u.who}</span>
                {u.status && <ActionStatusBadge status={u.status} className='text-[11px]' />}
              </div>
              <p className='mt-1 break-words'>{u.note}</p>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  )
}

function OutcomeReview({ action: a, isOwner }: { action: ManagementAction; isOwner: boolean }) {
  const history = useVoms((s) => s.history)
  const periods = useVoms((s) => s.periods)
  const closeAction = useVoms((s) => s.closeAction)
  const latest = periods[periods.length - 1]
  const current = currentKpi(history, a, latest)
  const suggestion = a.kpiId ? kpiDelta(a.kpiId as KpiId, a.baseline?.value, current)?.assessment : undefined
  const [assessment, setAssessment] = useState<Assessment>(suggestion ?? 'no_change')
  const [note, setNote] = useState('')

  return (
    <Card className='gap-3 border-[var(--series-1)]/40'>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <ClipboardCheck className='size-5 text-[var(--series-1-ink)]' aria-hidden /> Outcome review
        </CardTitle>
        <CardDescription>
          The owner marked this action done. Assess the outcome against the KPI baseline and close it. The owner cannot assess their own action.
        </CardDescription>
      </CardHeader>
      <CardContent className='grid gap-3'>
        {suggestion && (
          <p className='text-sm text-muted-foreground'>
            Suggested from KPI change ({periodLabel(latest)} vs baseline): <span className='font-medium text-foreground'>{assessmentLabel[suggestion]}</span>
          </p>
        )}
        {isOwner && (
          <p className='text-sm text-[var(--status-warning-ink)]'>You are the owner of this action; another manager must review the outcome.</p>
        )}
        <Field label='Assessment'>
          <NativeSelect value={assessment} onChange={(e) => setAssessment(e.target.value as Assessment)}>
            <option value='improved'>Improved</option>
            <option value='no_change'>No change</option>
            <option value='worsened'>Worsened</option>
          </NativeSelect>
        </Field>
        <Field label='Outcome note (required)'>
          <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder='Evidence for the assessment and any follow-on decision…' />
        </Field>
        <Button
          disabled={!note.trim()}
          onClick={() => {
            if (runAction(() => closeAction(a.id, assessment, note.trim()), `${a.id} closed with outcome`)) setNote('')
          }}
        >
          <CheckCircle2 /> Close with outcome
        </Button>
      </CardContent>
    </Card>
  )
}

function OutcomeCard({ action: a }: { action: ManagementAction }) {
  const o = a.outcome!
  const k = a.kpiId ? kpiById[a.kpiId as KpiId] : undefined
  const unit = k ? unitOf(k, a.scope as Scope) : ''
  return (
    <Card className='gap-3'>
      <CardHeader>
        <CardTitle className='flex flex-wrap items-center gap-2'>
          Outcome <ToneBadge tone={assessmentTone[o.assessment]}>{assessmentLabel[o.assessment]}</ToneBadge>
        </CardTitle>
        <CardDescription>
          Closed by {o.closedBy} · {fmtDateTime(o.closedAt)}
        </CardDescription>
      </CardHeader>
      <CardContent className='grid gap-3 text-sm'>
        {k && (
          <>
            <dl className='grid grid-cols-2 gap-3'>
              <div className='min-w-0 rounded-lg border p-3'>
                <dt className='text-xs text-muted-foreground'>Before{a.baseline ? ` · ${periodLabel(a.baseline.period)}` : ''}</dt>
                <dd className='text-lg font-semibold tabular-nums'>{fmtKpi(a.baseline?.value, unit)}</dd>
              </div>
              <div className='min-w-0 rounded-lg border p-3'>
                <dt className='text-xs text-muted-foreground'>After · {periodLabel(o.period)}</dt>
                <dd className='text-lg font-semibold tabular-nums'>{fmtKpi(o.value, unit)}</dd>
              </div>
            </dl>
            <DeltaText kpiId={k.id} baseline={a.baseline?.value} current={o.value} unit={unit} />
          </>
        )}
        <p className='break-words whitespace-pre-line'>{o.note}</p>
      </CardContent>
    </Card>
  )
}
