import { createFileRoute } from '@tanstack/react-router'
import { TerminalIntelligence } from '@/features/voms/pages/portix/terminal-intelligence'

export const Route = createFileRoute('/_app/terminals')({
  component: TerminalIntelligence,
})
