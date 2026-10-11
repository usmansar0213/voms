import { describe, expect, it } from 'vitest'
import { berthCompatibility, callStatus, lineProgress, sequenceIssues, turnaround } from './calc'
import { allActions, can } from './roles'
import { seedBerths, seedCalls, vessels } from './seed'
import { check, extract, templates } from './submissions'
import { visibleCalls } from './store'
import type { Session, VesselCall } from './types'

const NOW = Date.parse('2026-10-11T08:00:00Z')
const calls = seedCalls(NOW, vessels)
const byId = (id: string) => calls.find((c) => c.id === id)!

describe('vessel call calculations', () => {
  it('derives lifecycle status from events', () => {
    expect(callStatus(byId('SB-2026-000126'))).toBe('expected')
    expect(callStatus(byId('SB-2026-000122'))).toBe('operations')
    expect(callStatus(byId('SB-2026-000114'))).toBe('closed')
  })

  it('computes turnaround as ATA → ATD and its components', () => {
    const t = turnaround(byId('SB-2026-000114'))
    expect(t.total).toBeCloseTo((t.waiting ?? 0) + (t.atBerth ?? 0) + (t.departure ?? 0), 5)
  })

  it('computes cargo progress per line in its own unit', () => {
    const c = byId('SB-2026-000122')
    const p = lineProgress(c, c.cargo[0].id)
    expect(p.line.unit).toBe('MT')
    expect(p.done).toBe(15000)
    expect(p.pct).toBeCloseTo(60)
  })

  it('flags out-of-order events instead of rejecting them', () => {
    const c = byId('SB-2026-000124')
    const broken: VesselCall = { ...c, events: { ...c.events, allFast: { ...c.events.allFast!, time: new Date(NOW - 30 * 3600_000).toISOString() } } }
    expect(sequenceIssues(broken).length).toBeGreaterThan(0)
    expect(sequenceIssues(c)).toEqual([])
  })

  it('checks berth compatibility (type, LOA, draft)', () => {
    const berths = seedBerths(NOW)
    const bulk = vessels.find((v) => v.type === 'bulk' && v.loa > 150)!
    expect(berthCompatibility(bulk, berths.find((b) => b.id === 'B-01')!)).not.toEqual([])
    expect(berthCompatibility(bulk, berths.find((b) => b.id === 'B-05')!)).toEqual([])
  })
})

describe('permission matrix (segregation of duties)', () => {
  it('lets every role submit only from the Submission perspective and approve only from Management', () => {
    for (const role of ['port_control', 'harbor_master', 'terminal_operator', 'shipping_agent', 'management', 'admin'] as const) {
      expect(can({ role, perspective: 'submission' }, 'submission.upload')).toBe(true)
      expect(can({ role, perspective: 'submission' }, 'submission.approve')).toBe(false)
      expect(can({ role, perspective: 'management' }, 'submission.approve')).toBe(true)
      expect(can({ role, perspective: 'management' }, 'submission.upload')).toBe(false)
    }
  })

  it('never lets an action be recorded and verified from the same perspective', () => {
    const pairs: [string, string][] = [
      ['event.movement', 'event.verify'],
      ['production.record', 'production.verify'],
      ['tally.submit', 'tally.verify'],
    ]
    for (const [rec, ver] of pairs) {
      for (const role of ['port_control', 'harbor_master', 'terminal_operator'] as const)
        for (const perspective of ['submission', 'management'] as const)
          expect(can({ role, perspective }, rec as never) && can({ role, perspective }, ver as never)).toBe(false)
    }
  })

  it('reserves action outcome review for Port Authority management roles', () => {
    expect(can({ role: 'management', perspective: 'management' }, 'action.close')).toBe(true)
    expect(can({ role: 'terminal_operator', perspective: 'management' }, 'action.close')).toBe(false)
    expect(can({ role: 'admin', perspective: 'management' }, 'action.close')).toBe(false)
  })

  it('gives the administrator no operational approval rights', () => {
    for (const a of ['event.verify', 'production.verify', 'tally.verify', 'call.close', 'incident.close'] as const) {
      expect(can({ role: 'admin', perspective: 'management' }, a)).toBe(false)
      expect(can({ role: 'admin', perspective: 'submission' }, a)).toBe(false)
    }
    expect(allActions.length).toBeGreaterThan(20)
  })
})

describe('submission validation and anomaly detection', () => {
  const tpl = templates.find((t) => t.id === 'T-TA-DAILY')!
  const stats = Array.from({ length: 14 }, (_, i) => ({
    unitId: 'U-TA',
    metric: 'container_moves' as const,
    date: `2026-09-${String(i + 10).padStart(2, '0')}`,
    value: 100,
    status: 'published' as const,
  }))
  const ids = calls.map((c) => c.id)

  it('accepts a normal day', () => {
    const r = check(tpl, extract(tpl, tpl.variants.find((v) => v.id === 'normal')!), 'U-TA', stats, ids)
    expect(r.validation).toEqual([])
    expect(r.anomalies).toEqual([])
  })

  it('flags 1,000 moves against a typical 100 and the inconsistent total', () => {
    const r = check(tpl, extract(tpl, tpl.variants.find((v) => v.id === 'thousand')!), 'U-TA', stats, ids)
    expect(r.anomalies.some((a) => a.includes('10×'))).toBe(true)
    expect(r.anomalies.some((a) => a.includes('does not equal'))).toBe(true)
  })

  it('rejects an IMO number with a wrong check digit', () => {
    const pan = templates.find((t) => t.id === 'T-AG-PAN')!
    const r = check(pan, extract(pan, pan.variants.find((v) => v.id === 'imo')!), 'U-AGA', [], ids)
    expect(r.validation.some((v) => v.includes('check-digit'))).toBe(true)
  })
})

describe('organization scope isolation', () => {
  const session = (over: Partial<Session>): Session => ({ name: 'x', orgId: 'ORG-SBMA', role: 'management', perspective: 'management', scopeUnitIds: [], scopeLabel: '', ...over })

  it('shows a shipping agency only its own vessel calls', () => {
    const visible = visibleCalls({ calls, session: session({ orgId: 'ORG-AGB', role: 'shipping_agent', scopeUnitIds: ['U-AGB'] }) })
    expect(visible.length).toBeGreaterThan(0)
    expect(visible.every((c) => c.agentId === 'AG-02')).toBe(true)
  })

  it('shows a terminal only calls at its own berths', () => {
    const visible = visibleCalls({ calls, session: session({ orgId: 'ORG-TA', role: 'terminal_operator', scopeUnitIds: ['U-TA'] }) })
    expect(visible.every((c) => ['B-01', 'B-02', 'B-03', 'B-04', 'B-13'].includes(c.berthId!))).toBe(true)
  })

  it('shows nothing without a session', () => {
    expect(visibleCalls({ calls, session: null })).toEqual([])
  })
})
