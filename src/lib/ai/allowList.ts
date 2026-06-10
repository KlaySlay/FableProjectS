import 'server-only'

/**
 * Returns true if the email is allowed to use AI features.
 * Controlled by ALLOWED_AI_EMAILS env var — comma-separated list.
 * If the env var is empty or unset, AI is disabled for everyone.
 */
export function isAIAllowed(email: string | undefined): boolean {
  if (!email) return false
  const raw = process.env.ALLOWED_AI_EMAILS ?? ''
  if (!raw.trim()) return false
  const allowed = raw.split(',').map((e) => e.trim().toLowerCase())
  return allowed.includes(email.toLowerCase())
}
