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
    <div className='flex flex-wrap items-end justify-between gap-3'>
      <div className='min-w-0'>
        <h1 className='text-xl font-bold tracking-tight sm:text-2xl'>{title}</h1>
        {description && <p className='mt-1 text-sm text-muted-foreground'>{description}</p>}
      </div>
      {actions && <div className='flex flex-wrap gap-2'>{actions}</div>}
    </div>
  )
}

export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  onClick,
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  icon: LucideIcon
  onClick?: () => void
}) {
  const Comp = onClick ? 'button' : 'div'
  return (
    <Comp
      onClick={onClick}
      className={cn(
        'flex flex-col gap-1 rounded-xl border bg-card p-4 text-start shadow-xs',
        onClick && 'transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none'
      )}
    >
      <div className='flex items-center justify-between gap-2 text-sm text-muted-foreground'>
        <span>{label}</span>
        <Icon className='size-4' aria-hidden />
      </div>
      <div className='text-3xl font-bold tabular-nums'>{value}</div>
      {hint && <div className='text-xs text-muted-foreground'>{hint}</div>}
    </Comp>
  )
}

/** Completed vs remaining bar with a 2px surface gap between segments. */
export function ProgressBar({ pct, className, label }: { pct: number; className?: string; label?: string }) {
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
      {p > 0 && <div className='h-full rounded-s-full bg-[var(--series-1)] last:rounded-e-full' style={{ width: `${p}%` }} />}
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
