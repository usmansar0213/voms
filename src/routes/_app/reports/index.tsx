import { createFileRoute } from '@tanstack/react-router'
import { Reports } from '@/features/voms/pages/reports'

export const Route = createFileRoute('/_app/reports/')({
  component: Reports,
})
