import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { RotateCcw, Ship } from 'lucide-react'
import { useLayout } from '@/context/layout-provider'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { roleById } from '@/features/voms/roles'
import { perspectiveMeta } from '@/features/voms/org'
import { useVoms } from '@/features/voms/store'
import { runAction } from '@/features/voms/components/common'
import { sidebarData } from './data/sidebar-data'
import { NavGroup } from './nav-group'

export function AppSidebar() {
  const { collapsible, variant } = useLayout()
  const { setOpenMobile } = useSidebar()
  const session = useVoms((s) => s.session)
  const perspective = useVoms((s) => s.perspective)
  const resetDemo = useVoms((s) => s.resetDemo)
  const [open, setOpen] = useState(false)
  return (
    <Sidebar collapsible={collapsible} variant={variant}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size='lg' className='h-14 hover:bg-transparent' asChild>
              <Link to='/' onClick={() => setOpenMobile(false)}>
                <div className='flex aspect-square size-10 items-center justify-center rounded-lg bg-sidebar-primary text-white'>
                  <Ship className='size-5' />
                </div>
                <div className='grid flex-1 text-start text-sm leading-tight'>
                  <span className='truncate text-xl font-bold tracking-tight text-white'>VOMS</span>
                  <span className='truncate text-xs text-sidebar-foreground/70'>Port of Subic Bay · Mockup</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {sidebarData.navGroups.map((g) => (
          <NavGroup key={g.title} title={g.title} items={g.items.filter((i) => !i.only || i.only === perspective)} />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <div className='rounded-md border border-dashed border-sidebar-border p-2 text-xs group-data-[collapsible=icon]:hidden'>
          <div className='text-sidebar-foreground/70'>Signed in as</div>
          <div className='font-medium'>{session?.name}</div>
          <div className='text-sidebar-foreground/70'>
            {session && roleById[session.role].name} · {session && perspectiveMeta[session.perspective].short}
          </div>
          <div className='text-sidebar-foreground/70'>Scope: {session?.scopeLabel}</div>
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => setOpen(true)} tooltip='Reset demo data'>
              <RotateCcw />
              <span>Reset demo data</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title='Reset demo data?'
        desc='All changes made during this demo are discarded and the simulated vessel calls are regenerated relative to the current time.'
        confirmText='Reset'
        handleConfirm={() => {
          setOpen(false)
          runAction(resetDemo, 'Demo data reset')
        }}
      />
    </Sidebar>
  )
}
