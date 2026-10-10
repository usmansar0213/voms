import { useState } from 'react'
import { getRouteApi, Link } from '@tanstack/react-router'
import { AlertTriangle, ArrowLeft, Check, Pencil, Send, Undo2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { PageShell } from '@/components/layout/page-shell'
import { fmtDateTime, fmtShort } from '../format'
import { unitById } from '../org'
import { can } from '../roles'
import { useActor, useVoms, visibleSubmissions } from '../store'
import type { ExtractedField, Submission } from '../types'
import { EmptyState, KeyValues, runAction } from '../components/common'
import { SubmissionStatusBadge } from './submissions'

const route = getRouteApi('/_app/submissions/$subId')

function FieldRow({ sub, f, editable }: { sub: Submission; f: ExtractedField; editable: boolean }) {
  const correct = useVoms((s) => s.correctField)
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(f.value)
  const pct = Math.round(f.confidence * 100)
  return (
    <li className='grid gap-1 py-2 text-sm sm:grid-cols-[1fr_1.2fr_auto] sm:items-center sm:gap-3'>
      <div>
        <div className='font-medium'>{f.label}</div>
        <div className='text-[11px] text-muted-foreground'>Source: {f.citation}</div>
      </div>
      <div>
        {editing ? (
          <form
            className='flex gap-2'
            onSubmit={(e) => {
              e.preventDefault()
              if (runAction(() => correct(sub.id, f.key, value), 'Field corrected')) setEditing(false)
            }}
          >
            <Input className='h-8' value={value} onChange={(e) => setValue(e.target.value)} autoFocus aria-label={f.label} />
            <Button size='sm' type='submit'>
              Save
            </Button>
          </form>
        ) : (
          <div className='flex flex-wrap items-baseline gap-x-2'>
            <span className='font-semibold tabular-nums'>
              {f.value || '—'} {f.unit}
            </span>
            {f.original !== undefined && <span className='text-xs text-muted-foreground line-through'>{f.original}</span>}
          </div>
        )}
        <div className='mt-1 flex items-center gap-2 text-[11px] text-muted-foreground'>
          <div className='h-1.5 w-20 rounded-full bg-muted'>
            <div className={pct < 60 ? 'h-full rounded-full bg-[var(--status-critical)]' : 'h-full rounded-full bg-[var(--series-1)]'} style={{ width: `${pct}%` }} />
          </div>
          {f.original !== undefined ? 'Corrected by coordinator' : `Confidence ${pct}%`}
        </div>
      </div>
      {editable && !editing && (
        <Button size='sm' variant='ghost' className='w-fit' onClick={() => setEditing(true)}>
          <Pencil /> Correct
        </Button>
      )}
    </li>
  )
}

export function SubmissionDetail() {
  const { subId } = route.useParams()
  const state = useVoms()
  const actor = useActor()
  const { submitSubmission, approveSubmission, rejectSubmission } = state
  const sub = visibleSubmissions(state).find((s) => s.id === subId)
  const [reason, setReason] = useState('')
  if (!sub)
    return (
      <PageShell>
        <EmptyState>
          Submission {subId} is not available in your scope.{' '}
          <Link to='/submissions' className='underline'>
            Back
          </Link>
        </EmptyState>
      </PageShell>
    )
  const coordinator = can(actor, 'submission.upload') && sub.status === 'review'
  const approver = can(actor, 'submission.approve') && sub.status === 'submitted' && sub.role === actor.role && sub.orgId === state.session?.orgId
  const self = sub.submittedBy === state.session?.name

  return (
    <PageShell className='max-w-5xl'>
      <Button variant='ghost' size='sm' className='w-fit' asChild>
        <Link to='/submissions'>
          <ArrowLeft /> Submissions
        </Link>
      </Button>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div className='min-w-0'>
          <h1 className='break-all text-lg font-bold tracking-tight sm:text-xl'>{sub.fileName}</h1>
          <p className='text-sm text-muted-foreground'>
            {sub.id} · {sub.reportType} · {unitById[sub.unitId]?.name}
          </p>
        </div>
        <SubmissionStatusBadge status={sub.status} />
      </div>

      {(sub.validation.length > 0 || sub.anomalies.length > 0) && (
        <div className='grid gap-2'>
          {sub.validation.map((v) => (
            <div key={v} className='flex items-start gap-2 rounded-md border border-[var(--status-critical)]/40 bg-[var(--status-critical)]/8 p-2.5 text-sm'>
              <XCircle className='mt-0.5 size-4 shrink-0 text-[var(--status-critical-ink)]' />
              <span>
                <span className='font-medium'>Validation: </span>
                {v}
              </span>
            </div>
          ))}
          {sub.anomalies.map((a) => (
            <div key={a} className='flex items-start gap-2 rounded-md border border-[var(--status-warning)]/50 bg-[var(--status-warning)]/10 p-2.5 text-sm'>
              <AlertTriangle className='mt-0.5 size-4 shrink-0 text-[var(--status-warning-ink)]' />
              <span>
                <span className='font-medium'>Anomaly (review flag): </span>
                {a}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className='grid gap-4 lg:grid-cols-3'>
        <Card className='lg:col-span-2'>
          <CardHeader>
            <CardTitle>Extracted fields</CardTitle>
            <CardDescription>Simulated AI extraction with confidence and source citation. Corrections keep the original value.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className='divide-y'>
              {sub.fields.map((f) => (
                <FieldRow key={f.key} sub={sub} f={f} editable={coordinator} />
              ))}
            </ul>
          </CardContent>
        </Card>

        <div className='grid h-fit gap-4'>
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent>
              <KeyValues
                className='sm:grid-cols-1'
                items={[
                  ['Channel', sub.channel === 'api' ? 'API delivery' : 'File upload'],
                  ['Report date', sub.reportDate],
                  ['Received', fmtDateTime(sub.receivedAt)],
                  ['Submitted by', sub.submittedBy],
                  ['Approved by', sub.approvedBy ? `${sub.approvedBy} · ${fmtShort(sub.approvedAt)}` : '—'],
                  ['Vessel call', sub.callId ?? '—'],
                ]}
              />
            </CardContent>
          </Card>

          {coordinator && (
            <Card>
              <CardHeader>
                <CardTitle>Coordinator review</CardTitle>
                <CardDescription>Fix validation errors, then submit. Anomalies may be submitted with an explanation for the approver.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className='w-full' disabled={sub.validation.length > 0} onClick={() => runAction(() => submitSubmission(sub.id), 'Submitted for approval')}>
                  <Send /> Submit for approval
                </Button>
              </CardContent>
            </Card>
          )}

          {approver && (
            <Card>
              <CardHeader>
                <CardTitle>Approval</CardTitle>
                <CardDescription>{self ? 'You submitted this report — another manager must approve it.' : 'Approve to publish to dashboards, or return it with a reason.'}</CardDescription>
              </CardHeader>
              <CardContent className='grid gap-2'>
                <Button disabled={self} onClick={() => runAction(() => approveSubmission(sub.id), 'Approved and published')}>
                  <Check /> Approve & publish
                </Button>
                <Textarea rows={2} placeholder='Reason for returning (required)' value={reason} onChange={(e) => setReason(e.target.value)} />
                <Button variant='outline' disabled={!reason.trim()} onClick={() => runAction(() => rejectSubmission(sub.id, reason), 'Returned to coordinator')}>
                  <Undo2 /> Return to coordinator
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Version history</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className='grid gap-2 text-sm'>
                {[...sub.history].reverse().map((h, i) => (
                  <li key={i}>
                    <div className='text-xs text-muted-foreground tabular-nums'>{fmtShort(h.time)}</div>
                    <div>{h.action}</div>
                    <div className='text-xs text-muted-foreground'>{h.who}</div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageShell>
  )
}
