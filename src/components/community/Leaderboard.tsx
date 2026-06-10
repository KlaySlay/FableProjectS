'use client'

import { useEffect, useState } from 'react'
import { getWeeklyXPByUser, getStreak } from '@/lib/supabase/xpStorage'
import { useCommunity } from '@/lib/hooks/useCommunity'
import { useActiveUser } from '@/lib/hooks/useActiveUser'

export function Leaderboard() {
  const { community } = useCommunity()
  const { user } = useActiveUser()
  const [weeklyXP, setWeeklyXP] = useState<Record<string, number>>({})
  const [streaks, setStreaks] = useState<Record<string, number>>({})

  useEffect(() => {
    if (!community) return
    const ids = community.members.map((m) => m.id)
    getWeeklyXPByUser(ids).then(setWeeklyXP).catch(() => {})
    Promise.all(ids.map(async (id) => [id, await getStreak(id)] as const))
      .then((entries) => setStreaks(Object.fromEntries(entries)))
      .catch(() => {})
  }, [community])

  if (!community) return null

  const ranked = [...community.members].sort(
    (a, b) => (weeklyXP[b.id] ?? 0) - (weeklyXP[a.id] ?? 0),
  )

  return (
    <section>
      <h2 className="mb-2.5 text-sm font-semibold text-ink-muted">This week</h2>
      <div className="space-y-1.5">
        {ranked.map((member, i) => {
          const isMe = member.id === user?.id
          const streak = streaks[member.id] ?? 0
          return (
            <div
              key={member.id}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5"
              style={{
                backgroundColor: isMe ? 'color-mix(in srgb, var(--accent) 14%, transparent)' : 'var(--surface)',
                outline: isMe ? '1px solid var(--accent)' : 'none',
              }}
            >
              <span className="w-5 text-center text-sm font-semibold text-ink-muted">{i + 1}</span>
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: member.avatarColor }} />
              <span className="flex-1 truncate text-sm font-medium text-ink">{member.displayName}</span>
              {streak > 0 && <span className="text-xs">🔥 {streak}</span>}
              <span className="text-sm font-semibold text-ink">{weeklyXP[member.id] ?? 0} XP</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
