'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { XPBar } from '@/components/profile/XPBar'
import { BadgeGrid } from '@/components/profile/BadgeGrid'
import { useActiveUser } from '@/lib/hooks/useActiveUser'
import { useCommunity } from '@/lib/hooks/useCommunity'
import { getCategoryCounts } from '@/lib/supabase/photoStorage'
import { getStreak } from '@/lib/supabase/xpStorage'

export default function ProfilePage() {
  const { user } = useActiveUser()
  const { community } = useCommunity()
  const [streak, setStreak] = useState(0)
  const [counts, setCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    if (!user) return
    getStreak(user.id).then(setStreak).catch(() => {})
    getCategoryCounts(user.id).then(setCounts).catch(() => {})
  }, [user])

  if (!user) {
    return (
      <main className="flex h-[60dvh] items-center justify-center">
        <p className="text-sm text-ink-muted">Loading…</p>
      </main>
    )
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  const statCategories = (community?.categories ?? []).slice(0, 3)

  return (
    <main className="px-4 pb-6" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 28px)' }}>
      {/* Avatar + name */}
      <div className="mb-6 flex flex-col items-center">
        <span
          className="mb-3 flex h-20 w-20 items-center justify-center rounded-full text-3xl font-bold text-zinc-950"
          style={{ backgroundColor: user.avatarColor }}
        >
          {user.displayName.charAt(0).toUpperCase()}
        </span>
        <h1 className="text-xl font-bold text-ink">{user.displayName}</h1>
        <p className="text-sm text-ink-muted">@{user.username}</p>
      </div>

      <div className="space-y-4">
        <XPBar xp={user.xp} />

        {/* Streak row */}
        <div className="rounded-2xl bg-surface px-5 py-4">
          <p className="text-sm font-medium text-ink">
            {streak > 0 ? `🔥 ${streak}-day streak` : 'No active streak'}
          </p>
        </div>

        {/* Stats row */}
        <div className="flex gap-3">
          <StatBox label="Photos" value={total} />
          {statCategories.map((c) => (
            <StatBox key={c.id} label={c.label} value={counts[c.id] ?? 0} />
          ))}
        </div>

        <BadgeGrid userId={user.id} />

        <Link
          href="/settings"
          className="flex items-center justify-between rounded-2xl bg-surface px-5 py-4 text-sm font-medium text-ink"
        >
          Settings <span className="text-ink-muted">›</span>
        </Link>
      </div>
    </main>
  )
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex-1 rounded-2xl bg-surface px-2 py-3.5 text-center">
      <p className="text-lg font-bold text-ink">{value}</p>
      <p className="text-[10px] text-ink-muted">{label}</p>
    </div>
  )
}
