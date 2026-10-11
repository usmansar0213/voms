import { useMemo, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { AlarmClock, CheckCheck, ClipboardList, Columns3, List, ListTodo, Plus, TrendingUp, UserCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageShell } from '@/components/layout/page-shell'
import { CreateActionDialog } from '../../components/create-action-dialog'
import { EmptyState, PageHeader, StatTile } from '../../components/common'
import { NativeSelect } from '../../components/dialogs'
import { sessionScopes } from '../../components/portix-ui'
import { scopeLabel, type Scope } from '../../kpi'
import { can } from '../../roles'
import { useActor, useVoms, visibleActions } from '../../store'
import type { ActionPriority, ActionStatus, ManagementAction } from '../../types'
import { ActionStatusBadge, DueDate, isOverdue, OPEN_STATUSES, OriginTag, PriorityBadge, priorityRank, statusMeta, todayStr } from './action-ui'

type StatusFilter = 'all' | 'open' | 'overdue' | 'improved' | ActionStatus

const statusChips: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Open' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'proposed', label: 'Proposed' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'blocked', label: 'Blocked' },
  { id: 'done', label: 'Done' },
  { id: 'closed', label: 'Closed' },
  { id: 'cancelled', label: 'Cancelled' },
]

const boardColumns: { status: ActionStatus; label: string }[] = [
  { status: 'proposed', label: 'Proposed' },
  { status: 'in_progress', label: 'In progress' },
  { status: 'blocked', label: 'Blocked' },
  { status: 'done', label: 'Done (awaiting review)' },
  { status: 'closed', label: 'Closed' },
]

const matchesStatus = (a: ManagementAction, f: StatusFilter, today: string) => {
  if (f === 'all') return true
  if (f === 'open') return OPEN_STATUSES.includes(a.status)
  if (f === 'overdue') return isOverdue(a, today)
  if (f === 'improved') return a.status === 'closed' && a.outcome?.assessment === 'improved'
  return a.status === f
}

const sortActions = (list: ManagementAction[]) =>
  [...list].sort((a, b) => Number(isOverdue(b)) - Number(isOverdue(a)) || priorityRank[a.priority] - priorityRank[b.priority] || a.dueDate.localeCompare(b.dueDate))

export function ManagementActions() {
  const session = useVoms((s) => s.session)
  const allActions = useVoms((s) => s.actions)
  const actor = useActor()
  const navigate = useNavigate()
  const actions = useMemo(() => visibleActions({ session, actions: allActions }), [session, allActions])
  const scopes = sessionScopes(session)
  const today = todayStr()

  const [view, setView] = useState<'board' | 'list'>('board')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [priority, setPriority] = useState<ActionPriority | 'all'>('all')
  const [scope, setScope] = useState<Scope | 'all'>('all')
  const [mine, setMine] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)

  const counts = {
    open: actions.filter((a) => OPEN_STATUSES.includes(a.status)).length,
    overdue: actions.filter((a) => isOverdue(a, today)).length,
    review: actions.filter((a) => a.status === 'done').length,
    improved: actions.filter((a) => a.status === 'closed' && a.outcome?.assessment === 'improved').length,
  }

  const filtered = sortActions(
    actions.filter(
      (a) =>
        matchesStatus(a, status, today) &&
        (priority === 'all' || a.priority === priority) &&
        (scope === 'all' || a.scope === scope) &&
        (!mine || a.ownerName === session?.name)
    )
  )

  const open = (id: string) => navigate({ to: '/actions/$actionId', params: { actionId: id } })
  const toggleTile = (f: StatusFilter) => setStatus((s) => (s === f ? 'all' : f))

  return (
    <PageShell>
      <PageHeader
        title='Management Actions'
        description='Decisions turned into owned, measurable actions: issue → action → owner → due date → follow-up → outcome against the KPI baseline.'
        actions={
          can(actor, 'action.create') && (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus /> New action
            </Button>
          )
        }
      />

      <div className='grid grid-cols-2 gap-3 lg:grid-cols-4'>
        <StatTile label='Open' value={counts.open} hint='Proposed, in progress or blocked' icon={ListTodo} tone='blue' onClick={() => toggleTile('open')} />
        <StatTile label='Overdue' value={counts.overdue} hint='Past due date, still open' icon={AlarmClock} tone='red' onClick={() => toggleTile('overdue')} />
        <StatTile label='Awaiting outcome review' value={counts.review} hint='Done, not yet assessed' icon={ClipboardList} tone='amber' onClick={() => toggleTile('done')} />
        <StatTile label='Closed with improvement' value={counts.improved} hint='KPI outcome improved' icon={TrendingUp} tone='green' onClick={() => toggleTile('improved')} />
      </div>

      <div className='grid gap-3'>
        <div className='flex flex-wrap items-center gap-2'>
          <div role='group' aria-label='View' className='inline-flex rounded-md border bg-card p-0.5'>
            <Button size='sm' variant={view === 'board' ? 'default' : 'ghost'} aria-pressed={view === 'board'} onClick={() => setView('board')}>
              <Columns3 /> Board
            </Button>
            <Button size='sm' variant={view === 'list' ? 'default' : 'ghost'} aria-pressed={view === 'list'} onClick={() => setView('list')}>
              <List /> List
            </Button>
          </div>
          <label className='min-w-0'>
            <span className='sr-only'>Priority</span>
            <NativeSelect value={priority} onChange={(e) => setPriority(e.target.value as ActionPriority | 'all')} className='h-9 w-auto bg-card'>
              <option value='all'>All priorities</option>
              <option value='high'>High priority</option>
              <option value='medium'>Medium priority</option>
              <option value='low'>Low priority</option>
            </NativeSelect>
          </label>
          {scopes.length > 1 && (
            <label className='min-w-0'>
              <span className='sr-only'>Scope</span>
              <NativeSelect value={scope} onChange={(e) => setScope(e.target.value as Scope | 'all')} className='h-9 w-auto bg-card'>
                <option value='all'>All scopes</option>
                {scopes.map((s) => (
                  <option key={s} value={s}>
                    {scopeLabel(s)}
                  </option>
                ))}
              </NativeSelect>
            </label>
          )}
          <Button size='sm' variant={mine ? 'default' : 'outline'} aria-pressed={mine} className='h-9' onClick={() => setMine((m) => !m)}>
            <UserCheck /> My actions
          </Button>
        </div>
        <div className='-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar sm:mx-0 sm:flex-wrap sm:px-0'>
          {statusChips.map((c) => (
            <Button
              key={c.id}
              size='sm'
              variant={status === c.id ? 'default' : 'outline'}
              aria-pressed={status === c.id}
              className='shrink-0 rounded-full'
              onClick={() => setStatus(c.id)}
            >
              {c.label}
            </Button>
          ))}
          {status === 'improved' && (
            <Button size='sm' variant='default' aria-pressed className='shrink-0 rounded-full' onClick={() => setStatus('all')}>
              <CheckCheck /> Closed · improved
            </Button>
          )}
        </div>
        <p className='text-sm text-muted-foreground' aria-live='polite'>
          {filtered.length} of {actions.length} actions shown
        </p>
      </div>

      {actions.length === 0 ? (
        <EmptyState>No management actions in your scope yet.</EmptyState>
      ) : view === 'board' ? (
        <Board actions={filtered} />
      ) : filtered.length === 0 ? (
        <EmptyState>No actions match the current filters.</EmptyState>
      ) : (
        <>
          <div className='hidden md:block'>
            <Card className='py-0'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className='ps-4'>Action</TableHead>
                    <TableHead>Scope / KPI</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead className='pe-4'>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((a) => (
                    <TableRow key={a.id} className='cursor-pointer' onClick={() => open(a.id)}>
                      <TableCell className='max-w-[22rem] ps-4 whitespace-normal'>
                        <Link to='/actions/$actionId' params={{ actionId: a.id }} className='font-medium hover:underline' onClick={(e) => e.stopPropagation()}>
                          {a.title}
                        </Link>
                        <div className='mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground'>
                          <span className='tabular-nums'>{a.id}</span>
                          <OriginTag origin={a.origin} />
                        </div>
                      </TableCell>
                      <TableCell>
                        {scopeLabel(a.scope as Scope)}
                        {a.kpiId && <div className='text-xs text-muted-foreground'>{a.kpiId}</div>}
                      </TableCell>
                      <TableCell className='max-w-[14rem] whitespace-normal'>{a.ownerName}</TableCell>
                      <TableCell>
                        <PriorityBadge priority={a.priority} />
                      </TableCell>
                      <TableCell>
                        <DueDate action={a} />
                      </TableCell>
                      <TableCell className='pe-4'>
                        <ActionStatusBadge status={a.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
          <div className='grid gap-3 md:hidden'>
            {filtered.map((a) => (
              <ActionCard key={a.id} action={a} />
            ))}
          </div>
        </>
      )}

      {createOpen && <CreateActionDialog open onOpenChange={setCreateOpen} draft={{ origin: { type: 'manual' } }} />}
    </PageShell>
  )
}

function Board({ actions }: { actions: ManagementAction[] }) {
  const cancelled = actions.filter((a) => a.status === 'cancelled').length
  return (
    <div className='grid gap-2'>
      <div className='-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0'>
        <div className='flex gap-3 xl:grid xl:grid-cols-5'>
          {boardColumns.map((col) => {
            const items = actions.filter((a) => a.status === col.status)
            return (
              <section key={col.status} aria-label={col.label} className='flex w-[16rem] min-w-[16rem] shrink-0 flex-col gap-2 rounded-xl bg-muted/50 p-2 xl:w-auto xl:min-w-0'>
                <h2 className='flex items-center justify-between gap-2 px-1 pt-1 text-sm font-semibold'>
                  <span className='truncate'>{col.label}</span>
                  <span className='rounded-full bg-background px-2 text-xs font-medium tabular-nums text-muted-foreground'>{items.length}</span>
                </h2>
                {items.length === 0 ? (
                  <p className='rounded-lg border border-dashed px-3 py-4 text-center text-xs text-muted-foreground'>No actions</p>
                ) : (
                  items.map((a) => <ActionCard key={a.id} action={a} />)
                )}
              </section>
            )
          })}
        </div>
      </div>
      {cancelled > 0 && <p className='text-xs text-muted-foreground'>{cancelled} cancelled action(s) hidden from the board — use the List view or the Cancelled filter.</p>}
    </div>
  )
}

function ActionCard({ action: a, showStatus = true }: { action: ManagementAction; showStatus?: boolean }) {
  const overdue = isOverdue(a)
  return (
    <Link
      to='/actions/$actionId'
      params={{ actionId: a.id }}
      className={cn(
        'grid min-w-0 gap-2 rounded-lg border bg-card p-3 text-sm shadow-xs transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none',
        overdue && 'border-[var(--status-critical)]/50'
      )}
      aria-label={`${a.id}: ${a.title} — ${statusMeta[a.status].label}${overdue ? ', overdue' : ''}`}
    >
      <div className='flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground'>
        <span className='tabular-nums'>{a.id}</span>
        <OriginTag origin={a.origin} />
      </div>
      <div className='font-medium break-words'>{a.title}</div>
      <div className='flex flex-wrap gap-x-2 text-xs text-muted-foreground'>
        <span>{scopeLabel(a.scope as Scope)}</span>
        {a.kpiId && <span>· {a.kpiId}</span>}
      </div>
      <div className='truncate text-xs'>
        <span className='text-muted-foreground'>Owner: </span>
        {a.ownerName}
      </div>
      <div className='flex flex-wrap items-center gap-1.5'>
        <PriorityBadge priority={a.priority} />
        {showStatus && <ActionStatusBadge status={a.status} />}
      </div>
      <DueDate action={a} className='text-xs' />
    </Link>
  )
}
