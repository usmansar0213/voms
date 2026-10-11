import { cn } from '@/lib/utils'

/**
 * PORTIX mark: an "X" formed by two crossing quay-crane booms over a wave line.
 * Original vector; navy tile with blue and teal strokes.
 */
export function PortixMark({ className, tile = true }: { className?: string; tile?: boolean }) {
  return (
    <svg viewBox='0 0 48 48' role='img' aria-label='PORTIX' className={cn('size-10', className)}>
      {tile && <rect width='48' height='48' rx='11' fill='#12223a' />}
      <path d='M13 11 L35 33' stroke='#3987e5' strokeWidth='5' strokeLinecap='round' />
      <path d='M35 11 L13 33' stroke='var(--brand-teal, #14a8b0)' strokeWidth='5' strokeLinecap='round' />
      <circle cx='24' cy='22' r='3.2' fill='#ffffff' />
      <path d='M9 39 q5 -3.5 10 0 t10 0 t10 0' fill='none' stroke='#9ec5f4' strokeWidth='2.6' strokeLinecap='round' />
    </svg>
  )
}

/** Wordmark with optional subtitle. */
export function PortixWordmark({ className, subtitle, invert }: { className?: string; subtitle?: string; invert?: boolean }) {
  return (
    <span className={cn('grid leading-tight', className)}>
      <span className={cn('font-extrabold tracking-[0.08em]', invert ? 'text-white' : 'text-[#0d2240] dark:text-white')}>PORTIX</span>
      {subtitle && <span className={cn('text-xs', invert ? 'text-white/75' : 'text-muted-foreground')}>{subtitle}</span>}
    </span>
  )
}
