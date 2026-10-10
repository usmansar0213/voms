import { createFileRoute } from '@tanstack/react-router'
import { Alerts } from '@/features/voms/pages/alerts'

export const Route = createFileRoute('/_app/alerts')({
  component: Alerts,
})
