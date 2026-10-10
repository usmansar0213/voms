import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Container, Fuel, Mountain, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { PageShell } from '@/components/layout/page-shell'
import { roleById } from '../roles'
import { useVoms } from '../store'
import type { RoleId } from '../types'
import { PageHeader, runAction } from '../components/common'

type Step = { role: RoleId; text: string; callId?: string }

const scenarios: { title: string; icon: typeof Container; summary: string; steps: Step[] }[] = [
  {
    title: 'Scenario 1 — Container vessel',
    icon: Container,
    summary: 'Arrival to berthing, TEU-based production from a simulated TOS, and departure.',
    steps: [
      { role: 'harbor_master', callId: 'SB-2026-000126', text: 'Open the expected call and confirm the pre-assigned berth B-03 is compatible.' },
      { role: 'admin', text: 'Integration Simulator → simulate AIS arrival detection for SB-2026-000126.' },
      { role: 'harbor_master', callId: 'SB-2026-000126', text: 'Movements tab → verify the AIS-proposed ATA (source is shown as simulated).' },
      { role: 'port_control', callId: 'SB-2026-000126', text: 'Record Pilot on board, First line and All Fast.' },
      { role: 'terminal_operator', callId: 'SB-2026-000126', text: 'Record “Cargo operations commenced”, then add production in TEU.' },
      { role: 'harbor_master', callId: 'SB-2026-000124', text: 'On a working container call, verify submitted production entries.' },
    ],
  },
  {
    title: 'Scenario 2 — Bulk carrier',
    icon: Mountain,
    summary: 'Coal discharge in metric tons, weather delay, final tally and vessel call closure.',
    steps: [
      { role: 'management', callId: 'SB-2026-000122', text: 'Dashboard shows coal discharge at about 60% (15,000 of 25,000 MT). Open the call.' },
      { role: 'terminal_operator', callId: 'SB-2026-000122', text: 'Cargo & Terminal tab → record a delay (e.g. rain) and more production.' },
      { role: 'terminal_operator', callId: 'SB-2026-000120', text: 'The cement bulk call has operations completed; its final tally is already submitted.' },
      { role: 'harbor_master', callId: 'SB-2026-000120', text: 'Verify remaining production and the final tally.' },
      { role: 'port_control', callId: 'SB-2026-000120', text: 'Record Last line and ATD.' },
      { role: 'harbor_master', callId: 'SB-2026-000120', text: 'Movements → Verify all, then Closure tab → close the vessel call. Open the integrated report.' },
    ],
  },
  {
    title: 'Scenario 3 — Fuel / tanker',
    icon: Fuel,
    summary: 'Liquid cargo in kilolitres, dangerous-goods flag and an incident with corrective actions.',
    steps: [
      { role: 'port_control', callId: 'SB-2026-000123', text: 'Tanker at B-09 discharging gasoline and diesel (KL), flagged as dangerous goods.' },
      { role: 'terminal_operator', callId: 'SB-2026-000123', text: 'Incidents tab → review INC-2026-0032 (manifold drip) and tick completed actions.' },
      { role: 'shipping_agent', callId: 'SB-2026-000123', text: 'As shipping agent, incident details are restricted — only status is visible.' },
      { role: 'harbor_master', text: 'Safety & Incidents → close the incident once all actions are complete.' },
      { role: 'shipping_agent', text: 'Submit a new pre-arrival notice for a tanker; the duplicate check prevents double entry.' },
    ],
  },
]

export function Guide() {
  const setRole = useVoms((s) => s.setRole)
  const resetDemo = useVoms((s) => s.resetDemo)
  const [confirm, setConfirm] = useState(false)
  return (
    <PageShell>
      <PageHeader
        title='Demo Guide'
        description='Three walkthroughs for presenting VOMS to SBMA management on a laptop, tablet or phone.'
        actions={
          <Button variant='outline' onClick={() => setConfirm(true)}>
            <RotateCcw /> Reset demo data
          </Button>
        }
      />

      <div className='grid gap-4 lg:grid-cols-3'>
        {scenarios.map((s) => (
          <Card key={s.title}>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <s.icon className='size-5' /> {s.title}
              </CardTitle>
              <CardDescription>{s.summary}</CardDescription>
            </CardHeader>
            <CardContent>
              <ol className='grid gap-3'>
                {s.steps.map((st, i) => (
                  <li key={i} className='grid grid-cols-[1.5rem_1fr] gap-2 text-sm'>
                    <span className='flex size-6 items-center justify-center rounded-full bg-muted text-xs font-semibold'>{i + 1}</span>
                    <div className='grid gap-1'>
                      <span>{st.text}</span>
                      <div className='flex flex-wrap gap-2'>
                        <Button size='sm' variant='ghost' className='h-7 px-2 text-xs' onClick={() => runAction(() => setRole(st.role), `Now viewing as ${roleById[st.role].name}`)}>
                          As {roleById[st.role].short}
                        </Button>
                        {st.callId && (
                          <Button size='sm' variant='ghost' className='h-7 px-2 text-xs' asChild>
                            <Link to='/vessel-calls/$callId' params={{ callId: st.callId }} onClick={() => setRole(st.role)}>
                              Open {st.callId.slice(-6)}
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
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
            <p>An interactive illustration of the business requirements in the VOMS BRD (draft v0.1). It runs entirely in the browser and works offline once loaded.</p>
            <ul className='list-disc space-y-1 ps-5'>
              <li>All vessels, IMO numbers, agencies, berths and figures are fictitious demo data.</li>
              <li>Berths B-01 to B-15 are placeholders pending the official SBMA facility register.</li>
              <li>No connection to SBMA, AIS, TOS or any government system. Integration is simulated and labelled as such.</li>
              <li>Changes are stored only in this browser. “Reset demo data” restores the starting scenario.</li>
              <li>Roles are switched without sign-in for presentation purposes only.</li>
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
                UI shell based on <a className='underline' href='https://github.com/satnaing/shadcn-admin' target='_blank' rel='noreferrer'>shadcn-admin</a> by Sat Naing (MIT)
              </li>
              <li>shadcn/ui components, Radix UI, Tailwind CSS, TanStack Router & Table, Recharts, Zustand, date-fns, Sonner (MIT)</li>
              <li>Lucide icons (ISC)</li>
              <li>Event vocabulary informed by the DCSA Port Call / Just-in-Time standard and IALA S-211 Port Call Message concepts (reference only)</li>
            </ul>
          </CardContent>
        </Card>
      </div>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title='Reset demo data?'
        desc='All changes made during this demo are discarded and the simulated vessel calls are regenerated relative to the current time.'
        confirmText='Reset'
        handleConfirm={() => {
          setConfirm(false)
          runAction(resetDemo, 'Demo data reset')
        }}
      />
    </PageShell>
  )
}
