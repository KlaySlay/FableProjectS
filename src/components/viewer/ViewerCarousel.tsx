'use client'

import { useRef, useState } from 'react'
import type { CalendarPhoto } from '@/types'

/**
 * Category-scoped swipe carousel. Horizontal drag shows the adjacent photo
 * live; downward-dominant drag past 80px dismisses.
 */
export function ViewerCarousel({
  photos,
  index,
  onIndexChange,
  onDismiss,
}: {
  photos: CalendarPhoto[]
  index: number
  onIndexChange: (i: number) => void
  onDismiss: () => void
}) {
  const [dragX, setDragX] = useState(0)
  const [dragY, setDragY] = useState(0)
  const start = useRef<{ x: number; y: number } | null>(null)
  const axis = useRef<'h' | 'v' | null>(null)

  function onTouchStart(e: React.TouchEvent) {
    start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    axis.current = null
  }

  function onTouchMove(e: React.TouchEvent) {
    if (!start.current) return
    const dx = e.touches[0].clientX - start.current.x
    const dy = e.touches[0].clientY - start.current.y
    if (!axis.current && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      axis.current = Math.abs(dy) > Math.abs(dx) ? 'v' : 'h'
    }
    if (axis.current === 'h') {
      // Resist past the ends
      const atStart = index === 0 && dx > 0
      const atEnd = index === photos.length - 1 && dx < 0
      setDragX(atStart || atEnd ? dx / 3 : dx)
    } else if (axis.current === 'v' && dy > 0) {
      setDragY(dy)
    }
  }

  function onTouchEnd() {
    if (axis.current === 'v' && dragY > 80) {
      onDismiss()
      return
    }
    if (axis.current === 'h') {
      const threshold = 60
      if (dragX < -threshold && index < photos.length - 1) onIndexChange(index + 1)
      else if (dragX > threshold && index > 0) onIndexChange(index - 1)
    }
    setDragX(0)
    setDragY(0)
    start.current = null
    axis.current = null
  }

  const width = typeof window !== 'undefined' ? window.innerWidth : 393

  return (
    <div
      className="relative h-full w-full touch-none overflow-hidden"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {photos.map((photo, i) => {
        const offset = (i - index) * width + dragX
        if (Math.abs(i - index) > 1) return null
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={photo.id}
            src={photo.src}
            alt=""
            draggable={false}
            className="absolute inset-0 h-full w-full object-contain"
            style={{
              transform: `translate(${offset}px, ${i === index ? dragY : 0}px)`,
              transition: dragX === 0 && dragY === 0 ? 'transform 0.2s ease-out' : 'none',
              opacity: i === index ? 1 - Math.min(dragY / 400, 0.5) : 1,
            }}
          />
        )
      })}
    </div>
  )
}
