// Domain model for the VOMS mockup. Mirrors the BRD concepts: one Vessel Call ID
// links vessel, berth, cargo, terminal production, incidents and departure.

export type Scenario = 'container' | 'bulk' | 'tanker' | 'general'

export type CallStatus =
  | 'expected'
  | 'arrived'
  | 'at_berth'
  | 'operations'
  | 'ops_completed'
  | 'departed'
  | 'closed'
  | 'cancelled'

/** Where a record came from. Simulated feeds are always labelled as such. */
export type Source = 'manual' | 'agent' | 'ais_sim' | 'tos_sim'

/** Movement events in lifecycle order (DCSA / S-211 style: estimated vs actual). */
export type EventKey =
  | 'eta'
  | 'ata'
  | 'pilotOn'
  | 'firstLine'
  | 'allFast'
  | 'opsStart'
  | 'opsEnd'
  | 'lastLine'
  | 'atd'
  | 'etd'

export type RoleId =
  | 'port_control'
  | 'harbor_master'
  | 'terminal_operator'
  | 'shipping_agent'
  | 'management'
  | 'admin'

export type Unit = 'TEU' | 'MT' | 'KL' | 'UNIT'

export interface EventRecord {
  time: string // ISO timestamp of when the event happened
  source: Source
  recordedBy: RoleId
  recordedAt: string // ISO timestamp of when it was entered
  verifiedBy?: RoleId
  verifiedAt?: string
  remarks?: string
}

export interface CargoLine {
  id: string
  commodity: string
  category: string
  direction: 'discharge' | 'load'
  unit: Unit
  declared: number
  dangerous?: boolean
}

export interface Production {
  id: string
  lineId: string
  time: string
  qty: number
  source: Source
  recordedBy: RoleId
  status: 'submitted' | 'verified'
}

export interface Delay {
  id: string
  category: string
  start: string
  end?: string
  remarks: string
  recordedBy: RoleId
}

export interface AuditEntry {
  id: string
  time: string
  actor: RoleId
  action: string
  detail: string
}

export interface VesselCall {
  id: string // Vessel Call ID, e.g. SB-2026-000124
  vesselId: string
  agentId: string
  scenario: Scenario
  voyageIn: string
  voyageOut: string
  purpose: string
  requestedBerthId?: string
  berthId?: string
  berthAssignedBy?: RoleId
  lastPort: string
  nextPort: string
  events: Partial<Record<EventKey, EventRecord>>
  cargo: CargoLine[]
  production: Production[]
  delays: Delay[]
  audit: AuditEntry[]
  finalTally?: { submittedBy: RoleId; at: string; verifiedBy?: RoleId; verifiedAt?: string }
  closure?: { by: RoleId; at: string }
  cancelled?: boolean
}

export interface Vessel {
  id: string
  name: string
  imo: string
  type: Scenario
  typeLabel: string
  flag: string
  loa: number // metres
  beam: number
  draft: number
  gt: number
  dwt: number
}

export interface Agent {
  id: string
  name: string
}

export interface Berth {
  id: string
  name: string
  maxLoa: number
  maxDraft: number
  accepts: Scenario[]
  maintenance?: { reason: string; until: string }
}

export type IncidentType = 'safety' | 'security' | 'environmental' | 'dangerous_cargo'
export type Severity = 'low' | 'medium' | 'high' | 'critical'

export interface Incident {
  id: string
  callId: string
  type: IncidentType
  severity: Severity
  title: string
  description: string
  time: string
  reportedBy: RoleId
  status: 'open' | 'under_review' | 'closed'
  actions: { id: string; text: string; done: boolean }[]
  closedBy?: RoleId
  closedAt?: string
}

export interface FeedState {
  ais: boolean
  tos: boolean
}

export interface FeedMessage {
  id: string
  time: string
  feed: 'AIS' | 'TOS'
  callId: string
  text: string
  outcome: 'accepted_pending' | 'rejected' | 'queued'
}
