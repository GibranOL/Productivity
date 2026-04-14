import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { getDayKey } from '../utils/date'

// ─── Constants ───────────────────────────────────────────────────────────────
// Sacred sleep window: 12AM (00:00) → 8AM (08:00)
export const SACRED_SLEEP_HOURS = 8
export const MIN_HEALTHY_SLEEP = 6
export const BATTERY_SAVER_THRESHOLD = 6 // hours below this → battery saver mode

export const MOODS = [
  { id: 'beast',      label: 'Beast Mode',   emoji: '🔥', color: 'var(--orange)' },
  { id: 'energized',  label: 'Energético',   emoji: '⚡', color: 'var(--green)' },
  { id: 'focused',    label: 'Enfocado',     emoji: '🎯', color: 'var(--teal)' },
  { id: 'calm',       label: 'Tranquilo',    emoji: '🧘', color: 'var(--purple)' },
  { id: 'neutral',    label: 'Neutral',      emoji: '😐', color: 'var(--text-mid)' },
  { id: 'tired',      label: 'Cansado',      emoji: '😴', color: 'var(--yellow)' },
  { id: 'stressed',   label: 'Estresado',    emoji: '😰', color: 'var(--orange)' },
  { id: 'anxious',    label: 'Ansioso',      emoji: '😣', color: 'var(--red)' },
  { id: 'frustrated', label: 'Frustrado',    emoji: '😤', color: 'var(--red)' },
]

export const MEDITATION_PRESETS = [
  { id: 'box',        label: 'Box Breathing',   pattern: 'box',        durations: [5, 10, 15] },
  { id: '478',        label: '4-7-8 Relax',     pattern: '478',        durations: [5, 10, 15] },
  { id: 'silence',    label: 'Silencio',        pattern: 'silence',    durations: [10, 20, 30] },
]

// ─── Utils ──────────────────────────────────────────────────────────────────

/**
 * Compute hours slept given bedtime + waketime as 'HH:MM' strings.
 * Handles overnight case (bedtime after noon, waketime next morning).
 */
export function computeSleepHours(bedtime, waketime) {
  if (!bedtime || !waketime) return 0
  const [bh, bm] = bedtime.split(':').map(Number)
  const [wh, wm] = waketime.split(':').map(Number)
  const bedMin  = bh * 60 + bm
  const wakeMin = wh * 60 + wm
  // If wakeTime is smaller, assume next day
  const diff = wakeMin >= bedMin ? wakeMin - bedMin : (24 * 60 - bedMin) + wakeMin
  return +(diff / 60).toFixed(2)
}

/** Past N date keys, oldest first. */
function pastDateKeys(n) {
  const keys = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    keys.push(getDayKey(d))
  }
  return keys
}

function isoMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

// ─── Store ──────────────────────────────────────────────────────────────────

const useWellnessStore = create(
  persist(
    (set, get) => ({
      // { 'YYYY-MM-DD' (wake date): { bedtime, waketime, hours, quality, wakeEnergy, note, loggedAt } }
      sleepLogs: {},
      // { 'YYYY-MM-DD': [{ mood, stress, note?, loggedAt }] }
      moodLogs: {},
      // { 'YYYY-MM-DD': [{ minutes, pattern, completedAt }] }
      meditationLogs: {},

      // ─── Sleep ────────────────────────────────────────────────────────────
      logSleep: ({ bedtime, waketime, quality = 3, wakeEnergy = 5, note = '', dateKey }) => {
        const key = dateKey || getDayKey()
        const hours = computeSleepHours(bedtime, waketime)
        set((state) => ({
          sleepLogs: {
            ...state.sleepLogs,
            [key]: {
              bedtime, waketime, hours, quality, wakeEnergy, note,
              loggedAt: new Date().toISOString(),
            },
          },
        }))
      },

      clearSleep: (dateKey) => {
        set((state) => {
          const next = { ...state.sleepLogs }
          delete next[dateKey || getDayKey()]
          return { sleepLogs: next }
        })
      },

      getTodaySleep: () => get().sleepLogs[getDayKey()] || null,

      getSleepLog: (dateKey) => get().sleepLogs[dateKey] || null,

      /** Array of 7 {dateKey, hours, quality} entries, oldest first. */
      getWeekSleep: () => {
        const logs = get().sleepLogs
        return pastDateKeys(7).map((k) => ({
          dateKey: k,
          hours: logs[k]?.hours ?? 0,
          quality: logs[k]?.quality ?? 0,
          wakeEnergy: logs[k]?.wakeEnergy ?? 0,
        }))
      },

      getAvgSleepThisWeek: () => {
        const week = get().getWeekSleep().filter((d) => d.hours > 0)
        if (!week.length) return 0
        const total = week.reduce((s, d) => s + d.hours, 0)
        return +(total / week.length).toFixed(1)
      },

      /** Last night was well-rested? */
      isWellRested: () => {
        const last = get().getTodaySleep()
        return !!last && last.hours >= MIN_HEALTHY_SLEEP
      },

      isBatterySaver: () => {
        const last = get().getTodaySleep()
        if (!last) return false
        return last.hours < BATTERY_SAVER_THRESHOLD
      },

      // ─── Mood ─────────────────────────────────────────────────────────────
      logMood: ({ mood, stress = 5, note = '', dateKey }) => {
        const key = dateKey || getDayKey()
        set((state) => {
          const existing = state.moodLogs[key] || []
          return {
            moodLogs: {
              ...state.moodLogs,
              [key]: [
                ...existing,
                { mood, stress, note, loggedAt: new Date().toISOString() },
              ],
            },
          }
        })
      },

      getTodayMood: () => {
        const today = get().moodLogs[getDayKey()] || []
        return today[today.length - 1] || null
      },

      /** Returns the "dominant" mood for a given date (last entry wins, simple). */
      getMoodFor: (dateKey) => {
        const arr = get().moodLogs[dateKey] || []
        return arr[arr.length - 1] || null
      },

      /** Heatmap for a given month: [{ dateKey, mood, stress }] (30-31 entries). */
      getMoodHeatmap: (year = new Date().getFullYear(), month = new Date().getMonth()) => {
        const daysInMonth = new Date(year, month + 1, 0).getDate()
        const logs = get().moodLogs
        const out = []
        for (let d = 1; d <= daysInMonth; d++) {
          const date = new Date(year, month, d)
          const k = getDayKey(date)
          const arr = logs[k] || []
          const last = arr[arr.length - 1] || null
          out.push({ dateKey: k, day: d, mood: last?.mood || null, stress: last?.stress ?? null })
        }
        return out
      },

      /** Avg stress for last 7 days (0 if no data). */
      getAvgStressThisWeek: () => {
        const logs = get().moodLogs
        const values = []
        pastDateKeys(7).forEach((k) => {
          const arr = logs[k] || []
          if (arr.length) values.push(arr[arr.length - 1].stress ?? 5)
        })
        if (!values.length) return 0
        return +(values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)
      },

      // ─── Meditation ───────────────────────────────────────────────────────
      logMeditation: ({ minutes, pattern = 'silence', dateKey }) => {
        const key = dateKey || getDayKey()
        set((state) => {
          const existing = state.meditationLogs[key] || []
          return {
            meditationLogs: {
              ...state.meditationLogs,
              [key]: [
                ...existing,
                { minutes, pattern, completedAt: new Date().toISOString() },
              ],
            },
          }
        })
      },

      getTodayMeditationMinutes: () => {
        const arr = get().meditationLogs[getDayKey()] || []
        return arr.reduce((s, m) => s + (m.minutes || 0), 0)
      },

      didMeditateToday: () => get().getTodayMeditationMinutes() > 0,

      /** Consecutive days (ending today or yesterday) with any meditation. */
      getMeditationStreak: () => {
        const logs = get().meditationLogs
        let streak = 0
        const now = new Date()
        // Allow for "today not done yet" — check yesterday if today empty
        let startOffset = 0
        const todayKey = getDayKey(now)
        if (!logs[todayKey] || !logs[todayKey].length) startOffset = 1
        for (let i = startOffset; i < 365; i++) {
          const d = new Date(now)
          d.setDate(d.getDate() - i)
          const k = getDayKey(d)
          if (logs[k] && logs[k].length) streak++
          else break
        }
        return streak
      },

      getWeekMeditationTotal: () => {
        const logs = get().meditationLogs
        return pastDateKeys(7).reduce((sum, k) => {
          const arr = logs[k] || []
          return sum + arr.reduce((s, m) => s + (m.minutes || 0), 0)
        }, 0)
      },

      // ─── Deep Work Readiness ──────────────────────────────────────────────
      /**
       * Returns { tier, label, color, reasons[] }
       *  beast    — sleep ≥ 7.5 AND meditated AND wakeEnergy ≥ 7 AND no high stress
       *  strong   — sleep ≥ 7
       *  normal   — sleep ≥ 6
       *  saver    — sleep < 6 (battery saver mode)
       *  unknown  — no sleep log
       */
      getDeepWorkReadiness: () => {
        const sleep = get().getTodaySleep()
        const meditated = get().didMeditateToday()
        const mood = get().getTodayMood()
        const highStress = mood && mood.stress >= 8

        if (!sleep) {
          return { tier: 'unknown', label: 'Sin registro', color: 'var(--text-dim)', reasons: ['Registra tu sueño para activar insights'] }
        }

        const reasons = []
        if (sleep.hours >= 7.5) reasons.push(`${sleep.hours}h de sueño`)
        if (meditated) reasons.push('Meditación completada')
        if (sleep.wakeEnergy >= 7) reasons.push(`Energía al despertar ${sleep.wakeEnergy}/10`)
        if (highStress) reasons.push(`⚠️ Estrés elevado (${mood.stress}/10)`)

        if (sleep.hours >= 7.5 && meditated && sleep.wakeEnergy >= 7 && !highStress) {
          return { tier: 'beast', label: 'QA Beast Mode', color: 'var(--orange)', reasons }
        }
        if (sleep.hours >= 7) {
          return { tier: 'strong', label: 'Listo para deep work', color: 'var(--green)', reasons: reasons.length ? reasons : [`${sleep.hours}h de sueño`] }
        }
        if (sleep.hours >= BATTERY_SAVER_THRESHOLD) {
          return {
            tier: 'normal', label: 'Operativo',
            color: 'var(--teal)',
            reasons: [`${sleep.hours}h — normal pero no óptimo`],
          }
        }
        return {
          tier: 'saver', label: 'Modo Ahorro',
          color: 'var(--red)',
          reasons: [`Solo ${sleep.hours}h de sueño — prioriza tareas ligeras y descanso`],
        }
      },
    }),
    {
      name: 'gibran-wellness-v1',
      version: 1,
      storage: createJSONStorage(() => localStorage),
    }
  )
)

export default useWellnessStore
