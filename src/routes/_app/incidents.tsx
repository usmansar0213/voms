import { createFileRoute } from '@tanstack/react-router'
import { Incidents } from '@/features/voms/pages/incidents'

export const Route = createFileRoute('/_app/incidents')({
  component: Incidents,
})
