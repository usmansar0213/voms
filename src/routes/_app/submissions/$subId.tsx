import { createFileRoute } from '@tanstack/react-router'
import { SubmissionDetail } from '@/features/voms/pages/submission-detail'

export const Route = createFileRoute('/_app/submissions/$subId')({
  component: SubmissionDetail,
})
