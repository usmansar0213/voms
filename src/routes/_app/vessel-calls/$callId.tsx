import { createFileRoute } from '@tanstack/react-router'
import { CallDetail } from '@/features/voms/pages/call-detail'

export const Route = createFileRoute('/_app/vessel-calls/$callId')({
  component: CallDetail,
})
