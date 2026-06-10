'use client'

import { createContext, useCallback, useContext, useRef, useState } from 'react'

type ToastContextValue = { showToast: (message: string) => void }

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} })

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = useCallback((msg: string) => {
    setMessage(msg)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setMessage(null), 3000)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {message && (
        <div
          className="animate-fade-in pointer-events-none fixed inset-x-0 z-[70] flex justify-center"
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + 88px)' }}
        >
          <div className="rounded-full bg-surface-2 px-5 py-3 text-sm font-medium text-ink shadow-lg">
            {message}
          </div>
        </div>
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
