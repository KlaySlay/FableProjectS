'use client'

export function NudgeBanner({
  streak,
  onDismiss,
}: {
  streak: number
  onDismiss: () => void
}) {
  const text = streak >= 2 ? `🔥 Day ${streak} streak — don't break it!` : 'Log something today 👀'
  return (
    <button
      onClick={onDismiss}
      className="animate-fade-in mx-4 mb-1 rounded-xl bg-surface-2 px-4 py-2.5 text-left text-sm font-medium text-ink"
    >
      {text}
    </button>
  )
}
