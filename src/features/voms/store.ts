// Demo state. Persisted in the viewer's browser only; "Reset demo data" reseeds
// everything relative to the current time so the presentation can be replayed.
import { format } from 'date-fns'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { useShallow } from 'zustand/react/shallow'
import { can, roleById, type Action, type Actor } from './roles'
import { agents, seedBerths, seedCalls, seedIncidents, vessels } from './seed'
import { seedAlerts, seedConnectors, seedDaily, seedSubmissions } from './seed-pdd'
import { callStatus, eventShort } from './calc'
import { homeUnit, isPortWide, orgById, scopeBerths, scopeOptions, unitById, units } from './org'
import { check, extract, templates } from './submissions'
import type {
  Alert,
  Berth,
  CargoLine,
  Connector,
  DailyStat,
  EventKey,
  Incident,
  Perspective,
  Production,
  RoleId,
  Session,
  Source,
  Submission,
  Vessel,
  VesselCall,
} from './types'

const uid = () => Math.random().toString(36).slice(2, 9)
const nowIso = () => new Date().toISOString()

export class PermissionError extends Error {}

interface Data {
  seededAt: string
  session: Session | null
  /** Mirrors session.role / session.perspective for permission checks. */
  role: RoleId
  perspective: Perspective
  vessels: Vessel[]
  berths: Berth[]
  calls: VesselCall[]
  incidents: Incident[]
  daily: DailyStat[]
  submissions: Submission[]
  connectors: Connector[]
  alerts: Alert[]
  nextCallSeq: number
  nextIncidentSeq: number
  nextAlertSeq: number
  nextSubmissionSeq: number
}

interface Actions {
  login: (s: Session) => void
  logout: () => void
  switchPerspective: (p: Perspective) => void
  resetDemo: () => void
  // Operational vessel-call actions
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
  // Submissions (PDD §5)
  uploadSubmission: (input: { templateId: string; variantId: string; fileName?: string; channel?: 'upload' | 'api' }) => string
  correctField: (subId: string, key: string, value: string) => void
  submitSubmission: (subId: string) => void
  approveSubmission: (subId: string) => void
  rejectSubmission: (subId: string, reason: string) => void
  // API connectors
  simulateFailure: (connectorId: string) => void
  retryConnector: (connectorId: string) => void
  resolveMapping: (connectorId: string) => void
  ingestAis: (callId: string) => void
  ingestTos: (callId: string) => void
  // Alerts
  acknowledgeAlert: (id: string) => void
  resolveAlert: (id: string, note: string) => void
}

export type VomsState = Data & Actions

function initialData(session: Session | null = null): Data {
  const now = Math.floor(Date.now() / 60_000) * 60_000
  const daily = seedDaily(now)
  return {
    seededAt: new Date(now).toISOString(),
    session,
    role: session?.role ?? 'management',
    perspective: session?.perspective ?? 'management',
    vessels,
    berths: seedBerths(now),
    calls: seedCalls(now, vessels),
    incidents: seedIncidents(now),
    daily,
    submissions: seedSubmissions(now, daily),
    connectors: seedConnectors(now),
    alerts: seedAlerts(now),
    nextCallSeq: 129,
    nextIncidentSeq: 33,
    nextAlertSeq: 108,
    nextSubmissionSeq: 1,
  }
}

export const useVoms = create<VomsState>()(
  persist(
    (set, get) => {
      const who = () => get().session?.name ?? roleById[get().role].name

      const guard = (action: Action) => {
        const { role, perspective, session } = get()
        if (!session) throw new PermissionError('Sign in to the demo first.')
        if (!can({ role, perspective }, action)) {
          throw new PermissionError(
            `${roleById[role].name} (${perspective === 'submission' ? 'Submission' : 'Management'} perspective) is not permitted to perform this action.`
          )
        }
        return role
      }

      /** Update one call and append an audit entry. */
      const mutate = (callId: string, action: string, detail: string, fn: (c: VesselCall) => VesselCall) => {
        const actor = get().role
        const by = who()
        set((s) => ({
          calls: s.calls.map((c) =>
            c.id === callId ? { ...fn(c), audit: [...c.audit, { id: uid(), time: nowIso(), actor, by, action, detail }] } : c
          ),
        }))
      }

      const assertOpen = (callId: string) => {
        const c = get().calls.find((x) => x.id === callId)
        if (!c) throw new Error('Vessel call not found')
        if (c.closure) throw new PermissionError('Vessel call is closed. Reopen it with an approved reason first.')
        return c
      }

      const addAlert = (a: Omit<Alert, 'id' | 'time' | 'status'>) => {
        const seq = get().nextAlertSeq
        set((s) => ({
          alerts: [{ ...a, id: `AL-${String(seq).padStart(4, '0')}`, time: nowIso(), status: 'open' }, ...s.alerts],
          nextAlertSeq: seq + 1,
        }))
      }

      const mutateSub = (id: string, action: string, fn: (x: Submission) => Submission) =>
        set((s) => ({
          submissions: s.submissions.map((x) =>
            x.id === id ? { ...fn(x), history: [...x.history, { time: nowIso(), who: who(), action }] } : x
          ),
        }))

      const mutateConn = (id: string, fn: (c: Connector) => Connector) =>
        set((s) => ({ connectors: s.connectors.map((c) => (c.id === id ? fn(c) : c)) }))

      const log = (c: Connector, level: 'info' | 'warn' | 'error', message: string) => [{ time: nowIso(), level, message }, ...c.log].slice(0, 30)

      return {
        ...initialData(),

        login: (session) => set({ session, role: session.role, perspective: session.perspective }),
        logout: () => set({ session: null }),
        switchPerspective: (p) => {
          const s = get().session
          if (!s) return
          const scope = scopeOptions(s.orgId, s.role, p)[0]
          const name = s.name.replace(/ (Coordinator|Manager)$/, p === 'submission' ? ' Coordinator' : ' Manager')
          set({ session: { ...s, perspective: p, name, scopeUnitIds: scope.unitIds, scopeLabel: scope.label }, perspective: p })
        },
        resetDemo: () => set(initialData(get().session)),

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
          const agentId = orgById[get().session!.orgId]?.agentId ?? agents[0].id
          const call: VesselCall = {
            id,
            vesselId: input.vesselId,
            agentId,
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
            audit: [{ id: uid(), time: nowIso(), actor: role, by: who(), action: 'Created vessel call', detail: 'Pre-arrival notification submitted' }],
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
            (x) => ({ ...x, events: { ...x.events, [key]: { time, source, recordedBy: role, recordedAt: nowIso(), remarks } } })
          )
        },

        verifyEvent: (callId, key) => {
          const role = guard('event.verify')
          const c = assertOpen(callId)
          const ev = c.events[key]
          if (!ev) return
          mutate(callId, `Verified ${eventShort[key]}`, '', (x) => ({
            ...x,
            events: { ...x.events, [key]: { ...ev, verifiedBy: role, verifiedAt: nowIso() } },
          }))
        },

        verifyAllEvents: (callId) => {
          const role = guard('event.verify')
          const c = assertOpen(callId)
          const keys = (Object.keys(c.events) as EventKey[]).filter((k) => k !== 'eta' && k !== 'etd' && !c.events[k]!.verifiedBy)
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
          const role = guard('production.record')
          const c = assertOpen(callId)
          if (callStatus(c) !== 'operations') throw new Error('Production can only be recorded while cargo operations are in progress.')
          if (!(qty > 0)) throw new Error('Quantity must be greater than zero.')
          const line = c.cargo.find((l) => l.id === lineId)!
          const p: Production = { id: uid(), lineId, time, qty, source, recordedBy: role, status: 'submitted' }
          mutate(callId, 'Recorded production', `${qty} ${line.unit} — ${line.commodity} (${line.direction})`, (x) => ({
            ...x,
            production: [...x.production, p],
          }))
        },

        verifyProduction: (callId, ids) => {
          guard('production.verify')
          assertOpen(callId)
          mutate(callId, 'Verified production', `${ids.length} entr${ids.length === 1 ? 'y' : 'ies'}`, (x) => ({
            ...x,
            production: x.production.map((p) => (ids.includes(p.id) ? { ...p, status: 'verified' } : p)),
          }))
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
          const call = get().calls.find((c) => c.id === input.callId)
          const unit = units.find((u) => call?.berthId && u.berths.includes(call.berthId))
          addAlert({
            severity: input.severity === 'critical' ? 'critical' : input.severity === 'high' ? 'serious' : input.severity === 'medium' ? 'warning' : 'info',
            category: input.type === 'environmental' ? 'environment' : 'incident',
            title: input.title,
            evidence: `Linked incident ${id} reported by ${who()}.`,
            unitId: unit?.id ?? 'U-HM',
            callId: input.callId,
            ownerRole: 'harbor_master',
          })
          return id
        },

        toggleIncidentAction: (incidentId, actionId) => {
          guard('incident.report')
          set((s) => ({
            incidents: s.incidents.map((i) =>
              i.id === incidentId ? { ...i, actions: i.actions.map((a) => (a.id === actionId ? { ...a, done: !a.done } : a)) } : i
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
              i.id === incidentId ? { ...i, status, ...(status === 'closed' ? { closedBy: role, closedAt: nowIso() } : {}) } : i
            ),
          }))
        },

        // ---- Submissions --------------------------------------------------

        uploadSubmission: ({ templateId, variantId, fileName, channel = 'upload' }) => {
          const role = guard('submission.upload')
          const s = get().session!
          const tpl = templates.find((t) => t.id === templateId)!
          const variant = tpl.variants.find((v) => v.id === variantId)!
          const unitId = homeUnit(s.orgId, role)
          const fields = extract(tpl, variant)
          const { validation, anomalies } = check(tpl, fields, unitId, get().daily, get().calls.map((c) => c.id))
          const seq = get().nextSubmissionSeq
          const id = `SUB-${unitId.slice(2)}-N${String(seq).padStart(3, '0')}`
          const today = format(new Date(), 'yyyy-MM-dd')
          const sub: Submission = {
            id,
            orgId: s.orgId,
            unitId,
            role,
            channel,
            reportType: tpl.reportType,
            fileName: fileName || `${tpl.filePrefix}_${today}.${tpl.format}`,
            format: tpl.format,
            reportDate: today,
            callId: fields.find((f) => f.key === 'callId')?.value || undefined,
            receivedAt: nowIso(),
            submittedBy: s.name,
            status: 'review',
            fields,
            validation,
            anomalies,
            history: [{ time: nowIso(), who: s.name, action: `Received via ${channel === 'api' ? 'API' : 'upload'}; extracted with simulated AI (sample: ${variant.label})` }],
          }
          set((st) => ({ submissions: [sub, ...st.submissions], nextSubmissionSeq: seq + 1 }))
          return id
        },

        correctField: (subId, key, value) => {
          guard('submission.upload')
          const sub = get().submissions.find((x) => x.id === subId)!
          if (sub.status !== 'review') throw new Error('Only submissions in review can be corrected.')
          const tpl = templates.find((t) => t.reportType === sub.reportType)!
          const fields = sub.fields.map((f) =>
            f.key === key ? { ...f, value, original: f.original ?? f.value, confidence: 1 } : f
          )
          const { validation, anomalies } = check(tpl, fields, sub.unitId, get().daily, get().calls.map((c) => c.id))
          const label = sub.fields.find((f) => f.key === key)!.label
          mutateSub(subId, `Corrected ${label}: ${sub.fields.find((f) => f.key === key)!.value} → ${value}`, (x) => ({
            ...x,
            fields,
            validation,
            anomalies,
          }))
        },

        submitSubmission: (subId) => {
          guard('submission.upload')
          const sub = get().submissions.find((x) => x.id === subId)!
          if (sub.status !== 'review') return
          if (sub.validation.length) throw new Error('Resolve validation errors before submitting.')
          const tpl = templates.find((t) => t.reportType === sub.reportType)!
          const metricDef = tpl.fields.find((f) => f.metric)
          mutateSub(subId, sub.anomalies.length ? 'Submitted for approval with anomaly flags' : 'Submitted for approval', (x) => ({ ...x, status: 'submitted' }))
          if (metricDef) {
            const value = Number(sub.fields.find((f) => f.key === metricDef.key)!.value.replace(/,/g, ''))
            set((s) => ({
              daily: [
                ...s.daily.filter((d) => !(d.unitId === sub.unitId && d.date === sub.reportDate && d.metric === metricDef.metric)),
                { unitId: sub.unitId, date: sub.reportDate, metric: metricDef.metric!, value, status: 'pending_review', submissionId: sub.id },
              ],
            }))
          }
          if (sub.anomalies.length) {
            addAlert({
              severity: 'warning',
              category: 'data_anomaly',
              title: `Anomaly in ${sub.reportType} — ${unitById[sub.unitId].short}`,
              evidence: `${sub.anomalies.join('; ')}. Submission ${sub.id}. Review flag, not proof of erroneous data.`,
              unitId: sub.unitId,
              callId: sub.callId,
              ownerRole: sub.role,
            })
          }
          // Missing-submission alerts for this unit are satisfied by a new submission.
          set((s) => ({
            alerts: s.alerts.map((a) =>
              a.unitId === sub.unitId && a.category === 'missing_submission' && a.status !== 'resolved'
                ? { ...a, status: 'resolved', resolvedBy: who(), resolvedAt: nowIso(), resolution: `Report received (${sub.id})` }
                : a
            ),
          }))
        },

        approveSubmission: (subId) => {
          const role = guard('submission.approve')
          const s = get().session!
          const sub = get().submissions.find((x) => x.id === subId)!
          if (sub.status !== 'submitted') throw new Error('Only submitted reports can be approved.')
          if (sub.role !== role || sub.orgId !== s.orgId || !s.scopeUnitIds.includes(sub.unitId))
            throw new PermissionError('Approval belongs to the management perspective of the submitting organization and role.')
          if (sub.submittedBy === s.name) throw new PermissionError('The submitter cannot approve their own submission (segregation of duties).')
          mutateSub(subId, 'Approved and published to dashboards', (x) => ({ ...x, status: 'approved', approvedBy: s.name, approvedAt: nowIso() }))
          set((st) => ({ daily: st.daily.map((d) => (d.submissionId === subId ? { ...d, status: 'published' } : d)) }))
        },

        rejectSubmission: (subId, reason) => {
          guard('submission.approve')
          const s = get().session!
          const sub = get().submissions.find((x) => x.id === subId)!
          if (sub.role !== s.role || sub.orgId !== s.orgId) throw new PermissionError('Outside your approval authority.')
          if (!reason.trim()) throw new Error('A reason is required to return a submission.')
          mutateSub(subId, `Returned to coordinator: ${reason}`, (x) => ({ ...x, status: 'rejected', rejectedReason: reason }))
          set((st) => ({ daily: st.daily.filter((d) => d.submissionId !== subId) }))
        },

        // ---- Connectors ---------------------------------------------------

        simulateFailure: (connectorId) => {
          guard('connector.simulate')
          const c = get().connectors.find((x) => x.id === connectorId)!
          mutateConn(connectorId, (x) => ({
            ...x,
            status: 'failed',
            lastAttempt: nowIso(),
            failure24h: x.failure24h + 3,
            retryQueue: x.retryQueue + 5,
            log: log(x, 'error', 'HTTP 503 from source system — 3 attempts failed; 5 messages queued for retry'),
          }))
          addAlert({
            severity: 'serious',
            category: 'api_failure',
            title: `${c.name.replace(' (simulated)', '')} — transmission failure`,
            evidence: 'Source system returned HTTP 503 (simulated). Data freshness will degrade until delivery resumes.',
            unitId: c.unitId,
            ownerRole: c.system === 'AIS/VTMS' ? 'port_control' : 'terminal_operator',
          })
        },

        retryConnector: (connectorId) => {
          guard('connector.operate')
          const c = get().connectors.find((x) => x.id === connectorId)!
          if (c.mappingErrors.length) {
            mutateConn(connectorId, (x) => ({
              ...x,
              lastAttempt: nowIso(),
              status: 'degraded',
              log: log(x, 'warn', `Retry delivered transport successfully; ${x.mappingErrors.length} mapping error(s) still hold records`),
            }))
            throw new Error('Delivery restored, but records are held until the mapping errors are resolved by the administrator.')
          }
          mutateConn(connectorId, (x) => ({
            ...x,
            status: 'healthy',
            lastAttempt: nowIso(),
            lastSuccess: nowIso(),
            success24h: x.success24h + x.retryQueue + 1,
            log: log(x, 'info', `Retry succeeded — ${x.retryQueue} queued message(s) delivered; data fresh`),
            retryQueue: 0,
          }))
          set((s) => ({
            alerts: s.alerts.map((a) =>
              a.unitId === c.unitId && a.category === 'api_failure' && a.status !== 'resolved'
                ? { ...a, status: 'resolved', resolvedBy: who(), resolvedAt: nowIso(), resolution: 'Connector recovered after retry' }
                : a
            ),
          }))
        },

        resolveMapping: (connectorId) => {
          guard('masterdata.edit')
          mutateConn(connectorId, (x) => ({
            ...x,
            mappingErrors: [],
            log: log(x, 'info', `Mapping table updated by ${who()}; held records released for reprocessing`),
          }))
        },

        // Simulated interfaces: data arrives tagged with its source and is never
        // treated as verified — an SBMA user must confirm it (BRD 19.7).
        ingestAis: (callId) => {
          guard('connector.simulate')
          const c = assertOpen(callId)
          const ais = get().connectors.find((x) => x.id === 'C-AIS')!
          if (ais.status === 'failed') {
            mutateConn('C-AIS', (x) => ({ ...x, retryQueue: x.retryQueue + 1, log: log(x, 'warn', `Arrival message for ${callId} queued — feed down`) }))
            throw new Error('AIS feed is down. Record ATA manually; it will be flagged for reconciliation.')
          }
          if (c.events.ata) throw new Error('ATA already recorded. The feed does not overwrite existing values.')
          const time = nowIso()
          mutate(callId, 'Received ATA from AIS (simulated)', 'Pending verification', (x) => ({
            ...x,
            events: { ...x.events, ata: { time, source: 'ais_sim', recordedBy: 'port_control', recordedAt: time } },
          }))
          mutateConn('C-AIS', (x) => ({ ...x, lastSuccess: time, lastAttempt: time, success24h: x.success24h + 1, log: log(x, 'info', `Vessel entered port limits — ATA proposed for ${callId}`) }))
        },

        ingestTos: (callId) => {
          guard('connector.simulate')
          const c = assertOpen(callId)
          const unit = units.find((u) => c.berthId && u.berths.includes(c.berthId))
          const conn = get().connectors.find((x) => x.unitId === unit?.id)
          if (!conn) throw new Error('No TOS connector configured for this berth.')
          if (conn.status === 'failed') {
            mutateConn(conn.id, (x) => ({ ...x, retryQueue: x.retryQueue + 1, log: log(x, 'warn', `Production batch for ${callId} queued — feed down`) }))
            throw new Error('TOS feed is down. The terminal reports production manually until recovery.')
          }
          if (callStatus(c) !== 'operations') throw new Error('Vessel call is not in cargo operations.')
          const line = c.cargo.find((l) => c.production.filter((p) => p.lineId === l.id).reduce((a, p) => a + p.qty, 0) < l.declared) ?? c.cargo[0]
          const step = { TEU: 40, MT: 1200, KL: 600, UNIT: 15 }[line.unit]
          const time = nowIso()
          mutate(callId, 'Received production from TOS (simulated)', `${step} ${line.unit} — ${line.commodity}`, (x) => ({
            ...x,
            production: [...x.production, { id: uid(), lineId: line.id, time, qty: step, source: 'tos_sim', recordedBy: 'terminal_operator', status: 'submitted' }],
          }))
          mutateConn(conn.id, (x) => ({ ...x, lastSuccess: time, lastAttempt: time, success24h: x.success24h + 1, log: log(x, 'info', `Production batch ${step} ${line.unit} accepted (${callId})`) }))
        },

        // ---- Alerts -------------------------------------------------------

        acknowledgeAlert: (id) => {
          guard('alert.acknowledge')
          set((s) => ({ alerts: s.alerts.map((a) => (a.id === id && a.status === 'open' ? { ...a, status: 'acknowledged', ackBy: who(), ackAt: nowIso() } : a)) }))
        },

        resolveAlert: (id, note) => {
          guard('alert.resolve')
          if (!note.trim()) throw new Error('Add a resolution note.')
          set((s) => ({
            alerts: s.alerts.map((a) => (a.id === id ? { ...a, status: 'resolved', resolvedBy: who(), resolvedAt: nowIso(), resolution: note } : a)),
          }))
        },
      }
    },
    {
      name: 'voms-demo-v2',
      version: 2,
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

type ScopeState = Pick<VomsState, 'calls' | 'session'>

/** Vessel calls within the session's authorized scope (PDD §2). */
export function visibleCalls(s: ScopeState) {
  const sess = s.session
  if (!sess) return []
  if (sess.role === 'shipping_agent') {
    const agentId = orgById[sess.orgId]?.agentId
    return s.calls.filter((c) => c.agentId === agentId)
  }
  const berths = scopeBerths(sess)
  if (berths) return s.calls.filter((c) => c.berthId && berths.includes(c.berthId))
  return s.calls
}

export function inScope(s: Pick<VomsState, 'session'>, unitId: string) {
  return !!s.session && (isPortWide(s.session) || s.session.scopeUnitIds.includes(unitId))
}

export const visibleAlerts = (s: Pick<VomsState, 'session' | 'alerts'>) => s.alerts.filter((a) => inScope(s, a.unitId))

export function visibleSubmissions(s: Pick<VomsState, 'session' | 'submissions'>) {
  const sess = s.session
  if (!sess) return []
  if (sess.perspective === 'submission') return s.submissions.filter((x) => x.unitId === homeUnit(sess.orgId, sess.role))
  return s.submissions.filter((x) => inScope(s, x.unitId))
}

export const visibleConnectors = (s: Pick<VomsState, 'session' | 'connectors'>) => s.connectors.filter((c) => inScope(s, c.unitId))

export const useVessel = (id: string) => useVoms((s) => s.vessels.find((v) => v.id === id))
export const useActor = (): Actor => useVoms(useShallow((s) => ({ role: s.role, perspective: s.perspective })))
export const useCan = (action: Action) => useVoms((s) => can({ role: s.role, perspective: s.perspective }, action))

// Dev-only handle for automated UI checks; stripped from production builds.
if (import.meta.env.DEV) (window as unknown as { __voms: typeof useVoms }).__voms = useVoms
