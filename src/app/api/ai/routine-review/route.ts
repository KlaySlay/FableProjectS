import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { isRateLimited } from '@/lib/ai/rateLimit'
import { AI_MODEL, getAnthropic, parseModelJSON, responseText } from '@/lib/ai/anthropic'
import { isAIAllowed } from '@/lib/ai/allowList'
import type { RoutineReview } from '@/types'

const SYSTEM_PROMPT = `You are a supportive lifestyle coach reviewing someone's week of activity logs. Return ONLY valid JSON with no markdown:
{ "observations": [string, string, string], "verdict": string, "nudge": string }
The verdict must be under 20 words. The nudge must be under 15 words and motivational. Be warm and specific, not generic. Max 3 observations.`

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export async function POST(request: Request) {
  const supabase = getServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  if (!isAIAllowed(user.email)) {
    return NextResponse.json({ error: 'not_available' }, { status: 403 })
  }

  const force = (await request.json().catch(() => ({})))?.force === true

  // Cache valid for 24 hours (unless an explicit refresh)
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  if (!force) {
    const { data: cached } = await supabase
      .from('ai_sessions')
      .select('result')
      .eq('user_id', user.id)
      .eq('session_type', 'routine_review')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (cached?.result) return NextResponse.json(cached.result)
  }

  if (await isRateLimited(supabase, user.id)) {
    return NextResponse.json({ error: 'limit_reached' })
  }

  // Build the plain-text 7-day summary, e.g. "Mon: gym, meals(2). Tue: nothing."
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 6)
  const weekAgoKey = weekAgo.toISOString().slice(0, 10)

  const { data: photos } = await supabase
    .from('photos')
    .select('date, categories(slug)')
    .eq('user_id', user.id)
    .gte('date', weekAgoKey)

  const parts: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekAgo)
    d.setDate(weekAgo.getDate() + i)
    const key = d.toISOString().slice(0, 10)
    const dayPhotos = ((photos ?? []) as unknown as { date: string; categories: { slug: string } | null }[]).filter(
      (p) => p.date === key,
    )
    if (dayPhotos.length === 0) {
      parts.push(`${DAY_NAMES[d.getDay()]}: nothing.`)
    } else {
      const counts: Record<string, number> = {}
      for (const p of dayPhotos) {
        const slug = p.categories?.slug ?? 'other'
        counts[slug] = (counts[slug] ?? 0) + 1
      }
      const summary = Object.entries(counts)
        .map(([slug, n]) => (n > 1 ? `${slug}(${n})` : slug))
        .join(', ')
      parts.push(`${DAY_NAMES[d.getDay()]}: ${summary}.`)
    }
  }

  try {
    const message = await getAnthropic().messages.create({
      model: AI_MODEL,
      max_tokens: 400,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: parts.join(' ') }],
    })

    const result = parseModelJSON<RoutineReview>(responseText(message))

    await supabase.from('ai_sessions').insert({
      user_id: user.id,
      session_type: 'routine_review',
      context: { summary: parts.join(' ') },
      result,
    })

    return NextResponse.json(result)
  } catch (e) {
    console.error('Anthropic error:', e)
    return NextResponse.json({ error: 'ai_failed' }, { status: 502 })
  }
}
