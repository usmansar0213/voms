import { createFileRoute } from '@tanstack/react-router'
import { VesselIntelligence } from '@/features/voms/pages/portix/vessel-intelligence'

export const Route = createFileRoute('/_app/vessel-intelligence')({
  component: VesselIntelligence,
})
