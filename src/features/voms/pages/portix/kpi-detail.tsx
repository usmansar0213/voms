// PORTIX KPI detail: definition, 24-month trend vs illustrative target,
// terminal breakdown, related alerts/actions and "create action".
import { useMemo, useState } from 'react'
import { getRouteApi, Link } from '@tanstack/react-router'
import { ArrowDownRight, ArrowLeft, ArrowUpRight, Bell, ClipboardList, Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageShell } from '@/components/layout/page-shell'
import type { Tone } from '../../calc'
import {
  kpiById,
  kpiStatus,
  kpiTarget,
  kpiValue,
  kpiVariancePct,
  periodLabel,
  previousPeriod,
  scopeLabel,
  unitOf,
  type KpiDefinition,
  type Scope,
} from '../../kpi'
import { usePeriod, useVoms } from '../../store'
import type { AlertSeverity } from '../../types'
import { EmptyState, KeyValues, PageHeader, ToneBadge } from '../../components/common'
import { CreateActionDialog } from '../../components/create-action-dialog'
import { fmtKpi, IllustrativeBadge, KpiStatusPill, KpiTrendChart, PeriodSelector } from '../../components/portix-ui'
import { directionText, isKpiId, toleranceText, unitText, useScopedData } from './kpi-shared'

const route = getRouteApi('/_app/kpis/$kpiId')

const severityTone: Record<AlertSeverity, Tone> = { info: 'info', warning: 'warning', serious: 'serious', critical: 'critical' }
const cap = (s: string) => (s[0].toUpperCase() + s.slice(1)).replace(/_/g, ' ')

export function KpiDetail() {
  const { kpiId } = route.useParams()
  if (!isKpiId(kpiId)) {
    return (
      <PageShell>
        <PageHeader title='KPI not found' description={`There is no KPI with code “${kpiId}” in the registry.`} />
        <EmptyState>
          <Button variant='outline' asChild>
            <Link to='/kpis'>
              <ArrowLeft /> Back to Strategic KPIs
            </Link>
          </Button>
        </EmptyState>
      </PageShell>
    )
  }
  return <KpiDetailView k={kpiById[kpiId]} />
}

function KpiDetailView({ k }: { k: KpiDefinition }) {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const history = useVoms((s) => s.history)
  const periods = useVoms((s) => s.periods)
  const period = usePeriod()
  const { scopes, alerts, actions } = useScopedData()
  const [dialogOpen, setDialogOpen] = useState(false)

  const firstTerminal = scopes.find((s) => s !== 'PORT')
  const requested = scopes.find((s) => s === search.scope)
  let scope: Scope | undefined = requested ?? scopes[0]
  if (scope === 'PORT' && !k.portLevel) scope = firstTerminal

  const prev = previousPeriod(periods, period)
  const breakdown = useMemo(() => {
    const rows: Scope[] = scopes.filter((s) => s !== 'PORT' || k.portLevel)
    return rows.map((s) => {
      const value = kpiValue(history, k.id, s, period)
      const target = kpiTarget(history, k.id, s, period)
      const prevValue = prev ? kpiValue(history, k.id, s, prev) : null
      return { scope: s, value, target, prevValue, status: kpiStatus(k.id, value, target), variance: kpiVariancePct(k.id, value, target) }
    })
  }, [scopes, k, history, period, prev])

  const relatedAlerts = alerts.filter((a) => a.kpiId === k.id)
  const relatedActions = actions.filter((a) => a.kpiId === k.id)

  if (!scope) {
    return (
      <PageShell>
        <PageHeader title={`${k.id} · ${k.name}`} />
        <EmptyState>No scope is available for this KPI in the current session.</EmptyState>
      </PageShell>
    )
  }

  const unit = unitOf(k, scope)
  const current = breakdown.find((b) => b.scope === scope)

  return (
    <PageShell>
      <div>
        <Button variant='ghost' size='sm' asChild className='-ms-2'>
          <Link to='/kpis'>
            <ArrowLeft /> Strategic KPIs
          </Link>
        </Button>
      </div>
      <PageHeader
        title={`${k.id} · ${k.name}`}
        description={`${scopeLabel(scope)} · ${periodLabel(period)}`}
        actions={
          <>
            <PeriodSelector />
            <Button onClick={() => setDialogOpen(true)}>
              <Plus /> Create action
            </Button>
          </>
        }
      />

      {/* Scope switcher */}
      <div role='group' aria-label='Scope' className='flex flex-wrap gap-2'>
        {scopes.map((s) => {
          const disabled = s === 'PORT' && !k.portLevel
          return (
            <Button
              key={s}
              size='sm'
              variant={s === scope ? 'default' : 'outline'}
              aria-pressed={s === scope}
              disabled={disabled}
              title={disabled ? 'Not meaningful port-wide: terminals report in different units' : undefined}
              onClick={() => navigate({ search: (p) => ({ ...p, scope: s }), replace: true })}
            >
              {scopeLabel(s)}
              {disabled && ' (n/a)'}
            </Button>
          )
        })}
      </div>

      <div className='grid min-w-0 gap-4 lg:grid-cols-3'>
        <Card className='min-w-0 lg:col-span-2'>
          <CardHeader>
            <CardTitle>Actual vs target — 24 months</CardTitle>
            <CardDescription className='flex flex-wrap items-center gap-2'>
              {scopeLabel(scope)} · current {fmtKpi(current?.value, unit)} vs target {fmtKpi(current?.target, unit)}
              {current && <KpiStatusPill status={current.status} />}
              <IllustrativeBadge />
            </CardDescription>
          </CardHeader>
          <CardContent className='min-w-0'>
            <KpiTrendChart id={k.id} scope={scope} months={24} height='h-72' />
          </CardContent>
        </Card>

        <Card className='min-w-0'>
          <CardHeader>
            <CardTitle>Definition</CardTitle>
            <CardDescription>{k.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <KeyValues
              className='sm:grid-cols-1'
              items={[
                ['Formula', <code className='text-xs break-words'>{k.formula}</code>],
                ['Unit', unitText(k, 'PORT')],
                ['Direction', directionText(k)],
                ['Owner', k.owner],
                ['Data sources', k.sources.join(' · ')],
                ['Frequency', k.frequency],
                ['Port-wide value', k.portLevel ? 'Aggregated across terminals' : 'Not aggregated — terminals use different units'],
                ['Tolerance rules', toleranceText(k)],
                ['Version', `v${k.version} (BRD Section 4, draft)`],
              ]}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Breakdown — {periodLabel(period)}</CardTitle>
          <CardDescription>Variance is signed so that positive means better than target. Targets are illustrative.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='overflow-x-auto rounded-md border'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Scope</TableHead>
                  <TableHead className='text-end'>Value</TableHead>
                  <TableHead className='text-end'>Target</TableHead>
                  <TableHead className='text-end'>Variance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className='text-end'>vs prior month</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {breakdown.map((b) => {
                  const u = unitOf(k, b.scope)
                  const delta = b.value !== null && b.prevValue !== null ? b.value - b.prevValue : null
                  const better = delta === null || delta === 0 ? null : k.direction === 'lower' ? delta < 0 : delta > 0
                  return (
                    <TableRow key={b.scope} className={cn(b.scope === scope && 'bg-muted/50')}>
                      <TableCell className='font-medium'>{scopeLabel(b.scope)}</TableCell>
                      <TableCell className='text-end tabular-nums'>{fmtKpi(b.value, u)}</TableCell>
                      <TableCell className='text-end text-muted-foreground tabular-nums'>{fmtKpi(b.target, u)}</TableCell>
                      <TableCell className='text-end tabular-nums'>{b.variance === null ? '—' : `${b.variance > 0 ? '+' : ''}${b.variance.toFixed(1)}%`}</TableCell>
                      <TableCell>
                        <KpiStatusPill status={b.status} />
                      </TableCell>
                      <TableCell className='text-end tabular-nums'>
                        {delta === null ? (
                          '—'
                        ) : (
                          <span
                            className={cn(
                              'inline-flex items-center gap-0.5',
                              better === true && 'text-[var(--status-good-ink)]',
                              better === false && 'text-[var(--status-critical-ink)]'
                            )}
                          >
                            {delta === 0 ? <Minus className='size-3' aria-hidden /> : delta > 0 ? <ArrowUpRight className='size-3' aria-hidden /> : <ArrowDownRight className='size-3' aria-hidden />}
                            {delta > 0 ? '+' : delta < 0 ? '−' : ''}
                            {fmtKpi(Math.abs(delta), u)}
                            <span className='sr-only'>{better === null ? ' (no change)' : better ? ' (better)' : ' (worse)'}</span>
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className='grid min-w-0 gap-4 lg:grid-cols-2'>
        <Card className='min-w-0'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Bell className='size-4' aria-hidden /> Related alerts
            </CardTitle>
            <CardDescription>KPI breach alerts raised for {k.id} within your scope.</CardDescription>
          </CardHeader>
          <CardContent>
            {relatedAlerts.length === 0 ? (
              <EmptyState>No alerts linked to this KPI.</EmptyState>
            ) : (
              <ul className='grid gap-2'>
                {relatedAlerts.map((a) => (
                  <li key={a.id}>
                    <Link to='/alerts' className='grid min-w-0 gap-1 rounded-lg border p-3 text-sm transition-colors hover:bg-accent/40'>
                      <div className='flex flex-wrap items-center gap-2'>
                        <ToneBadge tone={severityTone[a.severity]}>{cap(a.severity)}</ToneBadge>
                        <span className='text-xs text-muted-foreground'>
                          {a.id} · {a.unitId} · {cap(a.status)}
                          {a.period && ` · ${periodLabel(a.period)}`}
                        </span>
                      </div>
                      <div className='font-medium break-words'>{a.title}</div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className='min-w-0'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <ClipboardList className='size-4' aria-hidden /> Related management actions
            </CardTitle>
            <CardDescription>Actions targeting {k.short.toLowerCase()} within your scope.</CardDescription>
          </CardHeader>
          <CardContent>
            {relatedActions.length === 0 ? (
              <EmptyState>No management actions linked to this KPI yet.</EmptyState>
            ) : (
              <ul className='grid gap-2'>
                {relatedActions.map((a) => (
                  <li key={a.id}>
                    <Link
                      to='/actions/$actionId'
                      params={{ actionId: a.id }}
                      className='grid min-w-0 gap-1 rounded-lg border p-3 text-sm transition-colors hover:bg-accent/40'
                    >
                      <div className='flex flex-wrap items-center gap-2 text-xs text-muted-foreground'>
                        <span className='rounded-full border px-2 py-0.5 font-medium text-foreground'>{cap(a.status)}</span>
                        <span>
                          {a.id} · {a.scope === 'PORT' ? 'Port-wide' : a.scope} · due {a.dueDate}
                        </span>
                      </div>
                      <div className='font-medium break-words'>{a.title}</div>
                      <div className='text-xs text-muted-foreground'>Owner: {a.ownerName}</div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {dialogOpen && (
        <CreateActionDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          draft={{
            origin: { type: 'kpi', ref: k.id },
            kpiId: k.id,
            scope,
            title: `Improve ${k.short} — ${scopeLabel(scope)}`,
            issue: `${k.name} for ${scopeLabel(scope)} in ${periodLabel(period)} was ${fmtKpi(current?.value, unit)} against an illustrative target of ${fmtKpi(
              current?.target,
              unit
            )}${current?.variance != null ? ` (${current.variance > 0 ? '+' : ''}${current.variance.toFixed(1)}% vs target)` : ''}.`,
          }}
        />
      )}
    </PageShell>
  )
}
