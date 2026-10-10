import type { RoleId } from './types'

export interface Role {
  id: RoleId
  name: string
  org: string
  short: string
  description: string
}

export const roles: Role[] = [
  {
    id: 'port_control',
    name: 'Port Control Operator',
    org: 'SBMA Seaport Department',
    short: 'PC',
    description:
      'Records factual vessel movement events (ATA, pilot, All Fast, Last Line, ATD) and berth shifting.',
  },
  {
    id: 'harbor_master',
    name: 'Harbor Master / Authorized Officer',
    org: 'SBMA Seaport Department',
    short: 'HM',
    description:
      'Assigns berths, verifies movement records, verifies final tally and closes vessel calls.',
  },
  {
    id: 'terminal_operator',
    name: 'Terminal Operator',
    org: 'Terminal operator (demo)',
    short: 'TO',
    description:
      'Records cargo production, delays and final tally for assigned vessel calls only.',
  },
  {
    id: 'shipping_agent',
    name: 'Shipping Agent',
    org: 'Shipping agency (demo)',
    short: 'SA',
    description:
      'Submits pre-arrival notification, ETA/ETD and declared cargo for own vessel calls.',
  },
  {
    id: 'management',
    name: 'Management (Read-only)',
    org: 'SBMA Management',
    short: 'MG',
    description: 'Views dashboards, KPIs and reports. Cannot change operational records.',
  },
  {
    id: 'admin',
    name: 'System Administrator',
    org: 'SBMA IT (demo)',
    short: 'AD',
    description:
      'Manages users and master data configuration. No operational approval rights (segregation of duties).',
  },
]

export const roleById = Object.fromEntries(roles.map((r) => [r.id, r])) as Record<RoleId, Role>

export type Action =
  | 'call.create'
  | 'call.updateEta'
  | 'event.movement'
  | 'event.verify'
  | 'berth.assign'
  | 'cargo.declare'
  | 'production.record'
  | 'production.verify'
  | 'delay.record'
  | 'tally.submit'
  | 'tally.verify'
  | 'incident.report'
  | 'incident.close'
  | 'call.close'
  | 'call.reopen'
  | 'feed.simulate'
  | 'masterdata.edit'
  | 'report.view'
  | 'report.export'

export const actionLabels: Record<Action, string> = {
  'call.create': 'Create vessel call / pre-arrival notice',
  'call.updateEta': 'Update ETA / ETD',
  'event.movement': 'Record movement events',
  'event.verify': 'Verify movement events',
  'berth.assign': 'Assign / change berth',
  'cargo.declare': 'Declare cargo',
  'production.record': 'Record cargo production',
  'production.verify': 'Verify cargo production',
  'delay.record': 'Record operational delay',
  'tally.submit': 'Submit final tally',
  'tally.verify': 'Verify final tally',
  'incident.report': 'Report incident',
  'incident.close': 'Close incident',
  'call.close': 'Close vessel call',
  'call.reopen': 'Reopen closed vessel call',
  'feed.simulate': 'Run integration simulator',
  'masterdata.edit': 'Edit master data',
  'report.view': 'View dashboards & reports',
  'report.export': 'Export / print reports',
}

const matrix: Record<Action, RoleId[]> = {
  'call.create': ['shipping_agent', 'port_control'],
  'call.updateEta': ['shipping_agent', 'port_control'],
  'event.movement': ['port_control'],
  'event.verify': ['harbor_master'],
  'berth.assign': ['harbor_master'],
  'cargo.declare': ['shipping_agent'],
  'production.record': ['terminal_operator'],
  'production.verify': ['harbor_master'],
  'delay.record': ['terminal_operator', 'port_control'],
  'tally.submit': ['terminal_operator'],
  'tally.verify': ['harbor_master'],
  'incident.report': ['port_control', 'terminal_operator', 'harbor_master', 'shipping_agent'],
  'incident.close': ['harbor_master'],
  'call.close': ['harbor_master'],
  'call.reopen': ['harbor_master'],
  'feed.simulate': ['admin', 'port_control'],
  'masterdata.edit': ['admin'],
  'report.view': ['port_control', 'harbor_master', 'terminal_operator', 'shipping_agent', 'management', 'admin'],
  'report.export': ['port_control', 'harbor_master', 'management'],
}

export function can(role: RoleId, action: Action) {
  return matrix[action].includes(role)
}

export const allActions = Object.keys(matrix) as Action[]
