import { useState } from 'react'
import { RadioTower, ServerCog, Unplug } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageShell } from '@/components/layout/page-shell'
import { callStatus } from '../calc'
import { fmtNum, fmtShort } from '../format'
import { can, roleById } from '../roles'
import { useVoms } from '../store'
import { NativeSelect } from '../components/dialogs'
import { EmptyState, PageHeader, runAction, ToneBadge } from '../components/common'

export function Integrations() {
  const state = useVoms()
  const { calls, vessels, feeds, feedLog, role, setFeed, ingestAis, ingestTos } = state
  const allowed = can(role, 'feed.simulate')
  const vesselOf = (id: string) => vessels.find((v) => v.id === id)!
  const expected = calls.filter((c) => callStatus(c) === 'expected')
  const working = calls.filter((c) => callStatus(c) === 'operations')
  const [aisCall, setAisCall] = useState(expected[0]?.id ?? '')
  const [tosCall, setTosCall] = useState(working[0]?.id ?? '')

  // Reconciliation view: manual vs TOS-sourced totals per active call (never merged silently).
  const recon = calls
    .filter((c) => c.production.length && !c.closure)
    .map((c) => {
      const sum = (src: string) => c.production.filter((p) => p.source === src).reduce((a, p) => a + p.qty, 0)
      return { c, manual: sum('manual'), tos: sum('tos_sim'), pending: c.production.filter((p) => p.status !== 'verified').length, unit: c.cargo[0]?.unit }
    })

  return (
    <PageShell>
      <PageHeader
        title='Integration Simulator'
        description='Demonstrates how AIS and Terminal Operating System (TOS) data would flow into VOMS. No live integration exists — every message here is simulated.'
      />
      {!allowed && (
        <div className='rounded-md border border-dashed p-3 text-sm text-muted-foreground'>
          Viewing as {roleById[role].name}. Switch to System Administrator or Port Control Operator to run the simulator.
        </div>
      )}

      <div className='grid gap-4 lg:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <RadioTower className='size-5' /> AIS feed (simulated)
            </CardTitle>
            <CardDescription>Proposes ATA when a vessel enters port limits. Port Control must verify.</CardDescription>
            <CardAction className='flex items-center gap-2 text-sm'>
              <span className='text-muted-foreground'>{feeds.ais ? 'Online' : 'Offline'}</span>
              <Switch checked={feeds.ais} disabled={!allowed} onCheckedChange={(v) => runAction(() => setFeed('ais', v))} aria-label='AIS feed online' />
            </CardAction>
          </CardHeader>
          <CardContent className='grid gap-3'>
            {expected.length === 0 ? (
              <EmptyState>No expected vessels to detect.</EmptyState>
            ) : (
              <>
                <NativeSelect value={aisCall} onChange={(e) => setAisCall(e.target.value)} aria-label='Expected vessel call'>
                  {expected.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.id} · {vesselOf(c.vesselId).name} · ETA {fmtShort(c.events.eta?.time)}
                    </option>
                  ))}
                </NativeSelect>
                <Button className='w-fit' disabled={!allowed || !aisCall} onClick={() => runAction(() => ingestAis(aisCall), 'AIS arrival received — pending verification')}>
                  Simulate arrival detection
                </Button>
              </>
            )}
            {!feeds.ais && (
              <p className='flex items-center gap-2 text-xs text-[var(--status-warning-ink)]'>
                <Unplug className='size-4' /> Manual fallback: ATA is entered by Port Control and flagged for later reconciliation.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <ServerCog className='size-5' /> TOS feed (simulated)
            </CardTitle>
            <CardDescription>Sends production batches for vessels in cargo operations. SBMA verifies before use in final figures.</CardDescription>
            <CardAction className='flex items-center gap-2 text-sm'>
              <span className='text-muted-foreground'>{feeds.tos ? 'Online' : 'Offline'}</span>
              <Switch checked={feeds.tos} disabled={!allowed} onCheckedChange={(v) => runAction(() => setFeed('tos', v))} aria-label='TOS feed online' />
            </CardAction>
          </CardHeader>
          <CardContent className='grid gap-3'>
            {working.length === 0 ? (
              <EmptyState>No vessels in cargo operations.</EmptyState>
            ) : (
              <>
                <NativeSelect value={tosCall} onChange={(e) => setTosCall(e.target.value)} aria-label='Vessel call in operations'>
                  {working.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.id} · {vesselOf(c.vesselId).name}
                    </option>
                  ))}
                </NativeSelect>
                <Button className='w-fit' disabled={!allowed || !tosCall} onClick={() => runAction(() => ingestTos(tosCall), 'TOS production batch received')}>
                  Send production batch
                </Button>
              </>
            )}
            {!feeds.tos && (
              <p className='flex items-center gap-2 text-xs text-[var(--status-warning-ink)]'>
                <Unplug className='size-4' /> Manual fallback: the terminal operator reports production directly in VOMS.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Source reconciliation</CardTitle>
          <CardDescription>Production by source for open vessel calls. Values from different sources are shown side by side, never overwritten.</CardDescription>
        </CardHeader>
        <CardContent>
          {recon.length === 0 ? (
            <EmptyState>No production data on open calls.</EmptyState>
          ) : (
            <div className='overflow-x-auto rounded-md border'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vessel Call</TableHead>
                    <TableHead className='text-end'>Manual entry</TableHead>
                    <TableHead className='text-end'>TOS (simulated)</TableHead>
                    <TableHead className='text-end'>Pending verification</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recon.map((r) => (
                    <TableRow key={r.c.id}>
                      <TableCell>
                        <div className='font-medium'>{r.c.id}</div>
                        <div className='text-xs text-muted-foreground'>{vesselOf(r.c.vesselId).name}</div>
                      </TableCell>
                      <TableCell className='text-end tabular-nums'>
                        {fmtNum(r.manual)} {r.unit}
                      </TableCell>
                      <TableCell className='text-end tabular-nums'>
                        {fmtNum(r.tos)} {r.unit}
                      </TableCell>
                      <TableCell className='text-end tabular-nums'>{r.pending}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Message log</CardTitle>
          <CardDescription>Most recent simulated interface messages in this session.</CardDescription>
        </CardHeader>
        <CardContent>
          {feedLog.length === 0 ? (
            <EmptyState>No messages yet. Run a simulation above.</EmptyState>
          ) : (
            <ul className='grid gap-2'>
              {feedLog.map((m) => (
                <li key={m.id} className='flex flex-wrap items-center gap-2 rounded-md border p-2 text-sm'>
                  <span className='w-24 text-xs tabular-nums text-muted-foreground'>{fmtShort(m.time)}</span>
                  <ToneBadge tone='info' icon={false}>
                    {m.feed}
                  </ToneBadge>
                  <span className='font-medium'>{m.callId}</span>
                  <span className='min-w-0 flex-1'>{m.text}</span>
                  <ToneBadge tone={m.outcome === 'accepted_pending' ? 'good' : m.outcome === 'queued' ? 'warning' : 'serious'}>
                    {m.outcome === 'accepted_pending' ? 'Accepted · pending verification' : m.outcome === 'queued' ? 'Queued' : 'Rejected'}
                  </ToneBadge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </PageShell>
  )
}
