import { createFileRoute } from '@tanstack/react-router'
import { LiveOperations } from '@/features/voms/pages/portix/live-operations'

export const Route = createFileRoute('/_app/operations')({
  component: LiveOperations,
})
