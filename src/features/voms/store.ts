// Demo state. Persisted in the viewer's browser only; "Reset demo data" reseeds
// everything relative to the current time so the presentation can be replayed.
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { can, roleById, type Action } from './roles'
import { agents, DEMO_AGENT_ID, seedBerths, seedCalls, seedIncidents, vessels } from './seed'
import { callStatus, eventShort } from './calc'
import type {
  Berth,
  CargoLine,
  EventKey,
  FeedMessage,
  FeedState,
  Incident,
  Production,
  RoleId,
  Source,
  Vessel,
  VesselCall,
} from './types'

const uid = () => Math.random().toString(36).slice(2, 9)
const nowIso = () => new Date().toISOString()

export class PermissionError extends Error {}

interface Data {
  seededAt: string
  role: RoleId
  vessels: Vessel[]
  berths: Berth[]
  calls: VesselCall[]
  incidents: Incident[]
  feeds: FeedState
  feedLog: FeedMessage[]
  nextCallSeq: number
  nextIncidentSeq: number
}

interface Actions {
  setRole: (r: RoleId) => void
  resetDemo: () => void
  createCall: (input: {
    vesselId: string
    eta: string
    etd: string
    purpose: string
    requestedBerthId?: string
    lastPort: string
    nextPort: string
    cargo: Omit<CargoLine, 'id'>[]
  }) => string
  recordEvent: (callId: string, key: EventKey, time: string, source?: Source, remarks?: string) => void
  verifyEvent: (callId: string, key: EventKey) => void
  verifyAllEvents: (callId: string) => void
  assignBerth: (callId: string, berthId: string, reason: string) => void
  addProduction: (callId: string, lineId: string, qty: number, time: string, source?: Source) => void
  verifyProduction: (callId: string, ids: string[]) => void
  addDelay: (callId: string, category: string, start: string, end: string | undefined, remarks: string) => void
  endDelay: (callId: string, delayId: string) => void
  submitTally: (callId: string) => void
  verifyTally: (callId: string) => void
  closeCall: (callId: string) => void
  reopenCall: (callId: string, reason: string) => void
  reportIncident: (input: Omit<Incident, 'id' | 'reportedBy' | 'status' | 'actions'> & { actions: string[] }) => string
  toggleIncidentAction: (incidentId: string, actionId: string) => void
  setIncidentStatus: (incidentId: string, status: Incident['status']) => void
  setFeed: (feed: keyof FeedState, on: boolean) => void
  ingestAis: (callId: string) => void
  ingestTos: (callId: string) => void
  logFeed: (msg: Omit<FeedMessage, 'id' | 'time'>) => void
}

export type VomsState = Data & Actions

function initialData(role: RoleId = 'harbor_master'): Data {
  const now = Math.floor(Date.now() / 60_000) * 60_000
  return {
    seededAt: new Date(now).toISOString(),
    role,
    vessels,
    berths: seedBerths(now),
    calls: seedCalls(now, vessels),
    incidents: seedIncidents(now),
    feeds: { ais: true, tos: true },
    feedLog: [],
    nextCallSeq: 129,
    nextIncidentSeq: 33,
  }
}

export const useVoms = create<VomsState>()(
  persist(
    (set, get) => {
      const guard = (action: Action) => {
        const role = get().role
        if (!can(role, action)) {
          throw new PermissionError(`${roleById[role].name} is not permitted to: ${action}`)
        }
        return role
      }

      /** Update one call and append an audit entry. */
      const mutate = (callId: string, action: string, detail: string, fn: (c: VesselCall) => VesselCall) => {
        const actor = get().role
        set((s) => ({
          calls: s.calls.map((c) =>
            c.id === callId
              ? {
                  ...fn(c),
                  audit: [...c.audit, { id: uid(), time: nowIso(), actor, action, detail }],
                }
              : c
          ),
        }))
      }

      const assertOpen = (callId: string) => {
        const c = get().calls.find((x) => x.id === callId)
        if (!c) throw new Error('Vessel call not found')
        if (c.closure) throw new PermissionError('Vessel call is closed. Reopen it with an approved reason first.')
        return c
      }

      return {
        ...initialData(),

        setRole: (role) => set({ role }),
        resetDemo: () => set(initialData(get().role)),

        createCall: (input) => {
          const role = guard('call.create')
          const seq = get().nextCallSeq
          const id = `SB-2026-${String(seq).padStart(6, '0')}`
          const vessel = get().vessels.find((v) => v.id === input.vesselId)!
          const duplicate = get().calls.find(
            (c) =>
              c.vesselId === input.vesselId &&
              !c.closure &&
              !c.cancelled &&
              Math.abs(Date.parse(c.events.eta?.time ?? '0') - Date.parse(input.eta)) < 72 * 3600_000
          )
          if (duplicate) {
            throw new Error(`Possible duplicate: ${duplicate.id} already exists for this vessel within 72 h of the ETA.`)
          }
          const call: VesselCall = {
            id,
            vesselId: input.vesselId,
            agentId: role === 'shipping_agent' ? DEMO_AGENT_ID : agents[0].id,
            scenario: vessel.type,
            voyageIn: `D${seq}S`,
            voyageOut: `D${seq}N`,
            purpose: input.purpose,
            requestedBerthId: input.requestedBerthId,
            lastPort: input.lastPort,
            nextPort: input.nextPort,
            events: {
              eta: { time: input.eta, source: 'agent', recordedBy: role, recordedAt: nowIso() },
              etd: { time: input.etd, source: 'agent', recordedBy: role, recordedAt: nowIso() },
            },
            cargo: input.cargo.map((c, i) => ({ ...c, id: `${id}-c${i + 1}` })),
            production: [],
            delays: [],
            audit: [{ id: uid(), time: nowIso(), actor: role, action: 'Created vessel call', detail: 'Pre-arrival notification submitted' }],
          }
          set((s) => ({ calls: [call, ...s.calls], nextCallSeq: seq + 1 }))
          return id
        },

        recordEvent: (callId, key, time, source = 'manual', remarks) => {
          const isEstimate = key === 'eta' || key === 'etd'
          const isTerminalEvent = (key === 'opsStart' || key === 'opsEnd') && get().role === 'terminal_operator'
          const role = guard(isEstimate ? 'call.updateEta' : isTerminalEvent ? 'production.record' : 'event.movement')
          const c = assertOpen(callId)
          if ((key === 'allFast' || key === 'firstLine') && !c.berthId) {
            throw new Error('Assign a berth before recording berthing events.')
          }
          if (key === 'opsStart' && !c.events.allFast) {
            throw new Error('Cargo operations can start only after All Fast is recorded.')
          }
          const prev = c.events[key]
          mutate(
            callId,
            prev ? `Amended ${eventShort[key]}` : `Recorded ${eventShort[key]}`,
            prev ? `Original value retained in history: ${prev.time}` : `Source: ${source}${remarks ? ` — ${remarks}` : ''}`,
            (x) => ({
              ...x,
              events: { ...x.events, [key]: { time, source, recordedBy: role, recordedAt: nowIso(), remarks } },
            })
          )
        },

        verifyEvent: (callId, key) => {
          const role = guard('event.verify')
          const c = assertOpen(callId)
          const ev = c.events[key]
          if (!ev) return
          if (ev.recordedBy === role) throw new PermissionError('The recorder of an event cannot verify it (segregation of duties).')
          mutate(callId, `Verified ${eventShort[key]}`, '', (x) => ({
            ...x,
            events: { ...x.events, [key]: { ...ev, verifiedBy: role, verifiedAt: nowIso() } },
          }))
        },

        verifyAllEvents: (callId) => {
          const role = guard('event.verify')
          const c = assertOpen(callId)
          const keys = (Object.keys(c.events) as EventKey[]).filter(
            (k) => k !== 'eta' && k !== 'etd' && !c.events[k]!.verifiedBy && c.events[k]!.recordedBy !== role
          )
          if (!keys.length) return
          mutate(callId, 'Verified movement events', keys.map((k) => eventShort[k]).join(', '), (x) => {
            const events = { ...x.events }
            for (const k of keys) events[k] = { ...events[k]!, verifiedBy: role, verifiedAt: nowIso() }
            return { ...x, events }
          })
        },

        assignBerth: (callId, berthId, reason) => {
          const role = guard('berth.assign')
          const c = assertOpen(callId)
          const shifting = !!c.events.allFast && !c.events.lastLine && c.berthId !== berthId
          mutate(
            callId,
            shifting ? 'Berth shifting' : c.berthId ? 'Changed berth assignment' : 'Assigned berth',
            `${c.berthId ? `${c.berthId} → ` : ''}${berthId}${reason ? ` — ${reason}` : ''}`,
            (x) => ({ ...x, berthId, berthAssignedBy: role })
          )
        },

        addProduction: (callId, lineId, qty, time, source = 'manual') => {
          const role = source === 'tos_sim' ? 'terminal_operator' : guard('production.record')
          const c = assertOpen(callId)
          const status = callStatus(c)
          if (status !== 'operations') throw new Error('Production can only be recorded while cargo operations are in progress.')
          if (!(qty > 0)) throw new Error('Quantity must be greater than zero.')
          const line = c.cargo.find((l) => l.id === lineId)!
          const p: Production = { id: uid(), lineId, time, qty, source, recordedBy: role, status: 'submitted' }
          mutate(callId, 'Recorded production', `${qty} ${line.unit} — ${line.commodity} (${line.direction})`, (x) => ({
            ...x,
            production: [...x.production, p],
          }))
        },

        verifyProduction: (callId, ids) => {
          const role = guard('production.verify')
          assertOpen(callId)
          mutate(callId, 'Verified production', `${ids.length} entr${ids.length === 1 ? 'y' : 'ies'}`, (x) => ({
            ...x,
            production: x.production.map((p) => (ids.includes(p.id) ? { ...p, status: 'verified' } : p)),
          }))
          void role
        },

        addDelay: (callId, category, start, end, remarks) => {
          const role = guard('delay.record')
          assertOpen(callId)
          mutate(callId, 'Recorded delay', `${category}${remarks ? ` — ${remarks}` : ''}`, (x) => ({
            ...x,
            delays: [...x.delays, { id: uid(), category, start, end, remarks, recordedBy: role }],
          }))
        },

        endDelay: (callId, delayId) => {
          guard('delay.record')
          assertOpen(callId)
          mutate(callId, 'Ended delay', '', (x) => ({
            ...x,
            delays: x.delays.map((d) => (d.id === delayId ? { ...d, end: nowIso() } : d)),
          }))
        },

        submitTally: (callId) => {
          const role = guard('tally.submit')
          const c = assertOpen(callId)
          if (!c.events.opsEnd) throw new Error('Record "Cargo operations completed" before submitting the final tally.')
          mutate(callId, 'Submitted final tally', '', (x) => ({ ...x, finalTally: { submittedBy: role, at: nowIso() } }))
        },

        verifyTally: (callId) => {
          const role = guard('tally.verify')
          const c = assertOpen(callId)
          if (!c.finalTally) throw new Error('No final tally submitted yet.')
          if (c.production.some((p) => p.status !== 'verified'))
            throw new Error('Verify all production entries before verifying the final tally.')
          mutate(callId, 'Verified final tally', '', (x) => ({
            ...x,
            finalTally: { ...x.finalTally!, verifiedBy: role, verifiedAt: nowIso() },
          }))
        },

        closeCall: (callId) => {
          const role = guard('call.close')
          assertOpen(callId)
          mutate(callId, 'Closed vessel call', 'Closure checklist satisfied', (x) => ({ ...x, closure: { by: role, at: nowIso() } }))
        },

        reopenCall: (callId, reason) => {
          guard('call.reopen')
          if (!reason.trim()) throw new Error('A reason is required to reopen a closed vessel call.')
          mutate(callId, 'Reopened vessel call', reason, (x) => ({ ...x, closure: undefined }))
        },

        reportIncident: (input) => {
          const role = guard('incident.report')
          const seq = get().nextIncidentSeq
          const id = `INC-2026-${String(seq).padStart(4, '0')}`
          const inc: Incident = {
            ...input,
            id,
            reportedBy: role,
            status: 'open',
            actions: input.actions.filter(Boolean).map((text) => ({ id: uid(), text, done: false })),
          }
          set((s) => ({ incidents: [inc, ...s.incidents], nextIncidentSeq: seq + 1 }))
          mutate(input.callId, 'Linked incident', `${id} — ${input.title}`, (x) => x)
          return id
        },

        toggleIncidentAction: (incidentId, actionId) => {
          guard('incident.report')
          set((s) => ({
            incidents: s.incidents.map((i) =>
              i.id === incidentId
                ? { ...i, actions: i.actions.map((a) => (a.id === actionId ? { ...a, done: !a.done } : a)) }
                : i
            ),
          }))
        },

        setIncidentStatus: (incidentId, status) => {
          const role = guard(status === 'closed' ? 'incident.close' : 'incident.report')
          const inc = get().incidents.find((i) => i.id === incidentId)!
          if (status === 'closed' && inc.actions.some((a) => !a.done))
            throw new Error('Complete all corrective actions before closing the incident.')
          set((s) => ({
            incidents: s.incidents.map((i) =>
              i.id === incidentId
                ? { ...i, status, ...(status === 'closed' ? { closedBy: role, closedAt: nowIso() } : {}) }
                : i
            ),
          }))
        },

        setFeed: (feed, on) => {
          guard('feed.simulate')
          set((s) => ({ feeds: { ...s.feeds, [feed]: on } }))
        },

        // Simulated interfaces: data arrives tagged with its source and is never
        // treated as verified — an SBMA user must confirm it (BRD 19.7).
        ingestAis: (callId) => {
          guard('feed.simulate')
          const c = assertOpen(callId)
          const log = get().logFeed
          if (!get().feeds.ais) {
            log({ feed: 'AIS', callId, text: 'Feed offline — arrival not detected. Use manual entry (fallback).', outcome: 'queued' })
            throw new Error('AIS feed is offline. Record ATA manually; it will be flagged for reconciliation.')
          }
          if (c.events.ata) {
            log({ feed: 'AIS', callId, text: 'Arrival already recorded — message ignored (no silent overwrite).', outcome: 'rejected' })
            throw new Error('ATA already recorded. The feed does not overwrite existing values.')
          }
          const time = nowIso()
          mutate(callId, 'Received ATA from AIS (simulated)', 'Pending Port Control / Harbor Master verification', (x) => ({
            ...x,
            events: { ...x.events, ata: { time, source: 'ais_sim', recordedBy: 'port_control', recordedAt: time } },
          }))
          log({ feed: 'AIS', callId, text: 'Vessel entered port limits — ATA proposed', outcome: 'accepted_pending' })
        },

        ingestTos: (callId) => {
          guard('feed.simulate')
          const c = assertOpen(callId)
          const log = get().logFeed
          if (!get().feeds.tos) {
            log({ feed: 'TOS', callId, text: 'Feed offline — production batch queued for later processing.', outcome: 'queued' })
            throw new Error('TOS feed is offline. Terminal operator should report production manually.')
          }
          if (callStatus(c) !== 'operations') {
            log({ feed: 'TOS', callId, text: 'Rejected — vessel call is not in cargo operations.', outcome: 'rejected' })
            throw new Error('Vessel call is not in cargo operations.')
          }
          const line = c.cargo.find((l) => c.production.filter((p) => p.lineId === l.id).reduce((a, p) => a + p.qty, 0) < l.declared) ?? c.cargo[0]
          const step = { TEU: 40, MT: 1200, KL: 600, UNIT: 15 }[line.unit]
          const time = nowIso()
          mutate(callId, 'Received production from TOS (simulated)', `${step} ${line.unit} — ${line.commodity}`, (x) => ({
            ...x,
            production: [...x.production, { id: uid(), lineId: line.id, time, qty: step, source: 'tos_sim', recordedBy: 'terminal_operator', status: 'submitted' }],
          }))
          log({ feed: 'TOS', callId, text: `Production batch ${step} ${line.unit} (${line.commodity})`, outcome: 'accepted_pending' })
        },
        logFeed: (msg) => set((s) => ({ feedLog: [{ ...msg, id: uid(), time: nowIso() }, ...s.feedLog].slice(0, 50) })),
      }
    },
    {
      name: 'voms-demo-v1',
      version: 1,
      storage: createJSONStorage(() => {
        try {
          return localStorage
        } catch {
          return sessionStorage
        }
      }),
    }
  )
)

// ---- Selectors -----------------------------------------------------------

export function visibleCalls(s: Pick<VomsState, 'calls' | 'role'>) {
  if (s.role === 'shipping_agent') return s.calls.filter((c) => c.agentId === DEMO_AGENT_ID)
  if (s.role === 'terminal_operator') return s.calls.filter((c) => !!c.berthId)
  return s.calls
}

export const useVessel = (id: string) => useVoms((s) => s.vessels.find((v) => v.id === id))
export const useCan = (action: Action) => useVoms((s) => can(s.role, action))
