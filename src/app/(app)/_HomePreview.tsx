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
import type { CalendarPhoto, Category } from '@/types'

// ── Constants ──────────────────────────────────────────────────────────────────
const SQ = 26
const CORNER = 6
const CAT_COLORS = ['#bf5af2', '#ff9f0a', '#30d158', '#0a84ff', '#ff375f', '#ffd60a']
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

// ── Helpers ────────────────────────────────────────────────────────────────────
const daysIn = (y: number, m: number) => new Date(y, m + 1, 0).getDate()

const dk = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`

function lemniscateXY(t: number, a: number, cx: number, cy: number) {
  const denom = 1 + Math.sin(t) ** 2
  return { x: cx + (a * Math.cos(t)) / denom, y: cy + (a * Math.sin(t) * Math.cos(t)) / denom }
}

function shiftMonth(y: number, m: number, delta: number): { year: number; month: number } {
  let mm = m + delta, yy = y
  while (mm < 0) { mm += 12; yy-- }
  while (mm > 11) { mm -= 12; yy++ }
  return { year: yy, month: mm }
}

// ── Scroll-snap pager hook ─────────────────────────────────────────────────────
function usePager(onPrev: () => void, onNext: () => void, resetKey: unknown) {
  const ref = useRef<HTMLDivElement>(null)
  const settling = useRef(false)
  const onPrevRef = useRef(onPrev)
  const onNextRef = useRef(onNext)
  onPrevRef.current = onPrev
  onNextRef.current = onNext

  useEffect(() => {
    const div = ref.current
    if (!div) return
    settling.current = true
    div.style.scrollBehavior = 'auto'
    const raf = requestAnimationFrame(() => {
      div.scrollLeft = div.offsetWidth
      requestAnimationFrame(() => {
        div.style.scrollBehavior = ''
        settling.current = false
      })
    })
    return () => cancelAnimationFrame(raf)
  }, [resetKey])

  useEffect(() => {
    const div = ref.current
    if (!div) return
    let timer: ReturnType<typeof setTimeout>

    const commit = (cb: () => void) => {
      settling.current = true
      div.style.scrollBehavior = 'auto'
      div.scrollLeft = div.offsetWidth
      requestAnimationFrame(() => {
        div.style.scrollBehavior = ''
        settling.current = false
      })
      cb()
    }

    const onScroll = () => {
      if (settling.current) return
      clearTimeout(timer)
      timer = setTimeout(() => {
        if (!div || settling.current) return
        const W = div.offsetWidth, pos = div.scrollLeft
        if (pos < W * 0.5) commit(() => onPrevRef.current())
        else if (pos > W * 1.5) commit(() => onNextRef.current())
      }, 100)
    }

    div.addEventListener('scroll', onScroll, { passive: true })
    return () => { div.removeEventListener('scroll', onScroll); clearTimeout(timer) }
  }, [])

  return ref
}

// ── Infinity strip ─────────────────────────────────────────────────────────────
function InfinityStrip({
  year, month, photosByDate, categories,
}: {
  year: number; month: number
  photosByDate: Record<string, CalendarPhoto[]>
  categories: Category[]
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [W, setW] = useState(360)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    setW(el.offsetWidth)
    const ro = new ResizeObserver(() => setW(el.offsetWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const N = daysIn(year, month)
  const today = new Date()
  const todayNum = today.getFullYear() === year && today.getMonth() === month ? today.getDate() : -1
  const H = 240, cx = W / 2, cy = H / 2, a = Math.min(W * 0.44, 185)

  const half1 = Math.floor((N - 1) / 2)
  const centerDay = half1 + 1
  const half2 = N - half1 - 1
  const GAP = 0.2

  const rightStart = -Math.PI / 2 + GAP
  const rightEnd   =  Math.PI / 2 - GAP
  const leftStart  =  Math.PI / 2 + GAP
  const leftEnd    =  3 * Math.PI / 2 - GAP

  const items = useMemo(
    () => Array.from({ length: N }, (_, i) => {
      const day = i + 1
      let t: number

      if (day < centerDay) {
        const frac = half1 > 1 ? i / (half1 - 1) : 0.5
        t = rightStart + frac * (rightEnd - rightStart)
      } else if (day === centerDay) {
        t = Math.PI / 2
      } else {
        const li = i - centerDay
        const frac = half2 > 1 ? li / (half2 - 1) : 0.5
        t = leftStart + frac * (leftEnd - leftStart)
      }

      return { day, pos: lemniscateXY(t, a, cx, cy), key: dk(year, month, day) }
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [N, a, cx, cy, year, month, half1, centerDay, half2, rightStart, rightEnd, leftStart, leftEnd],
  )

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: H }}>
      {items.map(({ day, pos, key }) => {
        const photos = photosByDate[key] ?? []
        const isToday = day === todayNum
        const isFuture = todayNum > 0 && day > todayNum
        const hasAll = categories.length > 0 && categories.every(c => photos.some(p => p.categoryId === c.id))
        const hasAny = photos.length > 0
        const photo = hasAny ? photos[(day * 2053) % photos.length] : null

        return (
          <Link
            key={day}
            href={`/day/${key}`}
            aria-label={`Day ${day}`}
            style={{
              position: 'absolute', left: pos.x - SQ / 2, top: pos.y - SQ / 2,
              width: SQ, height: SQ, borderRadius: CORNER, overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: photo ? 'transparent' : 'var(--surface)',
              boxShadow: isToday || hasAll ? '0 0 0 2px var(--accent)' : hasAny ? '0 0 0 1.5px var(--surface-2)' : 'none',
              opacity: isFuture ? 0.35 : 1, zIndex: hasAny ? 1 : 0,
            }}
          >
            <span style={{
              fontSize: 7, fontWeight: 700, lineHeight: 1,
              color: isToday ? 'var(--accent)' : 'var(--ink-muted)',
              letterSpacing: '-0.01em',
              position: 'relative', zIndex: 0, userSelect: 'none',
              fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
            }}>
              {day}
            </span>
            {photo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photo.src}
                alt=""
                style={{
                  position: 'absolute', inset: 0,
                  width: '100%', height: '100%', objectFit: 'cover',
                  display: 'block', zIndex: 1,
                }}
              />
            )}
          </Link>
        )
      })}
    </div>
  )
}

// ── Month pager ────────────────────────────────────────────────────────────────
function MonthPager({
  year, month, onPrev, onNext, photos, categories,
}: {
  year: number; month: number; onPrev: () => void; onNext: () => void
  photos: [Record<string, CalendarPhoto[]>, Record<string, CalendarPhoto[]>, Record<string, CalendarPhoto[]>]
  categories: Category[]
}) {
  const ref = usePager(onPrev, onNext, `${year}-${month}`)
  const prev = shiftMonth(year, month, -1)
  const next = shiftMonth(year, month, 1)

  return (
    <div ref={ref} className="ps-pager" style={{ display: 'flex', overflowX: 'scroll', scrollSnapType: 'x mandatory' }}>
      {([prev, { year, month }, next] as const).map((m, i) => (
        <div key={i} style={{ minWidth: '100%', scrollSnapAlign: 'start' }}>
          <InfinityStrip year={m.year} month={m.month} photosByDate={photos[i]} categories={categories} />
        </div>
      ))}
    </div>
  )
}

// ── Day card ───────────────────────────────────────────────────────────────────
function DayCard({
  date, allPhotosByDate, categories,
}: {
  date: Date
  allPhotosByDate: Record<string, CalendarPhoto[]>
  categories: Category[]
}) {
  const key = dk(date.getFullYear(), date.getMonth(), date.getDate())
  const photos = allPhotosByDate[key] ?? []

  const now = new Date(); now.setHours(0, 0, 0, 0)
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1)
  const isToday = date.getTime() === now.getTime()
  const isYesterday = date.getTime() === yesterday.getTime()

  const dateLabel = isToday
    ? 'Today'
    : isYesterday
    ? 'Yesterday'
    : date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })

  const hasPhotos = photos.length > 0

  if (!hasPhotos) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center',
        padding: '9px 4px',
        borderBottom: '1px solid var(--surface)',
      }}>
        <span style={{ fontSize: 12, color: 'var(--ink-muted)', opacity: 0.4, fontWeight: 500, flex: 1 }}>{dateLabel}</span>
        <span style={{ fontSize: 11, color: 'var(--ink-muted)', opacity: 0.2 }}>—</span>
      </div>
    )
  }

  const totalPhotos = photos.length

  return (
    <Link href={`/day/${key}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div style={{ background: 'var(--surface)', borderRadius: 20, padding: 12 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
          <span style={{
            fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em',
            color: isToday ? 'var(--accent)' : 'var(--ink-muted)',
          }}>
            {dateLabel}
          </span>
          <span style={{ fontSize: 11, color: 'var(--ink-muted)', fontWeight: 500 }}>
            {totalPhotos} {totalPhotos === 1 ? 'photo' : 'photos'}
          </span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${categories.length}, 1fr)`,
          gap: 8,
        }}>
          {categories.map((cat, ci) => {
            const catPhotos = photos.filter(p => p.categoryId === cat.id)
            const photo = catPhotos[0] ?? null
            const count = catPhotos.length

            return (
              <div
                key={cat.id}
                style={{
                  position: 'relative',
                  aspectRatio: '1',
                  borderRadius: 12,
                  overflow: 'hidden',
                  background: photo ? 'transparent' : 'var(--surface-2)',
                }}
              >
                {photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photo.src}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                ) : (
                  <div style={{
                    position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
                    width: 4, height: 4, borderRadius: '50%',
                    background: CAT_COLORS[ci % CAT_COLORS.length],
                    opacity: 0.3,
                  }} />
                )}

                {count > 1 && (
                  <div style={{
                    position: 'absolute', top: 6, right: 6,
                    background: 'rgba(0,0,0,0.55)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    borderRadius: 20,
                    padding: '2px 7px',
                    fontSize: 11, fontWeight: 700, color: '#fff',
                    letterSpacing: '-0.01em',
                  }}>
                    ×{count}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </Link>
  )
}

// ── Day feed ───────────────────────────────────────────────────────────────────
function DayFeed({
  allPhotosByDate, categories,
}: {
  allPhotosByDate: Record<string, CalendarPhoto[]>
  categories: Category[]
}) {
  const days = useMemo(() => {
    const result: Date[] = []
    for (let i = 0; i < 14; i++) {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i)
      result.push(d)
    }
    return result
  }, [])

  return (
    <div
      className="ps-feed"
      style={{
        flex: 1, overflowY: 'scroll',
        padding: '2px 16px 24px',
        display: 'flex', flexDirection: 'column', gap: 8,
      }}
    >
      {days.map(date => (
        <DayCard
          key={date.getTime()}
          date={date}
          allPhotosByDate={allPhotosByDate}
          categories={categories}
        />
      ))}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
// sandbox=true renders the purple preview badge (used by /preview route only)
export default function HomePreview({ sandbox = false }: { sandbox?: boolean }) {
  const { user } = useActiveUser()
  const { community } = useCommunity()
  const now = new Date()

  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [streak, setStreak] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [mcqPhotoId, setMcqPhotoId] = useState<string | null>(null)
  const [memberFilter, setMemberFilter] = useState<string>(() => {
    if (typeof window === 'undefined') return 'both'
    return localStorage.getItem('ps-member-filter') ?? 'both'
  })

  function selectMember(val: string) {
    setMemberFilter(val)
    localStorage.setItem('ps-member-filter', val)
  }

  useEffect(() => {
    if (!user) return
    getStreak(user.id).then(setStreak).catch(() => {})
  }, [user])

  const prevM = shiftMonth(year, month, -1)
  const nextM = shiftMonth(year, month, 1)
  const { photosByDate: prevPhotos, refresh: refreshPrev } = usePhotosForMonth(prevM.year, prevM.month)
  const { photosByDate: currPhotos, refresh: refreshCurr } = usePhotosForMonth(year, month)
  const { photosByDate: nextPhotos, refresh: refreshNext } = usePhotosForMonth(nextM.year, nextM.month)

  const allPhotosByDate = useMemo(
    () => ({ ...prevPhotos, ...currPhotos, ...nextPhotos }),
    [prevPhotos, currPhotos, nextPhotos],
  )

  const filterByMember = useCallback(
    (pbd: Record<string, CalendarPhoto[]>): Record<string, CalendarPhoto[]> => {
      if (memberFilter === 'both') return pbd
      const out: Record<string, CalendarPhoto[]> = {}
      for (const [date, photos] of Object.entries(pbd)) {
        const f = photos.filter(p => p.userId === memberFilter)
        if (f.length) out[date] = f
      }
      return out
    },
    [memberFilter],
  )

  const filteredPrev = useMemo(() => filterByMember(prevPhotos), [filterByMember, prevPhotos])
  const filteredCurr = useMemo(() => filterByMember(currPhotos), [filterByMember, currPhotos])
  const filteredNext = useMemo(() => filterByMember(nextPhotos), [filterByMember, nextPhotos])
  const filteredAll  = useMemo(() => filterByMember(allPhotosByDate), [filterByMember, allPhotosByDate])

  const refresh = useCallback(() => {
    refreshPrev(); refreshCurr(); refreshNext()
  }, [refreshPrev, refreshCurr, refreshNext])

  const categories = community?.categories ?? []

  const goPrevMonth = useCallback(() => {
    const p = shiftMonth(year, month, -1); setYear(p.year); setMonth(p.month)
  }, [year, month])
  const goNextMonth = useCallback(() => {
    const n = shiftMonth(year, month, 1); setYear(n.year); setMonth(n.month)
  }, [year, month])

  const todayKey = dk(now.getFullYear(), now.getMonth(), now.getDate())
  const todayDone = useMemo(
    () => new Set((filteredAll[todayKey] ?? []).map(p => p.categoryId)),
    [filteredAll, todayKey],
  )

  return (
    <main style={{
      height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
      background: 'var(--bg)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif',
      paddingBottom: 'calc(56px + env(safe-area-inset-bottom))',
      // The app layout adds paddingBottom to its wrapper for normal scrollable pages.
      // Counteract it here so our fixed-height screen doesn't become scrollable.
      marginBottom: 'calc(-56px - env(safe-area-inset-bottom))',
    }}>
      <style>{`
        .ps-pager::-webkit-scrollbar { display: none; }
        .ps-pager { scrollbar-width: none; -ms-overflow-style: none; }
        .ps-feed::-webkit-scrollbar { display: none; }
        .ps-feed { scrollbar-width: none; -ms-overflow-style: none; }
      `}</style>

      {/* Sandbox-only preview badge */}
      {sandbox && (
        <div style={{
          background: 'rgba(88,28,220,0.9)', backdropFilter: 'blur(12px)',
          padding: '5px 0', textAlign: 'center', flexShrink: 0,
        }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(221,195,255,0.9)', letterSpacing: '0.12em' }}>
            PREVIEW{'  '}·{'  '}
            <Link href="/" style={{ color: '#fff', textDecoration: 'none' }}>exit →</Link>
          </span>
        </div>
      )}

      {/* ── Streak banner (top) ───────────────────────────────────────────── */}
      <div style={{
        margin: '8px 16px 0',
        background: 'var(--surface)', borderRadius: 16,
        padding: '10px 14px',
        display: 'flex', alignItems: 'center', gap: 10,
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 18, flexShrink: 0 }}>{streak > 0 ? '🔥' : '○'}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', margin: '0 0 4px', letterSpacing: '-0.01em' }}>
            {streak > 0 ? `${streak} day streak` : 'Start your streak'}
          </p>
          {categories.length > 0 && (
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              {categories.map((cat, ci) => (
                <div key={cat.id} title={cat.label} style={{
                  height: 3, width: 26, borderRadius: 2,
                  background: todayDone.has(cat.id) ? CAT_COLORS[ci % CAT_COLORS.length] : 'var(--surface-2)',
                  transition: 'background 0.3s',
                }} />
              ))}
              <span style={{ fontSize: 10, color: 'var(--ink-muted)', marginLeft: 2 }}>today</span>
            </div>
          )}
        </div>
        {community?.members && (
          <div style={{ display: 'flex', flexShrink: 0 }}>
            {community.members.map((m, i) => (
              <div key={m.id} style={{
                width: 28, height: 28, borderRadius: '50%', background: m.avatarColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: '#000',
                border: '2px solid var(--surface)',
                marginLeft: i > 0 ? -8 : 0,
                position: 'relative', zIndex: (community.members.length - i),
              }}>
                {m.displayName.charAt(0).toUpperCase()}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Month header ─────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 20px 0', flexShrink: 0,
      }}>
        <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.03em' }}>
          {MONTH_NAMES[month]}{year !== now.getFullYear() ? ` ${year}` : ''}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {(community?.members?.length ?? 0) > 1 && (
            <div style={{ display: 'flex', gap: 4, marginRight: 4 }}>
              {[{ id: 'both', label: 'Both' }, ...(community?.members ?? []).map(m => ({ id: m.id, label: m.displayName.split(' ')[0] }))].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => selectMember(opt.id)}
                  style={{
                    padding: '3px 10px', borderRadius: 20, border: 'none', cursor: 'pointer',
                    fontSize: 12, fontWeight: 600, lineHeight: 1,
                    background: memberFilter === opt.id ? 'var(--accent)' : 'var(--surface)',
                    color: memberFilter === opt.id ? '#09090b' : 'var(--ink-muted)',
                    transition: 'background 0.15s',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
          <button onClick={goPrevMonth} style={{ background: 'none', border: 'none', color: 'var(--ink-muted)', fontSize: 24, cursor: 'pointer', padding: '2px 10px', lineHeight: 1 }}>‹</button>
          <button onClick={goNextMonth} style={{ background: 'none', border: 'none', color: 'var(--ink-muted)', fontSize: 24, cursor: 'pointer', padding: '2px 10px', lineHeight: 1 }}>›</button>
        </div>
      </div>

      {/* ── Infinity month pager ─────────────────────────────────────────── */}
      <div style={{ flexShrink: 0 }}>
        <MonthPager
          year={year} month={month}
          onPrev={goPrevMonth} onNext={goNextMonth}
          photos={[filteredPrev, filteredCurr, filteredNext]}
          categories={categories}
        />
      </div>

      {/* ── Day feed ─────────────────────────────────────────────────────── */}
      <div style={{ height: 20, flexShrink: 0 }} />
      <DayFeed allPhotosByDate={filteredAll} categories={categories} />

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
