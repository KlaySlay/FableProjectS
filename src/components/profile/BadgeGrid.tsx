'use client'

import { useEffect, useState } from 'react'
import { BottomSheet } from '@/components/shared/BottomSheet'
import { getAllBadges, getUserBadges } from '@/lib/supabase/xpStorage'
import type { Badge } from '@/types'

export function BadgeGrid({ userId }: { userId: string }) {
  const [badges, setBadges] = useState<Badge[]>([])
  const [detail, setDetail] = useState<Badge | null>(null)

  useEffect(() => {
    Promise.all([getAllBadges(), getUserBadges(userId)])
      .then(([all, owned]) =>
        setBadges(all.map((b) => ({ ...b, unlockedAt: owned[b.id] }))),
      )
      .catch(() => {})
  }, [userId])

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-ink-muted">Badges</h2>
      <div className="grid grid-cols-4 gap-3">
        {badges.map((badge) => {
          const unlocked = Boolean(badge.unlockedAt)
          return (
            <button
              key={badge.id}
              onClick={() => setDetail(badge)}
              className="flex flex-col items-center gap-1 rounded-2xl bg-surface py-3"
              style={{ opacity: unlocked ? 1 : 0.4 }}
            >
              <span className="text-2xl" style={{ filter: unlocked ? 'none' : 'grayscale(1)' }}>
                {badge.emoji}
              </span>
              <span className="px-1 text-center text-[10px] font-medium leading-tight text-ink">
                {badge.name}
              </span>
            </button>
          )
        })}
      </div>

      <BottomSheet open={detail !== null} onClose={() => setDetail(null)}>
        {detail && (
          <div className="pb-2 text-center">
            <p className="mb-2 text-4xl" style={{ filter: detail.unlockedAt ? 'none' : 'grayscale(1)' }}>
              {detail.emoji}
            </p>
            <p className="mb-1 text-lg font-semibold text-ink">{detail.name}</p>
            <p className="text-sm text-ink-muted">{detail.description}</p>
            {detail.unlockedAt && (
              <p className="mt-2 text-xs text-accent">
                Unlocked {new Date(detail.unlockedAt).toLocaleDateString()}
              </p>
            )}
          </div>
        )}
      </BottomSheet>
    </section>
  )
}
