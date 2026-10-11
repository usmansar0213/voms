import { createFileRoute } from '@tanstack/react-router'
import { ActionDetail } from '@/features/voms/pages/portix/action-detail'

export const Route = createFileRoute('/_app/actions/$actionId')({
  component: ActionDetail,
})
