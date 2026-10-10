import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { PageShell } from '@/components/layout/page-shell'
import { useVoms, visibleAlerts } from '../store'
import type { AlertCategory } from '../types'
import { AlertItem, categoryLabel } from '../components/alerts-panel'
import { EmptyState, PageHeader } from '../components/common'

export function Alerts() {
  const state = useVoms()
  const all = visibleAlerts(state)
  const [status, setStatus] = useState<'active' | 'resolved' | 'all'>('active')
  const [cat, setCat] = useState<AlertCategory | 'all'>('all')
  const list = all
    .filter((a) => (status === 'all' ? true : status === 'resolved' ? a.status === 'resolved' : a.status !== 'resolved'))
    .filter((a) => cat === 'all' || a.category === cat)
    .sort((a, b) => b.time.localeCompare(a.time))
  return (
    <PageShell>
      <PageHeader
        title='Alerts'
        description={`Scoped to ${state.session?.scopeLabel}. Thresholds shown are illustrative, not approved operational rules.`}
      />
      <div className='grid gap-2'>
        <div className='-mx-4 flex gap-2 overflow-x-auto px-4 no-scrollbar'>
          {(['active', 'resolved', 'all'] as const).map((s) => (
            <Button key={s} size='sm' variant={status === s ? 'default' : 'outline'} className='shrink-0 rounded-full capitalize' onClick={() => setStatus(s)}>
              {s}
            </Button>
          ))}
        </div>
        <div className='-mx-4 flex gap-2 overflow-x-auto px-4 no-scrollbar'>
          {(['all', ...Object.keys(categoryLabel)] as (AlertCategory | 'all')[]).map((c) => (
            <Button key={c} size='sm' variant={cat === c ? 'secondary' : 'ghost'} className='shrink-0 rounded-full' onClick={() => setCat(c)}>
              {c === 'all' ? 'All categories' : categoryLabel[c]}
            </Button>
          ))}
        </div>
      </div>
      {list.length === 0 ? (
        <EmptyState>No alerts match. That is a normal, neutral state.</EmptyState>
      ) : (
        <ul className='grid gap-2 lg:grid-cols-2'>
          {list.map((a) => (
            <AlertItem key={a.id} alert={a} />
          ))}
        </ul>
      )}
    </PageShell>
  )
}
