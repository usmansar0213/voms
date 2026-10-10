import { createFileRoute } from '@tanstack/react-router'
import { Login } from '@/features/voms/pages/login'

export const Route = createFileRoute('/login')({
  // ?as=<persona key> signs straight in as a quick-start persona (shareable demo links).
  validateSearch: (search: Record<string, unknown>): { as?: string } => ({
    as: typeof search.as === 'string' ? search.as : undefined,
  }),
  component: Login,
})
