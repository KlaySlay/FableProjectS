# Project S

A shared visual accountability journal — a mobile-first PWA where you and your people log gym sessions, meals, and study time by taking photos. Built with Next.js 14, Tailwind CSS v4, Supabase, and the Anthropic Claude API.

## Setup (do these in order)

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** and run the entire contents of [`supabase/schema.sql`](supabase/schema.sql). This creates all tables, RLS policies, RPCs, the `photos` storage bucket, badge seeds, and Realtime publications.
3. In **Authentication → Providers**, make sure **Email** is enabled (magic link is used; no passwords).
4. In **Authentication → URL Configuration**, set the Site URL to your deployment URL (and `http://localhost:3000` for local dev under Redirect URLs).

### 2. Environment variables

Copy `.env.local.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=        # Project Settings → API → Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # Project Settings → API → anon public key
ANTHROPIC_API_KEY=               # console.anthropic.com — server-side only
```

### 3. Run

```
npm install
npm run dev
```

Open http://localhost:3000 — you'll be redirected to the login screen. Enter your email, click the magic link, complete the 3-step onboarding, and you land on the calendar.

### 4. Deploy (Vercel)

Push to GitHub, import the repo in Vercel, add the three environment variables in the Vercel dashboard, and deploy. Auto-deploys on push to `main`.

## What's inside

- **Calendar** — full-viewport monthly grid; each day shows a photo mosaic plus a conic-gradient category ring. Realtime: other members' uploads appear live.
- **Day view** — photos grouped by category, fullscreen swipe viewer, bulk delete, category editing, per-meal AI analysis.
- **Upload** — camera or gallery → canvas compression (max 1080px, JPEG 0.8) → Supabase Storage.
- **Coach tab** — AI routine review, workout split generator, study progress, weekly XP chart. 3 AI credits per user per day, enforced server-side with caching.
- **MCQ quizzes** — upload a study photo, get a 5-question quiz generated from it.
- **Community tab** — activity feed (Realtime), weekly XP leaderboard, invite codes, admin category management.
- **Profile** — XP levels, streaks, badge grid, settings (theme, accent colour, study topics).

## Architecture notes

- `src/lib/supabase/photoStorage.ts` is the only file that touches Supabase Storage or the `photos` table.
- `CalendarPhoto` (`src/types/index.ts`) is the universal rendering type — no component receives raw DB rows.
- All four AI routes (`src/app/api/ai/*`) validate the session, check the daily rate limit, and check the cache before calling Anthropic. The API key never reaches the client.
- XP and streaks are computed from `xp_events` / `photos` on read; only `profiles.xp` is materialised.
