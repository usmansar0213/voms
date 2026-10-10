import { cn } from '@/lib/utils'

/** VOMS brand mark: ship over two waves (original vector, no external asset). */
export function VomsMark({ className }: { className?: string }) {
  return (
    <svg viewBox='0 0 64 56' role='img' aria-label='VOMS' className={cn('h-14 w-16', className)}>
      <g fill='#1c5cab'>
        <rect x='27' y='2' width='6' height='9' rx='1' />
        <path d='M16 12h28a2 2 0 0 1 2 2v9H14v-9a2 2 0 0 1 2-2z' />
        <path d='M6 25h52l-7 13H13z' />
      </g>
      <g fill='#ffffff'>
        <rect x='20' y='15' width='5' height='4' rx='0.8' />
        <rect x='28' y='15' width='5' height='4' rx='0.8' />
        <rect x='36' y='15' width='5' height='4' rx='0.8' />
      </g>
      <path d='M2 44c8-5 14-5 22 0s14 5 22 0 12-4 16-2' fill='none' stroke='#2a78d6' strokeWidth='4' strokeLinecap='round' />
      <path d='M8 52c7-4 12-4 19 0s12 4 19 0' fill='none' stroke='#5598e7' strokeWidth='3.5' strokeLinecap='round' />
    </svg>
  )
}
