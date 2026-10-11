// PORTIX Executive Overview — management-perspective home ('/').
// KPI achievement, trend, top risks, management actions, terminal benchmark and
// a rule-based (simulated AI) executive summary. All data synthetic.
import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { format } from 'date-fns'
import { AlertTriangle, ArrowRight, CheckCircle2, OctagonAlert, Plus, Sparkles, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PageShell } from '@/components/layout/page-shell'
import { kpiById, kpiStatus, kpiTarget, kpiValue, periodLabel, scopeLabel, unitOf, type KpiId, type KpiStatus, type Scope } from '../../kpi'
import { unitById } from '../../org'
import { usePeriod, useVoms, visibleActions, visibleAlerts } from '../../store'
import type { ActionStatus, Alert, AlertSeverity } from '../../types'
import type { Tone } from '../../calc'
import { EmptyState, PageHeader, ToneBadge } from '../../components/common'
import { SimulatedAiBadge } from '../../components/ai-panel'
import { CreateActionDialog, type ActionDraft } from '../../components/create-action-dialog'
import { defaultScope, fmtKpi, IllustrativeBadge, KpiStatusPill, KpiTile, KpiTrendChart, PeriodSelector, sessionScopes } from '../../components/portix-ui'
import { actionsInScope, actionSummary, alertScope, generateExecSummary, isOverdue, terminalsInScope, topRisks } from './exec-summary'

const TILE_KPIS: KpiId[] = ['KPI-006', 'KPI-001', 'KPI-002', 'KPI-003', 'KPI-007', 'KPI-008']
const TREND_KPIS: KpiId[] = ['KPI-001', 'KPI-002', 'KPI-003', 'KPI-008']
const BENCH_KPIS: KpiId[] = ['KPI-001', 'KPI-002', 'KPI-003', 'KPI-004']

const sevTone: Record<AlertSeverity, Tone> = { info: 'info', warning: 'warning', serious: 'serious', critical: 'critical' }
const escalationLabel = { 1: 'Owner', 2: 'Unit management', 3: 'PA executive' } as const
const statusLabel: Partial<Record<ActionStatus, string>> = {
  proposed: 'Proposed',
  in_progress: 'In progress',
  blocked: 'Blocked',
  done: 'Done · awaiting review',
}

const unitName = (id: string) => (id === 'PORT' ? 'Port-wide' : (unitById[id]?.short ?? id))

export function ExecutiveOverview() {
  const session = useVoms((s) => s.session)
  const history = useVoms((s) => s.history)
  const periods = useVoms((s) => s.periods)
  const allAlerts = useVoms((s) => s.alerts)
  const allActions = useVoms((s) => s.actions)
  const period = usePeriod()
  const scopes = sessionScopes(session)
  const [picked, setPicked] = useState<Scope | null>(null)
  const scope: Scope = picked && scopes.includes(picked) ? picked : defaultScope(session)
  const terminals = terminalsInScope(scope, scopes)
  const visibleTerminals = terminalsInScope('PORT', scopes)

  const alerts = useMemo(() => visibleAlerts({ session, alerts: allAlerts }), [session, allAlerts])
  const actions = useMemo(() => visibleActions({ session, actions: allActions }), [session, allActions])
  const today = format(new Date(), 'yyyy-MM-dd')

  const [draft, setDraft] = useState<{ key: number; draft: ActionDraft } | null>(null)
  const openDraft = (d: ActionDraft) => setDraft({ key: Date.now(), draft: d })

  return (
    <PageShell>
      <PageHeader
        title='Executive Overview'
        description={`${scopeLabel(scope)} · ${periodLabel(period)} · simulated data`}
        actions={
          <>
            {scopes.length > 1 && (
              <div role='group' aria-label='Scope' className='flex flex-wrap gap-1'>
                {scopes.map((s) => (
                  <Button key={s} size='sm' variant={s === scope ? 'default' : 'outline'} aria-pressed={s === scope} onClick={() => setPicked(s)}>
                    {s === 'PORT' ? 'Port' : scopeLabel(s).replace('Terminal ', 'T-')}
                  </Button>
                ))}
              </div>
            )}
            <PeriodSelector />
          </>
        }
      />

      {/* KPI achievement */}
      <section aria-labelledby='kpi-row' className='grid gap-3'>
        <div className='flex flex-wrap items-center gap-2'>
          <h2 id='kpi-row' className='text-sm font-semibold'>
            KPI achievement · {periodLabel(period)}
          </h2>
          <IllustrativeBadge />
          <Link to='/kpis' className='ms-auto inline-flex items-center gap-1 text-sm text-primary hover:underline'>
            All KPIs <ArrowRight className='size-3.5' />
          </Link>
        </div>
        <div className='grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-6'>
          {TILE_KPIS.map((id) => (
            <KpiTile key={id} id={id} scope={scope} />
          ))}
        </div>
        <ThroughputCard terminals={terminals} period={period} />
      </section>

      <div className='grid gap-4 sm:gap-6 xl:grid-cols-5'>
        <TrendCard scope={scope} />
        <RisksCard alerts={topRisks(alerts, scope)} onCreate={openDraft} />
      </div>

      <div className='grid gap-4 sm:gap-6 xl:grid-cols-2'>
        <ActionsCard actions={actionsInScope(actions, scope)} today={today} />
        <BenchmarkCard terminals={visibleTerminals} period={period} />
      </div>

      <ExecSummaryCard
        input={{ history, periods, period, scope, scopes, alerts, actions, today }}
        onCreate={openDraft}
      />

      {draft && (
        <CreateActionDialog key={draft.key} open onOpenChange={(v) => !v && setDraft(null)} draft={draft.draft} />
      )}
    </PageShell>
  )
}

// ---- Throughput by terminal ----------------------------------------------------

function ThroughputCard({ terminals, period }: { terminals: ReturnType<typeof terminalsInScope>; period: string }) {
  const history = useVoms((s) => s.history)
  if (!terminals.length) return null
  const k = kpiById['KPI-005']
  return (
    <Card className='gap-3 py-4'>
      <CardHeader className='px-4'>
        <CardTitle>Throughput by terminal</CardTitle>
        <CardDescription>KPI-005 · each terminal in its own unit — never summed across units.</CardDescription>
      </CardHeader>
      <CardContent className='px-4'>
        <ul className='grid gap-3 sm:grid-cols-3'>
          {terminals.map((t) => {
            const value = kpiValue(history, 'KPI-005', t, period)
            const target = kpiTarget(history, 'KPI-005', t, period)
            const unit = unitOf(k, t)
            return (
              <li key={t} className='min-w-0'>
                <Link
                  to='/kpis/$kpiId'
                  params={{ kpiId: 'KPI-005' }}
                  search={{ scope: t }}
                  className='flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm hover:bg-accent/40'
                >
                  <span className='min-w-0'>
                    <span className='block text-muted-foreground'>{scopeLabel(t)}</span>
                    <span className='block font-semibold tabular-nums'>{fmtKpi(value, unit)}</span>
                    <span className='block text-xs text-muted-foreground'>Target {fmtKpi(target, unit)}</span>
                  </span>
                  <KpiStatusPill status={kpiStatus('KPI-005', value, target)} />
                </Link>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}

// ---- Performance trend -------------------------------------------------------

function TrendCard({ scope }: { scope: Scope }) {
  const [id, setId] = useState<KpiId>('KPI-002')
  return (
    <Card className='min-w-0 xl:col-span-3'>
      <CardHeader>
        <CardTitle>Performance trend</CardTitle>
        <CardDescription>
          {kpiById[id].name} · {scopeLabel(scope)} · last 12 months vs illustrative target
        </CardDescription>
      </CardHeader>
      <CardContent className='grid gap-3'>
        <div role='group' aria-label='KPI' className='flex flex-wrap gap-1.5'>
          {TREND_KPIS.map((k) => (
            <Button key={k} size='sm' variant={k === id ? 'default' : 'outline'} aria-pressed={k === id} onClick={() => setId(k)}>
              {kpiById[k].short}
            </Button>
          ))}
        </div>
        <KpiTrendChart id={id} scope={scope} />
        <Link to='/kpis/$kpiId' params={{ kpiId: id }} search={{ scope }} className='inline-flex items-center gap-1 text-sm text-primary hover:underline'>
          Open {id} detail <ArrowRight className='size-3.5' />
        </Link>
      </CardContent>
    </Card>
  )
}

// ---- Top risks ---------------------------------------------------------------------

function RisksCard({ alerts, onCreate }: { alerts: Alert[]; onCreate: (d: ActionDraft) => void }) {
  return (
    <Card className='min-w-0 xl:col-span-2'>
      <CardHeader>
        <CardTitle>Top risks</CardTitle>
        <CardDescription>
          {alerts.length} open or acknowledged alert{alerts.length === 1 ? '' : 's'} · by severity, then escalation
        </CardDescription>
        <CardAction>
          <Button asChild variant='ghost' size='sm'>
            <Link to='/alerts'>
              View all <ArrowRight />
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <EmptyState>No open risks in this scope.</EmptyState>
        ) : (
          <ul className='grid gap-2'>
            {alerts.slice(0, 4).map((a) => {
              const esc = a.escalation ?? 1
              return (
                <li key={a.id} className='grid gap-1 rounded-lg border p-2.5 text-sm'>
                  <div className='flex flex-wrap items-center gap-1.5'>
                    <ToneBadge tone={sevTone[a.severity]}>{a.severity[0].toUpperCase() + a.severity.slice(1)}</ToneBadge>
                    <ToneBadge tone='neutral' icon={false}>
                      Escalation L{esc} · {escalationLabel[esc]}
                    </ToneBadge>
                    {a.category === 'kpi_breach' && (
                      <ToneBadge tone='info' icon={false}>
                        KPI breach{a.kpiId ? ` · ${a.kpiId}` : ''}
                      </ToneBadge>
                    )}
                  </div>
                  <p className='font-medium'>{a.title}</p>
                  <p className='line-clamp-1 text-xs text-muted-foreground' title={a.evidence}>{a.evidence}</p>
                  <div className='flex flex-wrap items-center justify-between gap-2'>
                    <span className='text-xs text-muted-foreground'>
                      {a.id} · {unitName(a.unitId)} · {a.status === 'acknowledged' ? 'Acknowledged' : 'Open'}
                    </span>
                    <Button
                      size='sm'
                      variant='outline'
                      className='h-7'
                      onClick={() =>
                        onCreate({
                          origin: { type: 'alert', ref: a.id },
                          kpiId: a.kpiId as KpiId | undefined,
                          scope: alertScope(a),
                          title: a.title,
                          issue: a.evidence,
                          priority: a.severity === 'critical' || a.severity === 'serious' ? 'high' : 'medium',
                        })
                      }
                    >
                      <Plus /> Create action
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

// ---- Management actions ------------------------------------------------------------

function ActionsCard({ actions, today }: { actions: ReturnType<typeof actionsInScope>; today: string }) {
  const sum = actionSummary(actions, today)
  const tiles: [string, number, boolean][] = [
    ['Proposed', sum.counts.proposed, false],
    ['In progress', sum.counts.in_progress, false],
    ['Blocked', sum.counts.blocked, sum.counts.blocked > 0],
    ['Done · awaiting review', sum.counts.done, false],
    ['Overdue', sum.overdue, sum.overdue > 0],
  ]
  return (
    <Card className='min-w-0'>
      <CardHeader>
        <CardTitle>Management actions</CardTitle>
        <CardDescription>Issue → action → owner → due date → outcome</CardDescription>
        <CardAction>
          <Button asChild variant='ghost' size='sm'>
            <Link to='/actions'>
              All actions <ArrowRight />
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className='grid gap-4'>
        <dl className='grid grid-cols-2 gap-2 sm:grid-cols-5'>
          {tiles.map(([label, n, alert]) => (
            <div key={label} className={cn('rounded-lg border p-2.5', alert && 'border-[var(--status-critical)]/40 bg-[var(--status-critical)]/8')}>
              <dt className='text-xs text-muted-foreground'>{label}</dt>
              <dd className={cn('text-lg font-semibold tabular-nums', alert && 'text-[var(--status-critical-ink)]')}>{n}</dd>
            </div>
          ))}
        </dl>
        <div className='grid gap-2'>
          <h3 className='text-sm font-semibold'>Most urgent</h3>
          {sum.urgent.length === 0 ? (
            <EmptyState>No open actions in this scope.</EmptyState>
          ) : (
            <ul className='grid gap-2'>
              {sum.urgent.map((a) => {
                const overdue = isOverdue(a, today)
                return (
                  <li key={a.id}>
                    <Link
                      to='/actions/$actionId'
                      params={{ actionId: a.id }}
                      className='flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border p-3 text-sm hover:bg-accent/40'
                    >
                      <span className='min-w-0 flex-1'>
                        <span className='block truncate font-medium'>{a.title}</span>
                        <span className='block text-xs text-muted-foreground'>
                          {a.id} · {unitName(a.scope)} · {statusLabel[a.status] ?? a.status}
                        </span>
                      </span>
                      <span className={cn('text-xs whitespace-nowrap', overdue ? 'font-semibold text-[var(--status-critical-ink)]' : 'text-muted-foreground')}>
                        {overdue ? 'Overdue · ' : 'Due '}
                        {format(new Date(`${a.dueDate}T00:00:00`), 'dd MMM')}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ---- Terminal benchmark ------------------------------------------------------------

const statusIcon: Record<KpiStatus, { icon: LucideIcon; cls: string; label: string }> = {
  good: { icon: CheckCircle2, cls: 'text-[var(--status-good)]', label: 'On target' },
  warning: { icon: AlertTriangle, cls: 'text-[var(--status-warning)]', label: 'Watch' },
  critical: { icon: OctagonAlert, cls: 'text-[var(--status-critical)]', label: 'Off target' },
  na: { icon: CheckCircle2, cls: 'text-muted-foreground/40', label: 'No target' },
}

function StatusMark({ status }: { status: KpiStatus }) {
  const m = statusIcon[status]
  if (status === 'na') return null
  return (
    <span title={m.label} className='inline-flex'>
      <m.icon className={cn('size-3.5 shrink-0', m.cls)} aria-hidden />
      <span className='sr-only'>{m.label}</span>
    </span>
  )
}

function Cell({ id, scope, period }: { id: KpiId; scope: Scope; period: string }) {
  const history = useVoms((s) => s.history)
  const value = kpiValue(history, id, scope, period)
  const target = kpiTarget(history, id, scope, period)
  return (
    <td className='px-2 py-2 text-end tabular-nums whitespace-nowrap'>
      <span className='inline-flex items-center justify-end gap-1.5'>
        {fmtKpi(value, unitOf(kpiById[id], scope))}
        <StatusMark status={kpiStatus(id, value, target)} />
      </span>
    </td>
  )
}

function BenchmarkCard({ terminals, period }: { terminals: ReturnType<typeof terminalsInScope>; period: string }) {
  const multi = terminals.length >= 2
  const own = terminals[0]
  return (
    <Card className='min-w-0'>
      <CardHeader>
        <CardTitle>{multi ? 'Terminal benchmark' : 'Your terminal vs port average'}</CardTitle>
        <CardDescription>
          {periodLabel(period)} · productivity in each terminal’s own unit · illustrative targets
        </CardDescription>
        <CardAction>
          <Button asChild variant='ghost' size='sm'>
            <Link to='/terminals'>
              Terminals <ArrowRight />
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className='grid gap-3'>
        {!own ? (
          <EmptyState>No terminal in your scope.</EmptyState>
        ) : (
          <div className='overflow-x-auto'>
            {multi ? (
              <table className='w-full text-sm'>
                <thead>
                  <tr className='border-b text-xs text-muted-foreground'>
                    <th className='px-2 py-2 text-start font-medium'>Terminal</th>
                    {BENCH_KPIS.map((id) => (
                      <th key={id} className='px-2 py-2 text-end font-medium'>
                        {kpiById[id].short.replace('Berth utilization', 'Berth util.').replace('Berth productivity', 'Productivity')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {terminals.map((t) => (
                    <tr key={t} className='border-b last:border-0'>
                      <th scope='row' className='px-2 py-2 text-start font-medium whitespace-nowrap'>
                        {scopeLabel(t)}
                      </th>
                      {BENCH_KPIS.map((id) => (
                        <Cell key={id} id={id} scope={t} period={period} />
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className='w-full text-sm'>
                <thead>
                  <tr className='border-b text-xs text-muted-foreground'>
                    <th className='px-2 py-2 text-start font-medium'>KPI</th>
                    <th className='px-2 py-2 text-end font-medium'>{scopeLabel(own)}</th>
                    <th className='px-2 py-2 text-end font-medium'>Port average</th>
                  </tr>
                </thead>
                <tbody>
                  {BENCH_KPIS.map((id) => (
                    <tr key={id} className='border-b last:border-0'>
                      <th scope='row' className='px-2 py-2 text-start font-medium'>
                        {kpiById[id].short}
                      </th>
                      <Cell id={id} scope={own} period={period} />
                      {kpiById[id].portLevel ? (
                        <Cell id={id} scope='PORT' period={period} />
                      ) : (
                        <td className='px-2 py-2 text-end text-xs text-muted-foreground'>n/a (units differ)</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
        <p className='flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground'>
          {(['good', 'warning', 'critical'] as const).map((s) => (
            <span key={s} className='inline-flex items-center gap-1'>
              <StatusMark status={s} />
              <span aria-hidden>{statusIcon[s].label}</span>
            </span>
          ))}
        </p>
      </CardContent>
    </Card>
  )
}

// ---- Executive summary (simulated AI, rule-based) --------------------------------

function ExecSummaryCard({ input, onCreate }: { input: Parameters<typeof generateExecSummary>[0]; onCreate: (d: ActionDraft) => void }) {
  const { history, periods, period, scope, scopes, alerts, actions, today } = input
  // scopes is re-derived from the session each render; memoise on its contents.
  const scopesKey = scopes.join(',')
  const summary = useMemo(
    () => generateExecSummary({ history, periods, period, scope, scopes: scopesKey.split(',') as Scope[], alerts, actions, today }),
    [history, periods, period, scope, scopesKey, alerts, actions, today]
  )
  return (
    <Card className='min-w-0'>
      <CardHeader>
        <CardTitle className='flex flex-wrap items-center gap-2'>
          <Sparkles className='size-4 text-[var(--series-1)]' aria-hidden /> Executive summary
        </CardTitle>
        <CardDescription>
          {scopeLabel(scope)} · {periodLabel(period)} · generated by rules from the simulated data on this page
        </CardDescription>
        <CardAction>
          <SimulatedAiBadge />
        </CardAction>
      </CardHeader>
      <CardContent className='grid gap-5 text-sm lg:grid-cols-3'>
        <section className='grid content-start gap-2'>
          <h3 className='font-semibold'>Verified facts</h3>
          <ul className='grid gap-2'>
            {summary.facts.map((f, i) => (
              <li key={i} className='grid gap-0.5 border-s-2 border-[var(--series-1)]/50 ps-3'>
                <span>{f.text}</span>
                <span className='text-xs text-muted-foreground'>Source: {f.source}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className='grid content-start gap-2'>
          <h3 className='flex flex-wrap items-center gap-2 font-semibold'>
            Interpretation
            <ToneBadge tone='warning' icon={false} className='border-dashed'>
              Inferred — verify
            </ToneBadge>
          </h3>
          <ul className='grid gap-2'>
            {summary.interpretation.map((x, i) => (
              <li key={i} className='grid gap-0.5 border-s-2 border-dashed border-[var(--status-warning)]/60 ps-3'>
                <span>{x.text}</span>
                <span className='text-xs text-muted-foreground'>Based on: {x.basis}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className='grid content-start gap-2'>
          <h3 className='font-semibold'>Proposed actions</h3>
          {summary.proposals.length === 0 ? (
            <EmptyState>No action proposed for this scope and month.</EmptyState>
          ) : (
            <ul className='grid gap-2'>
              {summary.proposals.map((p, i) => (
                <li key={i} className='grid gap-2 rounded-lg border p-3'>
                  <div className='grid gap-0.5'>
                    <span className='font-medium'>{p.title}</span>
                    <span className='text-muted-foreground'>{p.recommendedAction}</span>
                    <span className='text-xs text-muted-foreground'>
                      {p.kpiId ? `${p.kpiId} · ` : ''}
                      {scopeLabel(p.scope)} · {p.priority} priority
                    </span>
                  </div>
                  <Button
                    size='sm'
                    variant='outline'
                    className='justify-self-start'
                    onClick={() =>
                      onCreate({
                        origin: { type: 'insight' },
                        title: p.title,
                        issue: p.issue,
                        recommendedAction: p.recommendedAction,
                        kpiId: p.kpiId,
                        scope: p.scope,
                        priority: p.priority,
                      })
                    }
                  >
                    <Plus /> Create action
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </CardContent>
    </Card>
  )
}
