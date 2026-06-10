'use client'

import { useEffect, useState } from 'react'
import { getSupabase } from '@/lib/supabase/client'
import { useActiveUser } from '@/lib/hooks/useActiveUser'
import type { MCQQuestion, StudyTopic } from '@/types'

type Stats = {
  topic: StudyTopic
  attempts: number
  avgScore: number | null
  lastSession: string | null
  weakAreas: { question: string; misses: number }[]
}

export function StudyProgressCard() {
  const { user } = useActiveUser()
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    if (!user) return
    ;(async () => {
      const supabase = getSupabase()
      const { data: topics } = await supabase
        .from('study_topics')
        .select('id, exam_name, subject')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
      if (!topics || topics.length === 0) return
      const topic = topics[0]

      const { data: attempts } = await supabase
        .from('mcq_attempts')
        .select('questions, answers, score, created_at')
        .eq('user_id', user.id)
        .not('score', 'is', null)
        .order('created_at', { ascending: false })

      const rows = (attempts ?? []) as {
        questions: MCQQuestion[]
        answers: string[] | null
        score: number
        created_at: string
      }[]

      // Weak areas: questions answered incorrectly most often
      const misses: Record<string, number> = {}
      for (const attempt of rows) {
        if (!attempt.answers) continue
        attempt.questions.forEach((q, i) => {
          if (attempt.answers![i] && attempt.answers![i] !== q.correct) {
            misses[q.q] = (misses[q.q] ?? 0) + 1
          }
        })
      }
      const weakAreas = Object.entries(misses)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([question, count]) => ({ question, misses: count }))

      setStats({
        topic: { id: topic.id, examName: topic.exam_name, subject: topic.subject },
        attempts: rows.length,
        avgScore: rows.length > 0 ? rows.reduce((s, a) => s + a.score, 0) / rows.length : null,
        lastSession: rows[0]?.created_at ?? null,
        weakAreas,
      })
    })()
  }, [user])

  if (!stats) return null

  return (
    <div className="rounded-2xl bg-surface p-5">
      <h2 className="mb-1 text-base font-semibold text-ink">{stats.topic.examName}</h2>
      <p className="mb-3 text-xs text-ink-muted">{stats.topic.subject}</p>

      <div className="mb-3 flex gap-4 text-sm">
        <Stat label="Quizzes" value={String(stats.attempts)} />
        <Stat label="Avg score" value={stats.avgScore !== null ? `${stats.avgScore.toFixed(1)}/5` : '—'} />
        <Stat
          label="Last session"
          value={stats.lastSession ? new Date(stats.lastSession).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '—'}
        />
      </div>

      {stats.weakAreas.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-medium text-ink-muted">Weak areas</p>
          <ul className="space-y-1">
            {stats.weakAreas.map((w) => (
              <li key={w.question} className="truncate text-xs text-ink">
                <span className="text-rose-400">×{w.misses}</span> {w.question}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-base font-semibold text-ink">{value}</p>
      <p className="text-[10px] text-ink-muted">{label}</p>
    </div>
  )
}
