import webpush from 'web-push'

let configured = false

function ensureConfigured() {
  if (configured) return
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const email = process.env.VAPID_EMAIL
  if (!publicKey || !privateKey || !email) throw new Error('VAPID keys not configured')
  webpush.setVapidDetails(`mailto:${email}`, publicKey, privateKey)
  configured = true
}

export async function sendPush(
  subscription: webpush.PushSubscription,
  payload: { title: string; body: string },
) {
  ensureConfigured()
  await webpush.sendNotification(subscription, JSON.stringify(payload))
}
