import { createFileRoute } from '@tanstack/react-router'
import { KpiDetail } from '@/features/voms/pages/portix/kpi-detail'

export const Route = createFileRoute('/_app/kpis/$kpiId')({
  validateSearch: (search: Record<string, unknown>): { scope?: string } => ({
    scope: typeof search.scope === 'string' ? search.scope : undefined,
  }),
  component: KpiDetail,
})
