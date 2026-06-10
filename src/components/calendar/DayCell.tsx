'use client'

import Link from 'next/link'
import { PhotoMosaic } from './PhotoMosaic'
import { CategoryRing } from './CategoryRing'
import type { CalendarPhoto, Category } from '@/types'

export function DayCell({
  date,
  dayNumber,
  photos,
  categories,
  userColors,
  isToday,
}: {
  date: string
  dayNumber: number
  photos: CalendarPhoto[]
  categories: Category[]
  userColors: Record<string, string>
  isToday: boolean
}) {
  return (
    <Link
      href={`/day/${date}`}
      className="relative block h-full w-full p-[3px]"
      aria-label={`Day ${dayNumber}`}
    >
      <div className="relative h-full w-full overflow-hidden rounded-xl bg-surface">
        {photos.length > 0 ? (
          <PhotoMosaic photos={photos} userColors={userColors} />
        ) : (
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-xs text-ink-muted">
            {dayNumber}
          </span>
        )}
        {photos.length > 0 && (
          <span className="absolute left-1 top-0.5 text-[10px] font-semibold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
            {dayNumber}
          </span>
        )}
        {isToday && (
          <span
            className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded-full px-1.5 py-px text-[8px] font-semibold text-zinc-950"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            Today
          </span>
        )}
      </div>
      <CategoryRing photos={photos} categories={categories} />
    </Link>
  )
}
