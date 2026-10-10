import { Link } from '@tanstack/react-router'
import { Construction, Ship } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BerthState } from '../calc'
import { useVoms } from '../store'
import type { Berth, VesselCall } from '../types'

export const berthStateMeta: Record<BerthState, { label: string; className: string }> = {
  occupied: { label: 'Occupied', className: 'border-[var(--series-1)] bg-[var(--series-1)]/12' },
  planned: { label: 'Planned', className: 'border-dashed border-[var(--series-1)]/60' },
  available: { label: 'Available', className: 'border-border' },
  maintenance: { label: 'Restricted', className: 'border-[var(--status-warning)] bg-[var(--status-warning)]/10' },
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
    <div className={cn('flex h-full flex-col gap-0.5 rounded-md border-2 p-2 text-xs', meta.className)}>
      <div className='flex items-center justify-between gap-1'>
        <span className='font-semibold'>{berth.id}</span>
        {state === 'occupied' && <Ship className='size-3.5' aria-hidden />}
        {state === 'maintenance' && <Construction className='size-3.5' aria-hidden />}
      </div>
      <span className='text-muted-foreground'>{meta.label}</span>
      {!compact && vessel && <span className='truncate font-medium'>{vessel.name.replace(/^(MV|MT) DEMO /, '')}</span>}
    </div>
  )
  if (occupant)
    return (
      <Link to='/vessel-calls/$callId' params={{ callId: occupant.id }} title={vessel?.name} className='block rounded-md hover:opacity-80'>
        {body}
      </Link>
    )
  return body
}
