import { useState } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageShell } from '@/components/layout/page-shell'
import { fmtNum } from '../format'
import { isValidImo } from '../seed'
import { useVoms } from '../store'
import { Field } from '../components/dialogs'
import { PageHeader } from '../components/common'

export function Vessels() {
  const { vessels, calls } = useVoms()
  const [imo, setImo] = useState('')
  const valid = isValidImo(imo)
  const match = vessels.find((v) => v.imo === imo)
  return (
    <PageShell>
      <PageHeader
        title='Vessel Registry'
        description='Vessel master data is kept separate from vessel call transactions. All vessels shown are fictitious demo records.'
      />

      <Card>
        <CardHeader>
          <CardTitle>IMO number check</CardTitle>
          <CardDescription>Validates format and check digit, then searches the register before a new vessel is created (duplicate prevention).</CardDescription>
        </CardHeader>
        <CardContent className='grid gap-2 sm:max-w-md'>
          <Field label='IMO number (7 digits)'>
            <Input inputMode='numeric' maxLength={7} value={imo} onChange={(e) => setImo(e.target.value.replace(/\D/g, ''))} placeholder='e.g. 9001019' />
          </Field>
          {imo.length === 7 && (
            <div className='flex items-center gap-2 text-sm'>
              {valid ? <CheckCircle2 className='size-4 text-[var(--status-good)]' /> : <XCircle className='size-4 text-[var(--status-critical)]' />}
              {valid ? (match ? `Valid — already registered as ${match.name}` : 'Valid check digit — no existing record found') : 'Invalid check digit'}
            </div>
          )}
        </CardContent>
      </Card>

      <div className='grid gap-3 md:hidden'>
        {vessels.map((v) => (
          <div key={v.id} className='rounded-xl border bg-card p-3 text-sm'>
            <div className='font-semibold'>{v.name}</div>
            <div className='text-xs text-muted-foreground'>
              IMO {v.imo} · {v.typeLabel}
            </div>
            <div className='mt-2 grid grid-cols-3 gap-2 text-xs'>
              <span>LOA {v.loa} m</span>
              <span>Draft {v.draft} m</span>
              <span>DWT {fmtNum(v.dwt)}</span>
            </div>
          </div>
        ))}
      </div>
      <div className='hidden overflow-x-auto rounded-md border md:block'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vessel</TableHead>
              <TableHead>IMO</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className='text-end'>LOA (m)</TableHead>
              <TableHead className='text-end'>Beam (m)</TableHead>
              <TableHead className='text-end'>Draft (m)</TableHead>
              <TableHead className='text-end'>GT</TableHead>
              <TableHead className='text-end'>DWT</TableHead>
              <TableHead className='text-end'>Calls</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vessels.map((v) => (
              <TableRow key={v.id}>
                <TableCell className='font-medium'>{v.name}</TableCell>
                <TableCell className='tabular-nums'>{v.imo}</TableCell>
                <TableCell>{v.typeLabel}</TableCell>
                <TableCell className='text-end tabular-nums'>{v.loa}</TableCell>
                <TableCell className='text-end tabular-nums'>{v.beam}</TableCell>
                <TableCell className='text-end tabular-nums'>{v.draft}</TableCell>
                <TableCell className='text-end tabular-nums'>{fmtNum(v.gt)}</TableCell>
                <TableCell className='text-end tabular-nums'>{fmtNum(v.dwt)}</TableCell>
                <TableCell className='text-end tabular-nums'>{calls.filter((c) => c.vesselId === v.id).length}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </PageShell>
  )
}
