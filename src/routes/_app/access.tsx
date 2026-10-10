import { createFileRoute } from '@tanstack/react-router'
import { Access } from '@/features/voms/pages/access'

export const Route = createFileRoute('/_app/access')({
  component: Access,
})
