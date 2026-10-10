import { format, formatDistanceToNowStrict } from 'date-fns'
import type { Source, Unit } from './types'

export const fmtDateTime = (iso?: string) => (iso ? format(new Date(iso), 'dd MMM yyyy HH:mm') : '—')
export const fmtShort = (iso?: string) => (iso ? format(new Date(iso), 'dd MMM HH:mm') : '—')
export const fmtTime = (iso?: string) => (iso ? format(new Date(iso), 'HH:mm') : '—')
export const fmtRelative = (iso?: string) =>
  iso ? formatDistanceToNowStrict(new Date(iso), { addSuffix: true }) : '—'

export const fmtNum = (n: number, digits = 0) =>
  n.toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits })

export const fmtQty = (n: number, unit: Unit) => `${fmtNum(n)} ${unit}`

export const fmtHours = (h?: number) => {
  if (h === undefined || Number.isNaN(h)) return '—'
  const sign = h < 0 ? '−' : ''
  const abs = Math.abs(h)
  const hh = Math.floor(abs)
  const mm = Math.round((abs - hh) * 60)
  return `${sign}${hh}h ${String(mm).padStart(2, '0')}m`
}

export const sourceLabel: Record<Source, string> = {
  manual: 'Manual entry',
  agent: 'Agent notice',
  ais_sim: 'AIS (simulated)',
  tos_sim: 'TOS (simulated)',
}

export const unitLabel: Record<Unit, string> = {
  TEU: 'TEU',
  MT: 'Metric tons',
  KL: 'Kilolitres',
  UNIT: 'Units',
}

/** Value for <input type="datetime-local"> in local time. */
export const toLocalInput = (iso: string) => format(new Date(iso), "yyyy-MM-dd'T'HH:mm")
export const fromLocalInput = (v: string) => new Date(v).toISOString()
