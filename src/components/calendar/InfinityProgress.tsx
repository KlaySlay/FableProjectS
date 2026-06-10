import type { CalendarPhoto, Category } from '@/types'

const PATH =
  'M 0 0 C 4 -6 9 -8 13 -8 C 17 -8 19 -3.5 19 0 C 19 3.5 17 8 13 8 C 9 8 4 6 0 0 C -4 -6 -9 -8 -13 -8 C -17 -8 -19 -3.5 -19 0 C -19 3.5 -17 8 -13 8 C -9 8 -4 6 0 0'

function categoryFill(userId: string, photos: CalendarPhoto[], totalCats: number): number {
  if (totalCats === 0) return 0
  const unique = new Set(photos.filter((p) => p.userId === userId).map((p) => p.categoryId))
  return Math.min(unique.size / totalCats, 1)
}

export function InfinityProgress({
  photos,
  categories,
  members,
  dayNumber,
  isToday,
}: {
  photos: CalendarPhoto[]
  categories: Category[]
  members: { id: string; avatarColor: string }[]
  dayNumber: number
  isToday: boolean
}) {
  const total = categories.length || 3
  const hasAny = photos.length > 0

  const outer = members[0]
  const inner = members[1]
  const outerFill = outer ? categoryFill(outer.id, photos, total) : 0
  const innerFill = inner ? categoryFill(inner.id, photos, total) : 0

  const OUTER_SW = 2.0
  const INNER_SW = OUTER_SW / 0.7

  return (
    <div className="relative flex h-full w-full items-center justify-center">
      <svg viewBox="-22 -12 44 24" className="h-[94%] w-[94%]">
        {/* Outer track */}
        <path
          d={PATH}
          fill="none"
          stroke={outer?.avatarColor ?? '#c084fc'}
          strokeWidth={OUTER_SW}
          strokeOpacity={hasAny ? 0.2 : 0.1}
          strokeLinecap="round"
        />
        {/* Outer fill */}
        {outerFill > 0 && (
          <path
            d={PATH}
            fill="none"
            stroke={outer?.avatarColor ?? '#c084fc'}
            strokeWidth={OUTER_SW}
            strokeLinecap="round"
            pathLength="100"
            strokeDasharray={`${outerFill * 100} 100`}
          />
        )}

        {/* Inner ring */}
        {inner && (
          <g transform="scale(0.7)">
            <path
              d={PATH}
              fill="none"
              stroke={inner.avatarColor}
              strokeWidth={INNER_SW}
              strokeOpacity={hasAny ? 0.2 : 0.1}
              strokeLinecap="round"
            />
            {innerFill > 0 && (
              <path
                d={PATH}
                fill="none"
                stroke={inner.avatarColor}
                strokeWidth={INNER_SW}
                strokeLinecap="round"
                pathLength="100"
                strokeDasharray={`${innerFill * 100} 100`}
              />
            )}
          </g>
        )}
      </svg>

      {/* Day number */}
      <span
        className="absolute text-[9px] font-semibold"
        style={{ color: isToday ? 'var(--accent)' : 'var(--text-muted)', opacity: isToday ? 1 : 0.7 }}
      >
        {dayNumber}
      </span>
    </div>
  )
}
