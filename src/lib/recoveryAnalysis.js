// ─── Recovery Analysis Engine ────────────────────────────────────────────────
// Cross-references wellness data (sleep/mood/meditation) with gym & productivity
// to produce insights for Cortana and the dashboard.

import useWellnessStore, { MOODS, BATTERY_SAVER_THRESHOLD } from '../store/wellnessStore'
import useGymStore, { GYM_DAYS } from '../store/gymStore'
import useStore from '../store/index'
import { getDayKey } from '../utils/date'

const MOOD_BY_ID = MOODS.reduce((acc, m) => { acc[m.id] = m; return acc }, {})

/**
 * Build wellness context for Cortana's system prompt.
 * Returns { sleepStatus, moodStatus, meditationStatus, readiness, batterySaver, alerts[], summary, insights[] }
 */
export function getWellnessContext() {
  const w = useWellnessStore.getState()

  const sleep = w.getTodaySleep()
  const readiness = w.getDeepWorkReadiness()
  const mood = w.getTodayMood()
  const medMin = w.getTodayMeditationMinutes()
  const streak = w.getMeditationStreak()
  const avgSleep = w.getAvgSleepThisWeek()
  const avgStress = w.getAvgStressThisWeek()

  // ─── Status strings ─────────────────────────────────────────────
  let sleepStatus
  if (!sleep) sleepStatus = 'Sueño: sin registrar hoy'
  else sleepStatus = `Sueño: ${sleep.hours}h (calidad ${sleep.quality}/5, energía al despertar ${sleep.wakeEnergy}/10)`

  let moodStatus
  if (!mood) moodStatus = 'Humor: sin registrar'
  else {
    const m = MOOD_BY_ID[mood.mood]
    moodStatus = `Humor: ${m?.label || mood.mood} ${m?.emoji || ''} — Estrés ${mood.stress}/10`
    if (mood.note) moodStatus += ` (nota: "${mood.note.slice(0, 80)}")`
  }

  const meditationStatus = medMin > 0
    ? `Meditación: ${medMin} min hoy (racha ${streak}d)`
    : streak > 0
      ? `Meditación: pendiente hoy (racha ${streak}d — no la rompas)`
      : 'Meditación: pendiente hoy'

  // ─── Alerts ─────────────────────────────────────────────────────
  const alerts = []
  const batterySaver = !!sleep && sleep.hours < BATTERY_SAVER_THRESHOLD

  if (batterySaver) {
    alerts.push(`MODO AHORRO: Solo ${sleep.hours}h de sueño. Mueve deep work a la tarde y considera siesta breve.`)
  }
  if (mood && mood.stress >= 8) {
    alerts.push(`Estrés elevado (${mood.stress}/10). Considera pausa activa, caminar o meditación antes del siguiente bloque.`)
  }
  if (avgSleep > 0 && avgSleep < BATTERY_SAVER_THRESHOLD) {
    alerts.push(`Promedio semanal de sueño: ${avgSleep}h — bajo crónico. Riesgo de burnout.`)
  }
  if (avgStress >= 7) {
    alerts.push(`Estrés promedio semanal: ${avgStress}/10. Patrón de estrés sostenido.`)
  }

  // ─── Cross-data insights ────────────────────────────────────────
  const insights = getCorrelationInsights()

  return {
    sleepStatus,
    moodStatus,
    meditationStatus,
    readiness: readiness.label,
    readinessTier: readiness.tier,
    batterySaver,
    avgSleep,
    avgStress,
    meditationStreak: streak,
    alerts,
    insights,
    summary: [sleepStatus, moodStatus, meditationStatus].join(' | '),
  }
}

/**
 * Analyze correlations over the last 7 days between:
 * - low sleep (<6h) ↔ high stress (≥7) ↔ missed gym ↔ low focus completion
 * Returns array of human-readable insight strings.
 */
export function getCorrelationInsights() {
  const w = useWellnessStore.getState()
  const g = useGymStore.getState()
  const s = useStore.getState()

  const now = new Date()
  const insights = []

  // Collect 7-day data
  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const k = getDayKey(d)
    const sleep = w.sleepLogs[k]
    const moodArr = w.moodLogs[k] || []
    const latestMood = moodArr[moodArr.length - 1]
    const gymLog = g.workoutLogs?.[k]
    const dayLog = s.logs[k]
    const isGymDay = GYM_DAYS.includes(d.getDay())

    days.push({
      dateKey: k,
      dow: d.getDay(),
      sleepHours: sleep?.hours ?? null,
      stress: latestMood?.stress ?? null,
      mood: latestMood?.mood ?? null,
      gymCompleted: !!gymLog?.completedAt,
      isGymDay,
      missedGym: isGymDay && !gymLog?.completedAt,
      focusBlocksDone: (dayLog?.focusBlocks || []).filter((b) => b.done).length,
    })
  }

  const lowSleepDays  = days.filter((d) => d.sleepHours !== null && d.sleepHours < BATTERY_SAVER_THRESHOLD)
  const highStressDays = days.filter((d) => d.stress !== null && d.stress >= 7)
  const missedGymDays = days.filter((d) => d.missedGym)

  // Correlation 1: low sleep → missed gym
  if (lowSleepDays.length >= 2) {
    const overlap = lowSleepDays.filter((d) => d.missedGym).length
    if (overlap >= 2) {
      insights.push(`Patrón detectado: ${overlap} de tus ${lowSleepDays.length} días con poco sueño coincidieron con gym no registrado.`)
    }
  }

  // Correlation 2: low sleep → high stress
  const lowSleepAndStress = lowSleepDays.filter((d) => d.stress !== null && d.stress >= 7).length
  if (lowSleepAndStress >= 2) {
    insights.push(`${lowSleepAndStress} días con <6h de sueño Y estrés alto — el círculo vicioso clásico.`)
  }

  // Correlation 3: low sleep → fewer focus blocks
  const daysWithSleep = days.filter((d) => d.sleepHours !== null)
  if (daysWithSleep.length >= 3) {
    const goodSleep = daysWithSleep.filter((d) => d.sleepHours >= 7)
    const badSleep  = daysWithSleep.filter((d) => d.sleepHours < BATTERY_SAVER_THRESHOLD)
    if (goodSleep.length && badSleep.length) {
      const avgGood = goodSleep.reduce((s, d) => s + d.focusBlocksDone, 0) / goodSleep.length
      const avgBad  = badSleep.reduce((s, d) => s + d.focusBlocksDone, 0) / badSleep.length
      if (avgGood - avgBad >= 1) {
        insights.push(`Días con sueño ≥7h: ${avgGood.toFixed(1)} bloques de foco promedio. Días con <6h: ${avgBad.toFixed(1)}. El sueño está pagando.`)
      }
    }
  }

  // Correlation 4: stress streak
  if (highStressDays.length >= 3) {
    insights.push(`${highStressDays.length}/7 días con estrés ≥7. Considera bajar intensidad de gym o pedir pausa al manager.`)
  }

  // Correlation 5: meditation consistency boost
  const weekMedTotal = w.getWeekMeditationTotal()
  if (weekMedTotal >= 60 && w.getAvgStressThisWeek() < 6) {
    insights.push(`${weekMedTotal} min de meditación esta semana con estrés promedio <6. La práctica está funcionando.`)
  }

  return insights
}

/** Quick boolean: is Gibran in battery-saver mode right now? */
export function isInBatterySaverMode() {
  const sleep = useWellnessStore.getState().getTodaySleep()
  return !!sleep && sleep.hours < BATTERY_SAVER_THRESHOLD
}
