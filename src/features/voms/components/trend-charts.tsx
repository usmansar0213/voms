import { useMemo } from 'react'
import { format } from 'date-fns'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { fmtNum } from '../format'
import { metricMeta, type Unit } from '../org'
import { useVoms } from '../store'
import { Legend } from './charts'

const axis = { stroke: 'var(--chart-axis)', fontSize: 11, tickLine: false, axisLine: false } as const

/** One small chart per unit metric — units are never mixed on one axis. */
export function UnitTrend({ unit }: { unit: Unit }) {
  const daily = useVoms((s) => s.daily)
  const meta = metricMeta[unit.metric!]
  const data = useMemo(
    () =>
      daily
        .filter((d) => d.unitId === unit.id && d.metric === unit.metric)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-14)
        .map((d) => ({ ...d, label: format(new Date(`${d.date}T12:00:00`), 'd MMM') })),
    [daily, unit]
  )
  return (
    <figure className='grid gap-2 rounded-lg border p-3'>
      <figcaption className='flex flex-wrap items-baseline justify-between gap-2 text-sm'>
        <span className='font-medium'>
          {unit.short} — {meta.label}
        </span>
        <span className='text-xs text-muted-foreground'>typical {meta.typical}</span>
      </figcaption>
      <div className='h-36'>
        <ResponsiveContainer width='100%' height='100%'>
          <BarChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }} barCategoryGap='20%'>
            <CartesianGrid vertical={false} stroke='var(--chart-grid)' />
            <XAxis dataKey='label' {...axis} interval='preserveStartEnd' minTickGap={16} />
            <YAxis {...axis} width={44} tickFormatter={(v: number) => (v >= 1000 ? `${fmtNum(v / 1000, 1)}k` : String(v))} />
            <Tooltip
              cursor={{ fill: 'var(--muted)', opacity: 0.5 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const d = payload[0].payload as (typeof data)[number]
                return (
                  <div className='rounded-md border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md'>
                    <div className='font-semibold'>{d.date}</div>
                    <div>
                      {fmtNum(d.value)} {meta.unit}
                    </div>
                    <div className='text-muted-foreground'>{d.status === 'published' ? 'Published' : 'Pending review'}</div>
                  </div>
                )
              }}
            />
            <Bar dataKey='value' radius={[4, 4, 0, 0]} isAnimationActive={false}>
              {data.map((d) => (
                <Cell key={d.date} fill={d.status === 'published' ? 'var(--series-1)' : 'var(--status-warning)'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </figure>
  )
}

export function TrendGrid({ units }: { units: Unit[] }) {
  const withMetric = units.filter((u) => u.metric)
  if (!withMetric.length) return null
  return (
    <div className='grid gap-3'>
      <Legend
        items={[
          { label: 'Published (approved)', color: 'var(--series-1)' },
          { label: 'Pending review', color: 'var(--status-warning)' },
        ]}
      />
      <div className='grid gap-3 sm:grid-cols-2'>
        {withMetric.map((u) => (
          <UnitTrend key={u.id} unit={u} />
        ))}
      </div>
    </div>
  )
}
