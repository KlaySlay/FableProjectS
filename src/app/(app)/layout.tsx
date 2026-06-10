'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ActiveUserProvider } from '@/lib/hooks/useActiveUser'
import { CommunityProvider } from '@/lib/hooks/useCommunity'
import { ThemeProvider } from '@/lib/hooks/useTheme'
import { ToastProvider } from '@/components/shared/Toast'
import { OfflineBanner } from '@/components/shared/OfflineBanner'

const TABS = [
  { href: '/', label: 'Calendar', icon: GridIcon },
  { href: '/coach', label: 'Coach', icon: SparkleIcon },
  { href: '/community', label: 'Community', icon: UsersIcon },
  { href: '/profile', label: 'Profile', icon: UserIcon },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <ActiveUserProvider>
      <CommunityProvider>
        <ThemeProvider>
          <ToastProvider>
            <OfflineBanner />
            <div className="relative min-h-[100dvh] bg-bg">
              <div style={{ paddingBottom: 'calc(56px + env(safe-area-inset-bottom))' }}>
                {children}
              </div>
              <nav
                className="fixed inset-x-0 bottom-0 z-40 border-t border-edge"
                style={{
                  height: 'calc(56px + env(safe-area-inset-bottom))',
                  paddingBottom: 'env(safe-area-inset-bottom)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  backgroundColor: 'color-mix(in srgb, var(--bg) 75%, transparent)',
                }}
              >
                <div className="flex h-14 items-stretch justify-around">
                  {TABS.map((tab) => {
                    const active =
                      tab.href === '/' ? pathname === '/' || pathname.startsWith('/day') : pathname.startsWith(tab.href)
                    return (
                      <Link
                        key={tab.href}
                        href={tab.href}
                        className="flex flex-1 flex-col items-center justify-center gap-0.5"
                        style={{ color: active ? 'var(--accent)' : 'var(--text-muted)' }}
                      >
                        <tab.icon />
                        <span className="text-[10px] font-medium">{tab.label}</span>
                      </Link>
                    )
                  })}
                </div>
              </nav>
            </div>
          </ToastProvider>
        </ThemeProvider>
      </CommunityProvider>
    </ActiveUserProvider>
  )
}

function GridIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  )
}

function SparkleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.9 5.7L19.6 10l-5.7 1.9L12 17.6l-1.9-5.7L4.4 10l5.7-1.9L12 3z" />
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function UserIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  )
}
