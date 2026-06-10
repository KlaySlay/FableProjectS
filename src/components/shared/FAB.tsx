'use client'

export function FAB({ onClick }: { onClick: () => void }) {
  return (
    <button
      aria-label="Add photo"
      onClick={onClick}
      className="fixed left-1/2 z-40 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full bg-accent shadow-lg shadow-black/40 active:scale-95"
      style={{ bottom: 'calc(56px + env(safe-area-inset-bottom) + 16px)' }}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#09090b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
        <circle cx="12" cy="13" r="3" />
      </svg>
    </button>
  )
}
