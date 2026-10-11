// Simulated AI layer (PDD §7). Insights and answers are rule-based computations
// over the user's authorized data — no model is called and nothing leaves the
// browser. Every output states its period, sources, freshness and validation.
import { callStatus, etaVariance, lineProgress, turnaround } from './calc'
import { fmtHours, fmtNum, fmtRelative } from './format'
import { metricMeta, unitById, units } from './org'
import { visibleAlerts, visibleCalls, visibleConnectors, visibleSubmissions, type VomsState } from './store'
import type { DailyMetric } from './types'

export interface Insight {
  id: string
  title: string
  /** Verified facts computed from data in scope. */
  body: string
  /** Inferred explanation — not a verified cause. */
  interpretation: string
  /** Proposed follow-up (can become a management action). */
  followUp: string
  unitId?: string
  tone: 'good' | 'warning' | 'serious' | 'info'
  period: string
  sources: string
  validation: string
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

function metricTrend(s: VomsState, unitId: string, metric: DailyMetric) {
  const xs = s.daily.filter((d) => d.unitId === unitId && d.metric === metric).sort((a, b) => a.date.localeCompare(b.date))
  const last7 = xs.slice(-7)
  const prev7 = xs.slice(-14, -7)
  const a = sum(last7.map((x) => x.value))
  const b = sum(prev7.map((x) => x.value))
  return {
    last7,
    a,
    b,
    change: b ? ((a - b) / b) * 100 : 0,
    pending: last7.filter((x) => x.status === 'pending_review').length,
    min: last7.reduce((m, x) => (x.value < m.value ? x : m), last7[0]),
    max: last7.reduce((m, x) => (x.value > m.value ? x : m), last7[0]),
  }
}

export function scopedUnits(s: VomsState) {
  return units.filter((u) => s.session && (s.session.scopeUnitIds.includes(u.id) || s.session.scopeUnitIds.length >= units.length))
}

export function insights(s: VomsState): Insight[] {
  const out: Insight[] = []
  const calls = visibleCalls(s)
  const metricUnits = scopedUnits(s).filter((u) => u.metric && (s.session?.role === 'terminal_operator' ? u.berths.length : true))

  for (const u of metricUnits) {
    const t = metricTrend(s, u.id, u.metric!)
    if (!t.last7.length) continue
    const meta = metricMeta[u.metric!]
    const dir = t.change >= 0 ? 'up' : 'down'
    const extreme = t.min && (t.min.value === 0 || t.max.value > (t.a / t.last7.length) * 3)
    out.push({
      id: `trend-${u.id}`,
      title: `${meta.label} ${dir} ${fmtNum(Math.abs(t.change))}% week-on-week — ${u.short}`,
      body: `${fmtNum(t.a)} ${meta.unit} in the last 7 reported days vs ${fmtNum(t.b)} the week before.${
        extreme ? ` Lowest day ${t.min.date}: ${fmtNum(t.min.value)}; highest ${t.max.date}: ${fmtNum(t.max.value)} — check for reporting anomalies.` : ''
      }`,
      interpretation: t.pending
        ? 'Part of the week is not yet validated, so the trend may change once pending reports are approved.'
        : extreme
          ? 'An unusually low or high day drives the change; this is more likely a reporting issue than an operational shift.'
          : Math.abs(t.change) > 15
            ? 'A change of this size usually reflects vessel mix or weather; confirm against delays before drawing conclusions.'
            : 'Within normal week-to-week variation.',
      followUp: t.pending ? `Confirm ${t.pending} pending day(s) for ${u.short} before relying on the trend.` : Math.abs(t.change) > 15 ? `Review vessel mix and delays for ${u.short} this week.` : 'No follow-up needed.',
      unitId: u.id,
      tone: t.pending || extreme ? 'warning' : Math.abs(t.change) > 15 ? 'info' : 'good',
      period: `${t.last7[0].date} → ${t.last7[t.last7.length - 1].date}`,
      sources: `${t.last7.length} daily ${u.short} submissions`,
      validation: t.pending ? `${t.pending} unvalidated` : 'All validated',
    })
  }

  const delayed = calls.filter((c) => {
    const v = etaVariance(c)
    return (v !== undefined && v > 2) || (callStatus(c) === 'arrived' && !c.berthId)
  })
  if (delayed.length) {
    out.push({
      id: 'delays',
      title: `${delayed.length} vessel call(s) delayed or waiting`,
      body: delayed.map((c) => `${c.id}${callStatus(c) === 'arrived' && !c.berthId ? ' (at anchorage, no berth)' : ` (+${fmtNum(etaVariance(c) ?? 0, 1)} h vs ETA)`}`).join('; '),
      interpretation: 'Arrivals later than ETA and calls without a berth point to schedule or berth-allocation pressure.',
      followUp: 'Confirm berth availability and update ETAs with the agents concerned.',
      tone: 'warning',
      period: 'Current',
      sources: `${calls.length} vessel calls in scope`,
      validation: 'Movement events — verification status varies',
    })
  }

  const working = calls.filter((c) => callStatus(c) === 'operations')
  const behind = working.filter((c) => {
    const etd = c.events.etd ? Date.parse(c.events.etd.time) : undefined
    const pct = c.cargo.length ? sum(c.cargo.map((l) => lineProgress(c, l.id).pct)) / c.cargo.length : 100
    return etd !== undefined && etd - Date.now() < 8 * 3600_000 && pct < 80
  })
  if (behind.length)
    out.push({
      id: 'etd-risk',
      title: `${behind.length} call(s) at risk of missing ETD`,
      body: behind.map((c) => `${c.id}: ETD ${fmtRelative(c.events.etd!.time)}`).join('; '),
      interpretation: 'At the current production rate the remaining quantity may not be completed before ETD.',
      followUp: 'Check productivity and remaining quantity with the terminal.',
      tone: 'serious',
      period: 'Next 8 hours',
      sources: 'Cargo production and ETD',
      validation: 'Includes submitted (unverified) production',
    })

  const conns = visibleConnectors(s).filter((c) => c.status !== 'healthy')
  const missing = visibleAlerts(s).filter((a) => a.category === 'missing_submission' && a.status !== 'resolved')
  if (conns.length || missing.length)
    out.push({
      id: 'freshness',
      title: 'Data freshness gaps',
      body: [
        ...conns.map((c) => `${c.name.replace(' (simulated)', '')} ${c.status}; last success ${fmtRelative(c.lastSuccess)}`),
        ...missing.map((a) => a.title),
      ].join('; '),
      interpretation: 'Dashboards for affected units may understate activity until data arrives.',
      followUp: 'Restore the affected feeds and chase missing reports.',
      tone: 'warning',
      period: 'Last 24 hours',
      sources: 'API monitor and submission schedule',
      validation: 'System status',
    })

  if (!out.length)
    out.push({ id: 'none', title: 'No material deviations', body: 'Indicators in your scope are within their recent range.', interpretation: 'No unusual pattern detected.', followUp: 'No follow-up needed.', tone: 'good', period: 'Last 7 days', sources: 'All data in scope', validation: '—' })
  return out
}

// ---------------------------------------------------------------------------

export const suggestedQuestions = [
  'Why is container throughput lower this week?',
  'Which vessel calls are delayed?',
  'What is the berth occupancy now?',
  'Are there open environmental or safety alerts?',
  'Which submissions are pending approval?',
  'Is any API connection failing?',
]

/** Scripted, data-driven answer restricted to the session's scope. */
export function answer(s: VomsState, question: string): { text: string; sources: string } {
  const q = question.toLowerCase()
  const sess = s.session!
  const calls = visibleCalls(s)

  // Scope guard: mentioning a unit outside the entitlement returns no data.
  const mentioned = units.find((u) => q.includes(u.short.toLowerCase()) || q.includes(u.id.toLowerCase()))
  if (mentioned && !sess.scopeUnitIds.includes(mentioned.id) && sess.scopeUnitIds.length < units.length)
    return { text: `${mentioned.short} is outside your authorized scope (${sess.scopeLabel}), so I can't share its data.`, sources: 'Access policy' }
  const callId = q.match(/sb-2026-\d{6}/)?.[0]?.toUpperCase()
  if (callId) {
    const c = calls.find((x) => x.id === callId)
    if (!c) return { text: `${callId} is not available in your scope.`, sources: 'Access policy' }
    const t = turnaround(c)
    const prog = c.cargo.map((l) => `${l.commodity} ${fmtNum(lineProgress(c, l.id).pct)}%`).join(', ')
    return { text: `${c.id} is ${callStatus(c).replace('_', ' ')} at ${c.berthId ?? 'no berth'}. Cargo: ${prog || 'n/a'}. Time since arrival: ${fmtHours(t.total ?? (c.events.ata ? (Date.now() - Date.parse(c.events.ata.time)) / 3600_000 : undefined))}.`, sources: `Vessel call record ${c.id}` }
  }

  if (/throughput|container|moves|volume|lower|bulk|liquid|cargo/.test(q)) {
    const us = scopedUnits(s).filter((u) => u.metric && u.metric !== 'vessel_arrivals')
    if (!us.length) return { text: 'Throughput data is not part of your scope.', sources: 'Access policy' }
    const lines = us.map((u) => {
      const t = metricTrend(s, u.id, u.metric!)
      const meta = metricMeta[u.metric!]
      const low = t.last7.filter((d) => d.value < (t.b / 7) * 0.5)
      return `${u.short}: ${fmtNum(t.a)} ${meta.unit} this week vs ${fmtNum(t.b)} last week (${t.change >= 0 ? '+' : ''}${fmtNum(t.change)}%).${
        low.length ? ` Low days: ${low.map((d) => `${d.date} (${fmtNum(d.value)}${d.status === 'pending_review' ? ', pending review' : ''})`).join(', ')}.` : ''
      }`
    })
    return {
      text: `${lines.join(' ')} Possible contributing factors to check: vessel arrival mix, weather or equipment delays, and unvalidated or anomalous daily reports. This is not a causal conclusion.`,
      sources: 'Daily unit submissions (last 14 days)',
    }
  }
  if (/delay|late|waiting|anchorage/.test(q)) {
    const d = calls.filter((c) => (etaVariance(c) ?? 0) > 2 || (callStatus(c) === 'arrived' && !c.berthId) || c.delays.some((x) => !x.end))
    return {
      text: d.length
        ? d.map((c) => `${c.id}: ${callStatus(c) === 'arrived' && !c.berthId ? 'waiting at anchorage without a berth' : c.delays.some((x) => !x.end) ? 'ongoing operational delay' : `arrived ${fmtNum(etaVariance(c) ?? 0, 1)} h after ETA`}`).join('; ')
        : 'No vessel calls in your scope are currently delayed.',
      sources: `${calls.length} vessel calls in scope`,
    }
  }
  if (/berth|occupan|utiliz/.test(q)) {
    const occupied = calls.filter((c) => c.events.allFast && !c.events.lastLine)
    return {
      text: `${occupied.length} vessel(s) alongside: ${occupied.map((c) => `${c.berthId} (${c.id})`).join(', ') || 'none'}. See the Berth Board for availability and restrictions.`,
      sources: 'Berth events (All Fast → Last Line)',
    }
  }
  if (/environment|safety|spill|accident|incident|alert/.test(q)) {
    const a = visibleAlerts(s).filter((x) => x.status !== 'resolved')
    return {
      text: a.length ? a.map((x) => `${x.severity.toUpperCase()}: ${x.title} (${x.status})`).join('; ') : 'No open alerts in your scope.',
      sources: 'Alert register',
    }
  }
  if (/submission|report|pending|approv|missing/.test(q)) {
    const subs = visibleSubmissions(s).filter((x) => x.status === 'submitted' || x.status === 'review')
    const missing = visibleAlerts(s).filter((a) => a.category === 'missing_submission' && a.status !== 'resolved')
    return {
      text: `${subs.length} submission(s) awaiting action: ${subs.map((x) => `${x.id} ${x.reportType} (${x.status})`).join('; ') || 'none'}.${missing.length ? ` Missing: ${missing.map((m) => m.title).join('; ')}.` : ''}`,
      sources: 'Submission center',
    }
  }
  if (/api|connector|sync|feed|integration|fresh/.test(q)) {
    const cs = visibleConnectors(s)
    return {
      text: cs.length ? cs.map((c) => `${c.name.replace(' (simulated)', '')}: ${c.status}, last success ${fmtRelative(c.lastSuccess)}, ${c.retryQueue} queued`).join('; ') : 'No API connectors in your scope.',
      sources: 'API integration monitor',
    }
  }
  return {
    text: `I can answer questions about throughput, delays, berths, alerts, submissions and API status within your scope (${sess.scopeLabel}). Try one of the suggested questions.`,
    sources: '—',
  }
}

export const unitLabel = (id: string) => unitById[id]?.short ?? id
