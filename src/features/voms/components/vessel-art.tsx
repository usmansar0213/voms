import { cn } from '@/lib/utils'
import type { Scenario } from '../types'

// Original flat illustrations (no stock photos): one silhouette per vessel type.
const hull = '#2b3a55'
const hullRed = '#b8433a'

function Container() {
  const colors = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#2a78d6', '#1baf7a', '#eb6834']
  return (
    <g>
      {colors.map((c, i) => (
        <rect key={i} x={14 + (i % 4) * 10} y={i < 4 ? 17 : 24} width='9' height='6.5' rx='0.8' fill={c} />
      ))}
      <rect x='58' y='14' width='9' height='17' rx='1' fill='#e8edf3' />
      <rect x='60' y='16' width='5' height='2.5' fill='#5b6b82' />
      <path d='M6 31 H76 L70 41 H12 Z' fill={hull} />
      <path d='M9 38 H73 L70 41 H12 Z' fill={hullRed} />
    </g>
  )
}

function Tanker() {
  return (
    <g>
      <rect x='12' y='26' width='46' height='3' fill='#cfd8e3' />
      <path d='M14 26 v-3 h40 v3' fill='none' stroke='#8a98ab' strokeWidth='1.2' />
      <circle cx='24' cy='24' r='1.6' fill='#eda100' />
      <circle cx='36' cy='24' r='1.6' fill='#eda100' />
      <circle cx='48' cy='24' r='1.6' fill='#eda100' />
      <rect x='60' y='15' width='9' height='14' rx='1' fill='#e8edf3' />
      <rect x='62' y='17' width='5' height='2.5' fill='#5b6b82' />
      <rect x='64' y='11' width='2' height='5' fill='#5b6b82' />
      <path d='M5 29 H77 L71 41 H11 Z' fill={hull} />
      <path d='M8 37 H74 L71 41 H11 Z' fill={hullRed} />
    </g>
  )
}

function Bulk() {
  return (
    <g>
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={13 + i * 11} y='24' width='9' height='5' rx='0.8' fill='#9aa7b8' />
      ))}
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x={22.5 + i * 11} y='14' width='1.4' height='11' fill='#eda100' />
          <path d={`M23.2 14 L${30 + i * 11} 19`} stroke='#eda100' strokeWidth='1.2' />
        </g>
      ))}
      <rect x='60' y='14' width='9' height='15' rx='1' fill='#e8edf3' />
      <rect x='62' y='16' width='5' height='2.5' fill='#5b6b82' />
      <path d='M6 29 H76 L70 41 H12 Z' fill={hull} />
      <path d='M9 38 H73 L70 41 H12 Z' fill={hullRed} />
    </g>
  )
}

function General() {
  return (
    <g>
      <rect x='16' y='23' width='14' height='6' rx='1' fill='#9aa7b8' />
      <rect x='34' y='23' width='14' height='6' rx='1' fill='#9aa7b8' />
      <rect x='31' y='12' width='1.4' height='13' fill='#eda100' />
      <path d='M31.7 12 L42 20' stroke='#eda100' strokeWidth='1.2' />
      <rect x='56' y='13' width='11' height='16' rx='1' fill='#e8edf3' />
      <rect x='58' y='15' width='7' height='2.5' fill='#5b6b82' />
      <path d='M7 29 H75 L69 41 H13 Z' fill={hull} />
      <path d='M10 38 H72 L69 41 H13 Z' fill={hullRed} />
    </g>
  )
}

const art: Record<Scenario, () => React.JSX.Element> = { container: Container, tanker: Tanker, bulk: Bulk, general: General }

export function VesselArt({ type, className }: { type: Scenario; className?: string }) {
  const Art = art[type]
  return (
    <svg viewBox='0 0 82 50' role='img' aria-label={`${type} vessel illustration`} className={cn('h-12 w-16 shrink-0 rounded-md', className)}>
      <defs>
        <linearGradient id='voms-sky' x1='0' y1='0' x2='0' y2='1'>
          <stop offset='0' stopColor='#dbeafe' />
          <stop offset='1' stopColor='#f1f5f9' />
        </linearGradient>
      </defs>
      <rect width='82' height='50' fill='url(#voms-sky)' />
      <rect y='40' width='82' height='10' fill='#7fb0e0' />
      <Art />
      <path d='M0 43 q6 -2 12 0 t12 0 t12 0 t12 0 t12 0 t12 0 t12 0' fill='none' stroke='#ffffff' strokeOpacity='0.6' strokeWidth='0.8' />
    </svg>
  )
}

/** Progress colour per vessel type — follows the entity, never its rank. */
export const scenarioColor: Record<Scenario, string> = {
  container: 'var(--series-1)',
  tanker: 'var(--series-3)',
  bulk: 'var(--series-7)',
  general: 'var(--series-2)',
}
