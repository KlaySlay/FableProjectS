'use client'

import { getLevelForXP, LEVELS } from '@/lib/utils/xpUtils'

export function XPBar({ xp }: { xp: number }) {
  const level = getLevelForXP(xp)
  const next = LEVELS.find((l) => l.level === level.level + 1)
  const span = next ? next.minXP - level.minXP : 1
  const progress = next ? Math.min(1, (xp - level.minXP) / span) : 1

  return (
    <div className="rounded-2xl bg-surface p-5">
      <p className="mb-2 text-sm font-semibold text-ink">
        Level {level.level} — {level.label}
      </p>
      <div className="mb-2 h-2.5 overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${progress * 100}%`, backgroundColor: 'var(--accent)' }}
        />
      </div>
      <p className="text-xs text-ink-muted">
        {xp} XP{next ? ` · ${next.minXP - xp} to Level ${next.level}` : ' · max level'}
      </p>
    </div>
  )
}
