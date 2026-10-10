import { createFileRoute } from '@tanstack/react-router'
import { Submissions } from '@/features/voms/pages/submissions'

export const Route = createFileRoute('/_app/submissions/')({
  validateSearch: (search: Record<string, unknown>): { upload?: boolean } => ({
    upload: search.upload === true || search.upload === 'true' ? true : undefined,
  }),
  component: Submissions,
})
