import 'server-only'

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'
export const GEMINI_MODEL = 'gemini-1.5-flash'

type Part = { text: string } | { inlineData: { mimeType: string; data: string } }

interface GeminiRequest {
  systemInstruction?: { parts: [{ text: string }] }
  contents: { role: string; parts: Part[] }[]
}

async function generateContent(body: GeminiRequest): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not set')

  const res = await fetch(`${GEMINI_API_BASE}/${GEMINI_MODEL}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini API error ${res.status}: ${err}`)
  }

  const data = await res.json() as {
    candidates: { content: { parts: { text: string }[] } }[]
  }
  return data.candidates[0].content.parts.map((p) => p.text).join('')
}

/** Text-only generation. */
export async function generateText(systemPrompt: string, userMessage: string): Promise<string> {
  return generateContent({
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: userMessage }] }],
  })
}

/** Vision generation — image + text. */
export async function generateWithImage(
  systemPrompt: string,
  image: { data: string; mimeType: string },
  userMessage: string,
): Promise<string> {
  return generateContent({
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{
      role: 'user',
      parts: [
        { inlineData: { mimeType: image.mimeType, data: image.data } },
        { text: userMessage },
      ],
    }],
  })
}

/** Fetch an image URL and return base64 for Gemini inline data. */
export async function fetchImageAsBase64(url: string): Promise<{ data: string; mimeType: string }> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`)
  const buffer = Buffer.from(await res.arrayBuffer())
  return { data: buffer.toString('base64'), mimeType: 'image/jpeg' }
}

/** Parse model output that should be bare JSON (tolerates stray markdown fences). */
export function parseModelJSON<T>(text: string): T {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/, '').replace(/```\s*$/, '')
  return JSON.parse(cleaned) as T
}
