// Strategic KPI registry and calculation engine (PORTIX). Definitions follow
// BRD Section 4; targets are ILLUSTRATIVE until approved by SBMA.
import { format, parse } from 'date-fns'
import { TERMINAL_IDS, type MonthlyRecord, type TerminalId } from './history'

export type KpiId =
  | 'KPI-001'
  | 'KPI-002'
  | 'KPI-003'
  | 'KPI-004'
  | 'KPI-005'
  | 'KPI-006'
  | 'KPI-007'
  | 'KPI-008'
  | 'KPI-009'

export type Scope = 'PORT' | TerminalId
export type KpiStatus = 'good' | 'warning' | 'critical' | 'na'

export interface KpiDefinition {
  id: KpiId
  name: string
  short: string
  description: string
  formula: string
  unit: string | Record<TerminalId, string>
  direction: 'lower' | 'higher'
  frequency: 'Monthly'
  owner: string
  sources: string[]
  /** Port-level value is not meaningful when units differ across terminals. */
  portLevel: boolean
  field: keyof Pick<MonthlyRecord, 'calls' | 'throughput' | 'turnaroundH' | 'waitingH' | 'utilizationPct' | 'productivity' | 'incidents' | 'timelinessPct' | 'reliabilityPct'>
  aggregate: 'sum' | 'callWeighted' | 'berthWeighted' | 'mean'
  /** Illustrative monthly targets per terminal. */
  targets: Record<TerminalId, number>
  /** Tolerance before amber / red, as a fraction of target (or absolute points for %). */
  amber: number
  red: number
  tolerance: 'relative' | 'absolute'
  version: string
}

const berthCount: Record<TerminalId, number> = { 'U-TA': 5, 'U-TB': 7, 'U-TC': 3 }

export const kpis: KpiDefinition[] = [
  {
    id: 'KPI-001',
    name: 'Vessel turnaround time',
    short: 'Turnaround',
    description: 'Average time a vessel spends in port from arrival to departure.',
    formula: 'mean(ATD − ATA) over vessel calls departed in the period',
    unit: 'h',
    direction: 'lower',
    frequency: 'Monthly',
    owner: 'Port Operations Manager',
    sources: ['VTMS (ATA, ATD)', 'PMIS (port call)'],
    portLevel: true,
    field: 'turnaroundH',
    aggregate: 'callWeighted',
    targets: { 'U-TA': 24, 'U-TB': 58, 'U-TC': 28 },
    amber: 0.05,
    red: 0.12,
    tolerance: 'relative',
    version: '0.1',
  },
  {
    id: 'KPI-002',
    name: 'Vessel waiting time',
    short: 'Waiting time',
    description: 'Average time from arrival to All Fast — anchorage waiting plus berthing.',
    formula: 'mean(All Fast − ATA) over vessel calls berthed in the period',
    unit: 'h',
    direction: 'lower',
    frequency: 'Monthly',
    owner: 'Harbor Master',
    sources: ['VTMS (ATA)', 'VTMS / PMIS (All Fast)'],
    portLevel: true,
    field: 'waitingH',
    aggregate: 'callWeighted',
    targets: { 'U-TA': 2.5, 'U-TB': 6, 'U-TC': 3 },
    amber: 0.1,
    red: 0.25,
    tolerance: 'relative',
    version: '0.1',
  },
  {
    id: 'KPI-003',
    name: 'Berth utilization',
    short: 'Berth utilization',
    description: 'Share of available berth hours occupied (All Fast → Last Line).',
    formula: 'Σ occupied berth hours ÷ Σ available berth hours × 100',
    unit: '%',
    direction: 'higher',
    frequency: 'Monthly',
    owner: 'Port Operations Manager',
    sources: ['VTMS / PMIS (All Fast, Last Line)', 'Facility register'],
    portLevel: true,
    field: 'utilizationPct',
    aggregate: 'berthWeighted',
    targets: { 'U-TA': 70, 'U-TB': 75, 'U-TC': 60 },
    amber: 5,
    red: 10,
    tolerance: 'absolute',
    version: '0.1',
  },
  {
    id: 'KPI-004',
    name: 'Gross berth productivity',
    short: 'Berth productivity',
    description: 'Cargo handled per hour at berth, in each terminal’s own unit.',
    formula: 'Σ cargo handled ÷ Σ hours from ops start to ops end',
    unit: { 'U-TA': 'moves/h', 'U-TB': 'MT/h', 'U-TC': 'KL/h' },
    direction: 'higher',
    frequency: 'Monthly',
    owner: 'Terminal Manager',
    sources: ['TOS (cargo moves, operation times)'],
    portLevel: false,
    field: 'productivity',
    aggregate: 'mean',
    targets: { 'U-TA': 55, 'U-TB': 650, 'U-TC': 480 },
    amber: 0.05,
    red: 0.12,
    tolerance: 'relative',
    version: '0.1',
  },
  {
    id: 'KPI-005',
    name: 'Cargo throughput',
    short: 'Throughput',
    description: 'Cargo handled in the period, in each terminal’s own unit. Never summed across units.',
    formula: 'Σ cargo discharged + loaded',
    unit: { 'U-TA': 'TEU', 'U-TB': 'MT', 'U-TC': 'KL' },
    direction: 'higher',
    frequency: 'Monthly',
    owner: 'Terminal Manager',
    sources: ['TOS', 'Daily terminal reports'],
    portLevel: false,
    field: 'throughput',
    aggregate: 'sum',
    targets: { 'U-TA': 21500, 'U-TB': 255000, 'U-TC': 95000 },
    amber: 0.05,
    red: 0.12,
    tolerance: 'relative',
    version: '0.1',
  },
  {
    id: 'KPI-006',
    name: 'Vessel calls',
    short: 'Vessel calls',
    description: 'Number of vessel calls completed (departed) in the period.',
    formula: 'count(vessel calls with ATD in period)',
    unit: 'calls',
    direction: 'higher',
    frequency: 'Monthly',
    owner: 'Port Authority Executive',
    sources: ['PMIS (port calls)', 'VTMS (ATD)'],
    portLevel: true,
    field: 'calls',
    aggregate: 'sum',
    targets: { 'U-TA': 23, 'U-TB': 14, 'U-TC': 12 },
    amber: 0.08,
    red: 0.18,
    tolerance: 'relative',
    version: '0.1',
  },
  {
    id: 'KPI-007',
    name: 'Safety & environmental incidents',
    short: 'Incidents',
    description: 'Reported safety, security and environmental incidents linked to port operations.',
    formula: 'count(incidents reported in period)',
    unit: 'incidents',
    direction: 'lower',
    frequency: 'Monthly',
    owner: 'Harbor Master',
    sources: ['Incident register'],
    portLevel: true,
    field: 'incidents',
    aggregate: 'sum',
    targets: { 'U-TA': 1, 'U-TB': 1, 'U-TC': 1 },
    amber: 1,
    red: 2,
    tolerance: 'absolute',
    version: '0.1',
  },
  {
    id: 'KPI-008',
    name: 'Report submission timeliness',
    short: 'Data timeliness',
    description: 'Share of required daily reports received on time.',
    formula: 'reports received by deadline ÷ reports required × 100',
    unit: '%',
    direction: 'higher',
    frequency: 'Monthly',
    owner: 'Data Steward',
    sources: ['PORTIX submission log', 'API integration jobs'],
    portLevel: true,
    field: 'timelinessPct',
    aggregate: 'mean',
    targets: { 'U-TA': 95, 'U-TB': 95, 'U-TC': 95 },
    amber: 3,
    red: 8,
    tolerance: 'absolute',
    version: '0.1',
  },
  {
    id: 'KPI-009',
    name: 'Schedule reliability',
    short: 'Schedule reliability',
    description: 'Share of arrivals within ±2 hours of the last declared ETA.',
    formula: 'arrivals with |ATA − ETA| ≤ 2 h ÷ arrivals × 100',
    unit: '%',
    direction: 'higher',
    frequency: 'Monthly',
    owner: 'Port Operations Manager',
    sources: ['PMIS (ETA)', 'VTMS (ATA)'],
    portLevel: true,
    field: 'reliabilityPct',
    aggregate: 'callWeighted',
    targets: { 'U-TA': 80, 'U-TB': 75, 'U-TC': 80 },
    amber: 5,
    red: 10,
    tolerance: 'absolute',
    version: '0.1',
  },
]

export const kpiById = Object.fromEntries(kpis.map((k) => [k.id, k])) as Record<KpiId, KpiDefinition>

export const unitOf = (k: KpiDefinition, scope: Scope) => (typeof k.unit === 'string' ? k.unit : scope === 'PORT' ? '' : k.unit[scope])

export const periodLabel = (p: string) => format(parse(p, 'yyyy-MM', new Date()), 'MMM yyyy')
export const periodShort = (p: string) => format(parse(p, 'yyyy-MM', new Date()), 'MMM yy')

function aggregate(k: KpiDefinition, rows: MonthlyRecord[], field: (r: MonthlyRecord) => number) {
  if (!rows.length) return null
  if (k.aggregate === 'sum') return rows.reduce((a, r) => a + field(r), 0)
  if (k.aggregate === 'mean') return rows.reduce((a, r) => a + field(r), 0) / rows.length
  const w = (r: MonthlyRecord) => (k.aggregate === 'callWeighted' ? r.calls : berthCount[r.unitId])
  const tw = rows.reduce((a, r) => a + w(r), 0)
  return rows.reduce((a, r) => a + field(r) * w(r), 0) / tw
}

const rowsFor = (history: MonthlyRecord[], scope: Scope, period: string) =>
  history.filter((r) => r.period === period && (scope === 'PORT' || r.unitId === scope))

export function kpiValue(history: MonthlyRecord[], id: KpiId, scope: Scope, period: string): number | null {
  const k = kpiById[id]
  if (scope === 'PORT' && !k.portLevel) return null
  return aggregate(k, rowsFor(history, scope, period), (r) => r[k.field])
}

/** Port target = same aggregation over terminal targets (weights from the period's actuals). */
export function kpiTarget(history: MonthlyRecord[], id: KpiId, scope: Scope, period: string): number | null {
  const k = kpiById[id]
  if (scope !== 'PORT') return k.targets[scope]
  if (!k.portLevel) return null
  return aggregate(k, rowsFor(history, scope, period), (r) => k.targets[r.unitId])
}

export function kpiStatus(id: KpiId, value: number | null, target: number | null): KpiStatus {
  if (value === null || target === null) return 'na'
  const k = kpiById[id]
  const gap = k.direction === 'lower' ? value - target : target - value // positive = worse than target
  const tol = (t: number) => (k.tolerance === 'relative' ? Math.abs(target) * t : t)
  if (gap <= 0) return 'good'
  if (gap <= tol(k.amber)) return 'good'
  if (gap <= tol(k.red)) return 'warning'
  return 'critical'
}

/** Variance vs target as a signed % (positive = better than target). */
export function kpiVariancePct(id: KpiId, value: number | null, target: number | null) {
  if (value === null || target === null || target === 0) return null
  const k = kpiById[id]
  const raw = ((value - target) / Math.abs(target)) * 100
  return k.direction === 'lower' ? -raw : raw
}

export function kpiSeries(history: MonthlyRecord[], periods: string[], id: KpiId, scope: Scope) {
  return periods.map((period) => {
    const value = kpiValue(history, id, scope, period)
    const target = kpiTarget(history, id, scope, period)
    return { period, value, target, status: kpiStatus(id, value, target) }
  })
}

export function previousPeriod(periods: string[], period: string) {
  const i = periods.indexOf(period)
  return i > 0 ? periods[i - 1] : undefined
}

export const scopeLabel = (s: Scope) => (s === 'PORT' ? 'Port-wide' : { 'U-TA': 'Terminal A', 'U-TB': 'Terminal B', 'U-TC': 'Terminal C' }[s])
export const ALL_SCOPES: Scope[] = ['PORT', ...TERMINAL_IDS]
