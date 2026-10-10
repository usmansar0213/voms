import { useNavigate } from '@tanstack/react-router'
import { ArrowLeftRight, ChevronsUpDown, LogOut, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { orgById, perspectiveMeta } from '../org'
import { roleById } from '../roles'
import { useVoms } from '../store'

/** Signed-in demo persona: shows role, perspective and scope; switches perspective. */
export function SessionMenu() {
  const session = useVoms((s) => s.session)
  const switchPerspective = useVoms((s) => s.switchPerspective)
  const logout = useVoms((s) => s.logout)
  const navigate = useNavigate()
  if (!session) return null
  const role = roleById[session.role]
  const other = session.perspective === 'submission' ? 'management' : 'submission'
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant='outline' size='sm' className='h-8 max-w-[10rem] gap-1.5 sm:max-w-none' aria-label='Demo session'>
          <UserRound className='size-4 shrink-0' />
          <span className='truncate sm:hidden'>
            {role.short} · {perspectiveMeta[session.perspective].short[0]}
          </span>
          <span className='hidden truncate sm:inline'>
            {role.short} · {perspectiveMeta[session.perspective].short}
          </span>
          <ChevronsUpDown className='size-3.5 shrink-0 opacity-60' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-80'>
        <DropdownMenuLabel className='grid gap-0.5 font-normal'>
          <span className='font-semibold'>{session.name}</span>
          <span className='text-xs text-muted-foreground'>{orgById[session.orgId].name}</span>
          <span className='text-xs text-muted-foreground'>
            {role.name} · {perspectiveMeta[session.perspective].label}
          </span>
          <span className='text-xs text-muted-foreground'>Scope: {session.scopeLabel}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            switchPerspective(other)
            navigate({ to: '/' })
            toast.info(`Switched to ${perspectiveMeta[other].label}`)
          }}
        >
          <ArrowLeftRight /> Switch to {perspectiveMeta[other].label}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            logout()
            navigate({ to: '/login' })
          }}
        >
          <LogOut /> Sign out / change role
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
