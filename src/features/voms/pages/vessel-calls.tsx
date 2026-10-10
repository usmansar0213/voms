import { useMemo, useState } from 'react'
import { getRouteApi, Link } from '@tanstack/react-router'
import { Plus, Search as SearchIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageShell } from '@/components/layout/page-shell'
import { callStatus, overallPct, statusMeta } from '../calc'
import { fmtNum, fmtShort } from '../format'
import { useCan, useVoms, visibleCalls } from '../store'
import type { CallStatus, Scenario, VesselCall } from '../types'
import { NewCallDialog } from '../components/dialogs'
import { EmptyState, PageHeader, ProgressBar, StatusBadge } from '../components/common'
import { roleById } from '../roles'

const route = getRouteApi('/_app/vessel-calls/')

const statusFilters: { value: string; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'expected', label: 'Expected' },
  { value: 'arrived', label: 'Anchorage' },
  { value: 'operations', label: 'Operations' },
  { value: 'departed', label: 'Departed' },
  { value: 'pending', label: 'Pending verification' },
  { value: 'closed', label: 'Closed' },
]

export const scenarioLabel: Record<Scenario, string> = {
  container: 'Container',
  bulk: 'Bulk Carrier',
  tanker: 'Fuel / Tanker',
  general: 'General Cargo',
}

function hasPending(c: VesselCall) {
  return (
    !c.closure &&
    (Object.entries(c.events).some(([k, e]) => k !== 'eta' && k !== 'etd' && !e!.verifiedBy) ||
      c.production.some((p) => p.status !== 'verified') ||
      (!!c.finalTally && !c.finalTally.verifiedBy))
  )
}

function keyTime(c: VesselCall) {
  const e = c.events
  return e.atd?.time ?? e.allFast?.time ?? e.ata?.time ?? e.eta?.time ?? ''
}

export function VesselCalls() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const state = useVoms()
  const calls = visibleCalls(state)
  const vessels = state.vessels
  const canCreate = useCan('call.create')
  const [newOpen, setNewOpen] = useState(false)
  const status = search.status ?? 'active'
  const type = (search.type ?? 'all') as Scenario | 'all'
  const q = search.q ?? ''

  const rows = useMemo(() => {
    const vesselOf = (id: string) => vessels.find((v) => v.id === id)!
    return calls
      .filter((c) => {
        const s = callStatus(c)
        if (status === 'active') return !['closed', 'cancelled'].includes(s)
        if (status === 'pending') return hasPending(c)
        if (status === 'operations') return s === 'operations' || s === 'ops_completed' || s === 'at_berth'
        if (status !== 'all') return s === (status as CallStatus)
        return true
      })
      .filter((c) => type === 'all' || c.scenario === type)
      .filter((c) => {
        if (!q) return true
        const v = vesselOf(c.vesselId)
        return [c.id, v.name, v.imo, c.berthId ?? ''].some((x) => x.toLowerCase().includes(q.toLowerCase()))
      })
      .sort((a, b) => statusMeta[callStatus(a)].step - statusMeta[callStatus(b)].step || keyTime(a).localeCompare(keyTime(b)))
      .map((c) => ({ call: c, vessel: vesselOf(c.vesselId) }))
  }, [calls, vessels, status, type, q])

  const setSearch = (patch: Partial<typeof search>) => navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true })

  return (
    <PageShell>
      <PageHeader
        title='Vessel Calls'
        description={
          state.role === 'shipping_agent' || state.role === 'terminal_operator'
            ? `Showing only records visible to ${roleById[state.role].name}.`
            : 'Each vessel call has one Vessel Call ID linking arrival, berth, cargo, incidents and departure.'
        }
        actions={
          canCreate && (
            <Button onClick={() => setNewOpen(true)}>
              <Plus /> New pre-arrival notice
            </Button>
          )
        }
      />

      <div className='grid gap-3'>
        <div className='relative'>
          <SearchIcon className='absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
          <Input
            className='ps-9'
            placeholder='Search by Vessel Call ID, vessel name, IMO or berth'
            value={q}
            onChange={(e) => setSearch({ q: e.target.value || undefined })}
          />
        </div>
        <div className='-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar'>
          {statusFilters.map((f) => (
            <Button
              key={f.value}
              size='sm'
              variant={status === f.value ? 'default' : 'outline'}
              className='shrink-0 rounded-full'
              onClick={() => setSearch({ status: f.value })}
            >
              {f.label}
            </Button>
          ))}
        </div>
        <div className='-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar'>
          {(['all', 'container', 'bulk', 'tanker', 'general'] as const).map((t) => (
            <Button
              key={t}
              size='sm'
              variant={type === t ? 'secondary' : 'ghost'}
              className={cn('shrink-0 rounded-full', type === t && 'ring-1 ring-border')}
              onClick={() => setSearch({ type: t === 'all' ? undefined : t })}
            >
              {t === 'all' ? 'All vessel types' : scenarioLabel[t]}
            </Button>
          ))}
        </div>
      </div>

      <p className='text-sm text-muted-foreground'>{rows.length} vessel call(s)</p>

      {rows.length === 0 && <EmptyState>No vessel calls match the filters.</EmptyState>}

      {/* Phone: cards */}
      <div className='grid gap-3 md:hidden'>
        {rows.map(({ call: c, vessel: v }) => (
          <Link key={c.id} to='/vessel-calls/$callId' params={{ callId: c.id }} className='grid gap-2 rounded-xl border bg-card p-3 shadow-xs active:bg-accent'>
            <div className='flex items-start justify-between gap-2'>
              <div className='min-w-0'>
                <div className='truncate font-semibold'>{v.name}</div>
                <div className='text-xs text-muted-foreground'>
                  {c.id} · {scenarioLabel[c.scenario]}
                </div>
              </div>
              <StatusBadge call={c} />
            </div>
            <div className='grid grid-cols-3 gap-2 text-xs'>
              <div>
                <div className='text-muted-foreground'>ETA / ATA</div>
                <div className='font-medium tabular-nums'>{fmtShort(c.events.ata?.time ?? c.events.eta?.time)}</div>
              </div>
              <div>
                <div className='text-muted-foreground'>Berth</div>
                <div className='font-medium'>{c.berthId ?? `req. ${c.requestedBerthId ?? '—'}`}</div>
              </div>
              <div>
                <div className='text-muted-foreground'>Cargo</div>
                <div className='font-medium tabular-nums'>{fmtNum(overallPct(c))}%</div>
              </div>
            </div>
            {c.events.opsStart && <ProgressBar pct={overallPct(c)} label='Cargo progress' />}
          </Link>
        ))}
      </div>

      {/* Tablet / desktop: table */}
      {rows.length > 0 && (
        <div className='hidden overflow-x-auto rounded-md border md:block'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vessel Call ID</TableHead>
                <TableHead>Vessel</TableHead>
                <TableHead className='hidden lg:table-cell'>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>ETA / ATA</TableHead>
                <TableHead>Berth</TableHead>
                <TableHead className='w-40'>Cargo progress</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ call: c, vessel: v }) => (
                <TableRow key={c.id} className='cursor-pointer' onClick={() => navigate({ to: '/vessel-calls/$callId', params: { callId: c.id } })}>
                  <TableCell className='font-medium'>
                    <Link to='/vessel-calls/$callId' params={{ callId: c.id }} className='hover:underline' onClick={(e) => e.stopPropagation()}>
                      {c.id}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className='font-medium'>{v.name}</div>
                    <div className='text-xs text-muted-foreground'>IMO {v.imo}</div>
                  </TableCell>
                  <TableCell className='hidden lg:table-cell'>{scenarioLabel[c.scenario]}</TableCell>
                  <TableCell>
                    <StatusBadge call={c} />
                  </TableCell>
                  <TableCell className='tabular-nums'>
                    {c.events.ata ? (
                      <>
                        {fmtShort(c.events.ata.time)} <span className='text-xs text-muted-foreground'>ATA</span>
                      </>
                    ) : (
                      <>
                        {fmtShort(c.events.eta?.time)} <span className='text-xs text-muted-foreground'>ETA</span>
                      </>
                    )}
                  </TableCell>
                  <TableCell>{c.berthId ?? <span className='text-muted-foreground'>req. {c.requestedBerthId ?? '—'}</span>}</TableCell>
                  <TableCell>
                    {c.events.opsStart ? (
                      <div className='grid gap-1'>
                        <span className='text-xs tabular-nums'>{fmtNum(overallPct(c))}%</span>
                        <ProgressBar pct={overallPct(c)} label='Cargo progress' />
                      </div>
                    ) : (
                      <span className='text-xs text-muted-foreground'>Not started</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {newOpen && <NewCallDialog open={newOpen} onOpenChange={setNewOpen} />}
    </PageShell>
  )
}
