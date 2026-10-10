import { createFileRoute } from '@tanstack/react-router'
import { Ask } from '@/features/voms/pages/ask'

export const Route = createFileRoute('/_app/ask')({
  component: Ask,
})
