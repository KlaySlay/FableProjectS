'use client'

import { useEffect, useState } from 'react'

export function OfflineBanner() {
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    setOffline(!navigator.onLine)
    const goOffline = () => setOffline(true)
    const goOnline = () => setOffline(false)
    window.addEventListener('offline', goOffline)
    window.addEventListener('online', goOnline)
    return () => {
      window.removeEventListener('offline', goOffline)
      window.removeEventListener('online', goOnline)
    }
  }, [])

  if (!offline) return null

  return (
    <div
      className="fixed inset-x-0 top-0 z-[80] bg-amber-500 px-4 py-2 text-center text-xs font-medium text-zinc-950"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 8px)' }}
    >
      You&apos;re offline — changes will sync when you reconnect.
    </div>
  )
}
