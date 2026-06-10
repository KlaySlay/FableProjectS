import 'server-only'
import Anthropic from '@anthropic-ai/sdk'

export const AI_MODEL = 'claude-sonnet-4-20250514'

let client: Anthropic | null = null

export function getAnthropic(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return client
}

/** Fetch an image URL server-side and return base64 + media type for the messages array. */
export async function fetchImageAsBase64(
  url: string,
): Promise<{ data: string; mediaType: 'image/jpeg' }> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`)
  const buffer = Buffer.from(await res.arrayBuffer())
  return { data: buffer.toString('base64'), mediaType: 'image/jpeg' }
}

/** Extract the text content of a non-streaming response. */
export function responseText(message: Anthropic.Message): string {
  return message.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('')
}

/** Parse model output that should be bare JSON (tolerates stray markdown fences). */
export function parseModelJSON<T>(text: string): T {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/, '').replace(/```\s*$/, '')
  return JSON.parse(cleaned) as T
}
