import type { CalendarPhoto, Category } from '@/types'

// Rainbow palette indexed by category position
const CAT_COLORS = ['#f97316', '#34d399', '#60a5fa', '#c084fc', '#fb7185', '#fbbf24']

// Butterfly wing paths (centered at origin). Each is a closed filled shape.
// Wing order: upper-right, upper-left, lower-right, lower-left
const WINGS = [
  // upper-right
  'M 1,0 C 3,-5 9,-13 15,-11 C 20,-8 19,-1 13,2 C 8,4 3,3 1,0 Z',
  // upper-left (mirror)
  'M -1,0 C -3,-5 -9,-13 -15,-11 C -20,-8 -19,-1 -13,2 C -8,4 -3,3 -1,0 Z',
  // lower-right
  'M 1,1 C 4,4 11,6 13,12 C 15,17 9,19 5,14 C 2,10 0,5 1,1 Z',
  // lower-left (mirror)
  'M -1,1 C -4,4 -11,6 -13,12 C -15,17 -9,19 -5,14 C -2,10 0,5 -1,1 Z',
]

// Body (slim oval between wings)
const BODY = 'M 0,-4 C 1.2,-4 1.2,4 0,4 C -1.2,4 -1.2,-4 0,-4 Z'

function wingColor(wingIndex: number, categories: Category[]): string {
  // lower-left mirrors lower-right if only 3 categories
  const catIndex = wingIndex === 3 && categories.length <= 3 ? 2 : wingIndex
  const cat = categories[catIndex]
  if (cat?.color) return cat.color
  return CAT_COLORS[catIndex % CAT_COLORS.length]
}

function isWingActive(wingIndex: number, photos: CalendarPhoto[], categories: Category[]): boolean {
  const catIndex = wingIndex === 3 && categories.length <= 3 ? 2 : wingIndex
  const cat = categories[catIndex]
  if (!cat) return false
  return photos.some((p) => p.categoryId === cat.id)
}

export function InfinityProgress({
  photos,
  categories,
  dayNumber,
  isToday,
}: {
  photos: CalendarPhoto[]
  categories: Category[]
  members: { id: string; avatarColor: string }[]
  dayNumber: number
  isToday: boolean
}) {
  const activeCount = WINGS.filter((_, i) => isWingActive(i, photos, categories)).length
  const hasAny = activeCount > 0

  return (
    <div className="relative flex h-full w-full items-center justify-center">
      <svg viewBox="-22 -16 44 36" className="h-[88%] w-[88%]">
        {WINGS.map((d, i) => {
          const active = isWingActive(i, photos, categories)
          const color = wingColor(i, categories)
          return (
            <path
              key={i}
              d={d}
              fill={active ? color : 'none'}
              fillOpacity={active ? 0.78 : 0}
              stroke={active ? color : '#52525b'}
              strokeOpacity={active ? 0.5 : 0.18}
              strokeWidth={0.7}
              strokeLinejoin="round"
            />
          )
        })}

        {/* Body */}
        <path
          d={BODY}
          fill={hasAny ? '#a1a1aa' : '#3f3f46'}
          fillOpacity={hasAny ? 0.6 : 0.3}
          stroke="none"
        />
      </svg>

      {/* Day number */}
      {!hasAny && (
        <span
          className="absolute text-[9px] font-semibold"
          style={{ color: isToday ? 'var(--accent)' : 'var(--text-muted)', opacity: 0.7 }}
        >
          {dayNumber}
        </span>
      )}

      {/* Today dot when wings are filled */}
      {isToday && hasAny && (
        <span
          className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full"
          style={{ backgroundColor: 'var(--accent)' }}
        />
      )}
    </div>
  )
}
