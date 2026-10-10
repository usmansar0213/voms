import { createFileRoute } from '@tanstack/react-router'
import { Vessels } from '@/features/voms/pages/vessels'

export const Route = createFileRoute('/_app/vessels')({
  component: Vessels,
})
