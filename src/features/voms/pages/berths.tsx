import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Construction } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PageShell } from '@/components/layout/page-shell'
import { berthNextPlanned, berthOccupant, berthState, callStatus, lineProgress, type BerthState } from '../calc'
import { fmtDateTime, fmtNum, fmtRelative, fmtShort } from '../format'
import { can } from '../roles'
import { useVoms, visibleCalls, useActor } from '../store'
import type { VesselCall } from '../types'
import { berthStateMeta } from '../components/berth-tile'
import { AssignBerthDialog } from '../components/dialogs'
import { EmptyState, PageHeader, ProgressBar, StatusBadge } from '../components/common'
import { scenarioLabel } from './vessel-calls'

export function Berths() {
  const state = useVoms()
  const { berths, vessels } = state
  const actor = useActor()
  const calls = visibleCalls(state)
  const [assign, setAssign] = useState<VesselCall | null>(null)
  const [filter, setFilter] = useState<BerthState | 'all'>('all')
  const waiting = calls.filter((c) => !c.berthId && ['expected', 'arrived'].includes(callStatus(c)))
  const vesselOf = (id: string) => vessels.find((v) => v.id === id)!
  const counts = berths.reduce<Record<string, number>>((m, b) => {
    const s = berthState(b, calls)
    m[s] = (m[s] ?? 0) + 1
    return m
  }, {})

  return (
    <PageShell>
      <PageHeader
        title='Berth Board'
        description='Initial scope of 15 piers and wharves. Names, count and limits are placeholders until validated against the official SBMA facility register.'
      />

      <div className='-mx-4 flex gap-2 overflow-x-auto px-4 no-scrollbar'>
        {(['all', 'occupied', 'planned', 'available', 'maintenance'] as const).map((s) => (
          <Button key={s} size='sm' variant={filter === s ? 'default' : 'outline'} className='shrink-0 rounded-full' onClick={() => setFilter(s)}>
            {s === 'all' ? `All (${berths.length})` : `${berthStateMeta[s].label} (${counts[s] ?? 0})`}
          </Button>
        ))}
      </div>

      {waiting.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Awaiting berth assignment</CardTitle>
            <CardDescription>Vessel calls without an assigned berth.</CardDescription>
          </CardHeader>
          <CardContent className='grid gap-2'>
            {waiting.map((c) => (
              <div key={c.id} className='flex flex-wrap items-center justify-between gap-2 rounded-md border p-2 text-sm'>
                <div className='min-w-0'>
                  <Link to='/vessel-calls/$callId' params={{ callId: c.id }} className='font-medium hover:underline'>
                    {vesselOf(c.vesselId).name}
                  </Link>
                  <div className='text-xs text-muted-foreground'>
                    {c.id} · {scenarioLabel[c.scenario]} · requested {c.requestedBerthId ?? '—'} ·{' '}
                    {c.events.ata ? `at anchorage since ${fmtShort(c.events.ata.time)}` : `ETA ${fmtRelative(c.events.eta?.time)}`}
                  </div>
                </div>
                <div className='flex items-center gap-2'>
                  <StatusBadge call={c} />
                  {can(actor, 'berth.assign') && (
                    <Button size='sm' onClick={() => setAssign(c)}>
                      Assign
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-3'>
        {berths
          .filter((b) => filter === 'all' || berthState(b, calls) === filter)
          .map((b) => {
            const st = berthState(b, calls)
            const occ = berthOccupant(b.id, calls)
            const next = berthNextPlanned(b.id, calls)
            const v = occ && vesselOf(occ.vesselId)
            return (
              <Card key={b.id} className={cn('gap-3 border-2 py-4', berthStateMeta[st].className)}>
                <CardHeader className='px-4'>
                  <CardTitle className='flex items-center justify-between'>
                    <span>{b.name}</span>
                    <span className='flex items-center gap-1.5 text-xs font-normal text-muted-foreground'>
                      <span className={cn('size-2.5 rounded-full', berthStateMeta[st].dot)} aria-hidden />
                      {berthStateMeta[st].label}
                    </span>
                  </CardTitle>
                  <CardDescription>
                    Max LOA {b.maxLoa} m · max draft {b.maxDraft} m · {b.accepts.map((a) => scenarioLabel[a]).join(', ')}
                  </CardDescription>
                </CardHeader>
                <CardContent className='grid gap-2 px-4 text-sm'>
                  {st === 'maintenance' && b.maintenance && (
                    <div className='flex items-start gap-2'>
                      <Construction className='mt-0.5 size-4 shrink-0' />
                      <span>
                        {b.maintenance.reason} — until {fmtDateTime(b.maintenance.until)}
                      </span>
                    </div>
                  )}
                  {occ && v ? (
                    <Link to='/vessel-calls/$callId' params={{ callId: occ.id }} className='grid gap-1.5 rounded-md bg-background/60 p-2 hover:bg-background'>
                      <div className='flex items-center justify-between gap-2'>
                        <span className='truncate font-medium'>{v.name}</span>
                        <StatusBadge call={occ} />
                      </div>
                      <span className='text-xs text-muted-foreground'>
                        {occ.id} · All Fast {fmtShort(occ.events.allFast?.time)} · ETD {fmtShort(occ.events.etd?.time)}
                      </span>
                      {occ.cargo.map((l) => {
                        const p = lineProgress(occ, l.id)
                        return (
                          <div key={l.id} className='grid gap-0.5'>
                            <span className='text-xs'>
                              {l.commodity} {l.direction} · {fmtNum(p.pct)}%
                            </span>
                            <ProgressBar pct={p.pct} label={`${l.commodity} progress`} />
                          </div>
                        )
                      })}
                    </Link>
                  ) : (
                    st !== 'maintenance' && <span className='text-muted-foreground'>No vessel alongside.</span>
                  )}
                  {next && (
                    <div className='text-xs text-muted-foreground'>
                      Next: <span className='font-medium text-foreground'>{vesselOf(next.vesselId).name}</span> · ETA {fmtShort(next.events.eta?.time)}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
      </div>
      {berths.filter((b) => filter === 'all' || berthState(b, calls) === filter).length === 0 && <EmptyState>No berths in this state.</EmptyState>}
      {assign && <AssignBerthDialog call={assign} open onOpenChange={() => setAssign(null)} />}
    </PageShell>
  )
}
