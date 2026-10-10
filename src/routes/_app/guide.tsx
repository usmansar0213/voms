import { createFileRoute } from '@tanstack/react-router'
import { Guide } from '@/features/voms/pages/guide'

export const Route = createFileRoute('/_app/guide')({
  component: Guide,
})
