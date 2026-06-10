import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function getServerSupabase() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // setAll called from a Server Component — safe to ignore when
            // middleware refreshes sessions.
          }
        },
      },
    },
  )
}

/** Authenticate an API route request. Returns the user id or null. */
export async function getAuthedUserId(): Promise<string | null> {
  const supabase = getServerSupabase()
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}
