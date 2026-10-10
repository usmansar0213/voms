// Simulated demo data. Every name, IMO number and berth here is fictitious and
// labelled DEMO. The 15 berth slots are placeholders pending validation against
// the official SBMA facility register (see BRD Section 5.5).
import type {
  Agent,
  Berth,
  CargoLine,
  Delay,
  EventKey,
  EventRecord,
  Incident,
  Production,
  RoleId,
  Scenario,
  Vessel,
  VesselCall,
} from './types'

/** Builds a syntactically valid IMO number (7 digits, last one is the check digit). */
export function makeImo(six: string) {
  const sum = six.split('').reduce((acc, d, i) => acc + Number(d) * (7 - i), 0)
  return `${six}${sum % 10}`
}

export function isValidImo(imo: string) {
  if (!/^\d{7}$/.test(imo)) return false
  return makeImo(imo.slice(0, 6)) === imo
}

const typeLabel: Record<Scenario, string> = {
  container: 'Container Vessel',
  bulk: 'Bulk Carrier',
  tanker: 'Fuel / Tanker',
  general: 'General Cargo',
}

function vessel(
  id: string,
  name: string,
  six: string,
  type: Scenario,
  loa: number,
  beam: number,
  draft: number,
  gt: number,
  dwt: number,
  flag = 'Demo Flag'
): Vessel {
  return { id, name, imo: makeImo(six), type, typeLabel: typeLabel[type], flag, loa, beam, draft, gt, dwt }
}

export const vessels: Vessel[] = [
  vessel('V-01', 'MV DEMO ZAMBALES EXPRESS', '900101', 'container', 172, 27, 9.5, 17800, 21500),
  vessel('V-02', 'MV DEMO PACIFIC TRADER', '900102', 'container', 200, 30, 11, 25300, 30100),
  vessel('V-03', 'MV DEMO LUZON BULKER', '900103', 'bulk', 190, 32, 12.2, 31200, 56000),
  vessel('V-04', 'MV DEMO VISAYAS GRAIN', '900104', 'bulk', 180, 30, 11, 24000, 42000),
  vessel('V-05', 'MT DEMO SUBIC SPIRIT', '900105', 'tanker', 183, 32, 10.5, 29700, 49900),
  vessel('V-06', 'MT DEMO BATAAN FUEL', '900106', 'tanker', 140, 22, 8, 8500, 12600),
  vessel('V-07', 'MV DEMO OLONGAPO STAR', '900107', 'general', 120, 20, 7.5, 6400, 8800),
  vessel('V-08', 'MV DEMO MANILA LINK', '900108', 'container', 150, 24, 8.8, 11200, 14000),
  vessel('V-09', 'MV DEMO MINDORO CARRIER', '900109', 'bulk', 160, 26, 9.8, 16500, 28000),
]

export const agents: Agent[] = [
  { id: 'AG-01', name: 'Demo Shipping Agency A' },
  { id: 'AG-02', name: 'Demo Shipping Agency B' },
]


function berth(n: number, maxLoa: number, maxDraft: number, accepts: Scenario[]): Berth {
  const id = `B-${String(n).padStart(2, '0')}`
  return { id, name: `Berth ${id}`, maxLoa, maxDraft, accepts }
}

export function seedBerths(now: number): Berth[] {
  const list = [
    berth(1, 250, 13, ['container']),
    berth(2, 250, 13, ['container']),
    berth(3, 230, 12.5, ['container', 'general']),
    berth(4, 200, 11, ['container', 'general']),
    berth(5, 220, 12.5, ['bulk']),
    berth(6, 220, 12.5, ['bulk']),
    berth(7, 200, 12, ['bulk', 'general']),
    berth(8, 180, 11, ['bulk', 'general']),
    berth(9, 200, 11.5, ['tanker']),
    berth(10, 180, 11, ['tanker']),
    berth(11, 150, 9.5, ['tanker']),
    berth(12, 150, 9, ['general', 'bulk']),
    berth(13, 150, 9, ['general', 'container']),
    berth(14, 130, 8, ['general']),
    berth(15, 120, 7.5, ['general']),
  ]
  list[13].maintenance = {
    reason: 'Fender repair (demo restriction)',
    until: new Date(now + 72 * 3600_000).toISOString(),
  }
  return list
}

// ---------------------------------------------------------------------------
// Vessel calls

type EventSpec = Partial<Record<EventKey, number | [number, { source?: EventRecord['source']; verified?: boolean }]>>

interface CallSpec {
  seq: number
  vesselId: string
  agentId: string
  purpose: string
  berthId?: string
  requestedBerthId?: string
  lastPort: string
  nextPort: string
  events: EventSpec
  cargo: Omit<CargoLine, 'id'>[]
  /** production per cargo line: list of [hour offset, qty, source?, verified?] */
  production?: [number, number, number, ('manual' | 'tos_sim')?, boolean?][]
  /** [category, start offset h, end offset h | undefined, remarks] */
  delays?: [string, number, number | undefined, string][]
  tally?: 'submitted' | 'verified'
  closedAt?: number
}

const recorderFor: Record<EventKey, RoleId> = {
  eta: 'shipping_agent',
  etd: 'shipping_agent',
  ata: 'port_control',
  pilotOn: 'port_control',
  firstLine: 'port_control',
  allFast: 'port_control',
  opsStart: 'terminal_operator',
  opsEnd: 'terminal_operator',
  lastLine: 'port_control',
  atd: 'port_control',
}

function buildCall(spec: CallSpec, now: number, scenarioOf: (vid: string) => Scenario): VesselCall {
  const at = (h: number) => new Date(now + h * 3600_000).toISOString()
  const id = `SB-2026-${String(spec.seq).padStart(6, '0')}`
  const events: VesselCall['events'] = {}
  const audit: VesselCall['audit'] = []

  for (const [key, raw] of Object.entries(spec.events) as [EventKey, EventSpec[EventKey]][]) {
    if (raw === undefined) continue
    const [h, opt] = Array.isArray(raw) ? raw : [raw, {}]
    const isActual = !['eta', 'etd'].includes(key)
    const verified = opt.verified ?? (isActual && h < -1)
    const source = opt.source ?? (key === 'eta' || key === 'etd' ? 'agent' : 'manual')
    events[key] = {
      time: at(h),
      source,
      recordedBy: recorderFor[key],
      recordedAt: at(Math.min(h + 0.25, 0)),
      ...(verified && key !== 'eta' && key !== 'etd'
        ? { verifiedBy: 'harbor_master' as RoleId, verifiedAt: at(Math.min(h + 1, 0)) }
        : {}),
    }
    audit.push({
      id: `${id}-a-${key}`,
      time: at(Math.min(h + 0.25, 0)),
      actor: recorderFor[key],
      action: `Recorded ${key.toUpperCase()}`,
      detail: `Source: ${source === 'agent' ? 'agent notice' : source}`,
    })
  }

  const cargo: CargoLine[] = spec.cargo.map((c, i) => ({ ...c, id: `${id}-c${i + 1}` }))
  const production: Production[] = (spec.production ?? []).map(([line, h, qty, source, verified], i) => ({
    id: `${id}-p${i + 1}`,
    lineId: cargo[line].id,
    time: at(h),
    qty,
    source: source ?? 'manual',
    recordedBy: 'terminal_operator',
    status: verified === false ? 'submitted' : h < -3 ? 'verified' : 'submitted',
  }))

  const delays: Delay[] = (spec.delays ?? []).map(
    ([category, start, end, remarks], i) => ({
      id: `${id}-d${i + 1}`,
      category,
      start: at(start),
      end: end === undefined ? undefined : at(end),
      remarks,
      recordedBy: 'terminal_operator',
    })
  )

  const call: VesselCall = {
    id,
    vesselId: spec.vesselId,
    agentId: spec.agentId,
    scenario: scenarioOf(spec.vesselId),
    voyageIn: `${spec.seq % 2 ? 'V' : 'N'}${(spec.seq * 7) % 90 + 10}S`,
    voyageOut: `${spec.seq % 2 ? 'V' : 'N'}${(spec.seq * 7) % 90 + 10}N`,
    purpose: spec.purpose,
    requestedBerthId: spec.requestedBerthId ?? spec.berthId,
    berthId: spec.berthId,
    berthAssignedBy: spec.berthId ? 'harbor_master' : undefined,
    lastPort: spec.lastPort,
    nextPort: spec.nextPort,
    events,
    cargo,
    production,
    delays,
    audit: audit.sort((a, b) => a.time.localeCompare(b.time)),
  }
  if (spec.tally) {
    const t = events.opsEnd ? Date.parse(events.opsEnd.time) : now
    call.finalTally = {
      submittedBy: 'terminal_operator',
      at: new Date(t + 0.5 * 3600_000).toISOString(),
      ...(spec.tally === 'verified'
        ? { verifiedBy: 'harbor_master' as RoleId, verifiedAt: new Date(t + 1.5 * 3600_000).toISOString() }
        : {}),
    }
  }
  if (spec.closedAt !== undefined) {
    call.closure = { by: 'harbor_master', at: at(spec.closedAt) }
    call.audit.push({ id: `${id}-a-close`, time: at(spec.closedAt), actor: 'harbor_master', action: 'Closed vessel call', detail: 'Closure checklist satisfied' })
  }
  return call
}

/** A fully completed call starting `start` hours from now. */
function historic(
  seq: number,
  vesselId: string,
  agentId: string,
  berthId: string,
  start: number,
  wait: number,
  ops: number,
  cargo: Omit<CargoLine, 'id'>[],
  lastPort: string,
  nextPort: string
): CallSpec {
  const allFast = start + wait + 1.5
  const opsStart = allFast + 1
  const opsEnd = opsStart + ops
  const lastLine = opsEnd + 2
  const atd = lastLine + 0.7
  return {
    seq,
    vesselId,
    agentId,
    berthId,
    purpose: 'Cargo operations',
    lastPort,
    nextPort,
    events: {
      eta: start - 0.5,
      ata: start,
      pilotOn: start + wait,
      firstLine: allFast - 0.4,
      allFast,
      opsStart,
      opsEnd,
      lastLine,
      atd,
      etd: atd - 1,
    },
    cargo,
    production: cargo.flatMap((c, i) => {
      const parts = 4
      return Array.from({ length: parts }, (_, k) => [
        i,
        opsStart + ((k + 1) * ops) / parts,
        k === parts - 1 ? c.declared - Math.round(c.declared / parts) * (parts - 1) : Math.round(c.declared / parts),
        k % 2 ? 'tos_sim' : 'manual',
        true,
      ]) as [number, number, number, 'manual' | 'tos_sim', boolean][]
    }),
    tally: 'verified',
    closedAt: atd + 3,
  }
}

export function seedCalls(now: number, vesselList: Vessel[]): VesselCall[] {
  const scenarioOf = (vid: string) => vesselList.find((v) => v.id === vid)!.type
  const specs: CallSpec[] = [
    // ---- Closed history (last ~7 days) for KPIs
    historic(114, 'V-08', 'AG-01', 'B-03', -168, 2, 14, [
      { commodity: 'Containers (laden)', category: 'Containerized', direction: 'discharge', unit: 'TEU', declared: 380 },
      { commodity: 'Containers (laden)', category: 'Containerized', direction: 'load', unit: 'TEU', declared: 290 },
    ], 'Demo Port North', 'Demo Port South'),
    historic(115, 'V-06', 'AG-02', 'B-10', -150, 1, 18, [
      { commodity: 'Diesel (Gasoil)', category: 'Liquid bulk — petroleum', direction: 'discharge', unit: 'KL', declared: 6200, dangerous: true },
    ], 'Demo Refinery Port', 'Demo Port East'),
    historic(116, 'V-04', 'AG-02', 'B-07', -132, 6, 40, [
      { commodity: 'Wheat', category: 'Dry bulk — grain', direction: 'discharge', unit: 'MT', declared: 22000 },
    ], 'Demo Grain Terminal', 'Demo Port West'),
    historic(117, 'V-07', 'AG-01', 'B-12', -110, 3, 16, [
      { commodity: 'Steel coils', category: 'Break bulk', direction: 'discharge', unit: 'MT', declared: 4200 },
      { commodity: 'Vehicles', category: 'Ro-Ro / units', direction: 'discharge', unit: 'UNIT', declared: 120 },
    ], 'Demo Port North', 'Demo Port South'),
    historic(118, 'V-02', 'AG-01', 'B-01', -90, 1, 20, [
      { commodity: 'Containers (laden)', category: 'Containerized', direction: 'discharge', unit: 'TEU', declared: 820 },
      { commodity: 'Containers (empty)', category: 'Containerized', direction: 'load', unit: 'TEU', declared: 610 },
    ], 'Demo Hub Port', 'Demo Port North'),
    historic(119, 'V-03', 'AG-02', 'B-05', -80, 9, 34, [
      { commodity: 'Coal', category: 'Dry bulk — mineral', direction: 'discharge', unit: 'MT', declared: 18000 },
    ], 'Demo Coal Port', 'Demo Port West'),

    // ---- Departed, awaiting closure
    {
      seq: 121,
      vesselId: 'V-02',
      agentId: 'AG-01',
      berthId: 'B-01',
      purpose: 'Cargo operations',
      lastPort: 'Demo Port North',
      nextPort: 'Demo Hub Port',
      events: { eta: -31, ata: -30.5, pilotOn: -29, firstLine: -28.4, allFast: -28, opsStart: -27, opsEnd: -8, lastLine: -5, atd: [-4.3, { verified: false }], etd: -5 },
      cargo: [
        { commodity: 'Containers (laden)', category: 'Containerized', direction: 'discharge', unit: 'TEU', declared: 540 },
        { commodity: 'Containers (laden)', category: 'Containerized', direction: 'load', unit: 'TEU', declared: 470 },
      ],
      production: [
        [0, -24, 180, 'tos_sim'], [0, -20, 190, 'tos_sim'], [0, -16, 170, 'manual'],
        [1, -14, 160, 'tos_sim'], [1, -11, 150, 'tos_sim'], [1, -8.5, 160, 'manual'],
      ],
      tally: 'verified',
    },

    // ---- Bulk, operations completed, tally awaiting verification
    {
      seq: 120,
      vesselId: 'V-09',
      agentId: 'AG-01',
      berthId: 'B-06',
      purpose: 'Cargo operations',
      lastPort: 'Demo Cement Port',
      nextPort: 'Demo Port East',
      events: { eta: -61, ata: -60, pilotOn: -57.5, firstLine: -56.4, allFast: -56, opsStart: -55, opsEnd: [-3, { verified: false }], etd: 2 },
      cargo: [{ commodity: 'Cement clinker', category: 'Dry bulk — mineral', direction: 'discharge', unit: 'MT', declared: 12000 }],
      production: [[0, -48, 3100], [0, -36, 3000], [0, -22, 2950], [0, -10, 2400], [0, -3, 550, 'manual', false]],
      delays: [['Equipment breakdown', -30, -26.5, 'Grab crane hydraulic fault (demo)']],
      tally: 'submitted',
    },

    // ---- Bulk carrier, coal discharge in progress (60%)
    {
      seq: 122,
      vesselId: 'V-03',
      agentId: 'AG-02',
      berthId: 'B-05',
      purpose: 'Cargo operations',
      lastPort: 'Demo Coal Port',
      nextPort: 'Demo Port West',
      events: { eta: -41, ata: -40, pilotOn: -37.2, firstLine: -36.5, allFast: -36, opsStart: -35, etd: 22 },
      cargo: [{ commodity: 'Coal', category: 'Dry bulk — mineral', direction: 'discharge', unit: 'MT', declared: 25000 }],
      production: [
        [0, -30, 2600, 'tos_sim'], [0, -24, 2700, 'tos_sim'], [0, -18, 2500, 'tos_sim'],
        [0, -12, 2600, 'manual'], [0, -6, 2500, 'tos_sim'], [0, -1, 2100, 'tos_sim'],
      ],
      delays: [['Weather — rain', -16, -14, 'Hatches closed during heavy rain (demo)']],
    },

    // ---- Tanker discharging fuel
    {
      seq: 123,
      vesselId: 'V-05',
      agentId: 'AG-01',
      berthId: 'B-09',
      purpose: 'Liquid cargo discharge',
      lastPort: 'Demo Refinery Port',
      nextPort: 'Demo Refinery Port',
      events: { eta: -10.5, ata: -10, pilotOn: [-9, { source: 'manual' }], firstLine: -8.4, allFast: -8, opsStart: -6, etd: 14 },
      cargo: [
        { commodity: 'Gasoline (Mogas)', category: 'Liquid bulk — petroleum', direction: 'discharge', unit: 'KL', declared: 6000, dangerous: true },
        { commodity: 'Diesel (Gasoil)', category: 'Liquid bulk — petroleum', direction: 'discharge', unit: 'KL', declared: 8000, dangerous: true },
      ],
      production: [[0, -4, 1700, 'manual'], [0, -1.5, 1500, 'manual'], [1, -1, 1500, 'manual', false]],
    },

    // ---- Container vessel working
    {
      seq: 124,
      vesselId: 'V-01',
      agentId: 'AG-01',
      berthId: 'B-02',
      purpose: 'Cargo operations',
      lastPort: 'Demo Hub Port',
      nextPort: 'Demo Port North',
      events: { eta: -21, ata: -20, pilotOn: -18.7, firstLine: -17.4, allFast: -17, opsStart: -16, etd: 6 },
      cargo: [
        { commodity: 'Containers (laden)', category: 'Containerized', direction: 'discharge', unit: 'TEU', declared: 640 },
        { commodity: 'Containers (laden)', category: 'Containerized', direction: 'load', unit: 'TEU', declared: 420 },
      ],
      production: [
        [0, -13, 160, 'tos_sim'], [0, -10, 170, 'tos_sim'], [0, -7, 150, 'tos_sim'],
        [1, -4, 70, 'tos_sim'], [1, -1, 50, 'tos_sim', false],
      ],
    },

    // ---- General cargo at anchorage, waiting for berth
    {
      seq: 125,
      vesselId: 'V-07',
      agentId: 'AG-02',
      requestedBerthId: 'B-12',
      purpose: 'Cargo operations',
      lastPort: 'Demo Port South',
      nextPort: 'Demo Port North',
      events: { eta: -6, ata: [-5, { source: 'ais_sim', verified: false }], etd: 30 },
      cargo: [{ commodity: 'Bagged rice', category: 'Break bulk', direction: 'discharge', unit: 'MT', declared: 5200 }],
    },

    // ---- Expected arrivals
    {
      seq: 126,
      vesselId: 'V-08',
      agentId: 'AG-01',
      requestedBerthId: 'B-03',
      berthId: 'B-03',
      purpose: 'Cargo operations',
      lastPort: 'Demo Port South',
      nextPort: 'Demo Hub Port',
      events: { eta: 6, etd: 26 },
      cargo: [
        { commodity: 'Containers (laden)', category: 'Containerized', direction: 'discharge', unit: 'TEU', declared: 310 },
        { commodity: 'Containers (empty)', category: 'Containerized', direction: 'load', unit: 'TEU', declared: 280 },
      ],
    },
    {
      seq: 127,
      vesselId: 'V-04',
      agentId: 'AG-02',
      requestedBerthId: 'B-07',
      purpose: 'Cargo operations',
      lastPort: 'Demo Grain Terminal',
      nextPort: 'Demo Port West',
      events: { eta: 20, etd: 70 },
      cargo: [{ commodity: 'Wheat', category: 'Dry bulk — grain', direction: 'discharge', unit: 'MT', declared: 30000 }],
    },
    {
      seq: 128,
      vesselId: 'V-06',
      agentId: 'AG-01',
      requestedBerthId: 'B-10',
      purpose: 'Liquid cargo discharge',
      lastPort: 'Demo Refinery Port',
      nextPort: 'Demo Port East',
      events: { eta: 30, etd: 52 },
      cargo: [{ commodity: 'Diesel (Gasoil)', category: 'Liquid bulk — petroleum', direction: 'discharge', unit: 'KL', declared: 5000, dangerous: true }],
    },
  ]
  return specs.map((s) => buildCall(s, now, scenarioOf)).sort((a, b) => b.id.localeCompare(a.id))
}

export function seedIncidents(now: number): Incident[] {
  const at = (h: number) => new Date(now + h * 3600_000).toISOString()
  return [
    {
      id: 'INC-2026-0032',
      callId: 'SB-2026-000123',
      type: 'dangerous_cargo',
      severity: 'low',
      title: 'Minor drip at manifold flange — contained',
      description: 'Drip observed at discharge manifold flange; drip tray in place, flange re-tightened. Simulated record.',
      time: at(-2),
      reportedBy: 'terminal_operator',
      status: 'open',
      actions: [
        { id: 'a1', text: 'Re-tighten flange and monitor', done: true },
        { id: 'a2', text: 'Confirm no product reached water', done: false },
      ],
    },
    {
      id: 'INC-2026-0031',
      callId: 'SB-2026-000122',
      type: 'environmental',
      severity: 'medium',
      title: 'Coal dust emission during grab discharge',
      description: 'Visible dust plume during grab discharge in strong wind. Water spray activated. Simulated record.',
      time: at(-20),
      reportedBy: 'port_control',
      status: 'under_review',
      actions: [
        { id: 'a1', text: 'Activate dust suppression spray', done: true },
        { id: 'a2', text: 'Reduce grab drop height', done: true },
        { id: 'a3', text: 'Environmental officer inspection', done: false },
      ],
    },
    {
      id: 'INC-2026-0030',
      callId: 'SB-2026-000119',
      type: 'safety',
      severity: 'low',
      title: 'Mooring line chafing observed',
      description: 'Chafing on stern line; line replaced by crew. Simulated record.',
      time: at(-60),
      reportedBy: 'port_control',
      status: 'closed',
      actions: [{ id: 'a1', text: 'Replace chafed mooring line', done: true }],
      closedBy: 'harbor_master',
      closedAt: at(-55),
    },
  ]
}
