// Organizations, domain units and access scopes (PDD §2–3). All names are demo
// placeholders; the final unit list and ownership are to be validated with SBMA.
import type { DailyMetric, Perspective, RoleId, Session } from './types'

export interface Unit {
  id: string
  orgId: string
  name: string
  short: string
  domain: string
  berths: string[]
  metric?: DailyMetric
}

export interface Org {
  id: string
  name: string
  kind: 'authority' | 'terminal' | 'agency'
  agentId?: string
}

export const orgs: Org[] = [
  { id: 'ORG-SBMA', name: 'SBMA Seaport Department', kind: 'authority' },
  { id: 'ORG-TA', name: 'Demo Container Terminal A', kind: 'terminal' },
  { id: 'ORG-TB', name: 'Demo Bulk Terminal B', kind: 'terminal' },
  { id: 'ORG-TC', name: 'Demo Liquid Bulk Terminal C', kind: 'terminal' },
  { id: 'ORG-AGA', name: 'Demo Shipping Agency A', kind: 'agency', agentId: 'AG-01' },
  { id: 'ORG-AGB', name: 'Demo Shipping Agency B', kind: 'agency', agentId: 'AG-02' },
]

export const units: Unit[] = [
  { id: 'U-PC', orgId: 'ORG-SBMA', name: 'Port Control — Vessel Movements', short: 'Port Control', domain: 'Vessel movements, arrival & departure', berths: [], metric: 'vessel_arrivals' },
  { id: 'U-HM', orgId: 'ORG-SBMA', name: 'Harbor Master Office', short: 'Harbor Master', domain: 'Berth allocation, safety, security & environment', berths: [] },
  { id: 'U-TA', orgId: 'ORG-TA', name: 'Container Terminal A', short: 'Terminal A', domain: 'Container handling', berths: ['B-01', 'B-02', 'B-03', 'B-04', 'B-13'], metric: 'container_moves' },
  { id: 'U-TB', orgId: 'ORG-TB', name: 'Bulk & Break-bulk Terminal B', short: 'Terminal B', domain: 'Dry bulk / break-bulk', berths: ['B-05', 'B-06', 'B-07', 'B-08', 'B-12', 'B-14', 'B-15'], metric: 'bulk_mt' },
  { id: 'U-TC', orgId: 'ORG-TC', name: 'Liquid Bulk Terminal C', short: 'Terminal C', domain: 'Fuel / liquid bulk', berths: ['B-09', 'B-10', 'B-11'], metric: 'liquid_kl' },
  { id: 'U-AGA', orgId: 'ORG-AGA', name: 'Shipping Agency A', short: 'Agency A', domain: 'Pre-arrival notices & manifests', berths: [] },
  { id: 'U-AGB', orgId: 'ORG-AGB', name: 'Shipping Agency B', short: 'Agency B', domain: 'Pre-arrival notices & manifests', berths: [] },
  { id: 'U-MG', orgId: 'ORG-SBMA', name: 'Port Authority Management', short: 'Management', domain: 'Port-wide statistics & reporting', berths: [] },
  { id: 'U-IT', orgId: 'ORG-SBMA', name: 'Systems & Access Administration', short: 'Systems', domain: 'Access, connectors & audit', berths: [] },
]

/** Home unit of a role within an organization (where its submissions belong). */
export function homeUnit(orgId: string, role: RoleId): string {
  if (role === 'port_control') return 'U-PC'
  if (role === 'harbor_master') return 'U-HM'
  if (role === 'management') return 'U-MG'
  if (role === 'admin') return 'U-IT'
  return units.find((u) => u.orgId === orgId)!.id
}

export const unitById = Object.fromEntries(units.map((u) => [u.id, u])) as Record<string, Unit>
export const orgById = Object.fromEntries(orgs.map((o) => [o.id, o])) as Record<string, Org>
export const terminalUnits = units.filter((u) => ['U-TA', 'U-TB', 'U-TC'].includes(u.id))

export const metricMeta: Record<DailyMetric, { label: string; unit: string; typical: string }> = {
  container_moves: { label: 'Container moves', unit: 'moves', typical: '~100 moves/day' },
  bulk_mt: { label: 'Dry bulk handled', unit: 'MT', typical: '~3,000 MT/day' },
  liquid_kl: { label: 'Liquid bulk handled', unit: 'KL', typical: '~2,500 KL/day' },
  vessel_arrivals: { label: 'Vessel arrivals', unit: 'vessels', typical: '~3 arrivals/day' },
}

/** Which roles each organization can hold in the demo. */
export const rolesForOrg: Record<string, RoleId[]> = {
  'ORG-SBMA': ['port_control', 'harbor_master', 'management', 'admin'],
  'ORG-TA': ['terminal_operator'],
  'ORG-TB': ['terminal_operator'],
  'ORG-TC': ['terminal_operator'],
  'ORG-AGA': ['shipping_agent'],
  'ORG-AGB': ['shipping_agent'],
}

export const perspectiveMeta: Record<Perspective, { label: string; short: string; description: string }> = {
  submission: {
    label: 'Submission Coordinator',
    short: 'Submission',
    description: 'Records and submits data: uploads, API deliveries, operational entries, corrections.',
  },
  management: {
    label: 'Management Viewer',
    short: 'Management',
    description: 'Verifies and approves submissions, monitors KPIs, alerts and AI insights for the authorized scope.',
  },
}

export type ScopeOption = { id: string; label: string; unitIds: string[] }

/** Access scopes a persona may choose (PDD §2: one unit, several units, or port-wide). */
export function scopeOptions(orgId: string, role: RoleId, perspective: Perspective): ScopeOption[] {
  const all = units.map((u) => u.id)
  if (role === 'terminal_operator') {
    const own = units.find((u) => u.orgId === orgId)!
    const opts: ScopeOption[] = [{ id: own.id, label: own.name, unitIds: [own.id] }]
    if (perspective === 'management')
      opts.push({ id: 'multi', label: 'Multi-terminal group (A, B, C) — demo', unitIds: terminalUnits.map((u) => u.id) })
    return opts
  }
  if (role === 'shipping_agent') {
    const own = units.find((u) => u.orgId === orgId)!
    return [{ id: own.id, label: own.name, unitIds: [own.id] }]
  }
  if (perspective === 'submission') {
    const id = homeUnit(orgId, role)
    return [{ id, label: unitById[id].name, unitIds: [id] }]
  }
  return [{ id: 'port', label: 'Port-wide (all units)', unitIds: all }]
}

export const isPortWide = (s: Pick<Session, 'scopeUnitIds'>) => s.scopeUnitIds.length >= units.length

/** Berths visible to a scope; empty array = all berths. */
export function scopeBerths(s: Pick<Session, 'scopeUnitIds' | 'role'>): string[] | null {
  if (s.role !== 'terminal_operator') return null
  return s.scopeUnitIds.flatMap((id) => unitById[id]?.berths ?? [])
}

export const defaultName = (role: RoleId, perspective: Perspective, orgId: string) => {
  const org = orgById[orgId]?.name.replace(/^Demo /, '') ?? ''
  const who = perspective === 'submission' ? 'Coordinator' : 'Manager'
  const r: Record<RoleId, string> = {
    port_control: 'Port Control',
    harbor_master: 'Harbor Master',
    terminal_operator: org,
    shipping_agent: org,
    management: 'Port Authority',
    admin: 'Systems',
  }
  return `Demo ${r[role]} ${who}`
}
