import { createFileRoute } from '@tanstack/react-router'
import { CargoTerminal } from '@/features/voms/pages/cargo'

export const Route = createFileRoute('/_app/cargo')({
  component: CargoTerminal,
})
