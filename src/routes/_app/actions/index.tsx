import { createFileRoute } from '@tanstack/react-router'
import { ManagementActions } from '@/features/voms/pages/portix/management-actions'

export const Route = createFileRoute('/_app/actions/')({
  component: ManagementActions,
})
