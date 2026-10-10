import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PageShell } from '@/components/layout/page-shell'
import { useVoms } from '../store'
import { DiscussionBox, InsightCards, SimulatedAiBadge } from '../components/ai-panel'
import { PageHeader } from '../components/common'

export function Ask() {
  const session = useVoms((s) => s.session)
  return (
    <PageShell>
      <PageHeader
        title='Ask VOMS'
        description={`Contextual questions about data in your scope (${session?.scopeLabel}). Responses are scripted from demo data and clearly labelled — no AI model is called.`}
      />
      <div className='grid gap-4 lg:grid-cols-5'>
        <Card className='lg:col-span-3'>
          <CardHeader>
            <CardTitle>Discussion</CardTitle>
            <CardDescription>Inherits your identity, organization scope and role. It cannot reveal data outside your entitlement or make operational decisions.</CardDescription>
            <div>
              <SimulatedAiBadge />
            </div>
          </CardHeader>
          <CardContent>
            <DiscussionBox />
          </CardContent>
        </Card>
        <Card className='lg:col-span-2'>
          <CardHeader>
            <CardTitle>Current insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='[&>div]:grid-cols-1'>
              <InsightCards />
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  )
}
