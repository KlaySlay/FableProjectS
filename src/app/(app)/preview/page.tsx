'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePhotosForMonth } from '@/lib/hooks/usePhotosForMonth'
import { useCommunity } from '@/lib/hooks/useCommunity'
import { useActiveUser } from '@/lib/hooks/useActiveUser'
import { getStreak } from '@/lib/supabase/xpStorage'
import { FAB } from '@/components/shared/FAB'
import { AddPhotoModal } from '@/components/upload/AddPhotoModal'
import { MCQFlow } from '@/components/coach/MCQScreen'
import { monthLabel } from '@/lib/utils/dateUtils'
import type { CalendarPhoto } from '@/types'

const SQ = 17       // square size in px
const CORNER = 4    // border-radius

const MONTH_NAMES = ['January','February','March','April','May','June',
  'July','August','September','October','November','December']
const DAY_LETTERS = ['M','T','W','T','F','S','S']
const CAT_PALETTE = ['#c084fc','#fb923c','#38bdf8','#34d399','#fb7185','#fbbf24']

function daysIn(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function dk(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function lemniscateXY(t: number, a: number, cx: number, cy: number) {
  const d = 1 + Math.sin(t) ** 2
  return { x: cx + (a * Math.cos(t)) / d, y: cy + (a * Math.sin(t) * Math.cos(t)) / d }
}

// Returns Mon–Sun week containing the given date
function weekContaining(year: number, month: number, day: number): Date[] {
  const date = new Date(year, month, day)
  const dow = (date.getDay() + 6) % 7 // 0=Mon
  const monday = new Date(date)
  monday.setDate(date.getDate() - dow)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

// ─── Infinity component ───────────────────────────────────────────────────────

function InfinityStrip({
  year, month, photosByDate,
}: {
  year: number
  month: number
  photosByDate: Record<string, CalendarPhoto[]>
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [W, setW] = useState(360)

  useEffect(() => {
    if (containerRef.current) setW(containerRef.current.offsetWidth)
  }, [])

  const N = daysIn(year, month)
  const today = new Date()
  const todayNum =
    today.getFullYear() === year && today.getMonth() === month ? today.getDate() : -1

  const H = 190
  const cx = W / 2
  const cy = H / 2
  const a = Math.min(W * 0.41, 158)

  const positions = useMemo(() => {
    return Array.from({ length: N }, (_, i) => {
      const t = (i / N) * 2 * Math.PI - Math.PI * 0.5
      return lemniscateXY(t, a, cx, cy)
    })
  }, [N, a, cx, cy])

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: H }}>
      {positions.map((pos, i) => {
        const day = i + 1
        const key = dk(year, month, day)
        const photos = photosByDate[key] ?? []
        const photo = photos[0]
        const isToday = day === todayNum
        const isFuture = todayNum > 0 && day > todayNum

        return (
          <Link
            key={i}
            href={`/day/${key}`}
            style={{
              position: 'absolute',
              left: pos.x - SQ / 2,
              top: pos.y - SQ / 2,
              width: SQ,
              height: SQ,
              borderRadius: CORNER,
              overflow: 'hidden',
              display: 'block',
              background: photo ? 'transparent' : isFuture ? '#18181b' : '#27272a',
              outline: isToday ? '1.5px solid var(--accent)' : 'none',
              outlineOffset: '1px',
              flexShrink: 0,
            }}
            aria-label={`Day ${day}`}
          >
            {photo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photo.src}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            )}
          </Link>
        )
      })}
    </div>
  )
}

// ─── Weekly row ───────────────────────────────────────────────────────────────

function WeekRow({
  week, photosByDate, categoryIds,
}: {
  week: Date[]
  photosByDate: Record<string, CalendarPhoto[]>
  categoryIds: string[]
}) {
  const today = new Date()
  const todayKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
      {week.map((date, i) => {
        const key = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
        const photos = photosByDate[key] ?? []
        const loggedCats = new Set(photos.map(p => p.categoryId))
        const isToday = key === todayKey

        return (
          <Link key={i} href={`/day/${key}`} style={{ textDecoration: 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  background: isToday ? 'var(--accent)' : 'transparent',
                  border: isToday ? 'none' : photos.length > 0 ? '0.5px solid #3f3f46' : '0.5px solid #27272a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  gap: 1,
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 600, color: isToday ? '#09090b' : photos.length > 0 ? '#fafafa' : '#52525b' }}>
                  {date.getDate()}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
                {categoryIds.map((catId, ci) => (
                  <div
                    key={catId}
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      background: loggedCats.has(catId) ? CAT_PALETTE[ci % CAT_PALETTE.length] : '#27272a',
                    }}
                  />
                ))}
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PreviewPage() {
  const { user } = useActiveUser()
  const { community } = useCommunity()

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [streak, setStreak] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [mcqPhotoId, setMcqPhotoId] = useState<string | null>(null)

  const touchStartX = useRef(0)

  const { photosByDate, refresh } = usePhotosForMonth(year, month)

  useEffect(() => {
    if (!user) return
    getStreak(user.id).then(setStreak).catch(() => {})
  }, [user])

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1)
  }

  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX }
  const onTouchEnd = (e: React.TouchEvent) => {
    const delta = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(delta) > 50) delta > 0 ? nextMonth() : prevMonth()
  }

  const categories = community?.categories ?? []
  const categoryIds = categories.map(c => c.id)

  // Week to show: current week if in current month, else first week of month
  const refDay = (year === now.getFullYear() && month === now.getMonth())
    ? now.getDate()
    : 7
  const week = useMemo(() => weekContaining(year, month, refDay), [year, month, refDay])

  return (
    <main
      className="flex h-[100dvh] flex-col overflow-hidden"
      style={{ paddingBottom: 'calc(56px + env(safe-area-inset-bottom))' }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Preview label */}
      <div style={{ background: '#7c3aed', padding: '4px 0', textAlign: 'center' }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: '#fff', letterSpacing: '0.08em' }}>
          PREVIEW  ·  <Link href="/" style={{ color: '#e9d5ff' }}>back to calendar →</Link>
        </span>
      </div>

      {/* Month nav */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, padding: '12px 24px 4px' }}>
        <button onClick={prevMonth} className="text-ink-muted text-xl px-2">‹</button>
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', minWidth: 140, textAlign: 'center' }}>
          {MONTH_NAMES[month]} {year}
        </span>
        <button onClick={nextMonth} className="text-ink-muted text-xl px-2">›</button>
      </header>

      {/* Infinity */}
      <div style={{ padding: '0 10px' }}>
        <InfinityStrip year={year} month={month} photosByDate={photosByDate} />
      </div>

      {/* Streak banner */}
      <div style={{ margin: '8px 16px 0', background: 'var(--surface)', borderRadius: 14, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 20 }}>{streak > 0 ? '🔥' : '○'}</span>
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: 0 }}>
            {streak > 0 ? `${streak} day streak` : 'No streak yet'}
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
            {streak > 0 ? 'Keep going.' : 'Log something today to start.'}
          </p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          {community?.members.map(m => (
            <div key={m.id} style={{ width: 32, height: 32, borderRadius: '50%', background: m.avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#09090b' }}>
              {m.displayName.charAt(0).toUpperCase()}
            </div>
          ))}
        </div>
      </div>

      {/* Week section */}
      <div style={{ margin: '14px 16px 0', flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>This week</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {week[0].toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – {week[6].toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          </span>
        </div>

        {/* Day letters */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 8 }}>
          {DAY_LETTERS.map((d, i) => (
            <div key={i} style={{ textAlign: 'center', fontSize: 10, fontWeight: 500, color: '#52525b' }}>{d}</div>
          ))}
        </div>

        <WeekRow week={week} photosByDate={photosByDate} categoryIds={categoryIds} />

        {/* Category legend */}
        {categories.length > 0 && (
          <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
            {categories.map((c, i) => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: CAT_PALETTE[i % CAT_PALETTE.length] }} />
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.emoji} {c.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <FAB onClick={() => setModalOpen(true)} />

      {user && community && (
        <AddPhotoModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          categories={community.categories}
          userId={user.id}
          communityId={community.id}
          onUploaded={(slug, photoId) => {
            refresh()
            if (slug === 'study') setMcqPhotoId(photoId)
          }}
        />
      )}

      {mcqPhotoId && <MCQFlow photoId={mcqPhotoId} onClose={() => setMcqPhotoId(null)} />}
    </main>
  )
}
