'use client'

import { useEffect } from 'react'

export function BottomSheet({
  open,
  onClose,
  children,
  title,
}: {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
}) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <button
        aria-label="Close"
        className="animate-fade-in absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <div
        className="animate-sheet-up absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-edge bg-surface px-5 pt-3"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 20px)' }}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-surface-2" />
        {title && <h2 className="mb-4 text-lg font-semibold text-ink">{title}</h2>}
        {children}
      </div>
    </div>
  )
}
