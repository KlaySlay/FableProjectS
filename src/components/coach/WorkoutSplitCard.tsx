'use client'

import { useEffect, useState } from 'react'
import { getSupabase } from '@/lib/supabase/client'
import { awardXP } from '@/lib/supabase/xpStorage'
import { useActiveUser } from '@/lib/hooks/useActiveUser'
import type { WorkoutSplitDay } from '@/types'

const GOALS = [
  { id: 'strength', label: 'Strength' },
  { id: 'fat_loss', label: 'Fat loss' },
  { id: 'build_muscle', label: 'Build muscle' },
] as const

type CardState =
  | { kind: 'form' }
  | { kind: 'loading' }
  | { kind: 'result'; split: WorkoutSplitDay[] }
  | { kind: 'error'; message: string }

export function WorkoutSplitCard({ onCreditUsed }: { onCreditUsed: () => void }) {
  const { user } = useActiveUser()
  const [state, setState] = useState<CardState>({ kind: 'form' })
  const [days, setDays] = useState<3 | 4 | 5 | 6>(4)
  const [goal, setGoal] = useState<(typeof GOALS)[number]['id']>('build_muscle')

  // Load the most recent stored split
  useEffect(() => {
    if (!user) return
    getSupabase()
      .from('ai_sessions')
      .select('result')
      .eq('user_id', user.id)
      .eq('session_type', 'workout_split')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        const result = data?.result as { split?: WorkoutSplitDay[] } | null
        if (result?.split) setState({ kind: 'result', split: result.split })
      })
  }, [user])

  async function generate() {
    setState({ kind: 'loading' })
    try {
      const res = await fetch('/api/ai/workout-split', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ daysPerWeek: days, goal }),
      })
      const data = await res.json()
      if (data.error === 'limit_reached') {
        setState({ kind: 'error', message: "You've used all 3 AI credits today. Come back tomorrow." })
      } else if (data.error || !data.split) {
        setState({ kind: 'error', message: "Couldn't connect. Try again later." })
      } else {
        setState({ kind: 'result', split: data.split })
        if (user) awardXP(user.id, 'workout_split').catch(() => {})
        onCreditUsed()
      }
    } catch {
      setState({ kind: 'error', message: "Couldn't connect. Try again later." })
    }
  }

  return (
    <div className="rounded-2xl bg-surface p-5">
      <h2 className="mb-3 text-base font-semibold text-ink">Training split</h2>

      {(state.kind === 'form' || state.kind === 'error') && (
        <div className="space-y-4">
          {state.kind === 'error' && <p className="text-sm text-ink-muted">{state.message}</p>}
          <div>
            <p className="mb-2 text-xs text-ink-muted">Days per week</p>
            <div className="flex gap-2">
              {([3, 4, 5, 6] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className="flex-1 rounded-xl py-2.5 text-sm font-semibold"
                  style={{
                    backgroundColor: days === d ? 'var(--accent)' : 'var(--surface-2)',
                    color: days === d ? '#09090b' : 'var(--text)',
                  }}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs text-ink-muted">Goal</p>
            <div className="flex gap-2">
              {GOALS.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setGoal(g.id)}
                  className="flex-1 rounded-xl py-2.5 text-xs font-medium"
                  style={{
                    backgroundColor: goal === g.id ? 'var(--accent)' : 'var(--surface-2)',
                    color: goal === g.id ? '#09090b' : 'var(--text)',
                  }}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>
          <button onClick={generate} className="w-full rounded-xl bg-accent py-3 text-sm font-semibold text-zinc-950">
            Generate
          </button>
        </div>
      )}

      {state.kind === 'loading' && <p className="py-2 text-sm text-ink-muted">Building your split…</p>}

      {state.kind === 'result' && (
        <div className="space-y-2.5">
          {state.split.map((day) => (
            <div key={day.day} className="rounded-xl bg-surface-2 px-4 py-3">
              <p className="text-sm font-semibold text-ink">
                {day.day} <span className="font-normal text-ink-muted">— {day.focus}</span>
              </p>
              <p className="mt-1 text-xs text-ink-muted">{day.exercises.join(' · ')}</p>
            </div>
          ))}
          <button
            onClick={() => setState({ kind: 'form' })}
            className="w-full rounded-xl bg-surface-2 py-3 text-sm font-medium text-ink"
          >
            Regenerate
          </button>
        </div>
      )}
    </div>
  )
}
