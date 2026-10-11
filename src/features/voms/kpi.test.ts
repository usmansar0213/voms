import { describe, expect, it } from 'vitest'
import { buildHistory, historyPeriods, type MonthlyRecord } from './history'
import { kpiById, kpiStatus, kpiTarget, kpiValue, kpiVariancePct, kpiSeries } from './kpi'

const NOW = new Date('2026-10-11T08:00:00Z')

const rec = (unitId: MonthlyRecord['unitId'], over: Partial<MonthlyRecord>): MonthlyRecord => ({
  unitId,
  period: '2026-09',
  calls: 10,
  throughput: 1000,
  turnaroundH: 20,
  waitingH: 2,
  utilizationPct: 60,
  productivity: 50,
  incidents: 0,
  timelinessPct: 95,
  reliabilityPct: 80,
  delayByCategoryH: {},
  ...over,
})

describe('synthetic history', () => {
  it('covers 24 complete months ending with the previous month', () => {
    const p = historyPeriods(NOW)
    expect(p).toHaveLength(24)
    expect(p[p.length - 1]).toBe('2026-09')
    expect(p[0]).toBe('2024-10')
  })

  it('is deterministic for the same reference date', () => {
    expect(buildHistory(NOW)).toEqual(buildHistory(NOW))
    expect(buildHistory(NOW)).toHaveLength(24 * 3)
  })
})

describe('KPI engine', () => {
  const history = [rec('U-TA', { calls: 30, turnaroundH: 20 }), rec('U-TB', { calls: 10, turnaroundH: 60 }), rec('U-TC', { calls: 10, turnaroundH: 30 })]

  it('aggregates port turnaround as a call-weighted mean', () => {
    // (30×20 + 10×60 + 10×30) / 50 = 30
    expect(kpiValue(history, 'KPI-001', 'PORT', '2026-09')).toBeCloseTo(30)
  })

  it('weights the port target by the same call mix', () => {
    const t = kpiById['KPI-001'].targets
    const expected = (30 * t['U-TA'] + 10 * t['U-TB'] + 10 * t['U-TC']) / 50
    expect(kpiTarget(history, 'KPI-001', 'PORT', '2026-09')).toBeCloseTo(expected)
  })

  it('never sums throughput across different units at port level', () => {
    expect(kpiValue(history, 'KPI-005', 'PORT', '2026-09')).toBeNull()
    expect(kpiTarget(history, 'KPI-005', 'PORT', '2026-09')).toBeNull()
    expect(kpiValue(history, 'KPI-005', 'U-TB', '2026-09')).toBe(1000)
  })

  it('sums counts (vessel calls) at port level', () => {
    expect(kpiValue(history, 'KPI-006', 'PORT', '2026-09')).toBe(50)
  })

  it('classifies status with direction and tolerance', () => {
    // lower-is-better, relative tolerance 5% amber / 12% red on target 24
    expect(kpiStatus('KPI-001', 24, 24)).toBe('good')
    expect(kpiStatus('KPI-001', 25, 24)).toBe('good') // +4.2% within amber tolerance
    expect(kpiStatus('KPI-001', 26.5, 24)).toBe('warning') // +10.4%
    expect(kpiStatus('KPI-001', 28, 24)).toBe('critical') // +16.7%
    // higher-is-better, absolute tolerance 5 / 10 points
    expect(kpiStatus('KPI-003', 72, 70)).toBe('good')
    expect(kpiStatus('KPI-003', 62, 70)).toBe('warning')
    expect(kpiStatus('KPI-003', 55, 70)).toBe('critical')
    expect(kpiStatus('KPI-003', null, 70)).toBe('na')
  })

  it('reports variance with a positive sign when better than target', () => {
    expect(kpiVariancePct('KPI-001', 22, 24)).toBeCloseTo(8.33, 1) // lower is better
    expect(kpiVariancePct('KPI-003', 63, 70)).toBeCloseTo(-10)
  })

  it('builds a consistent series from the generated history', () => {
    const h = buildHistory(NOW)
    const periods = historyPeriods(NOW)
    const s = kpiSeries(h, periods, 'KPI-002', 'U-TB')
    expect(s).toHaveLength(24)
    expect(s.every((d) => d.value !== null && d.target === kpiById['KPI-002'].targets['U-TB'])).toBe(true)
    // Story line: Terminal B waiting time rises over the last four months.
    const last4 = s.slice(-4).map((d) => d.value!)
    expect(last4[3]).toBeGreaterThan(last4[0])
  })
})
