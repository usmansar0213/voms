import { Check, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageShell } from '@/components/layout/page-shell'
import { actionLabels, allActions, can, roles } from '../roles'
import { useVoms } from '../store'
import { PageHeader, runAction } from '../components/common'

export function Access() {
  const role = useVoms((s) => s.role)
  const setRole = useVoms((s) => s.setRole)
  return (
    <PageShell>
      <PageHeader
        title='Roles & Access'
        description='Proposed role-based access (BRD Section 18). Use these cards or the role switch in the header to see how each user experiences VOMS.'
      />
      <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-3'>
        {roles.map((r) => (
          <Card key={r.id} className={cn('gap-3 py-4', r.id === role && 'border-primary ring-1 ring-primary')}>
            <CardHeader className='px-4'>
              <CardTitle>{r.name}</CardTitle>
              <CardDescription>{r.org}</CardDescription>
            </CardHeader>
            <CardContent className='grid gap-3 px-4 text-sm'>
              <p>{r.description}</p>
              <Button size='sm' variant={r.id === role ? 'secondary' : 'outline'} className='w-fit' disabled={r.id === role} onClick={() => runAction(() => setRole(r.id), `Now viewing as ${r.name}`)}>
                {r.id === role ? 'Current role' : 'View as this role'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Permission matrix</CardTitle>
          <CardDescription>Recorders and approvers are separate roles. The administrator has no operational approval rights. Final assignments are TBC by SBMA.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='overflow-x-auto rounded-md border'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className='sticky start-0 bg-card'>Function</TableHead>
                  {roles.map((r) => (
                    <TableHead key={r.id} className={cn('text-center', r.id === role && 'bg-primary/10')} title={r.name}>
                      {r.short}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {allActions.map((a) => (
                  <TableRow key={a}>
                    <TableCell className='sticky start-0 bg-card'>{actionLabels[a]}</TableCell>
                    {roles.map((r) => (
                      <TableCell key={r.id} className={cn('text-center', r.id === role && 'bg-primary/10')}>
                        {can(r.id, a) ? (
                          <Check className='mx-auto size-4 text-[var(--status-good)]' aria-label='Allowed' />
                        ) : (
                          <Minus className='mx-auto size-4 text-muted-foreground/50' aria-label='Not allowed' />
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className='mt-3 text-xs text-muted-foreground'>
            {roles.map((r) => `${r.short} = ${r.name}`).join(' · ')}
          </p>
        </CardContent>
      </Card>
    </PageShell>
  )
}
