'use client'

import { useRef, useState } from 'react'
import { BottomSheet } from '@/components/shared/BottomSheet'
import { useToast } from '@/components/shared/Toast'
import { resizeImage } from '@/lib/utils/imageUtils'
import { uploadPhoto } from '@/lib/supabase/photoStorage'
import { awardXP, checkAndAwardBadges } from '@/lib/supabase/xpStorage'
import { getPhotosForDate } from '@/lib/supabase/photoStorage'
import { dateKey } from '@/lib/utils/dateUtils'
import { METRIC_LABELS } from '@/lib/utils/metricUtils'
import type { Category } from '@/types'

export function AddPhotoModal({
  open,
  onClose,
  categories,
  userId,
  communityId,
  onUploaded,
}: {
  open: boolean
  onClose: () => void
  categories: Category[]
  userId: string
  communityId: string
  onUploaded: (categorySlug: string, photoId: string) => void
}) {
  const cameraInput = useRef<HTMLInputElement>(null)
  const galleryInput = useRef<HTMLInputElement>(null)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [pendingCategory, setPendingCategory] = useState<Category | null>(null)
  const [metricInput, setMetricInput] = useState('')
  const { showToast } = useToast()

  function reset() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setBlob(null)
    setPreviewUrl(null)
    setUploading(false)
    setPendingCategory(null)
    setMetricInput('')
  }

  function handleClose() {
    reset()
    onClose()
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const compressed = await resizeImage(file)
      setBlob(compressed)
      setPreviewUrl(URL.createObjectURL(compressed))
    } catch {
      showToast("Couldn't read that image — try another")
    }
  }

  function handleCategory(category: Category) {
    if (!blob || uploading) return
    if (category.metricType !== 'none') {
      setPendingCategory(category)
      return
    }
    doUpload(category, null)
  }

  async function doUpload(category: Category, metricValue: number | null) {
    if (!blob || uploading) return
    setUploading(true)
    const today = dateKey(new Date())
    try {
      const photo = await uploadPhoto({
        blob,
        userId,
        communityId,
        date: today,
        categoryId: category.id,
        metricValue,
      })

      await awardXP(userId, 'upload')

      // Daily triple: uploaded in 3+ distinct categories today
      const todayPhotos = await getPhotosForDate(communityId, today)
      const myCategories = new Set(
        todayPhotos.filter((p) => p.userId === userId).map((p) => p.categoryId),
      )
      if (myCategories.size >= 3) {
        await awardXP(userId, 'daily_triple')
      }

      checkAndAwardBadges(userId).catch(() => {})

      handleClose()
      onUploaded(category.slug, photo.id)
    } catch {
      setUploading(false)
      showToast('Upload failed — try again')
    }
  }

  function handleMetricSubmit() {
    if (!pendingCategory) return
    const trimmed = metricInput.trim()
    if (pendingCategory.metricRequired && !trimmed) return
    const value = trimmed ? Number(trimmed) : null
    if (trimmed && (Number.isNaN(value) || value! < 0)) {
      showToast('Enter a valid number')
      return
    }
    doUpload(pendingCategory, value)
  }

  return (
    <BottomSheet open={open} onClose={handleClose}>
      <input ref={cameraInput} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
      <input ref={galleryInput} type="file" accept="image/*" className="hidden" onChange={handleFile} />

      {!blob ? (
        <div className="space-y-3">
          <button
            onClick={() => cameraInput.current?.click()}
            className="w-full rounded-2xl bg-accent py-5 text-lg font-semibold text-zinc-950"
          >
            Take photo
          </button>
          <button
            onClick={() => galleryInput.current?.click()}
            className="w-full rounded-2xl bg-surface-2 py-4 text-base font-medium text-ink"
          >
            Choose from gallery
          </button>
        </div>
      ) : pendingCategory ? (
        <div className="space-y-4">
          {previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="Preview" className="mx-auto max-h-64 rounded-2xl object-contain" />
          )}
          <div className="flex items-center gap-2">
            <span className="text-2xl">{pendingCategory.emoji}</span>
            <span className="text-sm font-medium text-ink">{pendingCategory.label}</span>
          </div>
          <label className="block rounded-2xl bg-surface-2 px-4 py-3">
            <span className="text-[10px] text-ink-muted">
              {METRIC_LABELS[pendingCategory.metricType as 'distance_km' | 'duration_min']}
              {pendingCategory.metricRequired ? '' : ' (optional)'}
            </span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              autoFocus
              value={metricInput}
              onChange={(e) => setMetricInput(e.target.value)}
              className="w-full bg-transparent text-lg text-ink focus:outline-none"
              placeholder="0"
            />
          </label>
          <div className="flex gap-2">
            <button
              disabled={uploading}
              onClick={() => setPendingCategory(null)}
              className="flex-1 rounded-2xl bg-surface-2 py-3.5 text-sm font-medium text-ink disabled:opacity-50"
            >
              Back
            </button>
            <button
              disabled={uploading || (pendingCategory.metricRequired && !metricInput.trim())}
              onClick={handleMetricSubmit}
              className="flex-1 rounded-2xl bg-accent py-3.5 text-sm font-semibold text-zinc-950 disabled:opacity-50"
            >
              {uploading ? 'Uploading…' : 'Add'}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="Preview" className="mx-auto max-h-64 rounded-2xl object-contain" />
          )}
          <div className="grid grid-cols-3 gap-3">
            {categories.map((c) => (
              <button
                key={c.id}
                disabled={uploading}
                onClick={() => handleCategory(c)}
                className="flex flex-col items-center gap-1 rounded-2xl bg-surface-2 py-4 disabled:opacity-50"
              >
                <span className="text-2xl">{c.emoji}</span>
                <span className="text-xs font-medium text-ink">{c.label}</span>
              </button>
            ))}
          </div>
          {uploading && <p className="text-center text-sm text-ink-muted">Uploading…</p>}
        </div>
      )}
    </BottomSheet>
  )
}
