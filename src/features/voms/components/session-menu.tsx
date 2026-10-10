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

export const initials = (name: string) =>
  name
    .replace(/^Demo /, '')
    .split(/\s+/)
    .filter((w) => /^[A-Z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join('')

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
        <Button variant='outline' className='h-9 gap-2 rounded-full bg-muted/60 px-2 sm:px-3' aria-label='Demo session'>
          <span className='flex size-6 items-center justify-center rounded-full bg-[var(--series-1)]/15 text-[11px] font-semibold text-[var(--series-1-ink)] sm:hidden'>
            {initials(session.name)}
          </span>
          <span className='hidden text-xs text-muted-foreground md:inline'>Viewing as</span>
          <UserRound className='hidden size-4 shrink-0 sm:block' />
          <span className='hidden max-w-[12rem] truncate font-medium sm:inline xl:max-w-[22rem]'>
            {role.name} · {perspectiveMeta[session.perspective].short}
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

/** Initials avatar shown next to the session menu on larger screens. */
export function SessionAvatar() {
  const name = useVoms((s) => s.session?.name)
  if (!name) return null
  return (
    <span className='hidden size-9 shrink-0 items-center justify-center rounded-full bg-[var(--series-1)]/15 text-xs font-semibold text-[var(--series-1-ink)] sm:flex' title={name}>
      {initials(name)}
    </span>
  )
}
