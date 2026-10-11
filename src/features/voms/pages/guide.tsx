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
    title: 'Scenario 1 — Monthly executive review',
    summary: 'Port Authority Executive · port-wide',
    start: { orgId: 'ORG-SBMA', role: 'management', perspective: 'management', to: '/' },
    steps: [
      'Executive Overview: KPI achievement vs illustrative targets for the latest month; change the month with the period selector.',
      'Read the executive summary: verified facts, inferred interpretation and proposed actions.',
      'Open Strategic KPIs → a KPI off target → definition, 24-month trend, terminal breakdown.',
      'Terminal Intelligence: benchmark the three terminals on comparable KPIs (throughput stays in TEU / MT / KL).',
    ],
  },
  {
    title: 'Scenario 2 — KPI breach → action → outcome',
    summary: 'Port Operations Manager (Harbor Master) · port-wide',
    start: { orgId: 'ORG-SBMA', role: 'harbor_master', perspective: 'management', to: '/alerts' },
    steps: [
      'Alerts & Risks: open the “Waiting time off target — Terminal B” KPI-breach alert → Create action (baseline captured).',
      'Management Actions: follow ACT-2026-0012 (in progress) and the blocked ACT-2026-0014 (overdue).',
      'Mark an action done, then sign in as Port Authority Executive to review the outcome against the KPI and close it — the owner cannot assess their own outcome.',
    ],
  },
  {
    title: 'Scenario 3 — Terminal view & confidentiality',
    summary: 'Terminal Manager · Terminal A only, then the terminal group',
    start: { orgId: 'ORG-TA', role: 'terminal_operator', perspective: 'management', scopeId: 'U-TA', to: '/terminals' },
    steps: [
      'Terminal Intelligence shows Terminal A named and a port average — peer terminals are not shown individually.',
      'AI Intelligence: ask about “Terminal B” — the assistant refuses because it is outside the scope.',
      'Sign out → Terminal Group Manager to see A, B and C side by side.',
    ],
  },
  {
    title: 'Scenario 4 — Data quality & integration',
    summary: 'Data Steward (Terminal A), then Integration Administrator',
    start: { orgId: 'ORG-TA', role: 'terminal_operator', perspective: 'submission', to: '/submissions' },
    steps: [
      'Submissions → sample “Anomaly: 1,000 containers” → Process → anomaly and consistency flags; correct the total to 104 and submit.',
      'Switch to Management (session menu) → approve; the coordinator cannot approve their own report.',
      'Sign in as Integration Administrator → API integration monitor: Terminal B TOS degraded → Update mapping table → Retry.',
    ],
  },
  {
    title: 'Scenario 5 — From strategy to a single vessel call',
    summary: 'Port Operations Manager · drill-down',
    start: { orgId: 'ORG-SBMA', role: 'harbor_master', perspective: 'management', to: '/vessel-intelligence' },
    steps: [
      'Vessel Intelligence: delay Pareto and waiting-time trend; current calls waiting at anchorage.',
      'Open a vessel call: movement events show their source (VTMS / PMIS simulated); manual entry is labelled as fallback.',
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
        description='Five PORTIX management scenarios: DATA → PERFORMANCE → INSIGHT → DECISION → ACTION → OUTCOME. Every value and target is synthetic and labelled.'
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
              <li>All vessels, IMO numbers, organizations, berths, figures and KPI targets are fictitious demo data; targets are illustrative until approved by SBMA.</li>
              <li>PORTIX is the intelligence layer above TOS, VTMS and PMIS, which remain the systems of record. It does not control vessel traffic or terminal operations.</li>
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
