import { useEffect, useMemo, useState } from 'react'
import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { Building2, Info, LogIn, Ship } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ThemeSwitch } from '@/components/theme-switch'
import { defaultName, orgs, perspectiveMeta, rolesForOrg, scopeOptions } from '../org'
import { roleById } from '../roles'
import { useVoms } from '../store'
import type { Perspective, RoleId, Session } from '../types'
import { DemoBadge } from '../components/common'

export interface Persona {
  key: string
  label: string
  hint: string
  orgId: string
  role: RoleId
  perspective: Perspective
  scopeId?: string
}

export const personas: Persona[] = [
  { key: 'ta-coordinator', label: 'Container terminal coordinator', hint: 'Scenario 1 — upload & anomaly', orgId: 'ORG-TA', role: 'terminal_operator', perspective: 'submission' },
  { key: 'tb-coordinator', label: 'Terminal B coordinator', hint: 'Scenario 2 — API failure', orgId: 'ORG-TB', role: 'terminal_operator', perspective: 'submission' },
  { key: 'ta-manager', label: 'Single-terminal manager', hint: 'Scenario 3 — KPIs, AI & Q&A', orgId: 'ORG-TA', role: 'terminal_operator', perspective: 'management', scopeId: 'U-TA' },
  { key: 'terminal-group', label: 'Multi-terminal manager', hint: 'Scenario 4 — wider scope', orgId: 'ORG-TA', role: 'terminal_operator', perspective: 'management', scopeId: 'multi' },
  { key: 'port-authority', label: 'Port authority management', hint: 'Scenario 4/5 — port-wide', orgId: 'ORG-SBMA', role: 'management', perspective: 'management' },
  { key: 'harbor-master', label: 'Harbor master (management)', hint: 'Scenario 5 — verify & close', orgId: 'ORG-SBMA', role: 'harbor_master', perspective: 'management' },
]

export function buildSession(orgId: string, role: RoleId, perspective: Perspective, scopeId?: string, name?: string): Session {
  const opts = scopeOptions(orgId, role, perspective)
  const scope = opts.find((o) => o.id === scopeId) ?? opts[0]
  return { name: name?.trim() || defaultName(role, perspective, orgId), orgId, role, perspective, scopeUnitIds: scope.unitIds, scopeLabel: scope.label }
}

const route = getRouteApi('/login')

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
  const [orgId, setOrgId] = useState('ORG-TA')
  const [role, setRole] = useState<RoleId>('terminal_operator')
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
    <div className='min-h-svh bg-muted/40'>
      <div className='mx-auto grid max-w-5xl gap-6 px-4 py-6 sm:py-10'>
        <header className='flex items-center justify-between gap-3'>
          <div className='flex items-center gap-3'>
            <div className='flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground'>
              <Ship className='size-5' />
            </div>
            <div>
              <h1 className='text-lg font-bold leading-tight sm:text-xl'>VOMS — Vessel Operations Monitoring System</h1>
              <p className='text-xs text-muted-foreground sm:text-sm'>Port of Subic Bay · management demonstration</p>
            </div>
          </div>
          <div className='flex items-center gap-2'>
            <DemoBadge className='hidden sm:inline-flex' />
            <ThemeSwitch />
          </div>
        </header>

        <div className='grid gap-6 lg:grid-cols-[1.4fr_1fr]'>
          <Card>
            <CardHeader>
              <CardTitle>Demo sign-in</CardTitle>
              <CardDescription>Choose an organization, role and perspective. No password is used in this demo.</CardDescription>
            </CardHeader>
            <CardContent className='grid gap-5'>
              <fieldset className='grid gap-2'>
                <legend className='mb-1 text-sm font-medium'>1. Organization</legend>
                <div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
                  {orgs.map((o) => (
                    <button
                      key={o.id}
                      type='button'
                      onClick={() => {
                        setOrgId(o.id)
                        setRole(rolesForOrg[o.id][0])
                        setScopeId(undefined)
                      }}
                      className={cn('flex items-center gap-2 rounded-md border p-2.5 text-start text-sm', orgId === o.id ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:bg-accent')}
                      aria-pressed={orgId === o.id}
                    >
                      <Building2 className='size-4 shrink-0 text-muted-foreground' />
                      {o.name}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset className='grid gap-2'>
                <legend className='mb-1 text-sm font-medium'>2. Role</legend>
                <div className='grid gap-2'>
                  {rolesForOrg[orgId].map((r) => (
                    <button
                      key={r}
                      type='button'
                      onClick={() => {
                        setRole(r)
                        setScopeId(undefined)
                      }}
                      className={cn('rounded-md border p-2.5 text-start text-sm', role === r ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:bg-accent')}
                      aria-pressed={role === r}
                    >
                      <div className='font-medium'>{roleById[r].name}</div>
                      <div className='text-xs text-muted-foreground'>{roleById[r].description}</div>
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset className='grid gap-2'>
                <legend className='mb-1 text-sm font-medium'>3. Perspective</legend>
                <div className='grid gap-2 sm:grid-cols-2'>
                  {(['submission', 'management'] as Perspective[]).map((p) => (
                    <button
                      key={p}
                      type='button'
                      onClick={() => {
                        setPerspective(p)
                        setScopeId(undefined)
                      }}
                      className={cn('rounded-md border p-2.5 text-start text-sm', perspective === p ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:bg-accent')}
                      aria-pressed={perspective === p}
                    >
                      <div className='font-medium'>{perspectiveMeta[p].label}</div>
                      <div className='text-xs text-muted-foreground'>{p === 'submission' ? roleById[role].submission : roleById[role].management}</div>
                    </button>
                  ))}
                </div>
              </fieldset>

              {scopes.length > 1 && (
                <fieldset className='grid gap-2'>
                  <legend className='mb-1 text-sm font-medium'>4. Access scope</legend>
                  <div className='grid gap-2 sm:grid-cols-2'>
                    {scopes.map((s) => (
                      <button
                        key={s.id}
                        type='button'
                        onClick={() => setScopeId(s.id)}
                        className={cn('rounded-md border p-2.5 text-start text-sm', effectiveScope.id === s.id ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:bg-accent')}
                        aria-pressed={effectiveScope.id === s.id}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </fieldset>
              )}

              <div className='grid gap-1.5'>
                <Label htmlFor='demo-name'>Display name</Label>
                <Input id='demo-name' value={name} placeholder={defaultName(role, perspective, orgId)} onChange={(e) => setName(e.target.value)} />
                <p className='text-xs text-muted-foreground'>Use a fictitious name. It only labels actions in the audit trail.</p>
              </div>

              <div className='flex items-start gap-2 rounded-md bg-muted p-3 text-xs text-muted-foreground'>
                <Info className='mt-0.5 size-4 shrink-0' />
                Demo only: roles are self-selected for presentation. In production, organizations, roles and scopes are derived from the authenticated SBMA identity — never from a self-selected list.
              </div>

              <Button size='lg' onClick={() => enter(buildSession(orgId, role, perspective, effectiveScope.id, name))}>
                <LogIn /> Enter as {perspectiveMeta[perspective].short} — {roleById[role].short}
              </Button>
            </CardContent>
          </Card>

          <Card className='h-fit'>
            <CardHeader>
              <CardTitle>Quick start personas</CardTitle>
              <CardDescription>Jump straight into a demo scenario.</CardDescription>
            </CardHeader>
            <CardContent className='grid gap-2'>
              {personas.map((p) => (
                <button
                  key={p.label}
                  type='button'
                  onClick={() => enter(buildSession(p.orgId, p.role, p.perspective, p.scopeId))}
                  className='rounded-md border p-2.5 text-start text-sm hover:bg-accent'
                >
                  <div className='font-medium'>{p.label}</div>
                  <div className='text-xs text-muted-foreground'>
                    {p.hint} · {roleById[p.role].short} / {perspectiveMeta[p.perspective].short}
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
        <p className='text-center text-xs text-muted-foreground'>All data is synthetic. No connection to SBMA, AIS, terminal or government systems.</p>
      </div>
    </div>
  )
}
