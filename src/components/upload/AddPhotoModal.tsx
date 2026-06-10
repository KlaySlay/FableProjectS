'use client'

import { useRef, useState } from 'react'
import { BottomSheet } from '@/components/shared/BottomSheet'
import { useToast } from '@/components/shared/Toast'
import { resizeImage } from '@/lib/utils/imageUtils'
import { uploadPhoto } from '@/lib/supabase/photoStorage'
import { awardXP, checkAndAwardBadges } from '@/lib/supabase/xpStorage'
import { getPhotosForDate } from '@/lib/supabase/photoStorage'
import { dateKey } from '@/lib/utils/dateUtils'
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
  const { showToast } = useToast()

  function reset() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setBlob(null)
    setPreviewUrl(null)
    setUploading(false)
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

  async function handleCategory(category: Category) {
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
