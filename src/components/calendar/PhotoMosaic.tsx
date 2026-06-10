'use client'

import type { CalendarPhoto } from '@/types'

const THUMB_FILTER = 'brightness(0.87) saturate(0.92)'

function Thumb({ photo, userColor }: { photo: CalendarPhoto; userColor: string }) {
  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.src}
        alt=""
        loading="lazy"
        className="h-full w-full object-cover"
        style={{ filter: THUMB_FILTER }}
      />
      <span
        className="absolute bottom-0.5 right-0.5 h-[3px] w-[3px] rounded-full"
        style={{ backgroundColor: userColor }}
      />
    </div>
  )
}

export function PhotoMosaic({
  photos,
  userColors,
}: {
  photos: CalendarPhoto[]
  userColors: Record<string, string>
}) {
  const color = (p: CalendarPhoto) => userColors[p.userId] ?? '#a1a1aa'

  if (photos.length === 0) return null
  if (photos.length === 1) {
    return <Thumb photo={photos[0]} userColor={color(photos[0])} />
  }
  if (photos.length === 2) {
    return (
      <div className="grid h-full w-full grid-cols-2 gap-px">
        <Thumb photo={photos[0]} userColor={color(photos[0])} />
        <Thumb photo={photos[1]} userColor={color(photos[1])} />
      </div>
    )
  }
  if (photos.length === 3) {
    return (
      <div className="grid h-full w-full grid-cols-2 gap-px">
        <Thumb photo={photos[0]} userColor={color(photos[0])} />
        <div className="grid grid-rows-2 gap-px">
          <Thumb photo={photos[1]} userColor={color(photos[1])} />
          <Thumb photo={photos[2]} userColor={color(photos[2])} />
        </div>
      </div>
    )
  }
  const extra = photos.length - 4
  return (
    <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-px">
      {photos.slice(0, 4).map((p, i) => (
        <div key={p.id} className="relative">
          <Thumb photo={p} userColor={color(p)} />
          {i === 3 && extra > 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/55 text-[10px] font-semibold text-white">
              +{extra}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
