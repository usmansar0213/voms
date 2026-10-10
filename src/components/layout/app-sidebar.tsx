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
import { useVoms } from '@/features/voms/store'
import { runAction } from '@/features/voms/components/common'
import { sidebarData } from './data/sidebar-data'
import { NavGroup } from './nav-group'

export function AppSidebar() {
  const { collapsible, variant } = useLayout()
  const { setOpenMobile } = useSidebar()
  const role = useVoms((s) => s.role)
  const resetDemo = useVoms((s) => s.resetDemo)
  const [open, setOpen] = useState(false)
  return (
    <Sidebar collapsible={collapsible} variant={variant}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size='lg' asChild>
              <Link to='/' onClick={() => setOpenMobile(false)}>
                <div className='flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground'>
                  <Ship className='size-4' />
                </div>
                <div className='grid flex-1 text-start text-sm leading-tight'>
                  <span className='truncate font-bold'>VOMS</span>
                  <span className='truncate text-xs text-muted-foreground'>Port of Subic Bay · Mockup</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {sidebarData.navGroups.map((props) => (
          <NavGroup key={props.title} {...props} />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <div className='rounded-md border border-dashed p-2 text-xs group-data-[collapsible=icon]:hidden'>
          <div className='text-muted-foreground'>Viewing as</div>
          <div className='font-medium'>{roleById[role].name}</div>
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
