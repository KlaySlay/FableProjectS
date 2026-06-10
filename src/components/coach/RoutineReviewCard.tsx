'use client'

import { useEffect, useState } from 'react'
import { getSupabase } from '@/lib/supabase/client'
import { awardXP } from '@/lib/supabase/xpStorage'
import { useActiveUser } from '@/lib/hooks/useActiveUser'
import type { RoutineReview } from '@/types'

type CardState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'result'; review: RoutineReview }
  | { kind: 'error'; message: string }

export function RoutineReviewCard({ onCreditUsed }: { onCreditUsed: () => void }) {
  const { user } = useActiveUser()
  const [state, setState] = useState<CardState>({ kind: 'idle' })
  const [confirmRefresh, setConfirmRefresh] = useState(false)

  // Load today's cached review if one exists (no AI call)
  useEffect(() => {
    if (!user) return
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    getSupabase()
      .from('ai_sessions')
      .select('result')
      .eq('user_id', user.id)
      .eq('session_type', 'routine_review')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.result && !(data.result as { error?: string }).error) {
          setState({ kind: 'result', review: data.result as RoutineReview })
        }
      })
  }, [user])

  async function review(force: boolean) {
    setConfirmRefresh(false)
    setState({ kind: 'loading' })
    try {
      const res = await fetch('/api/ai/routine-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force }),
      })
      const data = await res.json()
      if (data.error === 'limit_reached') {
        setState({ kind: 'error', message: "You've used all 3 AI credits today. Come back tomorrow." })
      } else if (data.error) {
        setState({ kind: 'error', message: "Couldn't connect. Try again later." })
      } else {
        setState({ kind: 'result', review: data })
        if (user) awardXP(user.id, 'routine_review').catch(() => {})
        onCreditUsed()
      }
    } catch {
      setState({ kind: 'error', message: "Couldn't connect. Try again later." })
    }
  }

  return (
    <div className="rounded-2xl bg-surface p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-ink">How was your week?</h2>
        {state.kind === 'result' && (
          <button aria-label="Refresh review" onClick={() => setConfirmRefresh(true)} className="text-ink-muted">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 1 1-2.64-6.36" /><path d="M21 3v6h-6" />
            </svg>
          </button>
        )}
      </div>

      {confirmRefresh && (
        <div className="mb-3 flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2.5">
          <span className="flex-1 text-xs text-ink-muted">Uses one AI credit.</span>
          <button onClick={() => review(true)} className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-zinc-950">
            Refresh
          </button>
          <button onClick={() => setConfirmRefresh(false)} className="px-2 text-xs text-ink-muted">
            Cancel
          </button>
        </div>
      )}

      {state.kind === 'idle' && (
        <button onClick={() => review(false)} className="w-full rounded-xl bg-accent py-3 text-sm font-semibold text-zinc-950">
          Review
        </button>
      )}
      {state.kind === 'loading' && <p className="py-2 text-sm text-ink-muted">Reviewing your week…</p>}
      {state.kind === 'error' && <p className="py-2 text-sm text-ink-muted">{state.message}</p>}
      {state.kind === 'result' && (
        <div className="space-y-3">
          <ul className="space-y-1.5">
            {state.review.observations.map((obs, i) => (
              <li key={i} className="flex gap-2 text-sm text-ink">
                <span className="text-accent">•</span>
                <span>{obs}</span>
              </li>
            ))}
          </ul>
          <p className="text-sm font-medium text-ink">{state.review.verdict}</p>
          <p className="rounded-xl bg-surface-2 px-3 py-2.5 text-sm font-medium text-accent">
            {state.review.nudge}
          </p>
        </div>
      )}
    </div>
  )
}
