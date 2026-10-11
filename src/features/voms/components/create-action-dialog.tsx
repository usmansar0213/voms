import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { format, addDays } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { kpis, scopeLabel, type KpiId, type Scope } from '../kpi'
import { roles } from '../roles'
import { useVoms } from '../store'
import type { ActionPriority, ManagementAction, RoleId } from '../types'
import { runAction } from './common'
import { Field, NativeSelect } from './dialogs'
import { sessionScopes } from './portix-ui'

export interface ActionDraft {
  title?: string
  issue?: string
  recommendedAction?: string
  kpiId?: KpiId
  scope?: Scope
  origin: ManagementAction['origin']
  priority?: ActionPriority
}

// Demo owners: one accountable manager per organization/role (fictitious).
const owners: { name: string; role: RoleId; orgId: string }[] = [
  { name: 'Demo Port Authority Manager', role: 'management', orgId: 'ORG-SBMA' },
  { name: 'Demo Harbor Master Manager', role: 'harbor_master', orgId: 'ORG-SBMA' },
  { name: 'Demo Port Control Manager', role: 'port_control', orgId: 'ORG-SBMA' },
  { name: 'Demo Systems Manager', role: 'admin', orgId: 'ORG-SBMA' },
  { name: 'Demo Container Terminal A Manager', role: 'terminal_operator', orgId: 'ORG-TA' },
  { name: 'Demo Bulk Terminal B Manager', role: 'terminal_operator', orgId: 'ORG-TB' },
  { name: 'Demo Liquid Bulk Terminal C Manager', role: 'terminal_operator', orgId: 'ORG-TC' },
]

/** Create a management action from an alert, KPI or insight (pre-filled). */
export function CreateActionDialog({ open, onOpenChange, draft }: { open: boolean; onOpenChange: (v: boolean) => void; draft: ActionDraft }) {
  const session = useVoms((s) => s.session)
  const createAction = useVoms((s) => s.createAction)
  const navigate = useNavigate()
  const scopes = sessionScopes(session)
  const [form, setForm] = useState({
    title: draft.title ?? '',
    issue: draft.issue ?? '',
    recommendedAction: draft.recommendedAction ?? '',
    kpiId: (draft.kpiId ?? '') as KpiId | '',
    scope: (draft.scope ?? scopes[0] ?? 'PORT') as Scope,
    owner: owners[1].name,
    priority: draft.priority ?? ('medium' as ActionPriority),
    dueDate: format(addDays(new Date(), 14), 'yyyy-MM-dd'),
  })
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const owner = owners.find((o) => o.name === form.owner)!
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[90svh] overflow-y-auto sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>Create management action</DialogTitle>
          <DialogDescription>
            Issue → action → owner → due date. The KPI baseline is captured automatically so the outcome can be measured later.
          </DialogDescription>
        </DialogHeader>
        <div className='grid gap-3'>
          <Field label='Title'>
            <Input value={form.title} onChange={set('title')} placeholder='Short action title' />
          </Field>
          <Field label='Issue (evidence)'>
            <Textarea rows={2} value={form.issue} onChange={set('issue')} />
          </Field>
          <Field label='Recommended action'>
            <Textarea rows={2} value={form.recommendedAction} onChange={set('recommendedAction')} />
          </Field>
          <div className='grid gap-3 sm:grid-cols-2'>
            <Field label='Related KPI'>
              <NativeSelect value={form.kpiId} onChange={set('kpiId')}>
                <option value=''>None</option>
                {kpis.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.id} · {k.short}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label='Scope'>
              <NativeSelect value={form.scope} onChange={set('scope')}>
                {scopes.map((s) => (
                  <option key={s} value={s}>
                    {scopeLabel(s)}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label='Owner'>
              <NativeSelect value={form.owner} onChange={set('owner')}>
                {owners.map((o) => (
                  <option key={o.name} value={o.name}>
                    {o.name.replace('Demo ', '')} · {roles.find((r) => r.id === o.role)!.short}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label='Priority'>
              <NativeSelect value={form.priority} onChange={set('priority')}>
                <option value='high'>High</option>
                <option value='medium'>Medium</option>
                <option value='low'>Low</option>
              </NativeSelect>
            </Field>
            <Field label='Due date'>
              <Input type='date' value={form.dueDate} onChange={set('dueDate')} />
            </Field>
          </div>
        </div>
        <DialogFooter className='gap-2'>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!form.title.trim() || !form.recommendedAction.trim()}
            onClick={() => {
              let id = ''
              const ok = runAction(() => {
                id = createAction({
                  title: form.title.trim(),
                  issue: form.issue.trim(),
                  recommendedAction: form.recommendedAction.trim(),
                  origin: draft.origin,
                  kpiId: form.kpiId || undefined,
                  scope: form.scope,
                  ownerName: owner.name,
                  ownerRole: owner.role,
                  ownerOrgId: owner.orgId,
                  priority: form.priority,
                  dueDate: form.dueDate,
                })
              }, 'Management action created')
              if (ok) {
                onOpenChange(false)
                navigate({ to: '/actions/$actionId', params: { actionId: id } })
              }
            }}
          >
            Create action
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
