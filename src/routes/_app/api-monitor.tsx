import { createFileRoute } from '@tanstack/react-router'
import { ApiMonitor } from '@/features/voms/pages/api-monitor'

export const Route = createFileRoute('/_app/api-monitor')({
  component: ApiMonitor,
})
