import { createFileRoute } from '@tanstack/react-router'
import { Integrations } from '@/features/voms/pages/integrations'

export const Route = createFileRoute('/_app/integrations')({
  component: Integrations,
})
