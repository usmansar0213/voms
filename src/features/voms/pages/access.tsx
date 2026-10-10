import { Check, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageShell } from '@/components/layout/page-shell'
import { orgs, perspectiveMeta, rolesForOrg } from '../org'
import { actionLabels, allActions, can, roles } from '../roles'
import { useActor } from '../store'
import type { Perspective } from '../types'
import { PageHeader } from '../components/common'

const perspectives: Perspective[] = ['submission', 'management']

export function Access() {
  const actor = useActor()
  const columns = roles.flatMap((r) => perspectives.map((p) => ({ role: r, p })))
  return (
    <PageShell>
      <PageHeader
        title='Roles & Access'
        description='Six operational roles (BRD Section 18). Each role has a Submission perspective (record and submit) and a Management perspective (verify, approve and monitor), as in the Project Design Document.'
      />

      <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-3'>
        {roles.map((r) => (
          <Card key={r.id} className={cn('gap-3 py-4', r.id === actor.role && 'border-primary ring-1 ring-primary')}>
            <CardHeader className='px-4'>
              <CardTitle>{r.name}</CardTitle>
              <CardDescription>
                {r.org} · {r.description}
              </CardDescription>
            </CardHeader>
            <CardContent className='grid gap-2 px-4 text-sm'>
              {perspectives.map((p) => (
                <div key={p} className={cn('rounded-md border p-2', r.id === actor.role && p === actor.perspective && 'bg-primary/5')}>
                  <div className='text-xs font-semibold'>{perspectiveMeta[p].label}</div>
                  <div className='text-muted-foreground'>{p === 'submission' ? r.submission : r.management}</div>
                </div>
              ))}
              <div className='text-xs text-muted-foreground'>Reports: {r.reports.join(', ')}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organization → role mapping (demo)</CardTitle>
          <CardDescription>Scope can cover one terminal, several terminals or all authorized port units. Final hierarchy is TBC by SBMA.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className='grid gap-2 text-sm sm:grid-cols-2'>
            {orgs.map((o) => (
              <li key={o.id} className='rounded-md border p-2'>
                <div className='font-medium'>{o.name}</div>
                <div className='text-xs text-muted-foreground'>{rolesForOrg[o.id].map((id) => roles.find((r) => r.id === id)!.name).join(', ')}</div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Permission matrix</CardTitle>
          <CardDescription>S = Submission, M = Management. A record is never approved from the perspective that created it. Your current column is highlighted.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='overflow-x-auto rounded-md border'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className='sticky start-0 z-10 bg-card' rowSpan={2}>
                    Function
                  </TableHead>
                  {roles.map((r) => (
                    <TableHead key={r.id} colSpan={2} className='border-s text-center' title={r.name}>
                      {r.short}
                    </TableHead>
                  ))}
                </TableRow>
                <TableRow>
                  {columns.map(({ role, p }) => (
                    <TableHead key={`${role.id}${p}`} className={cn('text-center text-xs', p === 'submission' && 'border-s', role.id === actor.role && p === actor.perspective && 'bg-primary/10')}>
                      {p === 'submission' ? 'S' : 'M'}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {allActions.map((a) => (
                  <TableRow key={a}>
                    <TableCell className='sticky start-0 z-10 min-w-48 bg-card'>{actionLabels[a]}</TableCell>
                    {columns.map(({ role, p }) => (
                      <TableCell key={`${role.id}${p}`} className={cn('text-center', p === 'submission' && 'border-s', role.id === actor.role && p === actor.perspective && 'bg-primary/10')}>
                        {can({ role: role.id, perspective: p }, a) ? (
                          <Check className='mx-auto size-4 text-[var(--status-good)]' aria-label='Allowed' />
                        ) : (
                          <Minus className='mx-auto size-4 text-muted-foreground/40' aria-label='Not allowed' />
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className='mt-3 text-xs text-muted-foreground'>{roles.map((r) => `${r.short} = ${r.name}`).join(' · ')}</p>
        </CardContent>
      </Card>
    </PageShell>
  )
}
