import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { berthOccupancyHours, HOUR, turnaround } from '../calc'
import { fmtHours, fmtNum } from '../format'
import type { Berth, VesselCall } from '../types'
import { useVoms } from '../store'

const axis = { stroke: 'var(--chart-axis)', fontSize: 11, tickLine: false, axisLine: false } as const

function TipBox({ title, rows }: { title: string; rows: { color?: string; label: string; value: string }[] }) {
  return (
    <div className='rounded-md border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md'>
      <div className='mb-1 font-semibold'>{title}</div>
      {rows.map((r) => (
        <div key={r.label} className='flex items-center gap-2'>
          {r.color && <span className='size-2.5 rounded-sm' style={{ background: r.color }} />}
          <span className='text-muted-foreground'>{r.label}</span>
          <span className='ms-auto ps-3 font-medium tabular-nums'>{r.value}</span>
        </div>
      ))}
    </div>
  )
}

const segments = [
  { key: 'waiting', label: 'ATA → All Fast (waiting & berthing)', color: 'var(--series-1)' },
  { key: 'atBerth', label: 'All Fast → Last Line (at berth)', color: 'var(--series-2)' },
  { key: 'departure', label: 'Last Line → ATD', color: 'var(--series-3)' },
] as const

export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <ul className='flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground'>
      {items.map((i) => (
        <li key={i.label} className='flex items-center gap-1.5'>
          <span className='size-2.5 rounded-sm' style={{ background: i.color }} />
          {i.label}
        </li>
      ))}
    </ul>
  )
}

/** Vessel turnaround (KPI-001) split into its three event intervals. */
export function TurnaroundChart({ calls }: { calls: VesselCall[] }) {
  const vessels = useVoms((s) => s.vessels)
  const data = useMemo(
    () =>
      calls
        .filter((c) => c.events.atd)
        .sort((a, b) => a.events.atd!.time.localeCompare(b.events.atd!.time))
        .slice(-8)
        .map((c) => {
          const t = turnaround(c)
          const v = vessels.find((x) => x.id === c.vesselId)!
          return {
            id: c.id.slice(-6),
            vessel: v.name.replace(/^(MV|MT) DEMO /, ''),
            waiting: +(t.waiting ?? 0).toFixed(2),
            atBerth: +(t.atBerth ?? 0).toFixed(2),
            departure: +(t.departure ?? 0).toFixed(2),
            total: t.total ?? 0,
          }
        }),
    [calls, vessels]
  )
  return (
    <div className='space-y-3'>
      <Legend items={segments.map((s) => ({ label: s.label, color: s.color }))} />
      <div className='h-64'>
        <ResponsiveContainer width='100%' height='100%'>
          <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }} barCategoryGap='28%'>
            <CartesianGrid vertical={false} stroke='var(--chart-grid)' />
            <XAxis dataKey='id' {...axis} />
            <YAxis {...axis} unit=' h' width={52} />
            <Tooltip
              cursor={{ fill: 'var(--muted)', opacity: 0.5 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const d = payload[0].payload as (typeof data)[number]
                return (
                  <TipBox
                    title={`SB-2026-${d.id} · ${d.vessel}`}
                    rows={[
                      ...segments.map((s) => ({ color: s.color, label: s.label, value: fmtHours(d[s.key]) })),
                      { label: 'Total turnaround (ATA → ATD)', value: fmtHours(d.total) },
                    ]}
                  />
                )
              }}
            />
            {segments.map((s, i) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                stackId='t'
                fill={s.color}
                stroke='var(--card)'
                strokeWidth={2}
                radius={i === segments.length - 1 ? [4, 4, 0, 0] : 0}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/** Berth occupancy over the last N days, one bar per berth (single series). */
export function BerthUtilizationChart({ berths, calls, days = 7 }: { berths: Berth[]; calls: VesselCall[]; days?: number }) {
  const data = useMemo(() => {
    const to = Date.now()
    const from = to - days * 24 * HOUR
    return berths.map((b) => {
      const hrs = berthOccupancyHours(b.id, calls, from, to)
      return { id: b.id, hours: hrs, pct: +((hrs / (days * 24)) * 100).toFixed(1) }
    })
  }, [berths, calls, days])
  return (
    <div className='h-64'>
      <ResponsiveContainer width='100%' height='100%'>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }} barCategoryGap='22%'>
          <CartesianGrid vertical={false} stroke='var(--chart-grid)' />
          <XAxis dataKey='id' {...axis} interval={0} tickFormatter={(v: string) => v.replace('B-', '')} />
          <YAxis {...axis} unit='%' domain={[0, 100]} width={48} />
          <Tooltip
            cursor={{ fill: 'var(--muted)', opacity: 0.5 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const d = payload[0].payload as (typeof data)[number]
              return (
                <TipBox
                  title={`Berth ${d.id}`}
                  rows={[
                    { label: 'Occupancy', value: `${fmtNum(d.pct, 1)}%` },
                    { label: 'Occupied (All Fast → Last Line)', value: fmtHours(d.hours) },
                  ]}
                />
              )
            }}
          />
          <Bar dataKey='pct' fill='var(--series-1)' radius={[4, 4, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
