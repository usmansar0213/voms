import { createFileRoute } from '@tanstack/react-router'
import { StrategicKpis } from '@/features/voms/pages/portix/strategic-kpis'

export const Route = createFileRoute('/_app/kpis/')({
  component: StrategicKpis,
})
