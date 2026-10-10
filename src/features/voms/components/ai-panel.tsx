import { useEffect, useMemo, useRef, useState } from 'react'
import { Bot, Send, Sparkles, UserRound } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { answer, insights, suggestedQuestions } from '../ai'
import { useVoms } from '../store'
import { ToneBadge } from './common'

export function SimulatedAiBadge() {
  return (
    <ToneBadge tone='neutral' icon={false} className='border-dashed'>
      <Sparkles className='size-3' /> Simulated AI · rule-based
    </ToneBadge>
  )
}

export function InsightCards({ max }: { max?: number }) {
  const state = useVoms()
  const list = useMemo(() => insights(state), [state])
  return (
    <div className='grid gap-3 md:grid-cols-2'>
      {list.slice(0, max).map((i) => (
        <article key={i.id} className='grid gap-2 rounded-lg border bg-card p-3 text-sm'>
          <div className='flex items-start gap-2'>
            <ToneBadge tone={i.tone} className='shrink-0'>
              {i.tone === 'good' ? 'Normal' : i.tone === 'info' ? 'Notable' : i.tone === 'warning' ? 'Review' : 'Risk'}
            </ToneBadge>
            <h3 className='font-semibold leading-snug'>{i.title}</h3>
          </div>
          <p>{i.body}</p>
          <p className='text-muted-foreground'>
            <span className='font-medium text-foreground'>Follow-up: </span>
            {i.followUp}
          </p>
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
        </article>
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
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder='Ask a question, e.g. “Which vessel calls are delayed?”' aria-label='Ask VOMS' />
        <Button type='submit' size='icon' aria-label='Send' disabled={!text.trim() || busy}>
          <Send />
        </Button>
      </form>
    </div>
  )
}
