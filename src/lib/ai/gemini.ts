import 'server-only'
import { GoogleGenerativeAI } from '@google/generative-ai'

export const GEMINI_MODEL = 'gemini-2.0-flash'

let client: GoogleGenerativeAI | null = null

function getClient() {
  if (!client) client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  return client
}

export function getGemini() {
  return getClient().getGenerativeModel({ model: GEMINI_MODEL })
}

/** Fetch an image URL and return base64 for Gemini inline data. */
export async function fetchImageAsBase64(url: string): Promise<{ data: string; mimeType: 'image/jpeg' }> {
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
