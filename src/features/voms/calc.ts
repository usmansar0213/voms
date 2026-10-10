// Business rules and KPI calculations (BRD Sections 4, 10–16). Everything is
// derived from recorded events so dashboard, call detail and reports agree.
import type { Berth, CallStatus, EventKey, Incident, Unit, Vessel, VesselCall } from './types'

export const HOUR = 3600_000

export const eventOrder: EventKey[] = [
  'ata',
  'pilotOn',
  'firstLine',
  'allFast',
  'opsStart',
  'opsEnd',
  'lastLine',
  'atd',
]

export const eventLabels: Record<EventKey, string> = {
  eta: 'ETA (Estimated Time of Arrival)',
  ata: 'ATA (Actual Time of Arrival)',
  pilotOn: 'Pilot on board',
  firstLine: 'First line ashore',
  allFast: 'All Fast',
  opsStart: 'Cargo operations commenced',
  opsEnd: 'Cargo operations completed',
  lastLine: 'Last line (unberthing)',
  atd: 'ATD (Actual Time of Departure)',
  etd: 'ETD (Estimated Time of Departure)',
}

export const eventShort: Record<EventKey, string> = {
  eta: 'ETA',
  ata: 'ATA',
  pilotOn: 'Pilot on board',
  firstLine: 'First line',
  allFast: 'All Fast',
  opsStart: 'Ops start',
  opsEnd: 'Ops end',
  lastLine: 'Last line',
  atd: 'ATD',
  etd: 'ETD',
}

export function callStatus(c: VesselCall): CallStatus {
  if (c.cancelled) return 'cancelled'
  if (c.closure) return 'closed'
  const e = c.events
  if (e.atd) return 'departed'
  if (e.opsEnd) return 'ops_completed'
  if (e.opsStart) return 'operations'
  if (e.allFast) return 'at_berth'
  if (e.ata) return 'arrived'
  return 'expected'
}

export const statusMeta: Record<CallStatus, { label: string; tone: Tone; step: number }> = {
  expected: { label: 'Expected', tone: 'info', step: 0 },
  arrived: { label: 'Arrived / Anchorage', tone: 'warning', step: 1 },
  at_berth: { label: 'At Berth', tone: 'info', step: 2 },
  operations: { label: 'Cargo Operations', tone: 'active', step: 3 },
  ops_completed: { label: 'Operations Completed', tone: 'info', step: 4 },
  departed: { label: 'Departed', tone: 'neutral', step: 5 },
  closed: { label: 'Closed', tone: 'good', step: 6 },
  cancelled: { label: 'Cancelled', tone: 'neutral', step: -1 },
}

export type Tone = 'good' | 'warning' | 'serious' | 'critical' | 'info' | 'active' | 'neutral'

/** The next movement event this call is waiting for. */
export function nextEvent(c: VesselCall): EventKey | undefined {
  if (c.closure || c.cancelled) return undefined
  return eventOrder.find((k) => !c.events[k])
}

const t = (iso?: string) => (iso ? Date.parse(iso) : undefined)

export function hoursBetween(a?: string, b?: string) {
  const x = t(a)
  const y = t(b)
  if (x === undefined || y === undefined) return undefined
  return (y - x) / HOUR
}

/** Event-sequence warnings: flagged, not rejected (BRD 15.6 / 10.7). */
export function sequenceIssues(c: VesselCall): string[] {
  const issues: string[] = []
  let prevKey: EventKey | undefined
  for (const k of eventOrder) {
    const ev = c.events[k]
    if (!ev) continue
    if (prevKey) {
      const prev = c.events[prevKey]!
      if (Date.parse(ev.time) < Date.parse(prev.time)) {
        issues.push(`${eventShort[k]} is earlier than ${eventShort[prevKey]}`)
      }
    }
    prevKey = k
  }
  return issues
}

export function validateEventTime(c: VesselCall, key: EventKey, iso: string): string[] {
  const draft: VesselCall = { ...c, events: { ...c.events, [key]: { ...(c.events[key] ?? {}), time: iso } as never } }
  const issues = sequenceIssues(draft)
  if (Date.parse(iso) > Date.now() + 5 * 60_000 && key !== 'eta' && key !== 'etd') {
    issues.push('Actual event time is in the future')
  }
  return issues
}

// ---- Cargo ---------------------------------------------------------------

export function lineProgress(c: VesselCall, lineId: string) {
  const line = c.cargo.find((l) => l.id === lineId)!
  const done = c.production.filter((p) => p.lineId === lineId).reduce((s, p) => s + p.qty, 0)
  const verified = c.production
    .filter((p) => p.lineId === lineId && p.status === 'verified')
    .reduce((s, p) => s + p.qty, 0)
  return {
    line,
    done,
    verified,
    remaining: Math.max(line.declared - done, 0),
    pct: line.declared ? Math.min((done / line.declared) * 100, 100) : 0,
    variance: done - line.declared,
  }
}

/** Progress per measurement unit — quantities in different units are never added together. */
export function progressByUnit(c: VesselCall) {
  const map = new Map<Unit, { declared: number; done: number }>()
  for (const line of c.cargo) {
    const p = lineProgress(c, line.id)
    const cur = map.get(line.unit) ?? { declared: 0, done: 0 }
    map.set(line.unit, { declared: cur.declared + line.declared, done: cur.done + p.done })
  }
  return [...map.entries()].map(([unit, v]) => ({
    unit,
    ...v,
    pct: v.declared ? Math.min((v.done / v.declared) * 100, 100) : 0,
  }))
}

export function overallPct(c: VesselCall) {
  const lines = c.cargo.map((l) => lineProgress(c, l.id).pct)
  return lines.length ? lines.reduce((a, b) => a + b, 0) / lines.length : 0
}

export function delayHours(c: VesselCall, until = Date.now()) {
  return c.delays.reduce((s, d) => s + ((d.end ? Date.parse(d.end) : until) - Date.parse(d.start)) / HOUR, 0)
}

/** Gross / net productivity per unit (BRD 13.6). */
export function productivity(c: VesselCall, until = Date.now()) {
  const start = t(c.events.opsStart?.time)
  if (start === undefined) return []
  const end = t(c.events.opsEnd?.time) ?? until
  const gross = (end - start) / HOUR
  const net = Math.max(gross - delayHours(c, end), 0.1)
  return progressByUnit(c).map((u) => ({
    unit: u.unit,
    qty: u.done,
    grossHours: gross,
    netHours: net,
    gross: u.done / Math.max(gross, 0.1),
    net: u.done / net,
  }))
}

// ---- Durations / KPIs ----------------------------------------------------

export function turnaround(c: VesselCall) {
  const e = c.events
  return {
    waiting: hoursBetween(e.ata?.time, e.allFast?.time), // ATA -> All Fast
    atBerth: hoursBetween(e.allFast?.time, e.lastLine?.time), // All Fast -> Last Line
    departure: hoursBetween(e.lastLine?.time, e.atd?.time), // Last Line -> ATD
    total: hoursBetween(e.ata?.time, e.atd?.time), // ATA -> ATD (KPI-001)
  }
}

export function etaVariance(c: VesselCall) {
  return hoursBetween(c.events.eta?.time, c.events.ata?.time)
}

// ---- Berths --------------------------------------------------------------

export function berthOccupant(berthId: string, calls: VesselCall[]) {
  return calls.find(
    (c) => c.berthId === berthId && c.events.allFast && !c.events.lastLine && !c.cancelled
  )
}

export function berthNextPlanned(berthId: string, calls: VesselCall[]) {
  return calls
    .filter((c) => c.berthId === berthId && !c.events.allFast && !c.cancelled)
    .sort((a, b) => (a.events.eta?.time ?? '').localeCompare(b.events.eta?.time ?? ''))[0]
}

export type BerthState = 'occupied' | 'planned' | 'available' | 'maintenance'

export function berthState(b: Berth, calls: VesselCall[]): BerthState {
  if (b.maintenance && Date.parse(b.maintenance.until) > Date.now()) return 'maintenance'
  if (berthOccupant(b.id, calls)) return 'occupied'
  if (berthNextPlanned(b.id, calls)) return 'planned'
  return 'available'
}

/** Compatibility check between a vessel and a berth (BRD 9.4.4 / 11.5). */
export function berthCompatibility(v: Vessel, b: Berth) {
  const issues: string[] = []
  if (!b.accepts.includes(v.type)) issues.push(`${b.id} is not designated for ${v.typeLabel}`)
  if (v.loa > b.maxLoa) issues.push(`LOA ${v.loa} m exceeds berth limit ${b.maxLoa} m`)
  if (v.draft > b.maxDraft) issues.push(`Draft ${v.draft} m exceeds berth limit ${b.maxDraft} m`)
  if (b.maintenance && Date.parse(b.maintenance.until) > Date.now())
    issues.push(`Berth under restriction: ${b.maintenance.reason}`)
  return issues
}

/** Hours each berth was occupied within the window [from, to]. */
export function berthOccupancyHours(berthId: string, calls: VesselCall[], from: number, to: number) {
  return calls
    .filter((c) => c.berthId === berthId && c.events.allFast)
    .reduce((sum, c) => {
      const s = Math.max(Date.parse(c.events.allFast!.time), from)
      const e = Math.min(c.events.lastLine ? Date.parse(c.events.lastLine.time) : to, to)
      return sum + Math.max(e - s, 0) / HOUR
    }, 0)
}

// ---- Closure -------------------------------------------------------------

export interface ChecklistItem {
  label: string
  ok: boolean
  blocking: boolean
}

export function closureChecklist(c: VesselCall, incidents: Incident[]): ChecklistItem[] {
  const movement = eventOrder.filter((k) => c.events[k])
  const unverified = movement.filter((k) => !c.events[k]!.verifiedBy)
  const unverifiedProd = c.production.filter((p) => p.status !== 'verified')
  const open = incidents.filter((i) => i.callId === c.id && i.status !== 'closed')
  return [
    { label: 'ATD recorded', ok: !!c.events.atd, blocking: true },
    { label: 'All movement events verified by Harbor Master', ok: movement.length > 0 && unverified.length === 0, blocking: true },
    { label: 'Event sequence consistent', ok: sequenceIssues(c).length === 0, blocking: true },
    { label: 'All cargo production entries verified', ok: unverifiedProd.length === 0, blocking: true },
    { label: 'Final tally submitted and verified', ok: !!c.finalTally?.verifiedBy, blocking: true },
    { label: 'No open linked incidents (warning only — rule TBC)', ok: open.length === 0, blocking: false },
  ]
}

export function canClose(c: VesselCall, incidents: Incident[]) {
  return closureChecklist(c, incidents).every((i) => i.ok || !i.blocking)
}
