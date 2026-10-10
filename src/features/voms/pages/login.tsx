import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { getRouteApi, useNavigate } from '@tanstack/react-router'
import {
  Anchor,
  BarChart3,
  Building2,
  ChevronDown,
  ChevronRight,
  Container,
  Info,
  Landmark,
  LayoutDashboard,
  Monitor,
  Network,
  Play,
  ShieldCheck,
  Ship,
  Target,
  UserRound,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { ThemeSwitch } from '@/components/theme-switch'
import { defaultName, orgs, perspectiveMeta, rolesForOrg, scopeOptions } from '../org'
import { roleById } from '../roles'
import { useVoms } from '../store'
import type { Perspective, RoleId, Session } from '../types'
import { VomsMark } from '../components/voms-mark'

export interface Persona {
  key: string
  label: string
  hint: string
  orgId: string
  role: RoleId
  perspective: Perspective
  scopeId?: string
  icon: LucideIcon
  color: string
}

export const personas: Persona[] = [
  { key: 'ta-coordinator', label: 'Container terminal coordinator', hint: 'Scenario 1 — upload & anomaly', orgId: 'ORG-TA', role: 'terminal_operator', perspective: 'submission', icon: Container, color: 'var(--series-1)' },
  { key: 'tb-coordinator', label: 'Terminal B coordinator', hint: 'Scenario 2 — API failure', orgId: 'ORG-TB', role: 'terminal_operator', perspective: 'submission', icon: Building2, color: 'var(--status-good)' },
  { key: 'ta-manager', label: 'Single-terminal manager', hint: 'Scenario 3 — KPIs, AI & Q&A', orgId: 'ORG-TA', role: 'terminal_operator', perspective: 'management', scopeId: 'U-TA', icon: LayoutDashboard, color: 'var(--series-7)' },
  { key: 'terminal-group', label: 'Multi-terminal manager', hint: 'Scenario 4 — wider scope', orgId: 'ORG-TA', role: 'terminal_operator', perspective: 'management', scopeId: 'multi', icon: Network, color: 'var(--status-warning)' },
  { key: 'port-authority', label: 'Port authority management', hint: 'Scenario 4/5 — port-wide', orgId: 'ORG-SBMA', role: 'management', perspective: 'management', icon: Landmark, color: 'var(--status-critical)' },
  { key: 'harbor-master', label: 'Harbor master (management)', hint: 'Scenario 5 — verify & close', orgId: 'ORG-SBMA', role: 'harbor_master', perspective: 'management', icon: Anchor, color: '#1b2638' },
]

export function buildSession(orgId: string, role: RoleId, perspective: Perspective, scopeId?: string, name?: string): Session {
  const opts = scopeOptions(orgId, role, perspective)
  const scope = opts.find((o) => o.id === scopeId) ?? opts[0]
  return { name: name?.trim() || defaultName(role, perspective, orgId), orgId, role, perspective, scopeUnitIds: scope.unitIds, scopeLabel: scope.label }
}

const route = getRouteApi('/login')
const heroUrl = `${import.meta.env.BASE_URL}images/subic-bay-hero.jpg`
const heroUrlSmall = `${import.meta.env.BASE_URL}images/subic-bay-hero-960.jpg`

const benefits: { icon: LucideIcon; title: string; text: string; color: string }[] = [
  { icon: Ship, title: 'Real-time Visibility', text: 'Vessels, berths and operations', color: 'var(--series-1)' },
  { icon: BarChart3, title: 'Better Decisions', text: 'Data-driven insights and reports', color: 'var(--status-good)' },
  { icon: ShieldCheck, title: 'Safer Operations', text: 'Early alerts and incident tracking', color: 'var(--status-warning)' },
  { icon: Network, title: 'Stronger Collaboration', text: 'Port, terminal and stakeholders', color: 'var(--series-7)' },
]

function Step({ n, label, children, hint }: { n: number; label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <div className='grid grid-cols-[1.75rem_1fr] gap-x-3 gap-y-1.5'>
      <span className='mt-0.5 flex size-7 items-center justify-center rounded-full bg-[var(--series-1)]/15 text-xs font-semibold text-[var(--series-1-ink)]'>{n}</span>
      <div className='grid min-w-0 gap-1.5'>
        <label className='text-sm font-semibold'>{label}</label>
        {children}
        {hint && <p className='text-xs text-muted-foreground'>{hint}</p>}
      </div>
    </div>
  )
}

function IconSelect({ icon: Icon, value, onChange, children, label }: { icon: LucideIcon; value: string; onChange: (v: string) => void; children: ReactNode; label: string }) {
  return (
    <div className='relative'>
      <Icon className='pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' aria-hidden />
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className='h-10 w-full appearance-none rounded-md border border-input bg-background ps-10 pe-10 text-sm font-medium shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30 [&>option]:bg-background'
      >
        {children}
      </select>
      <ChevronDown className='pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' aria-hidden />
    </div>
  )
}

export function Login() {
  const login = useVoms((s) => s.login)
  const navigate = useNavigate()
  const { as } = route.useSearch()
  useEffect(() => {
    const p = personas.find((x) => x.key === as)
    if (p) {
      login(buildSession(p.orgId, p.role, p.perspective, p.scopeId))
      navigate({ to: '/', replace: true })
    }
  }, [as, login, navigate])
  const [orgId, setOrgId] = useState('ORG-SBMA')
  const [role, setRole] = useState<RoleId>('port_control')
  const [perspective, setPerspective] = useState<Perspective>('submission')
  const scopes = useMemo(() => scopeOptions(orgId, role, perspective), [orgId, role, perspective])
  const [scopeId, setScopeId] = useState<string | undefined>()
  const [name, setName] = useState('')
  const effectiveScope = scopes.find((s) => s.id === scopeId) ?? scopes[0]

  const enter = (s: Session) => {
    login(s)
    navigate({ to: '/' })
  }

  return (
    <div className='flex min-h-svh flex-col bg-background'>
      {/* Demo notice */}
      <div className='flex items-center gap-3 border-b bg-[var(--series-1)]/10 px-4 py-2 text-xs sm:text-sm'>
        <Ship className='size-4 shrink-0 text-[var(--series-1-ink)]' aria-hidden />
        <p className='min-w-0 flex-1'>
          <span className='font-semibold'>VOMS</span>
          <span className='hidden sm:inline'> · Port of Subic Bay · Demo Environment</span> · All data are simulated for demonstration purposes only.
          <span className='hidden xl:inline'>
            <Info className='mb-0.5 ms-3 inline size-3.5 text-[var(--series-1-ink)]' aria-hidden /> Not connected to live SBMA, AIS or terminal systems.
          </span>
        </p>
        <ThemeSwitch />
      </div>

      <div className='relative grid flex-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(28rem,0.85fr)]'>
        {/* Hero (wide screens) */}
        <section aria-label='About VOMS' className='relative hidden lg:block'>
          <div
            className='sticky top-0 flex h-[calc(100svh-2.75rem)] max-h-[64rem] min-h-[40rem] flex-col overflow-hidden bg-[#2a5f9e] bg-cover bg-[80%_center] px-[5%] pt-[3.5vh] pb-[3vh]'
            style={{ backgroundImage: `url(${heroUrl})` }}
          >
            {/* Readability scrims: light over the sky for dark text, dark over the water for white text. */}
            <div className='pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgb(238_245_252/0.92)_0%,rgb(238_245_252/0.7)_42%,rgb(238_245_252/0)_72%)]' />
            <div className='pointer-events-none absolute inset-x-0 bottom-0 h-[34%] bg-[linear-gradient(0deg,rgb(9_27_51/0.72),rgb(9_27_51/0))]' />

            <div className='relative flex items-center gap-3'>
              <VomsMark className='h-14 w-16 xl:h-16 xl:w-[4.5rem]' />
              <div>
                <div className='text-3xl leading-none font-extrabold tracking-tight text-[#0d2240] xl:text-4xl'>VOMS</div>
                <div className='mt-1 text-sm text-[#1f3a5f] xl:text-base'>Vessel Operations Monitoring System</div>
                <div className='text-xs text-[#3d5675] xl:text-sm'>Port of Subic Bay</div>
              </div>
              <span className='ms-3 self-center rounded-full bg-[var(--status-good)]/15 px-3 py-1 text-xs font-semibold tracking-wide text-[var(--status-good-ink)]'>DEMO DATA</span>
            </div>
            <p className='relative mt-[3vh] text-[11px] font-medium tracking-[0.3em] text-[#2b4566] uppercase'>People · Safer operations · A brighter tomorrow</p>

            <div className='relative mt-[2.5vh] max-w-xl'>
              <h1 className='text-[clamp(1.75rem,4vh,2.6rem)] leading-[1.07] font-extrabold tracking-tight text-[#0d2240]'>
                Smarter Data.
                <br />
                Safer Operations.
                <br />A Stronger Subic Bay.
              </h1>
              <p className='mt-[2vh] max-w-md text-[clamp(0.875rem,1.7vh,1rem)] text-[#1f3a5f]'>
                A unified platform to monitor vessel calls, cargo operations, berth utilization, safety and compliance — built for the Port of Subic Bay.
              </p>
            </div>

            <ul className='relative mt-[3.5vh] grid max-w-xl grid-cols-4 gap-3 rounded-2xl bg-white/75 p-3 shadow-sm backdrop-blur-sm'>
              {benefits.map((b) => (
                <li key={b.title} className='grid justify-items-center gap-1.5 text-center'>
                  <span className='flex size-10 items-center justify-center rounded-full text-white shadow-md xl:size-11' style={{ background: b.color }}>
                    <b.icon className='size-5' aria-hidden />
                  </span>
                  <span className='text-[13px] leading-tight font-semibold text-[#0d2240]'>{b.title}</span>
                  <span className='text-[11px] leading-snug text-[#1f3a5f]'>{b.text}</span>
                </li>
              ))}
            </ul>

            <div className='relative mt-auto'>
              <p className='font-["Great_Vibes",cursive] text-[clamp(1.5rem,3.6vh,2.25rem)] leading-[1.05] text-white drop-shadow-md'>
                A Connected Port
                <br />
                <span className='ms-12'>A Brighter Tomorrow</span>
              </p>
              <p className='mt-4 text-[11px] tracking-[0.25em] text-white/90 uppercase'>Subic Bay Freeport Zone | Philippines</p>
            </div>
          </div>
        </section>

        {/* Compact hero strip on phones/tablets */}
        <div className='relative flex h-44 items-end overflow-hidden bg-[#2a5f9e] bg-cover bg-[75%_center] sm:h-56 lg:hidden' style={{ backgroundImage: `url(${heroUrlSmall})` }}>
          <div className='absolute inset-0 bg-[linear-gradient(0deg,rgb(9_27_51/0.75),rgb(9_27_51/0.05))]' />
          <div className='relative flex items-center gap-2 px-4 pb-14 text-white sm:pb-16'>
            <VomsMark className='h-10 w-11 rounded-md bg-white/90 p-1' />
            <div>
              <div className='text-2xl leading-none font-extrabold'>VOMS</div>
              <div className='text-xs text-white/90'>Vessel Operations Monitoring System · Port of Subic Bay</div>
            </div>
          </div>
        </div>

        {/* Sign-in panel */}
        <div className='relative -mt-10 px-3 pb-6 sm:px-6 lg:mt-0 lg:bg-gradient-to-br lg:from-[#cfe0f5] lg:to-[#eef3f9] lg:py-6 dark:lg:from-[#0f1726] dark:lg:to-[#162236]'>
          <div className='mx-auto grid max-w-xl gap-6 rounded-2xl border bg-card p-5 shadow-xl sm:p-7'>
            <div>
              <h2 className='text-xl font-bold tracking-tight sm:text-2xl'>Demo sign-in</h2>
              <p className='mt-1 text-sm text-muted-foreground'>Choose an organization, role and perspective. No password is used in this demo.</p>
            </div>

            <div className='grid gap-4'>
              <Step n={1} label='Organization'>
                <IconSelect
                  icon={Building2}
                  label='Organization'
                  value={orgId}
                  onChange={(v) => {
                    setOrgId(v)
                    setRole(rolesForOrg[v][0])
                    setScopeId(undefined)
                  }}
                >
                  {orgs.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </IconSelect>
              </Step>
              <Step n={2} label='Role' hint={roleById[role].description}>
                <IconSelect
                  icon={UsersRound}
                  label='Role'
                  value={role}
                  onChange={(v) => {
                    setRole(v as RoleId)
                    setScopeId(undefined)
                  }}
                >
                  {rolesForOrg[orgId].map((r) => (
                    <option key={r} value={r}>
                      {roleById[r].name}
                    </option>
                  ))}
                </IconSelect>
              </Step>
              <Step n={3} label='Perspective' hint={perspective === 'submission' ? roleById[role].submission : roleById[role].management}>
                <IconSelect
                  icon={Monitor}
                  label='Perspective'
                  value={perspective}
                  onChange={(v) => {
                    setPerspective(v as Perspective)
                    setScopeId(undefined)
                  }}
                >
                  {(['submission', 'management'] as Perspective[]).map((p) => (
                    <option key={p} value={p}>
                      {perspectiveMeta[p].label}
                    </option>
                  ))}
                </IconSelect>
              </Step>
              {scopes.length > 1 && (
                <Step n={4} label='Access scope'>
                  <IconSelect icon={Target} label='Access scope' value={effectiveScope.id} onChange={setScopeId}>
                    {scopes.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </IconSelect>
                </Step>
              )}
            </div>

            <div className='grid gap-1.5'>
              <label htmlFor='demo-name' className='text-sm font-semibold'>
                Your name (for audit trail)
              </label>
              <div className='relative'>
                <UserRound className='pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' aria-hidden />
                <Input id='demo-name' className='h-10 ps-10' value={name} placeholder='Enter a fictitious name (e.g., Juan Dela Cruz)' onChange={(e) => setName(e.target.value)} />
              </div>
              <p className='text-xs text-muted-foreground'>Optional — defaults to “{defaultName(role, perspective, orgId)}”.</p>
            </div>

            <button
              type='button'
              onClick={() => enter(buildSession(orgId, role, perspective, effectiveScope.id, name))}
              className='flex h-11 items-center justify-center gap-2 rounded-md bg-[var(--sidebar-primary)] text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--series-1-ink)] focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none'
            >
              <Play className='size-4 fill-current' aria-hidden /> Enter as {perspectiveMeta[perspective].short} — {roleById[role].short}
            </button>

            <p className='flex items-start gap-2 text-xs text-muted-foreground'>
              <Info className='mt-0.5 size-4 shrink-0' aria-hidden />
              Demo only: roles are self-selected for presentation. In production, organizations, roles and scopes are derived from the authenticated SBMA identity — never from a self-selected list.
            </p>

            <div className='grid gap-3 border-t pt-5'>
              <div>
                <h3 className='text-base font-semibold'>Quick start personas</h3>
                <p className='text-sm text-muted-foreground'>Jump straight into a demo scenario.</p>
              </div>
              <div className='grid grid-cols-1 gap-2.5 min-[480px]:grid-cols-2'>
                {personas.map((p) => (
                  <button
                    key={p.key}
                    type='button'
                    onClick={() => enter(buildSession(p.orgId, p.role, p.perspective, p.scopeId))}
                    className='group flex items-start gap-2.5 rounded-lg border-2 bg-card p-2.5 text-start transition-colors hover:bg-accent/60'
                    style={{ borderColor: `color-mix(in oklab, ${p.color} 45%, transparent)` }}
                  >
                    <span className='flex size-8 shrink-0 items-center justify-center rounded-full text-white' style={{ background: p.color }}>
                      <p.icon className='size-4' aria-hidden />
                    </span>
                    <span className='grid min-w-0 flex-1 gap-0.5'>
                      <span className='text-[13px] leading-tight font-semibold'>{p.label}</span>
                      <span className='text-[11px] leading-snug text-muted-foreground'>{p.hint}</span>
                      <span className='text-[11px] text-muted-foreground'>
                        {roleById[p.role].short} / {perspectiveMeta[p.perspective].short}
                      </span>
                    </span>
                    <ChevronRight className={cn('mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5')} aria-hidden />
                  </button>
                ))}
              </div>
            </div>

            <p className='flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground'>
              <Info className='size-4 shrink-0' aria-hidden />
              All data is synthetic. No connection to SBMA, AIS, terminal or government systems.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
