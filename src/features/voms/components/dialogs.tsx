import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { AlertTriangle, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { berthCompatibility, berthState, eventLabels, validateEventTime } from '../calc'
import { fromLocalInput, toLocalInput } from '../format'
import { useVoms } from '../store'
import type { CargoLine, EventKey, IncidentType, Severity, Unit, VesselCall } from '../types'
import { runAction } from './common'

export function NativeSelect({ className, ...props }: React.ComponentProps<'select'>) {
  return (
    <select
      className={cn(
        'h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30 [&>option]:bg-background',
        className
      )}
      {...props}
    />
  )
}

export function Field({ label, hint, children, className }: { label: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn('grid gap-1.5', className)}>
      <Label>{label}</Label>
      {children}
      {hint && <p className='text-xs text-muted-foreground'>{hint}</p>}
    </div>
  )
}

function Warnings({ items }: { items: string[] }) {
  if (!items.length) return null
  return (
    <div className='rounded-md border border-[var(--status-warning)]/50 bg-[var(--status-warning)]/10 p-3 text-sm'>
      <div className='mb-1 flex items-center gap-1.5 font-medium text-[var(--status-warning-ink)]'>
        <AlertTriangle className='size-4' /> Validation warnings
      </div>
      <ul className='list-disc ps-5 text-muted-foreground'>
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </div>
  )
}

type DialogProps = { open: boolean; onOpenChange: (v: boolean) => void }

function Shell({ open, onOpenChange, title, description, children, footer }: DialogProps & { title: string; description?: string; children: ReactNode; footer: ReactNode }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[90svh] overflow-y-auto sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className='grid gap-4'>{children}</div>
        <DialogFooter className='gap-2'>{footer}</DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const nowLocal = () => toLocalInput(new Date().toISOString())

// ---------------------------------------------------------------------------

export function RecordEventDialog({ call, eventKey, ...props }: DialogProps & { call: VesselCall; eventKey: EventKey }) {
  const recordEvent = useVoms((s) => s.recordEvent)
  const existing = call.events[eventKey]
  const [value, setValue] = useState(existing ? toLocalInput(existing.time) : nowLocal())
  const [remarks, setRemarks] = useState('')
  const iso = value ? fromLocalInput(value) : ''
  const warnings = useMemo(() => (iso ? validateEventTime(call, eventKey, iso) : []), [call, eventKey, iso])
  return (
    <Shell
      {...props}
      title={`Manual fallback — ${existing ? 'amend' : 'record'} ${eventLabels[eventKey]}`}
      description={`${call.id} · Use only when the source system (VTMS / PMIS) has no feed for this event. The entry is flagged as manual and reconciled later. Local port time. ${existing ? 'The original value is retained in the audit history.' : ''}`}
      footer={
        <>
          <Button variant='outline' onClick={() => props.onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!value}
            onClick={() => {
              if (runAction(() => recordEvent(call.id, eventKey, iso, 'manual', remarks || undefined), `${eventLabels[eventKey]} recorded`))
                props.onOpenChange(false)
            }}
          >
            {existing ? 'Save amendment' : 'Record event'}
          </Button>
        </>
      }
    >
      <Field label='Event time'>
        <Input type='datetime-local' value={value} onChange={(e) => setValue(e.target.value)} />
      </Field>
      <Button type='button' variant='secondary' size='sm' className='w-fit' onClick={() => setValue(nowLocal())}>
        Use current time
      </Button>
      <Field label={existing ? 'Reason for amendment' : 'Remarks (optional)'}>
        <Textarea rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
      </Field>
      <Warnings items={warnings} />
    </Shell>
  )
}

export function AssignBerthDialog({ call, ...props }: DialogProps & { call: VesselCall }) {
  const { berths, calls, vessels, assignBerth } = useVoms()
  const vessel = vessels.find((v) => v.id === call.vesselId)!
  const [berthId, setBerthId] = useState(call.berthId ?? call.requestedBerthId ?? berths[0].id)
  const [reason, setReason] = useState('')
  const berth = berths.find((b) => b.id === berthId)!
  const issues = berthCompatibility(vessel, berth)
  const occupant = calls.find((c) => c.id !== call.id && c.berthId === berthId && c.events.allFast && !c.events.lastLine)
  if (occupant) issues.push(`${berthId} is currently occupied by ${occupant.id}`)
  return (
    <Shell
      {...props}
      title={call.berthId ? 'Change berth assignment' : 'Assign berth'}
      description={`${call.id} · ${vessel.name} — LOA ${vessel.loa} m, draft ${vessel.draft} m, ${vessel.typeLabel}`}
      footer={
        <>
          <Button variant='outline' onClick={() => props.onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (runAction(() => assignBerth(call.id, berthId, reason), `Berth ${berthId} assigned`)) props.onOpenChange(false)
            }}
          >
            {issues.length ? 'Assign with warnings' : 'Assign berth'}
          </Button>
        </>
      }
    >
      <Field label='Berth' hint='Placeholder berth list — subject to validation against the official SBMA facility register.'>
        <NativeSelect value={berthId} onChange={(e) => setBerthId(e.target.value)}>
          {berths.map((b) => {
            const ok = berthCompatibility(vessel, b).length === 0
            return (
              <option key={b.id} value={b.id}>
                {b.id} · max LOA {b.maxLoa} m / draft {b.maxDraft} m · {berthState(b, calls)}
                {ok ? '' : ' ⚠'}
                {b.id === call.requestedBerthId ? ' (requested)' : ''}
              </option>
            )
          })}
        </NativeSelect>
      </Field>
      <Field label='Reason / remarks'>
        <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder='e.g. Requested berth occupied; reassigned' />
      </Field>
      <Warnings items={issues} />
    </Shell>
  )
}

export function ProductionDialog({ call, ...props }: DialogProps & { call: VesselCall }) {
  const addProduction = useVoms((s) => s.addProduction)
  const [lineId, setLineId] = useState(call.cargo[0]?.id ?? '')
  const [qty, setQty] = useState('')
  const [value, setValue] = useState(nowLocal())
  const line = call.cargo.find((l) => l.id === lineId)
  return (
    <Shell
      {...props}
      title='Record cargo production'
      description={`${call.id} · Quantities are kept in the commodity's own unit and are never added across units.`}
      footer={
        <>
          <Button variant='outline' onClick={() => props.onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!qty}
            onClick={() => {
              if (runAction(() => addProduction(call.id, lineId, Number(qty), fromLocalInput(value)), 'Production recorded — pending SBMA verification'))
                props.onOpenChange(false)
            }}
          >
            Submit
          </Button>
        </>
      }
    >
      <Field label='Cargo line'>
        <NativeSelect value={lineId} onChange={(e) => setLineId(e.target.value)}>
          {call.cargo.map((l) => (
            <option key={l.id} value={l.id}>
              {l.commodity} — {l.direction} ({l.unit})
            </option>
          ))}
        </NativeSelect>
      </Field>
      <div className='grid grid-cols-2 gap-3'>
        <Field label={`Quantity (${line?.unit ?? ''})`}>
          <Input inputMode='decimal' type='number' min={0} value={qty} onChange={(e) => setQty(e.target.value)} />
        </Field>
        <Field label='Reporting time'>
          <Input type='datetime-local' value={value} onChange={(e) => setValue(e.target.value)} />
        </Field>
      </div>
    </Shell>
  )
}

export const delayCategories = [
  'Weather — rain',
  'Weather — wind / swell',
  'Equipment breakdown',
  'Awaiting cargo / trucks',
  'Labour / shift change',
  'Vessel-side issue',
  'Documentation / clearance',
  'Other',
]

export function DelayDialog({ call, ...props }: DialogProps & { call: VesselCall }) {
  const addDelay = useVoms((s) => s.addDelay)
  const [category, setCategory] = useState(delayCategories[0])
  const [start, setStart] = useState(nowLocal())
  const [end, setEnd] = useState('')
  const [remarks, setRemarks] = useState('')
  return (
    <Shell
      {...props}
      title='Record operational delay'
      description={`${call.id} · Delay categories are proposed and subject to SBMA confirmation.`}
      footer={
        <>
          <Button variant='outline' onClick={() => props.onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (runAction(() => addDelay(call.id, category, fromLocalInput(start), end ? fromLocalInput(end) : undefined, remarks), 'Delay recorded'))
                props.onOpenChange(false)
            }}
          >
            Save delay
          </Button>
        </>
      }
    >
      <Field label='Category'>
        <NativeSelect value={category} onChange={(e) => setCategory(e.target.value)}>
          {delayCategories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </NativeSelect>
      </Field>
      <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
        <Field label='Start'>
          <Input type='datetime-local' value={start} onChange={(e) => setStart(e.target.value)} />
        </Field>
        <Field label='End (leave empty if ongoing)'>
          <Input type='datetime-local' value={end} onChange={(e) => setEnd(e.target.value)} />
        </Field>
      </div>
      <Field label='Remarks'>
        <Textarea rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
      </Field>
    </Shell>
  )
}

export function IncidentDialog({ callId, ...props }: DialogProps & { callId?: string }) {
  const { calls, reportIncident } = useVoms()
  const active = calls.filter((c) => !c.closure && !c.cancelled)
  const [form, setForm] = useState({
    callId: callId ?? active[0]?.id ?? '',
    type: 'safety' as IncidentType,
    severity: 'low' as Severity,
    title: '',
    description: '',
    time: nowLocal(),
    actions: '',
  })
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }))
  return (
    <Shell
      {...props}
      title='Report incident'
      description='Recording an incident in PORTIX is not an official notification to a competent authority.'
      footer={
        <>
          <Button variant='outline' onClick={() => props.onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!form.title || !form.callId}
            onClick={() => {
              let id = ''
              if (
                runAction(() => {
                  id = reportIncident({
                    callId: form.callId,
                    type: form.type,
                    severity: form.severity,
                    title: form.title,
                    description: form.description,
                    time: fromLocalInput(form.time),
                    actions: form.actions.split('\n').map((s) => s.trim()),
                  })
                })
              ) {
                runAction(() => undefined, `Incident ${id} reported`)
                props.onOpenChange(false)
              }
            }}
          >
            Submit report
          </Button>
        </>
      }
    >
      <Field label='Vessel call'>
        <NativeSelect value={form.callId} onChange={set('callId')} disabled={!!callId}>
          {active.map((c) => (
            <option key={c.id} value={c.id}>
              {c.id}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <div className='grid grid-cols-2 gap-3'>
        <Field label='Type'>
          <NativeSelect value={form.type} onChange={set('type')}>
            <option value='safety'>Safety</option>
            <option value='security'>Security</option>
            <option value='environmental'>Environmental</option>
            <option value='dangerous_cargo'>Dangerous cargo</option>
          </NativeSelect>
        </Field>
        <Field label='Severity (preliminary)'>
          <NativeSelect value={form.severity} onChange={set('severity')}>
            <option value='low'>Low</option>
            <option value='medium'>Medium</option>
            <option value='high'>High</option>
            <option value='critical'>Critical</option>
          </NativeSelect>
        </Field>
      </div>
      <Field label='Title'>
        <Input value={form.title} onChange={set('title')} placeholder='Short description' />
      </Field>
      <Field label='Time of occurrence'>
        <Input type='datetime-local' value={form.time} onChange={set('time')} />
      </Field>
      <Field label='Description'>
        <Textarea rows={3} value={form.description} onChange={set('description')} />
      </Field>
      <Field label='Corrective actions (one per line)'>
        <Textarea rows={3} value={form.actions} onChange={set('actions')} />
      </Field>
    </Shell>
  )
}

type DraftLine = Omit<CargoLine, 'id' | 'declared'> & { declared: string }

const defaultLine: Record<string, DraftLine> = {
  container: { commodity: 'Containers (laden)', category: 'Containerized', direction: 'discharge', unit: 'TEU', declared: '' },
  bulk: { commodity: 'Coal', category: 'Dry bulk — mineral', direction: 'discharge', unit: 'MT', declared: '' },
  tanker: { commodity: 'Diesel (Gasoil)', category: 'Liquid bulk — petroleum', direction: 'discharge', unit: 'KL', declared: '', dangerous: true },
  general: { commodity: 'Steel products', category: 'Break bulk', direction: 'discharge', unit: 'MT', declared: '' },
}

export function NewCallDialog(props: DialogProps) {
  const { vessels, berths, createCall } = useVoms()
  const navigate = useNavigate()
  const [vesselId, setVesselId] = useState(vessels[0].id)
  const vessel = vessels.find((v) => v.id === vesselId)!
  const inH = (h: number) => toLocalInput(new Date(Date.now() + h * 3600_000).toISOString())
  const [eta, setEta] = useState(inH(24))
  const [etd, setEtd] = useState(inH(48))
  const [requested, setRequested] = useState('')
  const [lastPort, setLastPort] = useState('Demo Port North')
  const [nextPort, setNextPort] = useState('Demo Port South')
  const [lines, setLines] = useState<DraftLine[]>([defaultLine[vessel.type]])
  const etaIssue = Date.parse(etd) <= Date.parse(eta) ? 'ETD must be later than ETA' : ''
  const compatible = berths.filter((b) => berthCompatibility(vessel, b).length === 0)
  return (
    <Shell
      {...props}
      title='New pre-arrival notification'
      description='Creates a Vessel Call ID. In production this would be submitted by the appointed shipping agent.'
      footer={
        <>
          <Button variant='outline' onClick={() => props.onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!!etaIssue || lines.some((l) => !(Number(l.declared) > 0))}
            onClick={() => {
              let id = ''
              if (
                runAction(() => {
                  id = createCall({
                    vesselId,
                    eta: fromLocalInput(eta),
                    etd: fromLocalInput(etd),
                    purpose: vessel.type === 'tanker' ? 'Liquid cargo discharge' : 'Cargo operations',
                    requestedBerthId: requested || undefined,
                    lastPort,
                    nextPort,
                    cargo: lines.map((l) => ({ ...l, declared: Number(l.declared) })),
                  })
                })
              ) {
                runAction(() => undefined, `Vessel call ${id} created`)
                props.onOpenChange(false)
                navigate({ to: '/vessel-calls/$callId', params: { callId: id } })
              }
            }}
          >
            Submit notification
          </Button>
        </>
      }
    >
      <Field label='Vessel' hint={`IMO ${vessel.imo} · ${vessel.typeLabel} · LOA ${vessel.loa} m · draft ${vessel.draft} m`}>
        <NativeSelect
          value={vesselId}
          onChange={(e) => {
            const v = vessels.find((x) => x.id === e.target.value)!
            setVesselId(v.id)
            setLines([defaultLine[v.type]])
            setRequested('')
          }}
        >
          {vessels.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name} ({v.typeLabel})
            </option>
          ))}
        </NativeSelect>
      </Field>
      <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
        <Field label='ETA'>
          <Input type='datetime-local' value={eta} onChange={(e) => setEta(e.target.value)} />
        </Field>
        <Field label='ETD'>
          <Input type='datetime-local' value={etd} onChange={(e) => setEtd(e.target.value)} />
        </Field>
        <Field label='Last port'>
          <Input value={lastPort} onChange={(e) => setLastPort(e.target.value)} />
        </Field>
        <Field label='Next port'>
          <Input value={nextPort} onChange={(e) => setNextPort(e.target.value)} />
        </Field>
      </div>
      <Field label='Requested berth (optional)' hint='Only berths compatible with this vessel are listed.'>
        <NativeSelect value={requested} onChange={(e) => setRequested(e.target.value)}>
          <option value=''>No preference</option>
          {compatible.map((b) => (
            <option key={b.id} value={b.id}>
              {b.id}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <div className='grid gap-2'>
        <Label>Declared cargo</Label>
        {lines.map((l, i) => (
          <div key={i} className='grid grid-cols-[1fr_auto] gap-2 rounded-md border p-2'>
            <div className='grid grid-cols-2 gap-2 sm:grid-cols-4'>
              <Input
                className='col-span-2'
                aria-label='Commodity'
                value={l.commodity}
                onChange={(e) => setLines((ls) => ls.map((x, j) => (j === i ? { ...x, commodity: e.target.value } : x)))}
              />
              <NativeSelect
                aria-label='Direction'
                value={l.direction}
                onChange={(e) => setLines((ls) => ls.map((x, j) => (j === i ? { ...x, direction: e.target.value as DraftLine['direction'] } : x)))}
              >
                <option value='discharge'>Discharge</option>
                <option value='load'>Load</option>
              </NativeSelect>
              <NativeSelect
                aria-label='Unit'
                value={l.unit}
                onChange={(e) => setLines((ls) => ls.map((x, j) => (j === i ? { ...x, unit: e.target.value as Unit } : x)))}
              >
                {(['TEU', 'MT', 'KL', 'UNIT'] as Unit[]).map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </NativeSelect>
              <Input
                className='col-span-2'
                aria-label='Declared quantity'
                type='number'
                inputMode='decimal'
                placeholder='Declared quantity'
                value={l.declared}
                onChange={(e) => setLines((ls) => ls.map((x, j) => (j === i ? { ...x, declared: e.target.value } : x)))}
              />
            </div>
            <Button
              variant='ghost'
              size='icon'
              aria-label='Remove line'
              disabled={lines.length === 1}
              onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}
            >
              <Trash2 />
            </Button>
          </div>
        ))}
        <Button variant='secondary' size='sm' className='w-fit' onClick={() => setLines((ls) => [...ls, { ...defaultLine[vessel.type] }])}>
          <Plus /> Add cargo line
        </Button>
      </div>
      <Warnings items={etaIssue ? [etaIssue] : []} />
    </Shell>
  )
}
