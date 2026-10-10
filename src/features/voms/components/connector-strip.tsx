import { Link } from '@tanstack/react-router'
import { PlugZap } from 'lucide-react'
import { fmtRelative } from '../format'
import type { Connector, ConnectorStatus } from '../types'
import { ToneBadge } from './common'
import type { Tone } from '../calc'

export const connTone: Record<ConnectorStatus, Tone> = { healthy: 'good', degraded: 'warning', failed: 'critical' }

/** Compact data-freshness strip: one chip per API connector in scope. */
export function ConnectorStrip({ connectors }: { connectors: Connector[] }) {
  if (!connectors.length) return null
  return (
    <div className='flex flex-wrap items-center gap-2 rounded-lg border bg-card px-3 py-2 text-xs'>
      <span className='flex items-center gap-1 font-medium text-muted-foreground'>
        <PlugZap className='size-3.5' /> Data freshness
      </span>
      {connectors.map((c) => (
        <Link key={c.id} to='/api-monitor' className='flex items-center gap-1.5 rounded-md px-1.5 py-0.5 hover:bg-accent'>
          <ToneBadge tone={connTone[c.status]}>{c.status}</ToneBadge>
          <span>{c.name.replace(' (simulated)', '')}</span>
          <span className='text-muted-foreground'>· {fmtRelative(c.lastSuccess)}</span>
        </Link>
      ))}
    </div>
  )
}
