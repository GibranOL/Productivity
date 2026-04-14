import useDietStore from '../store/dietStore'
import useGymStore, { SPLIT_SCHEDULE, GYM_DAYS } from '../store/gymStore'

/**
 * Build health context string for Cortana's system prompt.
 * Called from CortanaSidebar.buildContext()
 */
export function getHealthContext() {
  const dietState = useDietStore.getState()
  const gymState = useGymStore.getState()

  const now = new Date()
  const dow = now.getDay()
  const hour = now.getHours()

  // ─── Medication ─────────────────────────────────────────────
  const meds = dietState.getTodayMeds()
  const amOverdue = dietState.isMedOverdue('am')
  const pmOverdue = dietState.isMedOverdue('pm')

  let medStatus = ''
  if (meds.am && meds.pm) {
    medStatus = 'Anticoagulante AM: OK, PM: OK'
  } else {
    const amStr = meds.am ? 'OK' : (amOverdue ? 'PENDIENTE (pasado de hora)' : 'Pendiente')
    const pmStr = meds.pm ? 'OK' : (pmOverdue ? 'PENDIENTE (pasado de hora)' : 'Pendiente')
    medStatus = `Anticoagulante AM: ${amStr}, PM: ${pmStr}`
  }

  // ─── Meals ──────────────────────────────────────────────────
  const mealsConsumed = dietState.getMealsConsumedCount()
  const mealStatus = `Comidas: ${mealsConsumed}/6 consumidas`

  // ─── Hydration ──────────────────────────────────────────────
  const hydration = dietState.getTodayHydration()
  const hydrationStatus = `Agua: ${hydration.current}L / ${hydration.goal}L`

  // ─── Gym ────────────────────────────────────────────────────
  const isGymDay = GYM_DAYS.includes(dow)
  const todaySplit = SPLIT_SCHEDULE[dow]
  const todayWorkout = gymState.getTodayLog()
  const missedGym = gymState.didMissGymToday()
  const streak = gymState.getGymStreak()
  const weeklyVol = gymState.getWeeklyVolume()

  let gymStatus = ''
  if (!isGymDay) {
    gymStatus = 'Hoy: Dia de descanso gym'
  } else if (todayWorkout?.completedAt) {
    const vol = gymState.getWorkoutVolume(now.toISOString().slice(0, 10))
    gymStatus = `Gym completado: ${todaySplit?.label || 'Entrenamiento'} — Vol: ${Math.round(vol/1000)}k kg`
  } else if (todayWorkout) {
    gymStatus = `Gym en progreso: ${todaySplit?.label || 'Entrenamiento'}`
  } else if (missedGym) {
    gymStatus = `⚠️ Gym NO registrado hoy (${todaySplit?.label || 'pendiente'})`
  } else {
    gymStatus = `Gym pendiente: ${todaySplit?.label || 'por empezar'} (12:30-4 PM)`
  }

  // ─── Alerts ─────────────────────────────────────────────────
  const alerts = []
  if (amOverdue) alerts.push('ALERTA: Anticoagulante AM no tomado')
  if (pmOverdue) alerts.push('ALERTA: Anticoagulante PM no tomado')
  if (missedGym) alerts.push(`Gym no registrado hoy (${todaySplit?.label})`)
  if (hydration.current < hydration.goal * 0.5 && hour >= 14) {
    alerts.push(`Hidratacion baja (${hydration.current}L de ${hydration.goal}L y ya son las ${hour}:00)`)
  }

  return {
    medStatus,
    mealStatus,
    hydrationStatus,
    gymStatus,
    gymStreak: streak,
    weeklyVolume: weeklyVol,
    alerts,
    summary: [medStatus, mealStatus, hydrationStatus, gymStatus].join(' | '),
  }
}

/**
 * Check if any health alerts need immediate attention.
 * Returns array of critical alert strings.
 */
export function getCriticalAlerts() {
  const ctx = getHealthContext()
  return ctx.alerts.filter((a) => a.startsWith('ALERTA'))
}
