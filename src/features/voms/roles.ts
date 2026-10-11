import type { Perspective, RoleId } from './types'

export interface Role {
  id: RoleId
  name: string
  org: string
  short: string
  description: string
  /** What this role does in each perspective (PDD §2). */
  submission: string
  management: string
  reports: string[]
}

export const roles: Role[] = [
  {
    id: 'port_control',
    name: 'Port Control Operator',
    org: 'SBMA Seaport Department',
    short: 'PC',
    description: 'Vessel movements: arrival, berthing, shifting and departure.',
    submission: 'Records ATA, pilot, All Fast, Last Line and ATD; submits the daily vessel movement log; operates the AIS/VTMS feed.',
    management: 'Monitors port-wide vessel traffic and delays; verifies movement records; reviews movement-log submissions.',
    reports: ['Daily Vessel Movement Log'],
  },
  {
    id: 'harbor_master',
    name: 'Harbor Master / Authorized Officer',
    org: 'SBMA Seaport Department',
    short: 'HM',
    description: 'Berth allocation, safety, security and environment.',
    submission: 'Assigns berths, submits berth allocation plans and safety inspection reports, reports incidents.',
    management: 'Verifies movements, production and final tally; closes incidents and vessel calls; port-wide oversight.',
    reports: ['Berth Allocation Plan', 'Safety Inspection Report'],
  },
  {
    id: 'terminal_operator',
    name: 'Terminal Operator',
    org: 'Terminal operator (demo)',
    short: 'TO',
    description: 'Terminal cargo operations for an assigned terminal.',
    submission: 'Uploads daily terminal reports (Excel/PDF), records production, delays and final tally, monitors the TOS API.',
    management: 'Terminal KPIs, exceptions and trends for one or several terminals; approves terminal submissions.',
    reports: ['Daily Terminal Operations Report'],
  },
  {
    id: 'shipping_agent',
    name: 'Shipping Agent',
    org: 'Shipping agency (demo)',
    short: 'SA',
    description: 'Pre-arrival notices and declared cargo for own vessel calls.',
    submission: 'Submits pre-arrival notifications, ETA/ETD updates and cargo manifest summaries.',
    management: 'Monitors own vessel calls from arrival to departure; approves agency submissions.',
    reports: ['Pre-arrival Notification', 'Cargo Manifest Summary'],
  },
  {
    id: 'management',
    name: 'Port Authority Executive',
    org: 'SBMA Management',
    short: 'MG',
    description: 'Port-wide performance, risk and throughput.',
    submission: 'Prepares and submits the monthly port statistics report from validated data.',
    management: 'Cross-unit KPIs, alerts, AI insights and discussion; approves management reports. Read-only on operations.',
    reports: ['Monthly Port Statistics Report'],
  },
  {
    id: 'admin',
    name: 'System / Access Administrator',
    org: 'SBMA IT (demo)',
    short: 'AD',
    description: 'Organizations, roles, scopes, audit and connector settings.',
    submission: 'Submits access and connector configuration changes; operates the integration simulator.',
    management: 'Monitors system health, data freshness and audit; approves configuration changes. No operational approval rights.',
    reports: ['Access & Connector Change Request'],
  },
]

export const roleById = Object.fromEntries(roles.map((r) => [r.id, r])) as Record<RoleId, Role>

export type Action =
  | 'call.create'
  | 'call.updateEta'
  | 'event.movement'
  | 'event.verify'
  | 'berth.assign'
  | 'production.record'
  | 'production.verify'
  | 'delay.record'
  | 'tally.submit'
  | 'tally.verify'
  | 'incident.report'
  | 'incident.close'
  | 'call.close'
  | 'call.reopen'
  | 'submission.upload'
  | 'submission.approve'
  | 'connector.operate'
  | 'connector.simulate'
  | 'alert.acknowledge'
  | 'alert.resolve'
  | 'masterdata.edit'
  | 'report.view'
  | 'report.export'
  | 'ai.ask'
  | 'action.create'
  | 'action.update'
  | 'action.close'

export const actionLabels: Record<Action, string> = {
  'call.create': 'Create vessel call / pre-arrival notice',
  'call.updateEta': 'Update ETA / ETD',
  'event.movement': 'Record movement events',
  'event.verify': 'Verify movement events',
  'berth.assign': 'Assign / change berth',
  'production.record': 'Record cargo production & ops start/end',
  'production.verify': 'Verify cargo production',
  'delay.record': 'Record operational delay',
  'tally.submit': 'Submit final tally',
  'tally.verify': 'Verify final tally',
  'incident.report': 'Report incident / corrective action',
  'incident.close': 'Close incident',
  'call.close': 'Close vessel call',
  'call.reopen': 'Reopen closed vessel call',
  'submission.upload': 'Upload Excel / PDF submissions',
  'submission.approve': 'Approve / reject submissions',
  'connector.operate': 'Retry / recover API connector',
  'connector.simulate': 'Run AIS / TOS simulator',
  'alert.acknowledge': 'Acknowledge alerts',
  'alert.resolve': 'Resolve alerts',
  'masterdata.edit': 'Edit master data & access',
  'report.view': 'View dashboards & reports',
  'report.export': 'Export / print reports',
  'ai.ask': 'Use AI insights & discussion',
  'action.create': 'Create management action',
  'action.update': 'Update action progress / follow-up',
  'action.close': 'Review outcome & close action',
}

export interface Actor {
  role: RoleId
  perspective: Perspective
}

type Key = `${RoleId}:${Perspective}`
const ALL_SUB: Key[] = roles.map((r) => `${r.id}:submission` as Key)
const ALL_MGMT: Key[] = roles.map((r) => `${r.id}:management` as Key)

// Submission perspective records and submits; Management perspective verifies,
// approves and monitors. A record is never approved from the perspective that created it.
const matrix: Record<Action, Key[]> = {
  'call.create': ['shipping_agent:submission', 'port_control:submission'],
  'call.updateEta': ['shipping_agent:submission', 'port_control:submission'],
  'event.movement': ['port_control:submission'],
  'event.verify': ['harbor_master:management', 'port_control:management'],
  'berth.assign': ['harbor_master:submission'],
  'production.record': ['terminal_operator:submission'],
  'production.verify': ['harbor_master:management', 'terminal_operator:management'],
  'delay.record': ['terminal_operator:submission', 'port_control:submission'],
  'tally.submit': ['terminal_operator:submission'],
  'tally.verify': ['harbor_master:management'],
  'incident.report': ['port_control:submission', 'terminal_operator:submission', 'harbor_master:submission', 'shipping_agent:submission'],
  'incident.close': ['harbor_master:management'],
  'call.close': ['harbor_master:management'],
  'call.reopen': ['harbor_master:management'],
  'submission.upload': ALL_SUB,
  'submission.approve': ALL_MGMT,
  'connector.operate': ['admin:submission', 'terminal_operator:submission', 'port_control:submission'],
  'connector.simulate': ['admin:submission', 'port_control:submission'],
  'alert.acknowledge': [...ALL_SUB, ...ALL_MGMT],
  'alert.resolve': ALL_MGMT,
  'masterdata.edit': ['admin:submission'],
  'report.view': [...ALL_SUB, ...ALL_MGMT],
  'report.export': ALL_MGMT,
  'ai.ask': [...ALL_SUB, ...ALL_MGMT],
  'action.create': ALL_MGMT,
  'action.update': ALL_MGMT,
  'action.close': ['management:management', 'harbor_master:management', 'port_control:management'],
}

export function can(actor: Actor, action: Action) {
  return matrix[action].includes(`${actor.role}:${actor.perspective}`)
}

export function allowedPerspectives(role: RoleId, action: Action): Perspective[] {
  return (['submission', 'management'] as Perspective[]).filter((p) => matrix[action].includes(`${role}:${p}`))
}

export const allActions = Object.keys(matrix) as Action[]
