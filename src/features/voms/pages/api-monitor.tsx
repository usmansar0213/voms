import { useState } from 'react'
import { PlugZap, RadioTower, RefreshCw, ServerCog, Wrench, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PageShell } from '@/components/layout/page-shell'
import { callStatus } from '../calc'
import { fmtRelative, fmtShort } from '../format'
import { unitById } from '../org'
import { can, roleById } from '../roles'
import { useActor, useVoms, visibleCalls, visibleConnectors } from '../store'
import type { Connector } from '../types'
import { connTone } from '../components/connector-strip'
import { NativeSelect } from '../components/dialogs'
import { EmptyState, PageHeader, runAction, ToneBadge } from '../components/common'

function ConnectorCard({ c }: { c: Connector }) {
  const actor = useActor()
  const { simulateFailure, retryConnector, resolveMapping } = useVoms()
  const Icon = c.system === 'AIS/VTMS' ? RadioTower : ServerCog
  const ownUnit = useVoms((s) => s.session?.scopeUnitIds.includes(c.unitId) || s.role === 'admin')
  return (
    <Card className='gap-4'>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <Icon className='size-5' /> {c.name}
        </CardTitle>
        <CardDescription>
          {unitById[c.unitId]?.name} · {c.system}
        </CardDescription>
        <CardAction>
          <ToneBadge tone={connTone[c.status]} className='capitalize'>
            {c.status}
          </ToneBadge>
        </CardAction>
      </CardHeader>
      <CardContent className='grid gap-3 text-sm'>
        <dl className='grid grid-cols-2 gap-2 sm:grid-cols-4'>
          <div>
            <dt className='text-xs text-muted-foreground'>Last success</dt>
            <dd className='font-medium'>{fmtRelative(c.lastSuccess)}</dd>
          </div>
          <div>
            <dt className='text-xs text-muted-foreground'>Deliveries 24 h</dt>
            <dd className='font-medium tabular-nums'>
              {c.success24h} ok · {c.failure24h} failed
            </dd>
          </div>
          <div>
            <dt className='text-xs text-muted-foreground'>Retry queue</dt>
            <dd className='font-medium tabular-nums'>{c.retryQueue}</dd>
          </div>
          <div>
            <dt className='text-xs text-muted-foreground'>Mapping errors</dt>
            <dd className='font-medium tabular-nums'>{c.mappingErrors.length}</dd>
          </div>
        </dl>
        {c.mappingErrors.length > 0 && (
          <ul className='grid gap-1 rounded-md border border-[var(--status-warning)]/50 bg-[var(--status-warning)]/10 p-2 text-xs'>
            {c.mappingErrors.map((m, i) => (
              <li key={i}>
                <span className='font-medium'>{m.field}</span>: {m.message} <span className='text-muted-foreground'>· {fmtShort(m.time)}</span>
              </li>
            ))}
          </ul>
        )}
        <details className='rounded-md border p-2'>
          <summary className='cursor-pointer text-xs font-medium'>Connector log ({c.log.length})</summary>
          <ul className='mt-2 grid gap-1 text-xs'>
            {c.log.map((l, i) => (
              <li key={i} className='flex gap-2'>
                <span className='w-20 shrink-0 tabular-nums text-muted-foreground'>{fmtShort(l.time)}</span>
                <span className={l.level === 'error' ? 'text-[var(--status-critical-ink)]' : l.level === 'warn' ? 'text-[var(--status-warning-ink)]' : ''}>{l.message}</span>
              </li>
            ))}
          </ul>
        </details>
        <div className='flex flex-wrap gap-2'>
          {can(actor, 'connector.operate') && ownUnit && c.status !== 'healthy' && (
            <Button size='sm' onClick={() => runAction(() => retryConnector(c.id), 'Retry succeeded — data fresh')}>
              <RefreshCw /> Retry now
            </Button>
          )}
          {can(actor, 'masterdata.edit') && c.mappingErrors.length > 0 && (
            <Button size='sm' variant='outline' onClick={() => runAction(() => resolveMapping(c.id), 'Mapping updated — held records released')}>
              <Wrench /> Update mapping table
            </Button>
          )}
          {can(actor, 'connector.simulate') && c.status !== 'failed' && (
            <Button size='sm' variant='ghost' onClick={() => runAction(() => simulateFailure(c.id), 'Simulated transmission failure')}>
              <Zap /> Simulate failure
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function ApiMonitor() {
  const state = useVoms()
  const actor = useActor()
  const conns = visibleConnectors(state)
  const calls = visibleCalls(state)
  const vesselOf = (id: string) => state.vessels.find((v) => v.id === id)!
  const expected = calls.filter((c) => callStatus(c) === 'expected')
  const working = calls.filter((c) => callStatus(c) === 'operations')
  const [aisCall, setAisCall] = useState(expected[0]?.id ?? '')
  const [tosCall, setTosCall] = useState(working[0]?.id ?? '')
  const simulate = can(actor, 'connector.simulate')

  return (
    <PageShell>
      <PageHeader
        title='API Integration Monitor'
        description='Delivery success and failure, retries, mapping errors and data freshness for connectors in your scope. All connectors are simulated — no live external connectivity.'
      />
      {conns.length === 0 ? (
        <EmptyState>
          <PlugZap className='mx-auto mb-2 size-5' />
          No API connectors in your scope ({roleById[actor.role].name}).
        </EmptyState>
      ) : (
        <div className='grid gap-4 lg:grid-cols-2'>
          {conns.map((c) => (
            <ConnectorCard key={c.id} c={c} />
          ))}
        </div>
      )}

      {simulate && (
        <Card>
          <CardHeader>
            <CardTitle>Message simulator</CardTitle>
            <CardDescription>Send a simulated AIS arrival or TOS production batch. Incoming data is tagged with its source and still needs verification.</CardDescription>
          </CardHeader>
          <CardContent className='grid gap-4 md:grid-cols-2'>
            <div className='grid gap-2'>
              <div className='text-sm font-medium'>AIS arrival detection</div>
              {expected.length ? (
                <>
                  <NativeSelect value={aisCall} onChange={(e) => setAisCall(e.target.value)} aria-label='Expected vessel call'>
                    {expected.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.id} · {vesselOf(c.vesselId).name}
                      </option>
                    ))}
                  </NativeSelect>
                  <Button size='sm' className='w-fit' onClick={() => runAction(() => state.ingestAis(aisCall), 'ATA proposed by AIS — pending verification')}>
                    Send AIS message
                  </Button>
                </>
              ) : (
                <EmptyState>No expected vessels.</EmptyState>
              )}
            </div>
            <div className='grid gap-2'>
              <div className='text-sm font-medium'>TOS production batch</div>
              {working.length ? (
                <>
                  <NativeSelect value={tosCall} onChange={(e) => setTosCall(e.target.value)} aria-label='Vessel call in operations'>
                    {working.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.id} · {vesselOf(c.vesselId).name}
                      </option>
                    ))}
                  </NativeSelect>
                  <Button size='sm' className='w-fit' onClick={() => runAction(() => state.ingestTos(tosCall), 'Production batch received')}>
                    Send TOS batch
                  </Button>
                </>
              ) : (
                <EmptyState>No vessels in cargo operations.</EmptyState>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </PageShell>
  )
}
