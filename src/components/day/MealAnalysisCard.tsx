'use client'

import { useEffect, useState } from 'react'
import { getSupabase } from '@/lib/supabase/client'
import { awardXP } from '@/lib/supabase/xpStorage'
import { useActiveUser } from '@/lib/hooks/useActiveUser'
import type { MealAnalysis } from '@/types'

type CardState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'result'; analysis: MealAnalysis }
  | { kind: 'error'; message: string }

/**
 * "✦ Analyse" chip below a Meals photo; renders the stored analysis card
 * if one already exists, otherwise calls the meal-analysis endpoint on tap.
 */
export function MealAnalysisCard({ photoId }: { photoId: string }) {
  const { user } = useActiveUser()
  const [state, setState] = useState<CardState>({ kind: 'idle' })
  const [checked, setChecked] = useState(false)

  // Show an existing analysis without re-calling the API
  useEffect(() => {
    getSupabase()
      .from('ai_sessions')
      .select('result')
      .eq('photo_id', photoId)
      .eq('session_type', 'meal_analysis')
      .maybeSingle()
      .then(({ data }) => {
        if (data?.result && !(data.result as { error?: string }).error) {
          setState({ kind: 'result', analysis: data.result as MealAnalysis })
        }
        setChecked(true)
      })
  }, [photoId])

  async function analyse() {
    setState({ kind: 'loading' })
    try {
      const res = await fetch('/api/ai/meal-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoId }),
      })
      const data = await res.json()
      if (data.error === 'limit_reached') {
        setState({ kind: 'error', message: "You've used all 3 AI credits today. Come back tomorrow." })
      } else if (data.error) {
        setState({ kind: 'error', message: "Couldn't connect. Try again later." })
      } else {
        setState({ kind: 'result', analysis: data })
        if (user) awardXP(user.id, 'meal_analysis', { photoId }).catch(() => {})
      }
    } catch {
      setState({ kind: 'error', message: "Couldn't connect. Try again later." })
    }
  }

  if (!checked) return null

  if (state.kind === 'result') {
    const a = state.analysis
    return (
      <div className="mt-1.5 rounded-xl bg-surface px-4 py-3">
        <p className="text-xs font-medium text-ink">
          ~{a.calories} kcal · Protein {a.protein_g}g · Carbs {a.carbs_g}g · Fat {a.fat_g}g
        </p>
        <p className="mt-1 text-xs italic text-ink-muted">&ldquo;{a.note}&rdquo;</p>
      </div>
    )
  }

  if (state.kind === 'error') {
    return <p className="mt-1.5 px-1 text-xs text-ink-muted">{state.message}</p>
  }

  return (
    <button
      onClick={analyse}
      disabled={state.kind === 'loading'}
      className="mt-1.5 rounded-full bg-surface px-3 py-1.5 text-xs font-medium text-accent disabled:opacity-60"
    >
      {state.kind === 'loading' ? 'Analysing…' : '✦ Analyse'}
    </button>
  )
}
