import { useState, type ReactNode } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { Bell, FileStack, Info, LayoutDashboard, Menu, RotateCcw, Ship, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useSidebar } from '@/components/ui/sidebar'
import { ConfigDrawer } from '@/components/config-drawer'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { runAction } from '@/features/voms/components/common'
import { SessionAvatar, SessionMenu } from '@/features/voms/components/session-menu'
import { useVoms } from '@/features/voms/store'
import { Header } from './header'
import { Main } from './main'

const BANNER_KEY = 'voms-demo-banner-dismissed'

/** Persistent demo disclaimer (dismissible per browser session). */
export function DemoBanner() {
  const [hidden, setHidden] = useState(() => {
    try {
      return sessionStorage.getItem(BANNER_KEY) === '1'
    } catch {
      return false
    }
  })
  if (hidden) return null
  return (
    <div role='note' className='flex items-center gap-3 border-b bg-[var(--series-1)]/10 px-4 py-2 text-xs text-foreground sm:text-sm'>
      <Ship className='hidden size-4 shrink-0 text-[var(--series-1-ink)] sm:block' aria-hidden />
      <p className='min-w-0 flex-1'>
        <span className='font-semibold'>VOMS</span>
        <span className='hidden sm:inline'> · Port of Subic Bay</span> · Demo environment — all data are simulated.
        <span className='hidden lg:inline'>
          {' '}
          <Info className='mb-0.5 ms-2 inline size-3.5 text-[var(--series-1-ink)]' aria-hidden /> Not connected to live SBMA, AIS or terminal systems.
        </span>
      </p>
      <button
        type='button'
        aria-label='Dismiss demo notice'
        className='rounded p-1 hover:bg-background/60'
        onClick={() => {
          try {
            sessionStorage.setItem(BANNER_KEY, '1')
          } catch {
            /* storage unavailable: hide for this render only */
          }
          setHidden(true)
        }}
      >
        <X className='size-4' />
      </button>
    </div>
  )
}

function ResetButton() {
  const resetDemo = useVoms((s) => s.resetDemo)
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant='outline' className='hidden h-9 rounded-full xl:inline-flex' onClick={() => setOpen(true)}>
        <RotateCcw /> Reset demo data
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title='Reset demo data?'
        desc='All changes made during this demo are discarded and the simulated data is regenerated relative to the current time.'
        confirmText='Reset'
        handleConfirm={() => {
          setOpen(false)
          runAction(resetDemo, 'Demo data reset')
        }}
      />
    </>
  )
}

/** Standard page frame: sticky header (search, session, theme) + content. */
export function PageShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <>
      <Header fixed className='border-b bg-card'>
        <Search className='me-auto h-9 min-w-0 rounded-full sm:w-56 lg:w-64 2xl:w-96' placeholder='Search…' />
        <SessionMenu />
        <ResetButton />
        <ThemeSwitch />
        <div className='hidden 2xl:block'>
          <ConfigDrawer />
        </div>
        <SessionAvatar />
      </Header>
      <Main className={cn('flex flex-1 flex-col gap-4 pb-24 sm:gap-6 md:pb-6', className)}>{children}</Main>
    </>
  )
}

const tabs = [
  { to: '/', label: 'Home', icon: LayoutDashboard },
  { to: '/submissions', label: 'Submissions', icon: FileStack },
  { to: '/vessel-calls', label: 'Calls', icon: Ship },
  { to: '/alerts', label: 'Alerts', icon: Bell },
] as const

/** Thumb-reachable navigation for phones; the full menu stays in the sidebar sheet. */
export function BottomNav() {
  const path = useLocation({ select: (l) => l.pathname })
  const { setOpenMobile } = useSidebar()
  return (
    <nav
      aria-label='Primary'
      className='fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden'
    >
      <ul className='grid grid-cols-5'>
        {tabs.map((t) => {
          const active = t.to === '/' ? path === '/' : path.startsWith(t.to)
          return (
            <li key={t.to}>
              <Link
                to={t.to}
                className={cn(
                  'flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] text-muted-foreground',
                  active && 'font-semibold text-primary'
                )}
              >
                <t.icon className='size-5' aria-hidden />
                {t.label}
              </Link>
            </li>
          )
        })}
        <li>
          <button
            type='button'
            onClick={() => setOpenMobile(true)}
            className='flex h-14 w-full flex-col items-center justify-center gap-0.5 text-[11px] text-muted-foreground'
          >
            <Menu className='size-5' aria-hidden />
            More
          </button>
        </li>
      </ul>
    </nav>
  )
}
