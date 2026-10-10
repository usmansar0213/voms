import { createFileRoute } from '@tanstack/react-router'
import { Berths } from '@/features/voms/pages/berths'

export const Route = createFileRoute('/_app/berths')({
  component: Berths,
})
