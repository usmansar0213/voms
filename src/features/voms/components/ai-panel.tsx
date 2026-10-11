import { useEffect, useMemo, useRef, useState } from 'react'
import { Bot, ClipboardPlus, Send, Sparkles, UserRound } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { answer, insights, suggestedQuestions, type Insight } from '../ai'
import { CreateActionDialog } from './create-action-dialog'
import { useCan, useVoms } from '../store'
import { ToneBadge } from './common'

export function SimulatedAiBadge() {
  return (
    <ToneBadge tone='neutral' icon={false} className='border-dashed'>
      <Sparkles className='size-3' /> Simulated AI · rule-based
    </ToneBadge>
  )
}

function InsightCard({ i }: { i: Insight }) {
  const [open, setOpen] = useState(false)
  const canCreate = useCan('action.create')
  const actionable = i.followUp !== 'No follow-up needed.'
  const scope = i.unitId && ['U-TA', 'U-TB', 'U-TC'].includes(i.unitId) ? (i.unitId as 'U-TA' | 'U-TB' | 'U-TC') : undefined
  return (
    <article className='grid content-start gap-2 rounded-lg border bg-card p-3 text-sm'>
      <div className='flex items-start gap-2'>
        <ToneBadge tone={i.tone} className='shrink-0'>
          {i.tone === 'good' ? 'Normal' : i.tone === 'info' ? 'Notable' : i.tone === 'warning' ? 'Review' : 'Risk'}
        </ToneBadge>
        <h3 className='leading-snug font-semibold'>{i.title}</h3>
      </div>
      <div>
        <div className='text-[11px] font-semibold tracking-wide text-muted-foreground uppercase'>Verified facts</div>
        <p>{i.body}</p>
      </div>
      <div>
        <div className='text-[11px] font-semibold tracking-wide text-muted-foreground uppercase'>Interpretation · inferred</div>
        <p className='text-muted-foreground italic'>{i.interpretation}</p>
      </div>
      <div>
        <div className='text-[11px] font-semibold tracking-wide text-muted-foreground uppercase'>Proposed action</div>
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <p>{i.followUp}</p>
          {actionable && canCreate && (
            <Button size='sm' variant='outline' className='h-7' onClick={() => setOpen(true)}>
              <ClipboardPlus /> Create action
            </Button>
          )}
        </div>
      </div>
      <dl className='grid grid-cols-3 gap-2 border-t pt-2 text-[11px] text-muted-foreground'>
        <div>
          <dt>Period</dt>
          <dd className='text-foreground'>{i.period}</dd>
        </div>
        <div>
          <dt>Source</dt>
          <dd className='text-foreground'>{i.sources}</dd>
        </div>
        <div>
          <dt>Validation</dt>
          <dd className='text-foreground'>{i.validation}</dd>
        </div>
      </dl>
      {open && (
        <CreateActionDialog
          open
          onOpenChange={setOpen}
          draft={{ origin: { type: 'insight', ref: i.id }, title: i.title, issue: i.body, recommendedAction: i.followUp, scope }}
        />
      )}
    </article>
  )
}

export function InsightCards({ max }: { max?: number }) {
  const state = useVoms()
  const list = useMemo(() => insights(state), [state])
  return (
    <div className='grid gap-3 md:grid-cols-2'>
      {list.slice(0, max).map((i) => (
        <InsightCard key={i.id} i={i} />
      ))}
    </div>
  )
}

type Msg = { from: 'user' | 'ai'; text: string; sources?: string }

/** Contextual discussion box. Answers are scripted from data in the user's scope. */
export function DiscussionBox({ compact }: { compact?: boolean }) {
  const state = useVoms()
  const session = state.session
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'nearest' })
  }, [msgs, busy])

  const ask = (q: string) => {
    if (!q.trim() || busy) return
    setMsgs((m) => [...m, { from: 'user', text: q }])
    setText('')
    setBusy(true)
    setTimeout(() => {
      const a = answer(useVoms.getState(), q)
      setMsgs((m) => [...m, { from: 'ai', text: a.text, sources: a.sources }])
      setBusy(false)
    }, 600)
  }

  return (
    <div className='grid gap-3'>
      <div className={cn('grid gap-2 overflow-y-auto rounded-lg border bg-muted/30 p-3', compact ? 'max-h-72' : 'max-h-[28rem]')} aria-live='polite'>
        {msgs.length === 0 && (
          <p className='text-sm text-muted-foreground'>
            Ask about your scope ({session?.scopeLabel}). The assistant only uses data you are authorized to see and does not make operational decisions.
          </p>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={cn('flex gap-2 text-sm', m.from === 'user' && 'flex-row-reverse')}>
            <span className='mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-muted'>
              {m.from === 'user' ? <UserRound className='size-3.5' /> : <Bot className='size-3.5' />}
            </span>
            <div className={cn('max-w-[85%] rounded-lg px-3 py-2', m.from === 'user' ? 'bg-primary text-primary-foreground' : 'border bg-card')}>
              <p>{m.text}</p>
              {m.sources && <p className='mt-1 text-[11px] text-muted-foreground'>Source: {m.sources} · simulated response</p>}
            </div>
          </div>
        ))}
        {busy && <div className='text-xs text-muted-foreground'>Analysing data in your scope…</div>}
        <div ref={end} />
      </div>
      <div className='-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 no-scrollbar'>
        {suggestedQuestions.map((q) => (
          <Button key={q} size='sm' variant='outline' className='shrink-0 rounded-full text-xs' onClick={() => ask(q)}>
            {q}
          </Button>
        ))}
      </div>
      <form
        className='flex gap-2'
        onSubmit={(e) => {
          e.preventDefault()
          ask(text)
        }}
      >
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder='Ask a question, e.g. “Which vessel calls are delayed?”' aria-label='Ask PORTIX' />
        <Button type='submit' size='icon' aria-label='Send' disabled={!text.trim() || busy}>
          <Send />
        </Button>
      </form>
    </div>
  )
}
