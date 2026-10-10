import { createFileRoute } from '@tanstack/react-router'
import { CallReport } from '@/features/voms/pages/call-report'

export const Route = createFileRoute('/_app/reports/$callId')({
  component: CallReport,
})
