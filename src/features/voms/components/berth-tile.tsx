import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import type { BerthState } from '../calc'
import { useVoms } from '../store'
import type { Berth, VesselCall } from '../types'

// Dot colour plus a text label, so state never relies on colour alone.
export const berthStateMeta: Record<BerthState, { label: string; dot: string; className: string }> = {
  occupied: { label: 'Occupied', dot: 'bg-[var(--status-critical)]', className: 'border-[var(--status-critical)]/40 bg-[var(--status-critical)]/5' },
  planned: { label: 'Planned', dot: 'bg-[var(--series-1)]', className: 'border-[var(--series-1)]/40 border-dashed' },
  available: { label: 'Available', dot: 'bg-[var(--status-good)]', className: 'border-border' },
  maintenance: { label: 'Restricted', dot: 'bg-[var(--status-warning)]', className: 'border-[var(--status-warning)]/60 bg-[var(--status-warning)]/8' },
}

export function BerthTile({
  berth,
  state,
  occupant,
  compact,
}: {
  berth: Berth
  state: BerthState
  occupant?: VesselCall
  compact?: boolean
}) {
  const vessel = useVoms((s) => s.vessels.find((v) => v.id === occupant?.vesselId))
  const meta = berthStateMeta[state]
  const body = (
    <div className={cn('flex h-full flex-col gap-0.5 rounded-lg border bg-card p-2 text-xs sm:p-2.5', meta.className)}>
      <div className='flex items-center gap-1.5'>
        <span className={cn('size-2.5 shrink-0 rounded-full', meta.dot)} aria-hidden />
        <span className='font-semibold'>{berth.id}</span>
      </div>
      <span className='text-muted-foreground'>{meta.label}</span>
      {!compact && vessel && <span className='truncate font-medium'>{vessel.name.replace(/^(MV|MT) DEMO /, '')}</span>}
    </div>
  )
  if (occupant)
    return (
      <Link to='/vessel-calls/$callId' params={{ callId: occupant.id }} title={vessel?.name} className='block rounded-lg hover:opacity-80'>
        {body}
      </Link>
    )
  return body
}
