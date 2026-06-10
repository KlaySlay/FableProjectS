'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { CalendarGrid } from '@/components/calendar/CalendarGrid'
import { AddPhotoModal } from '@/components/upload/AddPhotoModal'
import { CommunitySwitch } from '@/components/community/CommunitySwitch'
import { FAB } from '@/components/shared/FAB'
import { NudgeBanner } from '@/components/shared/NudgeBanner'
import { MCQFlow } from '@/components/coach/MCQScreen'
import { useActiveUser } from '@/lib/hooks/useActiveUser'
import { useCommunity } from '@/lib/hooks/useCommunity'
import { usePhotosForMonth } from '@/lib/hooks/usePhotosForMonth'
import { getStreak, hasUploadedToday } from '@/lib/supabase/xpStorage'
import { monthLabel } from '@/lib/utils/dateUtils'

export default function CalendarPage() {
  const { user } = useActiveUser()
  const { community } = useCommunity()

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [filterId, setFilterId] = useState<string | null>(null) // null = Both
  const [modalOpen, setModalOpen] = useState(false)
  const [streak, setStreak] = useState(0)
  const [nudgeVisible, setNudgeVisible] = useState(false)
  const [nudgeDismissed, setNudgeDismissed] = useState(false)
  const [mcqPhotoId, setMcqPhotoId] = useState<string | null>(null)

  const { photosByDate, refresh } = usePhotosForMonth(year, month)

  useEffect(() => {
    if (!user) return
    getStreak(user.id).then(setStreak).catch(() => {})
    hasUploadedToday(user.id)
      .then((uploaded) => setNudgeVisible(!uploaded))
      .catch(() => {})
  }, [user, photosByDate])

  const userColors = useMemo(() => {
    const map: Record<string, string> = {}
    for (const m of community?.members ?? []) map[m.id] = m.avatarColor
    return map
  }, [community])

  const filtered = useMemo(() => {
    if (!filterId) return photosByDate
    const result: typeof photosByDate = {}
    for (const [date, photos] of Object.entries(photosByDate)) {
      const kept = photos.filter((p) => p.userId === filterId)
      if (kept.length > 0) result[date] = kept
    }
    return result
  }, [photosByDate, filterId])

  function prevMonth() {
    if (month === 0) {
      setMonth(11)
      setYear((y) => y - 1)
    } else setMonth((m) => m - 1)
  }
  function nextMonth() {
    if (month === 11) {
      setMonth(0)
      setYear((y) => y + 1)
    } else setMonth((m) => m + 1)
  }

  const members = community?.members ?? []
  const solo = members.length <= 1

  return (
    <main className="flex h-[100dvh] flex-col" style={{ paddingBottom: 'calc(56px + env(safe-area-inset-bottom))' }}>
      {/* Header */}
      <header className="flex items-center justify-between px-4 pb-2 pt-4">
        <CommunitySwitch />
        <div className="flex items-center gap-2">
          <button aria-label="Previous month" onClick={prevMonth} className="px-2 py-1 text-lg text-ink-muted">
            ‹
          </button>
          <h1 className="min-w-[120px] text-center text-sm font-semibold text-ink">
            {monthLabel(year, month)}
          </h1>
          <button aria-label="Next month" onClick={nextMonth} className="px-2 py-1 text-lg text-ink-muted">
            ›
          </button>
        </div>
        {streak > 0 ? (
          <Link href="/profile" className="rounded-full bg-surface px-2.5 py-1.5 text-xs font-semibold text-ink">
            🔥 {streak}
          </Link>
        ) : (
          <div className="w-12" />
        )}
      </header>

      {/* View filter */}
      <div className="flex justify-center gap-1.5 px-4 pb-2">
        {!solo && <FilterPill label="Both" active={filterId === null} onClick={() => setFilterId(null)} />}
        {members.map((m) => (
          <FilterPill
            key={m.id}
            label={m.displayName.split(' ')[0]}
            active={filterId === m.id || (solo && filterId === null)}
            onClick={() => setFilterId(solo ? null : m.id)}
          />
        ))}
      </div>

      {/* Daily nudge */}
      {nudgeVisible && !nudgeDismissed && (
        <NudgeBanner streak={streak} onDismiss={() => setNudgeDismissed(true)} />
      )}

      {/* Grid fills remaining height */}
      <div className="min-h-0 flex-1 overflow-hidden pb-1">
        <CalendarGrid
          year={year}
          month={month}
          photosByDate={filtered}
          categories={community?.categories ?? []}
          userColors={userColors}
        />
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

function FilterPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-full px-4 py-1.5 text-xs font-medium transition-colors"
      style={{
        backgroundColor: active ? 'var(--accent)' : 'var(--surface)',
        color: active ? '#09090b' : 'var(--text-muted)',
      }}
    >
      {label}
    </button>
  )
}
