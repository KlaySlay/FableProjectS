import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { isRateLimited } from '@/lib/ai/rateLimit'
import { fetchImageAsBase64, getGemini, parseModelJSON } from '@/lib/ai/gemini'
import { isAIAllowed } from '@/lib/ai/allowList'
import type { MealAnalysis } from '@/types'

const SYSTEM_PROMPT = `You are a concise nutrition analyst. Given a meal photo, return ONLY valid JSON with no markdown:
{ "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number, "note": string }
Estimate for a single adult serving. The note must be under 12 words. If the photo is not food, return { "error": "not a meal" }.`

export async function POST(request: Request) {
  const supabase = getServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  if (!isAIAllowed(user.email)) {
    return NextResponse.json({ error: 'not_available' }, { status: 403 })
  }

  const { photoId } = await request.json().catch(() => ({}))
  if (!photoId) return NextResponse.json({ error: 'photoId required' }, { status: 400 })

  // Cache: existing session for this photo wins, no Anthropic call
  const { data: cached } = await supabase
    .from('ai_sessions')
    .select('result')
    .eq('photo_id', photoId)
    .eq('session_type', 'meal_analysis')
    .maybeSingle()
  if (cached?.result) return NextResponse.json(cached.result)

  if (await isRateLimited(supabase, user.id)) {
    return NextResponse.json({ error: 'limit_reached' })
  }

  const { data: photo } = await supabase
    .from('photos')
    .select('public_url')
    .eq('id', photoId)
    .maybeSingle()
  if (!photo) return NextResponse.json({ error: 'photo not found' }, { status: 404 })

  try {
    const image = await fetchImageAsBase64(photo.public_url)
    const response = await getGemini().generateContent({
      systemInstruction: SYSTEM_PROMPT,
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { mimeType: image.mimeType, data: image.data } },
          { text: 'Analyse this meal.' },
        ],
      }],
    })

    const result = parseModelJSON<MealAnalysis | { error: string }>(response.response.text())

    await supabase.from('ai_sessions').insert({
      user_id: user.id,
      photo_id: photoId,
      session_type: 'meal_analysis',
      result,
    })

    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'ai_failed' }, { status: 502 })
  }
}
