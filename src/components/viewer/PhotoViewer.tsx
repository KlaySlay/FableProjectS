'use client'

import { useEffect, useState } from 'react'
import { ViewerCarousel } from './ViewerCarousel'
import { deletePhotos, updatePhotoCategory } from '@/lib/supabase/photoStorage'
import type { CalendarPhoto, Category } from '@/types'

type Panel = 'actions' | 'category' | 'confirm-delete'

/**
 * Fullscreen viewer. Carousel is scoped to the photos passed in (one
 * category, one day). Bottom panel: change category / delete.
 */
export function PhotoViewer({
  photos,
  initialIndex,
  categories,
  onClose,
  onMutated,
}: {
  photos: CalendarPhoto[]
  initialIndex: number
  categories: Category[]
  onClose: () => void
  onMutated: () => Promise<void>
}) {
  const [localPhotos, setLocalPhotos] = useState(photos)
  const [index, setIndex] = useState(initialIndex)
  const [panel, setPanel] = useState<Panel>('actions')
  const [busy, setBusy] = useState(false)

  // Body scroll lock
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  const current = localPhotos[index]
  if (!current) return null

  async function handleChangeCategory(categoryId: string) {
    if (busy || categoryId === current.categoryId) {
      setPanel('actions')
      return
    }
    setBusy(true)
    try {
      await updatePhotoCategory(current.id, categoryId)
      await onMutated()
      // Viewer stays open after a category change
      setLocalPhotos((prev) =>
        prev.map((p) => (p.id === current.id ? { ...p, categoryId } : p)),
      )
      setPanel('actions')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (busy) return
    setBusy(true)
    try {
      await deletePhotos([current.id])
      await onMutated()
      const remaining = localPhotos.filter((p) => p.id !== current.id)
      if (remaining.length === 0) {
        onClose()
        return
      }
      setLocalPhotos(remaining)
      setIndex(Math.min(index, remaining.length - 1))
      setPanel('actions')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="animate-viewer-in fixed inset-0 z-[60] flex flex-col bg-black">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}>
        <button aria-label="Close" onClick={onClose} className="px-2 py-1 text-2xl text-white">
          ←
        </button>
        <span className="text-sm font-medium text-zinc-400">
          {index + 1} / {localPhotos.length}
        </span>
        <div className="w-8" />
      </div>

      {/* Carousel */}
      <div className="relative min-h-0 flex-1">
        <ViewerCarousel
          photos={localPhotos}
          index={index}
          onIndexChange={setIndex}
          onDismiss={onClose}
        />
        {/* Nav arrows when multiple photos */}
        {localPhotos.length > 1 && (
          <>
            {index > 0 && (
              <button
                aria-label="Previous photo"
                onClick={() => setIndex(index - 1)}
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 px-3 py-2 text-xl text-white"
              >
                ‹
              </button>
            )}
            {index < localPhotos.length - 1 && (
              <button
                aria-label="Next photo"
                onClick={() => setIndex(index + 1)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 px-3 py-2 text-xl text-white"
              >
                ›
              </button>
            )}
          </>
        )}
      </div>

      {/* Bottom panel */}
      <div className="px-5 pt-4" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 20px)' }}>
        {panel === 'actions' && (
          <div className="animate-fade-in flex gap-3">
            <button
              onClick={() => setPanel('category')}
              className="flex-1 rounded-2xl bg-zinc-800 py-3.5 text-sm font-medium text-white"
            >
              Change category
            </button>
            <button
              onClick={() => setPanel('confirm-delete')}
              className="flex-1 rounded-2xl bg-zinc-800 py-3.5 text-sm font-medium text-rose-400"
            >
              Delete
            </button>
          </div>
        )}

        {panel === 'category' && (
          <div className="animate-fade-in space-y-2">
            {categories.map((c) => (
              <button
                key={c.id}
                disabled={busy}
                onClick={() => handleChangeCategory(c.id)}
                className="flex w-full items-center justify-between rounded-2xl bg-zinc-800 px-5 py-3.5 text-sm font-medium text-white disabled:opacity-60"
              >
                <span>
                  {c.emoji} {c.label}
                </span>
                {c.id === current.categoryId && <span className="text-xs text-zinc-400">current</span>}
              </button>
            ))}
            <button onClick={() => setPanel('actions')} className="w-full py-2 text-sm text-zinc-400">
              Cancel
            </button>
          </div>
        )}

        {panel === 'confirm-delete' && (
          <div className="animate-fade-in flex items-center gap-3">
            <span className="flex-1 text-sm text-white">Delete this photo?</span>
            <button
              disabled={busy}
              onClick={handleDelete}
              className="rounded-2xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              Confirm
            </button>
            <button onClick={() => setPanel('actions')} className="rounded-2xl bg-zinc-800 px-5 py-3 text-sm font-medium text-white">
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
