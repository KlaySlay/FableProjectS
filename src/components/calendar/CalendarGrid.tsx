'use client'

import { DayCell } from './DayCell'
import { dateKey, monthGrid } from '@/lib/utils/dateUtils'
import type { CalendarPhoto, Category } from '@/types'

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export function CalendarGrid({
  year,
  month,
  photosByDate,
  categories,
  userColors,
  members,
  viewMode,
}: {
  year: number
  month: number
  photosByDate: Record<string, CalendarPhoto[]>
  categories: Category[]
  userColors: Record<string, string>
  members: { id: string; avatarColor: string }[]
  viewMode: 'mosaic' | 'infinity'
}) {
  const { daysInMonth, startWeekday, rows } = monthGrid(year, month)
  const todayKey = dateKey(new Date())

  const cells: (number | null)[] = [
    ...Array.from({ length: startWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length < rows * 7) cells.push(null)

  return (
    <div className="flex h-full flex-col px-1">
      <div className="grid grid-cols-7 pb-1">
        {WEEKDAYS.map((d, i) => (
          <span key={i} className="text-center text-[10px] font-medium text-ink-muted">
            {d}
          </span>
        ))}
      </div>
      <div
        className="grid flex-1 grid-cols-7"
        style={{ gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` }}
      >
        {cells.map((day, i) => {
          if (day === null) return <div key={i} />
          const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          return (
            <DayCell
              key={key}
              date={key}
              dayNumber={day}
              photos={photosByDate[key] ?? []}
              categories={categories}
              userColors={userColors}
              members={members}
              isToday={key === todayKey}
              viewMode={viewMode}
            />
          )
        })}
      </div>
    </div>
  )
}
