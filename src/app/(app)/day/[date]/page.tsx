'use client'

import { useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { PhotoViewer } from '@/components/viewer/PhotoViewer'
import { MealAnalysisCard } from '@/components/day/MealAnalysisCard'
import { usePhotosForDate } from '@/lib/hooks/usePhotosForDate'
import { useCommunity } from '@/lib/hooks/useCommunity'
import { deletePhotos } from '@/lib/supabase/photoStorage'
import { formatDayHeading, isValidDateKey } from '@/lib/utils/dateUtils'
import type { CalendarPhoto } from '@/types'

export default function DayPage() {
  const params = useParams<{ date: string }>()
  const router = useRouter()
  const date = params.date
  const { community } = useCommunity()
  const { photos, loading, refresh } = usePhotosForDate(date)

  const [viewer, setViewer] = useState<{ photos: CalendarPhoto[]; index: number } | null>(null)
  const [deleteMode, setDeleteMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const categories = community?.categories ?? []
  const members = community?.members ?? []
  const mealsCategoryId = categories.find((c) => c.slug === 'meals')?.id

  const grouped = useMemo(() => {
    return categories
      .map((cat) => ({ category: cat, photos: photos.filter((p) => p.categoryId === cat.id) }))
      .filter((g) => g.photos.length > 0)
  }, [categories, photos])

  if (!isValidDateKey(date)) {
    return (
      <main className="flex h-[100dvh] items-center justify-center">
        <p className="text-ink-muted">That date doesn&apos;t look right.</p>
      </main>
    )
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function exitDeleteMode() {
    setDeleteMode(false)
    setSelectedIds(new Set())
    setConfirmDelete(false)
  }

  async function handleConfirmDelete() {
    if (deleting) return
    setDeleting(true)
    try {
      await deletePhotos(Array.from(selectedIds))
      await refresh()
      exitDeleteMode()
    } finally {
      setDeleting(false)
    }
  }

  function memberBadge(userId: string) {
    const member = members.find((m) => m.id === userId)
    return { name: member?.displayName.split(' ')[0] ?? '?', color: member?.avatarColor ?? '#a1a1aa' }
  }

  return (
    <main className="min-h-[100dvh] pb-28">
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-bg/90 px-3 py-3 backdrop-blur" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}>
        <button aria-label="Back" onClick={() => router.back()} className="px-2 py-1 text-2xl text-ink">
          ←
        </button>
        <h1 className="text-base font-semibold text-ink">{formatDayHeading(date)}</h1>
        {photos.length > 0 ? (
          <button
            aria-label={deleteMode ? 'Cancel delete' : 'Delete photos'}
            onClick={() => (deleteMode ? exitDeleteMode() : setDeleteMode(true))}
            className="px-2 py-1 text-ink-muted"
          >
            {deleteMode ? (
              <span className="text-sm font-medium">Cancel</span>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            )}
          </button>
        ) : (
          <div className="w-9" />
        )}
      </header>

      {/* Content */}
      {!loading && photos.length === 0 && (
        <div className="flex h-[60dvh] items-center justify-center">
          <p className="text-sm text-ink-muted">Nothing logged for this day.</p>
        </div>
      )}

      <div className="space-y-7 px-4 pt-2">
        {grouped.map(({ category, photos: catPhotos }) => (
          <section key={category.id}>
            <h2 className="mb-2.5 text-sm font-semibold text-ink">
              {category.emoji} {category.label}
            </h2>
            <div className={catPhotos.length === 1 ? 'grid grid-cols-1 gap-2' : 'grid grid-cols-2 gap-2'}>
              {catPhotos.map((photo, i) => {
                const badge = memberBadge(photo.userId)
                const selected = selectedIds.has(photo.id)
                return (
                  <div key={photo.id}>
                    <button
                      className="relative block aspect-square w-full overflow-hidden rounded-2xl"
                      onClick={() =>
                        deleteMode
                          ? toggleSelect(photo.id)
                          : setViewer({ photos: catPhotos, index: i })
                      }
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.src}
                        alt=""
                        className="h-full w-full object-cover transition-opacity"
                        style={{ opacity: deleteMode && !selected ? 0.4 : 1 }}
                      />
                      {/* User badge */}
                      <span className="absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5">
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: badge.color }} />
                        <span className="text-[10px] font-medium text-white">{badge.name}</span>
                      </span>
                      {/* Selector circle */}
                      {deleteMode && (
                        <span
                          className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full border-2"
                          style={{
                            borderColor: selected ? 'var(--accent)' : 'rgba(255,255,255,0.8)',
                            backgroundColor: selected ? 'var(--accent)' : 'transparent',
                          }}
                        >
                          {selected && <span className="text-[10px] font-bold text-zinc-950">✓</span>}
                        </span>
                      )}
                    </button>
                    {/* Meal analysis chip / card */}
                    {!deleteMode && photo.categoryId === mealsCategoryId && (
                      <MealAnalysisCard photoId={photo.id} />
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        ))}
      </div>

      {/* Delete bottom bar */}
      {deleteMode && selectedIds.size > 0 && (
        <div
          className="fixed inset-x-0 z-40 px-5"
          style={{ bottom: 'calc(56px + env(safe-area-inset-bottom) + 12px)' }}
        >
          {confirmDelete ? (
            <div className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-3 shadow-lg">
              <span className="flex-1 text-sm text-ink">Are you sure?</span>
              <button
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                Confirm
              </button>
              <button onClick={() => setConfirmDelete(false)} className="rounded-xl bg-surface-2 px-4 py-2.5 text-sm font-medium text-ink">
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="w-full rounded-2xl bg-rose-600 py-4 font-semibold text-white shadow-lg"
            >
              Delete ({selectedIds.size})
            </button>
          )}
        </div>
      )}

      {/* Fullscreen viewer */}
      {viewer && (
        <PhotoViewer
          photos={viewer.photos}
          initialIndex={viewer.index}
          categories={categories}
          onClose={() => setViewer(null)}
          onMutated={refresh}
        />
      )}
    </main>
  )
}
