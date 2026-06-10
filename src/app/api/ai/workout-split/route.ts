import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { isRateLimited } from '@/lib/ai/rateLimit'
import { AI_MODEL, getAnthropic, parseModelJSON, responseText } from '@/lib/ai/anthropic'
import { isAIAllowed } from '@/lib/ai/allowList'
import type { WorkoutSplitDay } from '@/types'

const VALID_DAYS = [3, 4, 5, 6]
const VALID_GOALS = ['strength', 'fat_loss', 'build_muscle']

function systemPrompt(daysPerWeek: number, goal: string) {
  return `You are a fitness coach. Return ONLY valid JSON with no markdown:
{ "split": [ { "day": string, "focus": string, "exercises": [string, string, string] } ] }
Generate a ${daysPerWeek}-day-per-week programme for goal: ${goal}. Only include training days (no rest days in the array). Max 3 exercises per day. Exercise names should be clear and concise.`
}

export async function POST(request: Request) {
  const supabase = getServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { daysPerWeek, goal } = await request.json().catch(() => ({}))
  if (!isAIAllowed(user.email)) {
    return NextResponse.json({ error: 'not_available' }, { status: 403 })
  }

  if (!VALID_DAYS.includes(daysPerWeek) || !VALID_GOALS.includes(goal)) {
    return NextResponse.json({ error: 'invalid parameters' }, { status: 400 })
  }

  if (await isRateLimited(supabase, user.id)) {
    return NextResponse.json({ error: 'limit_reached' })
  }

  try {
    const message = await getAnthropic().messages.create({
      model: AI_MODEL,
      max_tokens: 800,
      system: systemPrompt(daysPerWeek, goal),
      messages: [{ role: 'user', content: 'Generate my training split.' }],
    })

    const result = parseModelJSON<{ split: WorkoutSplitDay[] }>(responseText(message))

    await supabase.from('ai_sessions').insert({
      user_id: user.id,
      session_type: 'workout_split',
      context: { daysPerWeek, goal },
      result,
    })

    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'ai_failed' }, { status: 502 })
  }
}
