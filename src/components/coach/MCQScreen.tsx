'use client'

import { useEffect, useState } from 'react'
import { BottomSheet } from '@/components/shared/BottomSheet'
import { getSupabase } from '@/lib/supabase/client'
import { awardXP, checkAndAwardBadges } from '@/lib/supabase/xpStorage'
import { useActiveUser } from '@/lib/hooks/useActiveUser'
import type { MCQQuestion, StudyTopic } from '@/types'

type FlowState =
  | { step: 'prompt' }
  | { step: 'topic-setup' }
  | { step: 'generating' }
  | { step: 'quiz'; attemptId: string; questions: MCQQuestion[] }
  | { step: 'error'; message: string }

/**
 * Full study-quiz flow: prompt sheet → (one-time topic setup) → generation →
 * fullscreen quiz → score summary.
 */
export function MCQFlow({ photoId, onClose }: { photoId: string; onClose: () => void }) {
  const { user, refreshUser } = useActiveUser()
  const [state, setState] = useState<FlowState>({ step: 'prompt' })
  const [topics, setTopics] = useState<StudyTopic[] | null>(null)
  const [examName, setExamName] = useState('')
  const [subject, setSubject] = useState('')

  useEffect(() => {
    if (!user) return
    getSupabase()
      .from('study_topics')
      .select('id, exam_name, subject')
      .eq('user_id', user.id)
      .then(({ data }) =>
        setTopics(
          ((data ?? []) as { id: string; exam_name: string; subject: string }[]).map((t) => ({
            id: t.id,
            examName: t.exam_name,
            subject: t.subject,
          })),
        ),
      )
  }, [user])

  async function startGeneration(topicId: string) {
    setState({ step: 'generating' })
    try {
      const res = await fetch('/api/ai/mcq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoId, topicId }),
      })
      const data = await res.json()
      if (data.error === 'limit_reached') {
        setState({ step: 'error', message: "You've used all 3 AI credits today. Come back tomorrow." })
      } else if (data.error === 'not study material') {
        setState({ step: 'error', message: "Couldn't read the notes clearly. Try better lighting." })
      } else if (data.error || !data.questions) {
        setState({ step: 'error', message: "Couldn't connect. Try again later." })
      } else {
        setState({ step: 'quiz', attemptId: data.attemptId, questions: data.questions })
      }
    } catch {
      setState({ step: 'error', message: "Couldn't connect. Try again later." })
    }
  }

  async function handleYes() {
    if (topics === null) return
    if (topics.length === 0) {
      setState({ step: 'topic-setup' })
    } else {
      startGeneration(topics[0].id)
    }
  }

  async function saveTopicAndStart() {
    if (!user || !examName.trim() || !subject.trim()) return
    const { data, error } = await getSupabase()
      .from('study_topics')
      .insert({ user_id: user.id, exam_name: examName.trim(), subject: subject.trim() })
      .select()
      .single()
    if (error || !data) {
      setState({ step: 'error', message: "Couldn't save the topic. Try again." })
      return
    }
    startGeneration(data.id)
  }

  async function handleQuizDone(score: number, answers: string[], attemptId: string) {
    if (!user) return
    await getSupabase().from('mcq_attempts').update({ answers, score }).eq('id', attemptId)
    await awardXP(user.id, 'mcq_complete', { attemptId })
    if (score === 5) await awardXP(user.id, 'mcq_perfect', { attemptId })
    checkAndAwardBadges(user.id).catch(() => {})
    refreshUser()
  }

  if (state.step === 'quiz') {
    return (
      <MCQScreen
        questions={state.questions}
        onComplete={(score, answers) => handleQuizDone(score, answers, state.attemptId)}
        onClose={onClose}
      />
    )
  }

  return (
    <BottomSheet open onClose={onClose}>
      {state.step === 'prompt' && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-ink">Want a quick quiz?</h2>
          <p className="text-sm text-ink-muted">5 questions generated from your study photo.</p>
          <button onClick={handleYes} className="w-full rounded-2xl bg-accent py-4 font-semibold text-zinc-950">
            Yes, generate
          </button>
          <button onClick={onClose} className="w-full py-2 text-sm text-ink-muted">
            Not now
          </button>
        </div>
      )}

      {state.step === 'topic-setup' && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-ink">First, your study prep</h2>
          <input
            placeholder="What exam are you preparing for?"
            value={examName}
            onChange={(e) => setExamName(e.target.value)}
            className="w-full rounded-2xl border border-edge bg-surface-2 px-4 py-3.5 text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
          />
          <input
            placeholder="What subject is this session?"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full rounded-2xl border border-edge bg-surface-2 px-4 py-3.5 text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
          />
          <button
            onClick={saveTopicAndStart}
            disabled={!examName.trim() || !subject.trim()}
            className="w-full rounded-2xl bg-accent py-4 font-semibold text-zinc-950 disabled:opacity-60"
          >
            Continue
          </button>
        </div>
      )}

      {state.step === 'generating' && (
        <div className="py-8 text-center">
          <p className="text-sm text-ink-muted">Generating your quiz…</p>
        </div>
      )}

      {state.step === 'error' && (
        <div className="space-y-4 py-4 text-center">
          <p className="text-sm text-ink-muted">{state.message}</p>
          <button onClick={onClose} className="w-full rounded-2xl bg-surface-2 py-3 font-medium text-ink">
            Close
          </button>
        </div>
      )}
    </BottomSheet>
  )
}

export function MCQScreen({
  questions,
  onComplete,
  onClose,
}: {
  questions: MCQQuestion[]
  onComplete: (score: number, answers: string[]) => void
  onClose: () => void
}) {
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<string[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [finished, setFinished] = useState(false)
  const [reported, setReported] = useState(false)

  const question = questions[index]
  const score = answers.filter((a, i) => a === questions[i].correct).length

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  useEffect(() => {
    if (finished && !reported) {
      setReported(true)
      onComplete(score, answers)
    }
  }, [finished, reported, score, answers, onComplete])

  function pick(letter: string) {
    if (selected) return
    setSelected(letter)
    setAnswers((prev) => [...prev, letter])
  }

  function next() {
    if (index + 1 >= questions.length) {
      setFinished(true)
    } else {
      setIndex((i) => i + 1)
      setSelected(null)
    }
  }

  if (finished) {
    const xp = 20 + (score === 5 ? 15 : 0)
    return (
      <div className="animate-fade-in fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/90 px-8 text-center">
        <p className="mb-2 text-4xl">🎯</p>
        <h2 className="mb-1 text-3xl font-bold text-white">You got {score}/5</h2>
        <p className="mb-8 text-sm text-zinc-400">
          +20 XP for completing{score === 5 ? ' · +15 XP perfect score' : ''} — {xp} XP total
        </p>
        <button onClick={onClose} className="rounded-2xl bg-accent px-12 py-4 font-semibold text-zinc-950">
          Done
        </button>
      </div>
    )
  }

  return (
    <div className="animate-fade-in fixed inset-0 z-[60] flex flex-col bg-black/95 px-6 py-10">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-medium text-zinc-400">
          Question {index + 1} of {questions.length}
        </p>
        <div className="flex gap-1.5">
          {questions.map((_, i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: i <= index ? 'var(--accent)' : '#3f3f46' }}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-center">
        <h2 className="mb-8 text-center text-xl font-semibold leading-snug text-white">{question.q}</h2>
        <div className="space-y-3">
          {question.options.map((option) => {
            const letter = option.trim().charAt(0)
            const isCorrect = letter === question.correct
            const isPicked = selected === letter
            let bg = '#18181b'
            let border = '#27272a'
            if (selected) {
              if (isCorrect) {
                bg = '#14532d'
                border = '#22c55e'
              } else if (isPicked) {
                bg = '#7f1d1d'
                border = '#ef4444'
              }
            }
            return (
              <button
                key={option}
                onClick={() => pick(letter)}
                className="w-full rounded-2xl border px-5 py-4 text-left text-sm font-medium text-white"
                style={{ backgroundColor: bg, borderColor: border }}
              >
                {option}
              </button>
            )
          })}
        </div>
        {selected && (
          <p className="mt-4 text-center text-xs text-zinc-400">{question.explanation}</p>
        )}
      </div>

      {selected && (
        <button onClick={next} className="rounded-2xl bg-accent py-4 font-semibold text-zinc-950">
          {index + 1 >= questions.length ? 'See score' : 'Next'}
        </button>
      )}
    </div>
  )
}
