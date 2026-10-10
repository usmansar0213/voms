import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { CheckCircle2, FileSpreadsheet, FileText, Loader2, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { PageShell } from '@/components/layout/page-shell'
import { fmtShort } from '../format'
import { homeUnit, unitById } from '../org'
import { can } from '../roles'
import { templatesFor } from '../submissions'
import { useActor, useVoms, visibleSubmissions } from '../store'
import type { Submission, SubmissionStatus } from '../types'
import { Field, NativeSelect } from '../components/dialogs'
import { EmptyState, PageHeader, runAction, ToneBadge } from '../components/common'
import type { Tone } from '../calc'

const statusMeta: Record<SubmissionStatus, { label: string; tone: Tone }> = {
  processing: { label: 'Processing', tone: 'info' },
  review: { label: 'Coordinator review', tone: 'warning' },
  submitted: { label: 'Awaiting approval', tone: 'info' },
  approved: { label: 'Approved', tone: 'good' },
  rejected: { label: 'Returned', tone: 'serious' },
}

export function SubmissionStatusBadge({ status }: { status: SubmissionStatus }) {
  return <ToneBadge tone={statusMeta[status].tone}>{statusMeta[status].label}</ToneBadge>
}

const pipeline = ['Receive file', 'Identify source & report type', 'Extract & map fields (simulated AI)', 'Validate business rules', 'Detect duplicates & anomalies']

function UploadPanel() {
  const session = useVoms((s) => s.session!)
  const upload = useVoms((s) => s.uploadSubmission)
  const navigate = useNavigate()
  const tpls = templatesFor(homeUnit(session.orgId, session.role))
  const [tplId, setTplId] = useState(tpls[0]?.id)
  const tpl = tpls.find((t) => t.id === tplId)
  const [variantId, setVariantId] = useState(tpl?.variants[0].id)
  const [file, setFile] = useState<File | null>(null)
  const [step, setStep] = useState(-1)

  useEffect(() => {
    setVariantId(tpl?.variants[0].id)
  }, [tpl])

  if (!tpl) return <EmptyState>No report templates are defined for your unit.</EmptyState>

  const run = () => {
    setStep(0)
    pipeline.forEach((_, i) => setTimeout(() => setStep(i + 1), (i + 1) * 450))
    setTimeout(() => {
      let id = ''
      if (runAction(() => (id = upload({ templateId: tpl.id, variantId: variantId!, fileName: file?.name })), 'Extraction complete — review the fields'))
        navigate({ to: '/submissions/$subId', params: { subId: id } })
      setStep(-1)
    }, pipeline.length * 450 + 300)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload a report</CardTitle>
        <CardDescription>Excel or PDF, including differing terminal layouts. The file stays in your browser — only its name is used.</CardDescription>
      </CardHeader>
      <CardContent className='grid gap-4'>
        <Field label='Report type'>
          <NativeSelect value={tplId} onChange={(e) => setTplId(e.target.value)}>
            {tpls.map((t) => (
              <option key={t.id} value={t.id}>
                {t.reportType} ({t.format.toUpperCase()})
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label='File (optional)' hint='Choose any local file to label the submission, or use a sample below. Content is not read in this demo.'>
          <Input type='file' accept='.xlsx,.xls,.csv,.pdf' onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </Field>
        <fieldset className='grid gap-2'>
          <legend className='mb-1 text-sm font-medium'>Sample content to simulate</legend>
          <div className='grid gap-2 sm:grid-cols-3'>
            {tpl.variants.map((v) => (
              <button
                key={v.id}
                type='button'
                onClick={() => setVariantId(v.id)}
                aria-pressed={variantId === v.id}
                className={cn('rounded-md border p-2.5 text-start text-sm', variantId === v.id ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:bg-accent')}
              >
                <div className='flex items-center gap-1.5 font-medium'>
                  {tpl.format === 'pdf' ? <FileText className='size-4' /> : <FileSpreadsheet className='size-4' />}
                  {v.label}
                </div>
                <div className='text-xs text-muted-foreground'>{v.note}</div>
              </button>
            ))}
          </div>
        </fieldset>
        {step >= 0 && (
          <ol className='grid gap-1.5 rounded-md border p-3 text-sm' aria-live='polite'>
            {pipeline.map((p, i) => (
              <li key={p} className='flex items-center gap-2'>
                {i < step ? <CheckCircle2 className='size-4 text-[var(--status-good)]' /> : i === step ? <Loader2 className='size-4 animate-spin' /> : <span className='size-4 rounded-full border' />}
                <span className={i <= step ? '' : 'text-muted-foreground'}>{p}</span>
              </li>
            ))}
          </ol>
        )}
        <Button className='w-fit' disabled={step >= 0} onClick={run}>
          <Upload /> Process submission
        </Button>
      </CardContent>
    </Card>
  )
}

export function SubmissionRow({ s }: { s: Submission }) {
  return (
    <li>
      <Link to='/submissions/$subId' params={{ subId: s.id }} className='flex flex-wrap items-center gap-2 p-3 text-sm hover:bg-accent/50'>
        {s.format === 'pdf' ? <FileText className='size-4 shrink-0 text-muted-foreground' /> : <FileSpreadsheet className='size-4 shrink-0 text-muted-foreground' />}
        <span className='min-w-0 flex-1'>
          <span className='block truncate font-medium'>{s.fileName}</span>
          <span className='block text-xs text-muted-foreground'>
            {s.reportType} · {unitById[s.unitId]?.short} · {s.channel === 'api' ? 'API' : 'Upload'} · {fmtShort(s.receivedAt)} · {s.submittedBy}
          </span>
        </span>
        {s.anomalies.length > 0 && <ToneBadge tone='warning'>{s.anomalies.length} anomaly</ToneBadge>}
        {s.validation.length > 0 && <ToneBadge tone='serious'>{s.validation.length} validation</ToneBadge>}
        <SubmissionStatusBadge status={s.status} />
      </Link>
    </li>
  )
}

export function Submissions() {
  const state = useVoms()
  const actor = useActor()
  const subs = visibleSubmissions(state)
  const [filter, setFilter] = useState<'all' | SubmissionStatus>('all')
  const awaiting = useMemo(() => subs.filter((s) => s.status === 'submitted' && s.role === actor.role && s.orgId === state.session?.orgId), [subs, actor.role, state.session?.orgId])
  const shown = subs.filter((s) => filter === 'all' || s.status === filter)
  const mgmt = actor.perspective === 'management'

  return (
    <PageShell>
      <PageHeader
        title={mgmt ? 'Submission Review' : 'Submission Center'}
        description={
          mgmt
            ? 'Approve or return submissions from your organization. Approved data is published to dashboards.'
            : 'Upload Excel/PDF reports, review the extracted fields, correct them and submit for approval.'
        }
      />
      {!mgmt && can(actor, 'submission.upload') && <UploadPanel />}

      {mgmt && (
        <Card>
          <CardHeader>
            <CardTitle>Awaiting your approval ({awaiting.length})</CardTitle>
            <CardDescription>You cannot approve a submission you created yourself.</CardDescription>
          </CardHeader>
          <CardContent>
            {awaiting.length === 0 ? <EmptyState>Nothing awaiting approval.</EmptyState> : <ul className='divide-y rounded-md border'>{awaiting.map((s) => <SubmissionRow key={s.id} s={s} />)}</ul>}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{mgmt ? 'All submissions in scope' : 'Submission history & receipts'}</CardTitle>
          <CardDescription>Original files, extracted fields, reviewer decisions and version history are retained.</CardDescription>
        </CardHeader>
        <CardContent className='grid gap-3'>
          <div className='-mx-1 flex gap-2 overflow-x-auto px-1 no-scrollbar'>
            {(['all', 'review', 'submitted', 'approved', 'rejected'] as const).map((f) => (
              <Button key={f} size='sm' variant={filter === f ? 'default' : 'outline'} className='shrink-0 rounded-full' onClick={() => setFilter(f)}>
                {f === 'all' ? 'All' : statusMeta[f].label}
              </Button>
            ))}
          </div>
          {shown.length === 0 ? <EmptyState>No submissions.</EmptyState> : <ul className='divide-y rounded-md border'>{shown.map((s) => <SubmissionRow key={s.id} s={s} />)}</ul>}
        </CardContent>
      </Card>
    </PageShell>
  )
}
