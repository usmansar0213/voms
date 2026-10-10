import type { ReactNode } from 'react'
import { toast } from 'sonner'
import {
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  Clock,
  FlaskConical,
  Info,
  OctagonAlert,
  RadioTower,
  ServerCog,
  UserPen,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { callStatus, statusMeta, type Tone } from '../calc'
import { sourceLabel } from '../format'
import type { Severity, Source, VesselCall } from '../types'

const toneClass: Record<Tone, string> = {
  good: 'border-[var(--status-good)]/40 bg-[var(--status-good)]/10 text-[var(--status-good-ink)]',
  warning: 'border-[var(--status-warning)]/50 bg-[var(--status-warning)]/15 text-[var(--status-warning-ink)]',
  serious: 'border-[var(--status-serious)]/50 bg-[var(--status-serious)]/15 text-[var(--status-serious-ink)]',
  critical: 'border-[var(--status-critical)]/50 bg-[var(--status-critical)]/12 text-[var(--status-critical-ink)]',
  info: 'border-[var(--series-1)]/35 bg-[var(--series-1)]/10 text-[var(--series-1-ink)]',
  active: 'border-[var(--series-3)]/45 bg-[var(--series-3)]/12 text-[var(--series-3-ink)]',
  neutral: 'border-border bg-muted text-muted-foreground',
}

const toneIcon: Record<Tone, LucideIcon> = {
  good: CheckCircle2,
  warning: AlertTriangle,
  serious: AlertTriangle,
  critical: OctagonAlert,
  info: Info,
  active: CircleDot,
  neutral: Clock,
}

export function ToneBadge({ tone, children, className, icon = true }: { tone: Tone; children: ReactNode; className?: string; icon?: boolean }) {
  const Icon = toneIcon[tone]
  return (
    <Badge variant='outline' className={cn('font-medium', toneClass[tone], className)}>
      {icon && <Icon aria-hidden />}
      {children}
    </Badge>
  )
}

export function StatusBadge({ call, className }: { call: VesselCall; className?: string }) {
  const meta = statusMeta[callStatus(call)]
  return (
    <ToneBadge tone={meta.tone} className={className}>
      {meta.label}
    </ToneBadge>
  )
}

const severityTone: Record<Severity, Tone> = { low: 'info', medium: 'warning', high: 'serious', critical: 'critical' }
export function SeverityBadge({ severity }: { severity: Severity }) {
  return <ToneBadge tone={severityTone[severity]}>{severity[0].toUpperCase() + severity.slice(1)}</ToneBadge>
}

const sourceIcon: Record<Source, LucideIcon> = { manual: UserPen, agent: UserPen, ais_sim: RadioTower, tos_sim: ServerCog }
export function SourceBadge({ source }: { source: Source }) {
  const Icon = sourceIcon[source]
  const simulated = source === 'ais_sim' || source === 'tos_sim'
  return (
    <Badge variant='outline' className={cn('gap-1 font-normal', simulated && 'border-dashed')}>
      <Icon aria-hidden />
      {sourceLabel[source]}
    </Badge>
  )
}

export function DemoBadge({ className }: { className?: string }) {
  return (
    <Badge variant='outline' className={cn('gap-1 border-dashed font-semibold tracking-wide', className)}>
      <FlaskConical aria-hidden />
      DEMO DATA
    </Badge>
  )
}

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className='flex flex-wrap items-start justify-between gap-3'>
      <div className='min-w-0'>
        <h1 className='text-2xl font-bold tracking-tight sm:text-3xl'>{title}</h1>
        {description && <p className='mt-1 text-sm text-muted-foreground sm:text-base'>{description}</p>}
      </div>
      <div className='flex flex-wrap items-center gap-2'>
        {actions}
        <span className='hidden rounded-full bg-[var(--status-good)]/12 px-3 py-1 text-xs font-semibold tracking-wide text-[var(--status-good-ink)] sm:inline-block'>
          DEMO DATA
        </span>
      </div>
    </div>
  )
}

export type TileTone = 'blue' | 'green' | 'amber' | 'red' | 'violet'
const tileTone: Record<TileTone, string> = {
  blue: 'bg-[var(--series-1)]/12 text-[var(--series-1-ink)]',
  green: 'bg-[var(--status-good)]/12 text-[var(--status-good-ink)]',
  amber: 'bg-[var(--status-warning)]/18 text-[var(--status-warning-ink)]',
  red: 'bg-[var(--status-critical)]/12 text-[var(--status-critical-ink)]',
  violet: 'bg-[var(--series-7)]/12 text-[var(--series-7)]',
}

export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'blue',
  onClick,
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  icon: LucideIcon
  tone?: TileTone
  onClick?: () => void
}) {
  const Comp = onClick ? 'button' : 'div'
  return (
    <Comp
      onClick={onClick}
      className={cn(
        'flex min-w-0 items-center gap-3 rounded-xl border bg-card p-3 text-start shadow-xs sm:gap-4 sm:p-4',
        onClick && 'transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none'
      )}
    >
      <span className={cn('hidden size-12 shrink-0 items-center justify-center rounded-full sm:flex sm:size-14', tileTone[tone])}>
        <Icon className='size-6 sm:size-7' aria-hidden />
      </span>
      <span className='grid min-w-0 gap-0.5'>
        <span className='text-sm text-muted-foreground sm:text-base sm:text-foreground'>{label}</span>
        <span className='text-2xl font-bold tabular-nums sm:text-3xl'>{value}</span>
        {hint && <span className='text-xs text-muted-foreground sm:text-sm'>{hint}</span>}
      </span>
    </Comp>
  )
}

/** Completed vs remaining bar with a 2px surface gap between segments. */
export function ProgressBar({ pct, className, label, color = 'var(--series-1)' }: { pct: number; className?: string; label?: string; color?: string }) {
  const p = Math.max(0, Math.min(100, pct))
  return (
    <div
      role='progressbar'
      aria-valuenow={Math.round(p)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn('flex h-2.5 w-full gap-0.5', className)}
    >
      {p > 0 && <div className='h-full rounded-s-full last:rounded-e-full' style={{ width: `${p}%`, background: color }} />}
      {p < 100 && <div className='h-full flex-1 rounded-e-full bg-muted first:rounded-s-full' />}
    </div>
  )
}

export function KeyValues({ items, className }: { items: [string, ReactNode][]; className?: string }) {
  return (
    <dl className={cn('grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2', className)}>
      {items.map(([k, v]) => (
        <div key={k} className='min-w-0'>
          <dt className='text-xs text-muted-foreground'>{k}</dt>
          <dd className='font-medium break-words'>{v}</dd>
        </div>
      ))}
    </dl>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className='rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground'>{children}</div>
}

/** Runs a store action and turns rule/permission errors into toasts. */
export function runAction(fn: () => unknown, success?: string) {
  try {
    fn()
    if (success) toast.success(success)
    return true
  } catch (e) {
    toast.error(e instanceof Error ? e.message : String(e))
    return false
  }
}
