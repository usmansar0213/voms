import { Check, ChevronsUpDown, UserRound } from 'lucide-react'
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
import { roleById, roles } from '../roles'
import { useVoms } from '../store'

/** Demo-only role switch: lets presenters show role-based access without sign-in. */
export function RoleSwitcher() {
  const role = useVoms((s) => s.role)
  const setRole = useVoms((s) => s.setRole)
  const current = roleById[role]
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant='outline' size='sm' className='h-8 max-w-[11rem] gap-1.5 sm:max-w-none' aria-label='Switch demo role'>
          <UserRound className='size-4 shrink-0' />
          <span className='truncate sm:hidden'>{current.short}</span>
          <span className='hidden truncate sm:inline'>{current.name}</span>
          <ChevronsUpDown className='size-3.5 shrink-0 opacity-60' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-72'>
        <DropdownMenuLabel className='text-xs text-muted-foreground'>View the demo as…</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {roles.map((r) => (
          <DropdownMenuItem
            key={r.id}
            onSelect={() => {
              setRole(r.id)
              toast.info(`Now viewing as ${r.name}`)
            }}
            className='items-start gap-2'
          >
            <Check className={r.id === role ? 'mt-0.5 opacity-100' : 'mt-0.5 opacity-0'} />
            <div>
              <div className='font-medium'>{r.name}</div>
              <div className='text-xs text-muted-foreground'>{r.org}</div>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
