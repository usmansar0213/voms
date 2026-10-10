import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { PageShell } from '@/components/layout/page-shell'
import { fmtDateTime } from '../format'
import { can, roleById } from '../roles'
import { useVoms, visibleCalls, useActor } from '../store'
import type { Incident } from '../types'
import { IncidentDialog } from '../components/dialogs'
import { EmptyState, PageHeader, runAction, SeverityBadge, ToneBadge } from '../components/common'

const typeLabel: Record<Incident['type'], string> = {
  safety: 'Safety',
  security: 'Security',
  environmental: 'Environmental',
  dangerous_cargo: 'Dangerous cargo',
}

export function Incidents() {
  const state = useVoms()
  const { role, toggleIncidentAction, setIncidentStatus } = state
  const actor = useActor()
  const visible = new Set(visibleCalls(state).map((c) => c.id))
  const list = state.incidents.filter((i) => visible.has(i.callId))
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState<'active' | 'closed' | 'all'>('active')
  const shown = list.filter((i) => (filter === 'all' ? true : filter === 'closed' ? i.status === 'closed' : i.status !== 'closed'))
  // Restricted detail: shipping agents see status only (BRD 18.6).
  const restricted = role === 'shipping_agent' || role === 'management'

  return (
    <PageShell>
      <PageHeader
        title='Safety, Security & Environmental'
        description='Incidents linked to vessel calls. VOMS records and monitors; it does not replace specialist assessment or official notification.'
        actions={
          can(actor, 'incident.report') && (
            <Button onClick={() => setOpen(true)}>
              <ShieldAlert /> Report incident
            </Button>
          )
        }
      />
      <div className='flex gap-2'>
        {(['active', 'closed', 'all'] as const).map((f) => (
          <Button key={f} size='sm' variant={filter === f ? 'default' : 'outline'} className='rounded-full capitalize' onClick={() => setFilter(f)}>
            {f}
          </Button>
        ))}
      </div>
      {shown.length === 0 && <EmptyState>No incidents.</EmptyState>}
      <div className='grid gap-3 lg:grid-cols-2'>
        {shown.map((i) => (
          <Card key={i.id} className='gap-3 py-4'>
            <CardHeader className='px-4'>
              <div className='flex flex-wrap items-center gap-2'>
                <SeverityBadge severity={i.severity} />
                <ToneBadge tone='neutral' icon={false}>
                  {typeLabel[i.type]}
                </ToneBadge>
                <ToneBadge tone={i.status === 'closed' ? 'good' : i.status === 'under_review' ? 'info' : 'warning'} className='ms-auto capitalize'>
                  {i.status.replace('_', ' ')}
                </ToneBadge>
              </div>
              <CardTitle className='mt-1'>{i.title}</CardTitle>
              <CardDescription>
                {i.id} ·{' '}
                <Link to='/vessel-calls/$callId' params={{ callId: i.callId }} className='underline'>
                  {i.callId}
                </Link>{' '}
                · {fmtDateTime(i.time)} · reported by {roleById[i.reportedBy].short}
              </CardDescription>
            </CardHeader>
            <CardContent className='grid gap-3 px-4 text-sm'>
              {restricted ? (
                <p className='text-muted-foreground italic'>Incident details are restricted for this role. Status is shown for awareness only.</p>
              ) : (
                <>
                  <p>{i.description}</p>
                  <div>
                    <div className='mb-1 text-xs font-medium text-muted-foreground'>Corrective actions</div>
                    <ul className='grid gap-1.5'>
                      {i.actions.map((a) => (
                        <li key={a.id} className='flex items-center gap-2'>
                          <Checkbox
                            checked={a.done}
                            disabled={i.status === 'closed' || !can(actor, 'incident.report')}
                            onCheckedChange={() => runAction(() => toggleIncidentAction(i.id, a.id))}
                            aria-label={a.text}
                          />
                          <span className={a.done ? 'text-muted-foreground line-through' : ''}>{a.text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  {i.status === 'closed' ? (
                    <p className='text-xs text-muted-foreground'>
                      Closed {fmtDateTime(i.closedAt)} by {i.closedBy && roleById[i.closedBy].name}
                    </p>
                  ) : (
                    <div className='flex flex-wrap gap-2'>
                      {i.status === 'open' && can(actor, 'incident.report') && (
                        <Button size='sm' variant='outline' onClick={() => runAction(() => setIncidentStatus(i.id, 'under_review'), 'Marked under review')}>
                          Mark under review
                        </Button>
                      )}
                      {can(actor, 'incident.close') && (
                        <Button size='sm' onClick={() => runAction(() => setIncidentStatus(i.id, 'closed'), `${i.id} closed`)}>
                          Close incident
                        </Button>
                      )}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      {open && <IncidentDialog open onOpenChange={setOpen} />}
    </PageShell>
  )
}
