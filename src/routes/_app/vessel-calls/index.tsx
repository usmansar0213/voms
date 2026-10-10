import { createFileRoute } from '@tanstack/react-router'
import { VesselCalls } from '@/features/voms/pages/vessel-calls'

type CallSearch = { status?: string; type?: string; q?: string }

export const Route = createFileRoute('/_app/vessel-calls/')({
  validateSearch: (search: Record<string, unknown>): CallSearch => ({
    status: typeof search.status === 'string' ? search.status : undefined,
    type: typeof search.type === 'string' ? search.type : undefined,
    q: typeof search.q === 'string' ? search.q : undefined,
  }),
  component: VesselCalls,
})
