import { describe, expect, it } from 'vitest'
import { buildHistory, historyPeriods } from '../../history'
import { seedActions, seedKpiAlerts } from '../../seed-portix'
import type { Scope } from '../../kpi'
import type { Alert, ManagementAction } from '../../types'
import { actionSummary, alertScope, generateExecSummary, terminalsInScope, topRisks } from './exec-summary'

const NOW = new Date('2026-10-11T08:00:00Z')
const history = buildHistory(NOW)
const periods = historyPeriods(NOW)
const period = periods[periods.length - 1]
const alerts = seedKpiAlerts(history, NOW.getTime())
const actions = seedActions(history, NOW.getTime())
const ALL: Scope[] = ['PORT', 'U-TA', 'U-TB', 'U-TC']

const run = (scope: Scope, scopes: Scope[]) => generateExecSummary({ history, periods, period, scope, scopes, alerts, actions, today: '2026-10-11' })

describe('terminalsInScope', () => {
  it('never returns terminals outside the session scopes', () => {
    expect(terminalsInScope('PORT', ALL)).toEqual(['U-TA', 'U-TB', 'U-TC'])
    expect(terminalsInScope('PORT', ['U-TB'])).toEqual(['U-TB'])
    expect(terminalsInScope('U-TA', ['U-TB'])).toEqual([])
  })
})

describe('generateExecSummary', () => {
  it('cites a source on every fact', () => {
    const s = run('PORT', ALL)
    expect(s.facts.length).toBeGreaterThanOrEqual(4)
    for (const f of s.facts) expect(f.source).toMatch(/·/)
  })

  it('infers berth congestion at Terminal B from the waiting trend and delay mix', () => {
    const s = run('PORT', ALL)
    expect(s.interpretation.some((x) => /Berth congestion is likely at Terminal B/.test(x.text))).toBe(true)
    expect(s.proposals.some((p) => p.kpiId === 'KPI-002' && p.scope === 'U-TB')).toBe(true)
    expect(s.proposals.length).toBeLessThanOrEqual(3)
  })

  it('restricted to one terminal only mentions that terminal', () => {
    const s = run('U-TA', ['U-TA'])
    const text = JSON.stringify(s)
    expect(text).not.toMatch(/Terminal B|Terminal C/)
  })
})

describe('risk and action helpers', () => {
  it('sorts risks by severity then escalation and drops resolved', () => {
    const base = { time: '2026-10-01T00:00:00Z', category: 'kpi_breach', title: 't', evidence: 'e', ownerRole: 'management' } as const
    const list: Alert[] = [
      { ...base, id: 'a', severity: 'warning', unitId: 'U-TA', status: 'open', escalation: 3 },
      { ...base, id: 'b', severity: 'serious', unitId: 'U-TB', status: 'open', escalation: 1 },
      { ...base, id: 'c', severity: 'serious', unitId: 'U-PC', status: 'acknowledged', escalation: 2 },
      { ...base, id: 'd', severity: 'critical', unitId: 'U-TA', status: 'resolved' },
    ]
    expect(topRisks(list, 'PORT').map((a) => a.id)).toEqual(['c', 'b', 'a'])
    expect(topRisks(list, 'U-TA').map((a) => a.id)).toEqual(['a'])
    expect(alertScope(list[2])).toBe('PORT')
    expect(alertScope(list[1])).toBe('U-TB')
  })

  it('counts overdue actions and lists overdue first', () => {
    const mk = (id: string, status: ManagementAction['status'], dueDate: string) => ({ ...actions[0], id, status, dueDate })
    const s = actionSummary([mk('1', 'in_progress', '2026-10-20'), mk('2', 'blocked', '2026-10-01'), mk('3', 'done', '2026-09-01'), mk('4', 'proposed', '2026-10-12')], '2026-10-11')
    expect(s.overdue).toBe(1)
    expect(s.urgent.map((a) => a.id)).toEqual(['2', '4', '1'])
    expect(s.counts).toEqual({ proposed: 1, in_progress: 1, blocked: 1, done: 1 })
  })
})
