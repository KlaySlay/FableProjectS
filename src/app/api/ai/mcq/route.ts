import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import { isRateLimited } from '@/lib/ai/rateLimit'
import { AI_MODEL, fetchImageAsBase64, getAnthropic, parseModelJSON, responseText } from '@/lib/ai/anthropic'
import { isAIAllowed } from '@/lib/ai/allowList'
import type { MCQQuestion } from '@/types'

function systemPrompt(examName: string, subject: string) {
  return `You are a quiz generator for Indian competitive exam preparation. Given a photo of study material, the exam "${examName}", and the subject "${subject}", generate exactly 5 multiple-choice questions based on content visible in the photo. Return ONLY valid JSON with no markdown:
{ "questions": [ { "q": string, "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "correct": "A"|"B"|"C"|"D", "explanation": string } ] }
Each explanation must be under 20 words. If the photo is not study material, return { "error": "not study material" }.`
}

export async function POST(request: Request) {
  const supabase = getServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  if (!isAIAllowed(user.email)) {
    return NextResponse.json({ error: 'not_available' }, { status: 403 })
  }

  const { photoId, topicId } = await request.json().catch(() => ({}))
  if (!photoId || !topicId) {
    return NextResponse.json({ error: 'photoId and topicId required' }, { status: 400 })
  }

  // Cache: existing MCQ session for this photo
  const { data: cached } = await supabase
    .from('ai_sessions')
    .select('result')
    .eq('photo_id', photoId)
    .eq('session_type', 'mcq')
    .maybeSingle()
  if (cached?.result) return NextResponse.json(cached.result)

  if (await isRateLimited(supabase, user.id)) {
    return NextResponse.json({ error: 'limit_reached' })
  }

  const [{ data: photo }, { data: topic }] = await Promise.all([
    supabase.from('photos').select('public_url').eq('id', photoId).maybeSingle(),
    supabase.from('study_topics').select('exam_name, subject').eq('id', topicId).maybeSingle(),
  ])
  if (!photo) return NextResponse.json({ error: 'photo not found' }, { status: 404 })
  if (!topic) return NextResponse.json({ error: 'topic not found' }, { status: 404 })

  try {
    const image = await fetchImageAsBase64(photo.public_url)
    const message = await getAnthropic().messages.create({
      model: AI_MODEL,
      max_tokens: 2000,
      system: systemPrompt(topic.exam_name, topic.subject),
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: image.mediaType, data: image.data } },
            { type: 'text', text: 'Generate the quiz from this study material.' },
          ],
        },
      ],
    })

    const parsed = parseModelJSON<{ questions?: MCQQuestion[]; error?: string }>(responseText(message))

    if (parsed.error || !parsed.questions) {
      // Failed reads do not consume the photo's cache slot
      return NextResponse.json({ error: parsed.error ?? 'ai_failed' })
    }

    const { data: attempt, error: attemptError } = await supabase
      .from('mcq_attempts')
      .insert({ user_id: user.id, topic_id: topicId, photo_id: photoId, questions: parsed.questions })
      .select('id')
      .single()
    if (attemptError) throw attemptError

    const result = { questions: parsed.questions, attemptId: attempt.id }

    await supabase.from('ai_sessions').insert({
      user_id: user.id,
      photo_id: photoId,
      session_type: 'mcq',
      context: { topicId },
      result,
    })

    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'ai_failed' }, { status: 502 })
  }
}
