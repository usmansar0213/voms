import { createFileRoute } from '@tanstack/react-router'
import { PortPerformance } from '@/features/voms/pages/portix/port-performance'

export const Route = createFileRoute('/_app/performance')({
  component: PortPerformance,
})
