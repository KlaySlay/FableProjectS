export type AppUser = {
  id: string
  username: string
  displayName: string
  avatarColor: string
  accentColor: string
  xp: number
}

export type Community = {
  id: string
  name: string
  inviteCode: string
  members: AppUser[]
  categories: Category[]
}

export type Category = {
  id: string
  communityId: string
  slug: string
  label: string
  emoji: string
  color: string
  sortOrder: number
}

export type Photo = {
  id: string
  userId: string
  communityId: string
  date: string            // "YYYY-MM-DD"
  categoryId: string
  publicUrl: string
  createdAt: string
}

export type CalendarPhoto = {
  id: string
  categoryId: string
  userId: string
  src: string
  categoryColor: string
}

export type XPLevel = {
  level: number
  label: string
  minXP: number
  maxXP: number
}

export type Badge = {
  id: string
  name: string
  description: string
  emoji: string
  conditionType: string
  unlockedAt?: string
}

export type MCQQuestion = {
  q: string
  options: string[]       // ["A) ...", "B) ...", "C) ...", "D) ..."]
  correct: 'A' | 'B' | 'C' | 'D'
  explanation: string
}

export type AISessionType = 'mcq' | 'meal_analysis' | 'routine_review' | 'workout_split'

export type MealAnalysis = {
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  note: string
}

export type RoutineReview = {
  observations: string[]
  verdict: string
  nudge: string
}

export type WorkoutSplitDay = {
  day: string
  focus: string
  exercises: string[]
}

export type StudyTopic = {
  id: string
  examName: string
  subject: string
}

export type ThemePreference = 'light' | 'dark' | 'system'
