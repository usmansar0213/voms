// Simulated document intake (PDD §5). No file content is read or sent anywhere:
// a chosen file contributes only its name; extracted values come from labelled
// sample templates so the demo never claims real AI processing.
import { isValidImo } from './seed'
import { metricMeta } from './org'
import type { DailyMetric, DailyStat, ExtractedField, RoleId } from './types'

export interface TemplateField {
  key: string
  label: string
  unit?: string
  citation: string
  metric?: DailyMetric
}

export interface SampleVariant {
  id: string
  label: string
  note: string
  values: Record<string, string>
  confidence?: Record<string, number>
}

export interface ReportTemplate {
  id: string
  unitIds: string[]
  role: RoleId
  reportType: string
  format: 'xlsx' | 'pdf'
  filePrefix: string
  fields: TemplateField[]
  variants: SampleVariant[]
}

export const templates: ReportTemplate[] = [
  {
    id: 'T-TA-DAILY',
    unitIds: ['U-TA'],
    role: 'terminal_operator',
    reportType: 'Daily Terminal Operations Report',
    format: 'xlsx',
    filePrefix: 'TerminalA_DailyOps',
    fields: [
      { key: 'callId', label: 'Vessel Call ID', citation: 'Sheet "Summary"!B3' },
      { key: 'discharge', label: 'Discharge moves', unit: 'moves', citation: 'Sheet "Summary"!C7' },
      { key: 'load', label: 'Load moves', unit: 'moves', citation: 'Sheet "Summary"!C8' },
      { key: 'total', label: 'Total container moves', unit: 'moves', citation: 'Sheet "Summary"!C9', metric: 'container_moves' },
      { key: 'craneHours', label: 'Crane working hours', unit: 'h', citation: 'Sheet "Cranes"!F12' },
      { key: 'delayMin', label: 'Recorded delays', unit: 'min', citation: 'Sheet "Delays"!D4' },
    ],
    variants: [
      { id: 'normal', label: 'Normal day', note: '104 moves — close to the typical ~100/day', values: { callId: 'SB-2026-000124', discharge: '61', load: '43', total: '104', craneHours: '19.5', delayMin: '35' } },
      { id: 'zero', label: 'Anomaly: 0 containers', note: 'Total keyed as 0 although discharge and load moves were reported', values: { callId: 'SB-2026-000124', discharge: '61', load: '43', total: '0', craneHours: '19.5', delayMin: '35' } },
      { id: 'thousand', label: 'Anomaly: 1,000 containers', note: 'Likely keying error (100 → 1,000)', values: { callId: 'SB-2026-000124', discharge: '61', load: '43', total: '1000', craneHours: '19.5', delayMin: '35' } },
    ],
  },
  {
    id: 'T-TB-DAILY',
    unitIds: ['U-TB'],
    role: 'terminal_operator',
    reportType: 'Daily Bulk Discharge Report',
    format: 'pdf',
    filePrefix: 'TerminalB_BulkDaily',
    fields: [
      { key: 'callId', label: 'Vessel Call ID', citation: 'p.1, header' },
      { key: 'commodity', label: 'Commodity', citation: 'p.1, table 1, row 1' },
      { key: 'total', label: 'Quantity discharged', unit: 'MT', citation: 'p.1, table 1, col "Qty"', metric: 'bulk_mt' },
      { key: 'hatches', label: 'Hatches worked', citation: 'p.1, table 2' },
      { key: 'delayMin', label: 'Weather / equipment delays', unit: 'min', citation: 'p.2, remarks' },
    ],
    variants: [
      { id: 'normal', label: 'Normal day', note: '2,950 MT coal', values: { callId: 'SB-2026-000122', commodity: 'Coal', total: '2950', hatches: '5', delayMin: '120' } },
      { id: 'units', label: 'Anomaly: unit error', note: 'Quantity entered in kg instead of MT', values: { callId: 'SB-2026-000122', commodity: 'Coal', total: '2950000', hatches: '5', delayMin: '120' } },
    ],
  },
  {
    id: 'T-TC-DAILY',
    unitIds: ['U-TC'],
    role: 'terminal_operator',
    reportType: 'Liquid Cargo Discharge Report',
    format: 'pdf',
    filePrefix: 'TerminalC_Discharge',
    fields: [
      { key: 'callId', label: 'Vessel Call ID', citation: 'p.1, header' },
      { key: 'product', label: 'Product', citation: 'p.1, table 1' },
      { key: 'total', label: 'Quantity discharged', unit: 'KL', citation: 'p.1, table 1, col "KL @15°C"', metric: 'liquid_kl' },
      { key: 'pumpHours', label: 'Pumping hours', unit: 'h', citation: 'p.2, pumping log' },
    ],
    variants: [
      { id: 'normal', label: 'Normal day', note: '2,480 KL gasoline', values: { callId: 'SB-2026-000123', product: 'Gasoline (Mogas)', total: '2480', pumpHours: '14' } },
      { id: 'scan', label: 'Low-quality scan', note: 'Scanned PDF — OCR confidence low on quantity', values: { callId: 'SB-2026-000123', product: 'Gasoline (Mogas)', total: '2l80', pumpHours: '14' }, confidence: { total: 0.41 } },
    ],
  },
  {
    id: 'T-PC-LOG',
    unitIds: ['U-PC'],
    role: 'port_control',
    reportType: 'Daily Vessel Movement Log',
    format: 'xlsx',
    filePrefix: 'PortControl_MovementLog',
    fields: [
      { key: 'total', label: 'Arrivals', unit: 'vessels', citation: 'Sheet "Log"!summary B2', metric: 'vessel_arrivals' },
      { key: 'departures', label: 'Departures', unit: 'vessels', citation: 'Sheet "Log"!summary B3' },
      { key: 'shifts', label: 'Berth shiftings', unit: 'moves', citation: 'Sheet "Log"!summary B4' },
      { key: 'pilotages', label: 'Pilotage jobs', unit: 'jobs', citation: 'Sheet "Log"!summary B5' },
    ],
    variants: [
      { id: 'normal', label: 'Normal day', note: '3 arrivals, 2 departures', values: { total: '3', departures: '2', shifts: '1', pilotages: '6' } },
      { id: 'zero', label: 'Anomaly: no arrivals', note: 'Unusual traffic decline (0 arrivals)', values: { total: '0', departures: '1', shifts: '0', pilotages: '1' } },
    ],
  },
  {
    id: 'T-HM-SAFETY',
    unitIds: ['U-HM'],
    role: 'harbor_master',
    reportType: 'Safety Inspection Report',
    format: 'pdf',
    filePrefix: 'HarborMaster_SafetyInspection',
    fields: [
      { key: 'inspections', label: 'Inspections performed', citation: 'p.1, summary' },
      { key: 'findings', label: 'Findings', citation: 'p.1, summary' },
      { key: 'openFindings', label: 'Open findings', citation: 'p.3, action list' },
    ],
    variants: [{ id: 'normal', label: 'Weekly inspection', note: '6 inspections, 2 findings', values: { inspections: '6', findings: '2', openFindings: '1' } }],
  },
  {
    id: 'T-AG-PAN',
    unitIds: ['U-AGA', 'U-AGB'],
    role: 'shipping_agent',
    reportType: 'Pre-arrival Notification',
    format: 'pdf',
    filePrefix: 'PreArrival',
    fields: [
      { key: 'vessel', label: 'Vessel name', citation: 'p.1, field 1' },
      { key: 'imo', label: 'IMO number', citation: 'p.1, field 2' },
      { key: 'eta', label: 'ETA (local)', citation: 'p.1, field 6' },
      { key: 'cargo', label: 'Cargo', citation: 'p.2, cargo table' },
      { key: 'quantity', label: 'Declared quantity', citation: 'p.2, cargo table' },
    ],
    variants: [
      { id: 'normal', label: 'Valid notice', note: 'All fields readable', values: { vessel: 'MV DEMO MANILA LINK', imo: '9001083', eta: 'in 6 h', cargo: 'Containers', quantity: '590 TEU' } },
      { id: 'imo', label: 'Invalid IMO', note: 'IMO check digit fails', values: { vessel: 'MV DEMO MANILA LINK', imo: '9001082', eta: 'in 6 h', cargo: 'Containers', quantity: '590 TEU' } },
    ],
  },
  {
    id: 'T-MG-MONTHLY',
    unitIds: ['U-MG'],
    role: 'management',
    reportType: 'Monthly Port Statistics Report',
    format: 'xlsx',
    filePrefix: 'SBMA_MonthlyPortStatistics',
    fields: [
      { key: 'month', label: 'Reporting month', citation: 'Sheet "Cover"!B2' },
      { key: 'calls', label: 'Vessel calls', citation: 'Sheet "Summary"!C4' },
      { key: 'moves', label: 'Container moves', unit: 'moves', citation: 'Sheet "Summary"!C5' },
      { key: 'bulk', label: 'Dry bulk', unit: 'MT', citation: 'Sheet "Summary"!C6' },
      { key: 'liquid', label: 'Liquid bulk', unit: 'KL', citation: 'Sheet "Summary"!C7' },
    ],
    variants: [{ id: 'normal', label: 'September 2026 (demo)', note: 'Compiled from validated data', values: { month: 'September 2026', calls: '86', moves: '3045', bulk: '91200', liquid: '74300' } }],
  },
  {
    id: 'T-IT-CHANGE',
    unitIds: ['U-IT'],
    role: 'admin',
    reportType: 'Access & Connector Change Request',
    format: 'xlsx',
    filePrefix: 'Access_Change_Request',
    fields: [
      { key: 'newUsers', label: 'New user accounts', citation: 'Sheet "Users"!A2:A5' },
      { key: 'roleChanges', label: 'Role / scope changes', citation: 'Sheet "Users"!D2:D5' },
      { key: 'connectorChanges', label: 'Connector configuration changes', citation: 'Sheet "Connectors"!A2' },
    ],
    variants: [{ id: 'normal', label: 'Weekly access batch', note: '4 new users, 2 scope changes', values: { newUsers: '4', roleChanges: '2', connectorChanges: '1' } }],
  },
]

export const templatesFor = (unitId: string) => templates.filter((t) => t.unitIds.includes(unitId))

/** Simulated extraction: template values + deterministic confidence and citations. */
export function extract(t: ReportTemplate, v: SampleVariant): ExtractedField[] {
  return t.fields.map((f, i) => ({
    key: f.key,
    label: f.label,
    unit: f.unit,
    value: v.values[f.key] ?? '',
    confidence: v.confidence?.[f.key] ?? 0.9 + ((i * 7) % 9) / 100,
    citation: f.citation,
  }))
}

export function typicalValue(stats: DailyStat[], unitId: string, metric: DailyMetric) {
  const xs = stats.filter((s) => s.unitId === unitId && s.metric === metric && s.status === 'published').slice(-14)
  return xs.length ? xs.reduce((a, s) => a + s.value, 0) / xs.length : undefined
}

/** Business-rule validation + anomaly flags. An anomaly is a review flag, not proof of error. */
export function check(t: ReportTemplate, fields: ExtractedField[], unitId: string, stats: DailyStat[], knownCallIds: string[]) {
  const validation: string[] = []
  const anomalies: string[] = []
  for (const f of fields) {
    const def = t.fields.find((x) => x.key === f.key)!
    if (!f.value.trim()) validation.push(`${f.label} is missing`)
    if (f.confidence < 0.6) validation.push(`${f.label}: low extraction confidence (${Math.round(f.confidence * 100)}%) — confirm against the source document`)
    if (def.unit && f.value && !/^-?\d+(\.\d+)?$/.test(f.value.replace(/,/g, ''))) validation.push(`${f.label} is not a valid number`)
    if (f.key === 'imo' && f.value && !isValidImo(f.value)) validation.push(`IMO number ${f.value} fails the check-digit test`)
    if (f.key === 'callId' && f.value && !knownCallIds.includes(f.value)) validation.push(`Vessel Call ID ${f.value} not found`)
    if (def.metric) {
      const v = Number(f.value.replace(/,/g, ''))
      const typical = typicalValue(stats, unitId, def.metric)
      if (typical !== undefined && Number.isFinite(v)) {
        const meta = metricMeta[def.metric]
        if (v === 0) anomalies.push(`${f.label} is 0 — typical is about ${Math.round(typical)} ${meta.unit}/day`)
        else if (v > typical * 3) anomalies.push(`${f.label} ${v.toLocaleString('en-US')} is ${Math.round(v / typical)}× the typical ${Math.round(typical).toLocaleString('en-US')} ${meta.unit}/day`)
        else if (v < typical * 0.3) anomalies.push(`${f.label} ${v.toLocaleString('en-US')} is far below the typical ${Math.round(typical).toLocaleString('en-US')} ${meta.unit}/day`)
      }
    }
  }
  // Cross-field consistency: component moves should add up to the reported total.
  const num = (k: string) => Number(fields.find((f) => f.key === k)?.value.replace(/,/g, ''))
  if (fields.some((f) => f.key === 'discharge') && fields.some((f) => f.key === 'load')) {
    const parts = num('discharge') + num('load')
    if (Number.isFinite(parts) && parts !== num('total')) anomalies.push(`Discharge + load (${parts}) does not equal the reported total (${num('total')})`)
  }
  return { validation, anomalies }
}
