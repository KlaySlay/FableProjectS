import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const url = request.nextUrl

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isAuthRoute = url.pathname.startsWith('/login')
  const isOnboarding = url.pathname.startsWith('/onboarding')
  const isJoin = url.pathname.startsWith('/join')
  const isApi = url.pathname.startsWith('/api')
  const isAuthCallback = url.pathname.startsWith('/auth/callback')

  if (!user) {
    if (isAuthRoute || isAuthCallback) return response
    if (isApi) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Signed in: check profile existence for app routes
  if (!isApi && !isOnboarding && !isJoin) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()
    if (!profile && !isAuthRoute) {
      return NextResponse.redirect(new URL('/onboarding', request.url))
    }
    if (profile && isAuthRoute) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|icon-.*\\.png|.*\\.svg).*)'],
}
