import { createFileRoute } from '@tanstack/react-router'
import { Dashboard } from '@/features/voms/pages/dashboard'

export const Route = createFileRoute('/_app/')({
  component: Dashboard,
})
