import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { LogIn, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { PageShell } from '@/components/layout/page-shell'
import { perspectiveMeta } from '../org'
import { roleById } from '../roles'
import { useVoms } from '../store'
import type { Perspective, RoleId } from '../types'
import { PageHeader, runAction } from '../components/common'
import { buildSession } from './login'

type Start = { orgId: string; role: RoleId; perspective: Perspective; scopeId?: string; to: string }

const scenarios: { title: string; summary: string; start: Start; steps: string[] }[] = [
  {
    title: 'Scenario 1 — Container upload & anomaly',
    summary: 'Submission Coordinator, Container Terminal A',
    start: { orgId: 'ORG-TA', role: 'terminal_operator', perspective: 'submission', to: '/submissions' },
    steps: [
      'Submission Center → choose sample “Anomaly: 0 containers” (or 1,000) → Process submission.',
      'Review the extracted fields: confidence, source citation and the anomaly flag versus the typical ~100/day.',
      'Correct “Total container moves” to 104 (discharge 61 + load 43); the anomaly and consistency flags clear. Submit for approval.',
      'Switch to Management (session menu) → Submission Review → approve. The coordinator cannot approve their own report.',
      'Dashboard trend now shows the published value; the anomaly alert can be resolved.',
    ],
  },
  {
    title: 'Scenario 2 — API failure & recovery',
    summary: 'Submission Coordinator, Bulk Terminal B',
    start: { orgId: 'ORG-TB', role: 'terminal_operator', perspective: 'submission', to: '/api-monitor' },
    steps: [
      'API Monitor shows Terminal B TOS degraded with mapping errors and queued retries.',
      'Retry now: transport recovers but records stay held until mapping is fixed.',
      'Sign in as System / Access Administrator (Submission) → Update mapping table; optionally Simulate failure on another connector.',
      'Retry again → healthy; data freshness strip and the API alert update.',
    ],
  },
  {
    title: 'Scenario 3 — Single-terminal manager',
    summary: 'Terminal Operator, Management perspective, Terminal A only',
    start: { orgId: 'ORG-TA', role: 'terminal_operator', perspective: 'management', scopeId: 'U-TA', to: '/' },
    steps: [
      'Dashboard: KPIs, alerts and AI insight cards scoped to Terminal A.',
      'Ask in the discussion box: “Why is container throughput lower this week?”',
      'Ask about “Terminal B” — the assistant refuses because it is outside the scope.',
    ],
  },
  {
    title: 'Scenario 4 — Wider scopes without leakage',
    summary: 'Multi-terminal manager, then port authority',
    start: { orgId: 'ORG-TA', role: 'terminal_operator', perspective: 'management', scopeId: 'multi', to: '/' },
    steps: [
      'Multi-terminal scope shows Terminals A, B and C side by side (each in its own unit).',
      'Sign out → Port Authority Management (Management): port-wide vessel traffic, throughput and risk.',
      'Sign in as Shipping Agency B: only that agency’s vessel calls and alerts are visible.',
    ],
  },
  {
    title: 'Scenario 5 — Bulk & tanker calls, environment, integrated report',
    summary: 'Harbor Master, Management perspective (port-wide)',
    start: { orgId: 'ORG-SBMA', role: 'harbor_master', perspective: 'management', to: '/vessel-calls' },
    steps: [
      'Open SB-2026-000122 (coal, MT) and SB-2026-000123 (fuel, KL) — commodity-specific units.',
      'Alerts: coal dust environmental alert and tanker manifold drip; acknowledge / resolve.',
      'On SB-2026-000120: verify production and tally, then close the call (Port Control records Last Line and ATD in the Submission perspective).',
      'Open the Integrated Vessel Call Report and print / save as PDF.',
    ],
  },
]

export function Guide() {
  const login = useVoms((s) => s.login)
  const resetDemo = useVoms((s) => s.resetDemo)
  const navigate = useNavigate()
  const [confirm, setConfirm] = useState(false)
  return (
    <PageShell>
      <PageHeader
        title='Demo Guide'
        description='Five management demo scenarios from the Project Design Document. Every value is synthetic and labelled.'
        actions={
          <Button variant='outline' onClick={() => setConfirm(true)}>
            <RotateCcw /> Reset demo data
          </Button>
        }
      />
      <div className='grid gap-4 lg:grid-cols-2'>
        {scenarios.map((s) => (
          <Card key={s.title}>
            <CardHeader>
              <CardTitle>{s.title}</CardTitle>
              <CardDescription>{s.summary}</CardDescription>
            </CardHeader>
            <CardContent className='grid gap-3'>
              <ol className='grid gap-2 text-sm'>
                {s.steps.map((st, i) => (
                  <li key={i} className='grid grid-cols-[1.5rem_1fr] gap-2'>
                    <span className='flex size-6 items-center justify-center rounded-full bg-muted text-xs font-semibold'>{i + 1}</span>
                    <span>{st}</span>
                  </li>
                ))}
              </ol>
              <Button
                className='w-fit'
                onClick={() => {
                  login(buildSession(s.start.orgId, s.start.role, s.start.perspective, s.start.scopeId))
                  navigate({ to: s.start.to })
                }}
              >
                <LogIn /> Start as {roleById[s.start.role].short} · {perspectiveMeta[s.start.perspective].short}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className='grid gap-4 lg:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle>What this mockup is — and is not</CardTitle>
          </CardHeader>
          <CardContent className='grid gap-2 text-sm'>
            <ul className='list-disc space-y-1 ps-5'>
              <li>All vessels, IMO numbers, organizations, berths and figures are fictitious demo data.</li>
              <li>AI extraction, insights and answers are rule-based simulations — no AI model is called and no file content is read.</li>
              <li>API connectors are simulated. No connection to SBMA, AIS, TOS or government systems.</li>
              <li>Demo sign-in has no password; production derives roles and scopes from the authenticated identity.</li>
              <li>Data is stored only in this browser. “Reset demo data” restores the starting scenario.</li>
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Open-source credits</CardTitle>
          </CardHeader>
          <CardContent className='grid gap-2 text-sm'>
            <ul className='list-disc space-y-1 ps-5'>
              <li>
                UI shell based on{' '}
                <a className='underline' href='https://github.com/satnaing/shadcn-admin' target='_blank' rel='noreferrer'>
                  shadcn-admin
                </a>{' '}
                by Sat Naing (MIT)
              </li>
              <li>shadcn/ui, Radix UI, Tailwind CSS, TanStack Router, Recharts, Zustand, date-fns, Sonner (MIT); Lucide icons (ISC)</li>
              <li>Event vocabulary informed by DCSA Port Call / JIT and IALA S-211 concepts (reference only)</li>
            </ul>
          </CardContent>
        </Card>
      </div>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title='Reset demo data?'
        desc='All changes made during this demo are discarded and the simulated data is regenerated relative to the current time. You stay signed in.'
        confirmText='Reset'
        handleConfirm={() => {
          setConfirm(false)
          runAction(resetDemo, 'Demo data reset')
        }}
      />
    </PageShell>
  )
}
