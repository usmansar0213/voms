import { beforeEach, describe, expect, it } from 'vitest'
import { useVoms } from './store'
import type { Session } from './types'

const all = ['U-PC', 'U-HM', 'U-TA', 'U-TB', 'U-TC', 'U-AGA', 'U-AGB', 'U-MG', 'U-IT']
const executive: Session = { name: 'Demo Port Authority Manager', orgId: 'ORG-SBMA', role: 'management', perspective: 'management', scopeUnitIds: all, scopeLabel: 'Port-wide' }
const harborMaster: Session = { ...executive, name: 'Demo Harbor Master Manager', role: 'harbor_master' }
const coordinator: Session = { name: 'Demo Container Terminal A Coordinator', orgId: 'ORG-TA', role: 'terminal_operator', perspective: 'submission', scopeUnitIds: ['U-TA'], scopeLabel: 'Terminal A' }

describe('management action workflow', () => {
  beforeEach(() => {
    useVoms.getState().resetDemo()
    useVoms.getState().login(executive)
  })

  it('creates an action from a KPI-breach alert with a KPI baseline and acknowledges the alert', () => {
    const s = useVoms.getState()
    const alert = s.alerts.find((a) => a.category === 'kpi_breach' && a.status === 'open')!
    expect(alert).toBeDefined()
    const id = s.createAction({
      title: 'Test action',
      issue: alert.evidence,
      recommendedAction: 'Do something measurable',
      origin: { type: 'alert', ref: alert.id },
      kpiId: alert.kpiId,
      scope: alert.unitId,
      ownerName: 'Demo Harbor Master Manager',
      ownerRole: 'harbor_master',
      ownerOrgId: 'ORG-SBMA',
      priority: 'high',
      dueDate: '2026-10-30',
    })
    const after = useVoms.getState()
    const action = after.actions.find((a) => a.id === id)!
    expect(action.status).toBe('proposed')
    expect(action.baseline?.value).toBeTypeOf('number')
    expect(after.alerts.find((a) => a.id === alert.id)!.status).toBe('acknowledged')
  })

  it('requires a note to block, and prevents the owner from assessing their own outcome', () => {
    const s = useVoms.getState()
    const id = s.actions.find((a) => a.status === 'in_progress' && a.ownerName === 'Demo Harbor Master Manager')!.id
    s.login(harborMaster)
    expect(() => useVoms.getState().setActionStatus(id, 'blocked', '')).toThrow()
    useVoms.getState().setActionStatus(id, 'done', 'Completed')
    expect(() => useVoms.getState().closeAction(id, 'improved', 'Looks better')).toThrow(/own outcome/)
    useVoms.getState().login(executive)
    useVoms.getState().closeAction(id, 'improved', 'Reviewed against KPI')
    const closed = useVoms.getState().actions.find((a) => a.id === id)!
    expect(closed.status).toBe('closed')
    expect(closed.outcome?.assessment).toBe('improved')
  })

  it('does not let the Submission perspective create management actions', () => {
    useVoms.getState().login(coordinator)
    expect(() =>
      useVoms.getState().createAction({
        title: 'x',
        issue: '',
        recommendedAction: 'y',
        origin: { type: 'manual' },
        scope: 'U-TA',
        ownerName: 'n',
        ownerRole: 'terminal_operator',
        ownerOrgId: 'ORG-TA',
        priority: 'low',
        dueDate: '2026-10-30',
      })
    ).toThrow()
  })
})
