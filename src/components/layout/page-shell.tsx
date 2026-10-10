import type { ReactNode } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { Bell, FileStack, LayoutDashboard, Menu, Ship } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSidebar } from '@/components/ui/sidebar'
import { ConfigDrawer } from '@/components/config-drawer'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { DemoBadge } from '@/features/voms/components/common'
import { SessionMenu } from '@/features/voms/components/session-menu'
import { Header } from './header'
import { Main } from './main'

/** Standard page frame: sticky header (search, role, theme) + content. */
export function PageShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <>
      <Header fixed>
        <Search className='me-auto min-w-0' placeholder='Search…' />
        <DemoBadge className='hidden lg:inline-flex' />
        <SessionMenu />
        <ThemeSwitch />
        <div className='hidden sm:block'>
          <ConfigDrawer />
        </div>
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
