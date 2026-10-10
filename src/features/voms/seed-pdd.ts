// Synthetic data for the PDD demo layer: 14 days of unit statistics, submission
// history, API connectors and alerts. All values are illustrative.
import { format } from 'date-fns'
import { extract, templates } from './submissions'
import type { Alert, Connector, DailyMetric, DailyStat, Submission } from './types'

const day = (now: number, offset: number) => format(new Date(now + offset * 86_400_000), 'yyyy-MM-dd')

// Deterministic pseudo-random noise so a reset always produces the same picture.
const noise = (i: number, seed: number) => {
  const x = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453
  return x - Math.floor(x) - 0.5
}

const series: { unitId: string; metric: DailyMetric; base: number; spread: number; seed: number }[] = [
  { unitId: 'U-TA', metric: 'container_moves', base: 100, spread: 22, seed: 1 },
  { unitId: 'U-TB', metric: 'bulk_mt', base: 3000, spread: 900, seed: 2 },
  { unitId: 'U-TC', metric: 'liquid_kl', base: 2500, spread: 700, seed: 3 },
  { unitId: 'U-PC', metric: 'vessel_arrivals', base: 3, spread: 2, seed: 4 },
]

export function seedDaily(now: number): DailyStat[] {
  const out: DailyStat[] = []
  for (const s of series) {
    for (let d = -14; d <= -1; d++) {
      // Terminal C has not yet submitted yesterday's report (drives a "missing submission" alert).
      if (s.unitId === 'U-TC' && d === -1) continue
      const trend = s.unitId === 'U-PC' && d > -5 ? -0.8 : 0 // mild traffic decline this week
      const value = Math.max(0, Math.round(s.base + trend + noise(d, s.seed) * s.spread))
      out.push({ unitId: s.unitId, metric: s.metric, date: day(now, d), value, status: 'published', submissionId: `SUB-${s.unitId.slice(2)}-${day(now, d).replace(/-/g, '')}` })
    }
  }
  return out
}

export function seedSubmissions(now: number, daily: DailyStat[]): Submission[] {
  const at = (h: number) => new Date(now + h * 3600_000).toISOString()
  const subs: Submission[] = []
  const owners: Record<string, { orgId: string; who: string; approver: string; tpl: string }> = {
    'U-TA': { orgId: 'ORG-TA', who: 'Demo Container Terminal A Coordinator', approver: 'Demo Container Terminal A Manager', tpl: 'T-TA-DAILY' },
    'U-TB': { orgId: 'ORG-TB', who: 'Demo Bulk Terminal B Coordinator', approver: 'Demo Bulk Terminal B Manager', tpl: 'T-TB-DAILY' },
    'U-TC': { orgId: 'ORG-TC', who: 'Demo Liquid Bulk Terminal C Coordinator', approver: 'Demo Liquid Bulk Terminal C Manager', tpl: 'T-TC-DAILY' },
    'U-PC': { orgId: 'ORG-SBMA', who: 'Demo Port Control Coordinator', approver: 'Demo Port Control Manager', tpl: 'T-PC-LOG' },
  }
  // Last three published daily submissions per unit, built from the daily series.
  for (const [unitId, o] of Object.entries(owners)) {
    const tpl = templates.find((t) => t.id === o.tpl)!
    const stats = daily.filter((d) => d.unitId === unitId).slice(-3)
    stats.forEach((st, i) => {
      const fields = extract(tpl, tpl.variants[0]).map((f) => (tpl.fields.find((x) => x.key === f.key)?.metric ? { ...f, value: String(st.value) } : f))
      const recv = new Date(`${st.date}T22:30:00`).toISOString()
      subs.push({
        id: st.submissionId!,
        orgId: o.orgId,
        unitId,
        role: tpl.role,
        channel: unitId !== 'U-PC' && i % 2 === 1 ? 'api' : 'upload',
        reportType: tpl.reportType,
        fileName: `${tpl.filePrefix}_${st.date}.${tpl.format}`,
        format: tpl.format,
        reportDate: st.date,
        receivedAt: recv,
        submittedBy: o.who,
        status: 'approved',
        fields,
        anomalies: [],
        validation: [],
        approvedBy: o.approver,
        approvedAt: new Date(Date.parse(recv) + 2 * 3600_000).toISOString(),
        history: [
          { time: recv, who: o.who, action: 'Received and extracted (simulated)' },
          { time: recv, who: o.who, action: 'Submitted for approval' },
          { time: new Date(Date.parse(recv) + 2 * 3600_000).toISOString(), who: o.approver, action: 'Approved and published' },
        ],
      })
    })
  }

  // Awaiting approval: Terminal B daily report for yesterday.
  const tb = templates.find((t) => t.id === 'T-TB-DAILY')!
  subs.push({
    id: 'SUB-TB-PENDING',
    orgId: 'ORG-TB',
    unitId: 'U-TB',
    role: 'terminal_operator',
    channel: 'upload',
    reportType: tb.reportType,
    fileName: `${tb.filePrefix}_${day(now, 0)}_draft.pdf`,
    format: 'pdf',
    reportDate: day(now, 0),
    callId: 'SB-2026-000122',
    receivedAt: at(-2),
    submittedBy: 'Demo Bulk Terminal B Coordinator',
    status: 'submitted',
    fields: extract(tb, tb.variants[0]),
    anomalies: [],
    validation: [],
    history: [
      { time: at(-2), who: 'Demo Bulk Terminal B Coordinator', action: 'Received and extracted (simulated)' },
      { time: at(-1.8), who: 'Demo Bulk Terminal B Coordinator', action: 'Submitted for approval' },
    ],
  })

  // Needs coordinator review: agency notice with an invalid IMO check digit.
  const pan = templates.find((t) => t.id === 'T-AG-PAN')!
  subs.push({
    id: 'SUB-AGA-REVIEW',
    orgId: 'ORG-AGA',
    unitId: 'U-AGA',
    role: 'shipping_agent',
    channel: 'upload',
    reportType: pan.reportType,
    fileName: 'PreArrival_MANILA_LINK.pdf',
    format: 'pdf',
    reportDate: day(now, 0),
    receivedAt: at(-3),
    submittedBy: 'Demo Shipping Agency A Coordinator',
    status: 'review',
    fields: extract(pan, pan.variants[1]),
    anomalies: [],
    validation: ['IMO number 9001082 fails the check-digit test'],
    history: [{ time: at(-3), who: 'Demo Shipping Agency A Coordinator', action: 'Received and extracted (simulated)' }],
  })
  return subs.sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))
}

export function seedConnectors(now: number): Connector[] {
  const at = (m: number) => new Date(now + m * 60_000).toISOString()
  return [
    {
      id: 'C-AIS',
      orgId: 'ORG-SBMA',
      unitId: 'U-PC',
      name: 'AIS / VTMS position feed (simulated)',
      system: 'AIS/VTMS',
      status: 'healthy',
      lastSuccess: at(-2),
      lastAttempt: at(-2),
      success24h: 1438,
      failure24h: 2,
      retryQueue: 0,
      mappingErrors: [],
      log: [
        { time: at(-2), level: 'info', message: 'Batch received: 31 position reports' },
        { time: at(-180), level: 'warn', message: 'Timeout — retried successfully after 30 s' },
      ],
    },
    {
      id: 'C-TA',
      orgId: 'ORG-TA',
      unitId: 'U-TA',
      name: 'Terminal A TOS API (simulated)',
      system: 'TOS',
      status: 'healthy',
      lastSuccess: at(-12),
      lastAttempt: at(-12),
      success24h: 96,
      failure24h: 0,
      retryQueue: 0,
      mappingErrors: [],
      log: [{ time: at(-12), level: 'info', message: 'Production batch accepted (SB-2026-000124)' }],
    },
    {
      id: 'C-TB',
      orgId: 'ORG-TB',
      unitId: 'U-TB',
      name: 'Terminal B TOS API (simulated)',
      system: 'TOS',
      status: 'degraded',
      lastSuccess: at(-95),
      lastAttempt: at(-5),
      success24h: 71,
      failure24h: 9,
      retryQueue: 3,
      mappingErrors: [
        { time: at(-40), field: 'commodity_code', message: 'Code "COAL-STM" not mapped to the VOMS commodity list' },
        { time: at(-20), field: 'quantity_uom', message: 'Unit "LT" (long tons) not in approved unit list' },
      ],
      log: [
        { time: at(-5), level: 'error', message: '3 records held: unmapped commodity code' },
        { time: at(-95), level: 'info', message: 'Production batch accepted (SB-2026-000122)' },
      ],
    },
    {
      id: 'C-TC',
      orgId: 'ORG-TC',
      unitId: 'U-TC',
      name: 'Terminal C TOS API (simulated)',
      system: 'TOS',
      status: 'healthy',
      lastSuccess: at(-25),
      lastAttempt: at(-25),
      success24h: 48,
      failure24h: 1,
      retryQueue: 0,
      mappingErrors: [],
      log: [{ time: at(-25), level: 'info', message: 'Pumping log batch accepted (SB-2026-000123)' }],
    },
  ]
}

export function seedAlerts(now: number): Alert[] {
  const at = (h: number) => new Date(now + h * 3600_000).toISOString()
  return [
    {
      id: 'AL-0107',
      time: at(-1),
      severity: 'warning',
      category: 'missing_submission',
      title: 'Missing daily report — Terminal C',
      evidence: `No Liquid Cargo Discharge Report received for ${day(now, -1)} (expected by 23:59).`,
      unitId: 'U-TC',
      ownerRole: 'terminal_operator',
      status: 'open',
    },
    {
      id: 'AL-0106',
      time: at(-1.5),
      severity: 'warning',
      category: 'api_failure',
      title: 'Terminal B TOS API degraded — mapping errors',
      evidence: '9 failed deliveries in 24 h; 3 records held for unmapped commodity / unit codes.',
      unitId: 'U-TB',
      ownerRole: 'terminal_operator',
      status: 'open',
    },
    {
      id: 'AL-0105',
      time: at(-4),
      severity: 'warning',
      category: 'vessel_delay',
      title: 'Vessel waiting at anchorage without berth',
      evidence: 'SB-2026-000125 arrived ~5 h ago; requested berth B-12 not yet assigned.',
      unitId: 'U-HM',
      callId: 'SB-2026-000125',
      ownerRole: 'harbor_master',
      status: 'open',
    },
    {
      id: 'AL-0104',
      time: at(-20),
      severity: 'serious',
      category: 'environment',
      title: 'Coal dust emission during discharge',
      evidence: 'Linked incident INC-2026-0031 under review; dust suppression active.',
      unitId: 'U-TB',
      callId: 'SB-2026-000122',
      ownerRole: 'harbor_master',
      status: 'acknowledged',
      ackBy: 'Demo Harbor Master Manager',
      ackAt: at(-19),
    },
    {
      id: 'AL-0103',
      time: at(-2),
      severity: 'info',
      category: 'incident',
      title: 'Minor drip at tanker manifold — contained',
      evidence: 'Linked incident INC-2026-0032; drip tray in place.',
      unitId: 'U-TC',
      callId: 'SB-2026-000123',
      ownerRole: 'harbor_master',
      status: 'open',
    },
    {
      id: 'AL-0102',
      time: at(-6),
      severity: 'info',
      category: 'traffic',
      title: 'Vessel arrivals below recent average',
      evidence: 'Arrivals in the last 4 days are below the 14-day average (illustrative threshold).',
      unitId: 'U-PC',
      ownerRole: 'port_control',
      status: 'open',
    },
  ]
}
