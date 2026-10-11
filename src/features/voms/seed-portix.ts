// PORTIX demo seed: KPI-breach alerts for the latest month and a set of
// management actions in different states. Illustrative only.
import { addDays, format } from 'date-fns'
import { TERMINAL_IDS, historyPeriods, type MonthlyRecord } from './history'
import { kpis, kpiStatus, kpiTarget, kpiValue, periodLabel, scopeLabel, unitOf, type KpiId, type Scope } from './kpi'
import type { Alert, ManagementAction, RoleId } from './types'

const kpiOwnerRole: Record<KpiId, RoleId> = {
  'KPI-001': 'port_control',
  'KPI-002': 'harbor_master',
  'KPI-003': 'port_control',
  'KPI-004': 'terminal_operator',
  'KPI-005': 'terminal_operator',
  'KPI-006': 'management',
  'KPI-007': 'harbor_master',
  'KPI-008': 'terminal_operator',
  'KPI-009': 'port_control',
}

const fmt = (v: number) => (Math.abs(v) >= 1000 ? Math.round(v).toLocaleString('en-US') : String(+v.toFixed(1)))

export function seedKpiAlerts(history: MonthlyRecord[], now: number): Alert[] {
  const periods = historyPeriods(new Date(now))
  const period = periods[periods.length - 1]
  const out: Alert[] = []
  let seq = 90
  for (const unitId of TERMINAL_IDS) {
    for (const k of kpis) {
      const value = kpiValue(history, k.id, unitId, period)
      const target = kpiTarget(history, k.id, unitId, period)
      const status = kpiStatus(k.id, value, target)
      if (status !== 'warning' && status !== 'critical') continue
      out.push({
        id: `AL-K${String(seq++).padStart(3, '0')}`,
        time: new Date(now - (seq % 5) * 3600_000 - 86_400_000).toISOString(),
        severity: status === 'critical' ? 'serious' : 'warning',
        category: 'kpi_breach',
        title: `${k.short} off target — ${scopeLabel(unitId)}`,
        evidence: `${periodLabel(period)}: ${fmt(value!)} ${unitOf(k, unitId)} vs illustrative target ${fmt(target!)} ${unitOf(k, unitId)} (${k.direction === 'lower' ? 'lower is better' : 'higher is better'}).`,
        unitId,
        ownerRole: kpiOwnerRole[k.id],
        status: 'open',
        kpiId: k.id,
        period,
        escalation: status === 'critical' ? 2 : 1,
      })
    }
  }
  return out
}

export function seedActions(history: MonthlyRecord[], now: number): ManagementAction[] {
  const periods = historyPeriods(new Date(now))
  const last = periods[periods.length - 1]
  const day = (d: number) => format(addDays(new Date(now), d), 'yyyy-MM-dd')
  const at = (d: number) => new Date(now + d * 86_400_000).toISOString()
  const base = (id: KpiId, scope: Scope, back: number) => {
    const period = periods[periods.length - 1 - back]
    return { period, value: +(kpiValue(history, id, scope, period) ?? 0).toFixed(1) }
  }
  const current = (id: KpiId, scope: Scope) => +(kpiValue(history, id, scope, last) ?? 0).toFixed(1)

  return [
    {
      id: 'ACT-2026-0014',
      title: 'Resolve Terminal B TOS mapping errors',
      issue: 'Commodity and unit codes from the Terminal B TOS feed are not mapped; records are held and Terminal B KPIs are incomplete.',
      origin: { type: 'alert', ref: 'AL-0106' },
      kpiId: 'KPI-008',
      scope: 'U-TB',
      recommendedAction: 'Agree code mapping for "COAL-STM" and "LT" with Terminal B and update the PORTIX mapping table.',
      ownerName: 'Demo Systems Manager',
      ownerRole: 'admin',
      ownerOrgId: 'ORG-SBMA',
      priority: 'high',
      dueDate: day(-2),
      status: 'blocked',
      createdBy: 'Demo Port Authority Manager',
      createdAt: at(-6),
      baseline: base('KPI-008', 'U-TB', 1),
      updates: [
        { time: at(-6), who: 'Demo Port Authority Manager', note: 'Action created from API alert.', status: 'proposed' },
        { time: at(-4), who: 'Demo Systems Manager', note: 'Mapping proposal sent to Terminal B.', status: 'in_progress' },
        { time: at(-1), who: 'Demo Systems Manager', note: 'Waiting for Terminal B to confirm the commodity code list.', status: 'blocked' },
      ],
    },
    {
      id: 'ACT-2026-0013',
      title: 'Agree ETA update protocol with shipping agents',
      issue: 'Schedule reliability falls in typhoon season; late ETA updates reduce berth planning accuracy.',
      origin: { type: 'kpi', ref: 'KPI-009' },
      kpiId: 'KPI-009',
      scope: 'PORT',
      recommendedAction: 'Require ETA updates at 72/24/6 hours before arrival through the pre-arrival notice; review monthly with agents.',
      ownerName: 'Demo Port Control Manager',
      ownerRole: 'port_control',
      ownerOrgId: 'ORG-SBMA',
      priority: 'medium',
      dueDate: day(30),
      status: 'proposed',
      createdBy: 'Demo Port Authority Manager',
      createdAt: at(-1),
      baseline: base('KPI-009', 'PORT', 0),
      updates: [{ time: at(-1), who: 'Demo Port Authority Manager', note: 'Proposed in the monthly performance review.', status: 'proposed' }],
    },
    {
      id: 'ACT-2026-0012',
      title: 'Reduce anchorage waiting at Terminal B',
      issue: `Waiting time at Terminal B has risen for four consecutive months (${periodLabel(periods[periods.length - 4])} → ${periodLabel(last)}); "Awaiting berth" is now the largest delay category.`,
      origin: { type: 'kpi', ref: 'KPI-002' },
      kpiId: 'KPI-002',
      scope: 'U-TB',
      recommendedAction: 'Introduce a berth-window booking for bulk carriers and review berth B-07/B-08 restrictions with Terminal B.',
      ownerName: 'Demo Harbor Master Manager',
      ownerRole: 'harbor_master',
      ownerOrgId: 'ORG-SBMA',
      priority: 'high',
      dueDate: day(14),
      status: 'in_progress',
      createdBy: 'Demo Port Authority Manager',
      createdAt: at(-20),
      baseline: base('KPI-002', 'U-TB', 3),
      updates: [
        { time: at(-20), who: 'Demo Port Authority Manager', note: 'Raised at the executive review.', status: 'proposed' },
        { time: at(-18), who: 'Demo Harbor Master Manager', note: 'Accepted; workshop with Terminal B scheduled.', status: 'in_progress' },
        { time: at(-5), who: 'Demo Harbor Master Manager', note: 'Draft berth-window rules shared with Terminal B for comment.' },
      ],
    },
    {
      id: 'ACT-2026-0011',
      title: 'Restore daily report timeliness — Terminal C',
      issue: 'Terminal C daily discharge reports are frequently late or missing, reducing data completeness for liquid bulk KPIs.',
      origin: { type: 'alert', ref: 'AL-0107' },
      kpiId: 'KPI-008',
      scope: 'U-TC',
      recommendedAction: 'Move Terminal C from PDF upload to scheduled file transfer; set a 09:00 submission reminder.',
      ownerName: 'Demo Liquid Bulk Terminal C Manager',
      ownerRole: 'terminal_operator',
      ownerOrgId: 'ORG-TC',
      priority: 'medium',
      dueDate: day(7),
      status: 'in_progress',
      createdBy: 'Demo Port Authority Manager',
      createdAt: at(-12),
      baseline: base('KPI-008', 'U-TC', 2),
      updates: [
        { time: at(-12), who: 'Demo Port Authority Manager', note: 'Created from missing-submission alert.', status: 'proposed' },
        { time: at(-10), who: 'Demo Liquid Bulk Terminal C Manager', note: 'Reminder configured; SFTP option under review.', status: 'in_progress' },
      ],
    },
    {
      id: 'ACT-2026-0010',
      title: 'Dust suppression plan for coal grab discharge',
      issue: 'Environmental alerts during coal discharge at Terminal B (incident INC-2026-0031).',
      origin: { type: 'alert', ref: 'AL-0104' },
      kpiId: 'KPI-007',
      scope: 'U-TB',
      recommendedAction: 'Mandatory water spray and reduced grab drop height when wind exceeds the agreed threshold.',
      ownerName: 'Demo Bulk Terminal B Manager',
      ownerRole: 'terminal_operator',
      ownerOrgId: 'ORG-TB',
      priority: 'high',
      dueDate: day(-1),
      status: 'done',
      createdBy: 'Demo Harbor Master Manager',
      createdAt: at(-25),
      baseline: base('KPI-007', 'U-TB', 1),
      updates: [
        { time: at(-25), who: 'Demo Harbor Master Manager', note: 'Created after environmental incident.', status: 'proposed' },
        { time: at(-23), who: 'Demo Bulk Terminal B Manager', note: 'Spray system checked; procedure drafted.', status: 'in_progress' },
        { time: at(-2), who: 'Demo Bulk Terminal B Manager', note: 'Procedure in force; awaiting outcome review by the Port Authority.', status: 'done' },
      ],
    },
    {
      id: 'ACT-2026-0009',
      title: 'Crane deployment pilot — Terminal A',
      issue: 'Container berth productivity below target in the previous year.',
      origin: { type: 'kpi', ref: 'KPI-004' },
      kpiId: 'KPI-004',
      scope: 'U-TA',
      recommendedAction: 'Deploy a third crane on calls above 600 moves; monitor gross berth productivity for 6 months.',
      ownerName: 'Demo Container Terminal A Manager',
      ownerRole: 'terminal_operator',
      ownerOrgId: 'ORG-TA',
      priority: 'medium',
      dueDate: day(-40),
      status: 'closed',
      createdBy: 'Demo Port Authority Manager',
      createdAt: at(-200),
      baseline: base('KPI-004', 'U-TA', 7),
      outcome: {
        period: last,
        value: current('KPI-004', 'U-TA'),
        assessment: 'improved',
        note: 'Productivity improved after the third-crane rule; keep as standard practice.',
        closedBy: 'Demo Port Authority Manager',
        closedAt: at(-30),
      },
      updates: [
        { time: at(-200), who: 'Demo Port Authority Manager', note: 'Pilot agreed with Terminal A.', status: 'in_progress' },
        { time: at(-35), who: 'Demo Container Terminal A Manager', note: 'Pilot completed.', status: 'done' },
        { time: at(-30), who: 'Demo Port Authority Manager', note: 'Outcome reviewed and action closed.', status: 'closed' },
      ],
    },
    {
      id: 'ACT-2026-0008',
      title: 'Typhoon-season berth window planning',
      issue: 'Turnaround rises every July–October as weather delays accumulate.',
      origin: { type: 'manual' },
      kpiId: 'KPI-001',
      scope: 'PORT',
      recommendedAction: 'Publish typhoon-season berth windows and pre-arrange tug availability.',
      ownerName: 'Demo Port Control Manager',
      ownerRole: 'port_control',
      ownerOrgId: 'ORG-SBMA',
      priority: 'low',
      dueDate: day(-60),
      status: 'closed',
      createdBy: 'Demo Port Authority Manager',
      createdAt: at(-150),
      baseline: base('KPI-001', 'PORT', 5),
      outcome: {
        period: last,
        value: current('KPI-001', 'PORT'),
        assessment: 'no_change',
        note: 'No measurable change this season; revisit with tug-availability data.',
        closedBy: 'Demo Port Authority Manager',
        closedAt: at(-20),
      },
      updates: [
        { time: at(-150), who: 'Demo Port Authority Manager', note: 'Created.', status: 'in_progress' },
        { time: at(-20), who: 'Demo Port Authority Manager', note: 'Closed with no measurable change.', status: 'closed' },
      ],
    },
  ]
}

