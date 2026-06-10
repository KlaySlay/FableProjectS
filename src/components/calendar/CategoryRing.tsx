'use client'

import type { CalendarPhoto, Category } from '@/types'

const GAP_DEG = 2

/**
 * Conic-gradient ring: each category gets an arc proportional to its photo
 * count, with 2° transparent gaps. Absent when there are no photos.
 */
export function CategoryRing({
  photos,
  categories,
}: {
  photos: CalendarPhoto[]
  categories: Category[]
}) {
  if (photos.length === 0) return null

  const counts = new Map<string, number>()
  for (const p of photos) counts.set(p.categoryId, (counts.get(p.categoryId) ?? 0) + 1)

  const active = categories.filter((c) => counts.has(c.id))
  if (active.length === 0) return null

  const total = photos.length
  const totalGaps = active.length > 1 ? active.length * GAP_DEG : 0
  const usable = 360 - totalGaps

  let cursor = 0
  const stops: string[] = []
  for (const cat of active) {
    const arc = ((counts.get(cat.id) ?? 0) / total) * usable
    stops.push(`${cat.color} ${cursor}deg ${cursor + arc}deg`)
    cursor += arc
    if (active.length > 1) {
      stops.push(`transparent ${cursor}deg ${cursor + GAP_DEG}deg`)
      cursor += GAP_DEG
    }
  }

  const dominant = active.reduce((a, b) =>
    (counts.get(a.id) ?? 0) >= (counts.get(b.id) ?? 0) ? a : b,
  )

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 rounded-xl"
      style={{
        background: `conic-gradient(${stops.join(', ')})`,
        WebkitMask:
          'radial-gradient(closest-side, transparent calc(100% - 2.5px), black calc(100% - 2.5px))',
        mask: 'radial-gradient(closest-side, transparent calc(100% - 2.5px), black calc(100% - 2.5px))',
        boxShadow: `0 0 8px ${dominant.color}29`,
      }}
    />
  )
}
