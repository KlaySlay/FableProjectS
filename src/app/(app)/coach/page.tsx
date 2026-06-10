'use client'

import { useCallback, useEffect, useState } from 'react'
import { RoutineReviewCard } from '@/components/coach/RoutineReviewCard'
import { WorkoutSplitCard } from '@/components/coach/WorkoutSplitCard'
import { StudyProgressCard } from '@/components/coach/StudyProgressCard'
import { useActiveUser } from '@/lib/hooks/useActiveUser'
import { getXPForWeek } from '@/lib/supabase/xpStorage'

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export default function CoachPage() {
  const { user } = useActiveUser()
  const [credits, setCredits] = useState<number | null>(null)
  const [weekXP, setWeekXP] = useState<{ date: string; xp: number }[]>([])

  const loadCredits = useCallback(() => {
    fetch('/api/ai/credits')
      .then((r) => r.json())
      .then((d) => setCredits(typeof d.remaining === 'number' ? d.remaining : null))
      .catch(() => {})
  }, [])

  useEffect(() => {
    loadCredits()
  }, [loadCredits])

  useEffect(() => {
    if (!user) return
    getXPForWeek(user.id).then(setWeekXP).catch(() => {})
  }, [user])

  const maxXP = Math.max(1, ...weekXP.map((d) => d.xp))

  return (
    <main className="px-4 pb-6 pt-5" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 20px)' }}>
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink">Coach</h1>
        <span className="rounded-full bg-surface px-3 py-1.5 text-xs font-medium text-ink-muted">
          {credits === null ? '✦ …' : credits === 0 ? 'Come back tomorrow' : `✦ ${credits} left today`}
        </span>
      </header>

      <div className="space-y-4">
        <RoutineReviewCard onCreditUsed={loadCredits} />
        <WorkoutSplitCard onCreditUsed={loadCredits} />
        <StudyProgressCard />

        {/* XP this week — client-rendered, no AI call */}
        <div className="rounded-2xl bg-surface p-5">
          <h2 className="mb-4 text-base font-semibold text-ink">XP this week</h2>
          <div className="flex h-24 items-end justify-between gap-2">
            {weekXP.map((d) => {
              const day = new Date(d.date + 'T00:00:00')
              return (
                <div key={d.date} className="flex flex-1 flex-col items-center gap-1.5">
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className="w-full rounded-t-md"
                      style={{
                        height: `${Math.max(4, (d.xp / maxXP) * 100)}%`,
                        backgroundColor: d.xp > 0 ? 'var(--accent)' : 'var(--surface-2)',
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-ink-muted">{DAY_LABELS[day.getDay()]}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </main>
  )
}
