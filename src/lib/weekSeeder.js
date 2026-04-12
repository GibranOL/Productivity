/**
 * Week Seeder — generates a standard week of events for Gibran's schedule.
 * Called when the calendar is empty to bootstrap with a default schedule.
 */
import { EVENT_TYPES } from './appwriteCollections'
import { startOfWeek, addDays, format } from 'date-fns'
import { fromZonedTime } from 'date-fns-tz'
import { TZ } from './dateUtils'

const GYM_DAYS = [1, 2, 3, 5, 6] // Mon, Tue, Wed, Fri, Sat (0=Sun)
const TAROT_DAYS = [2, 4, 6]       // Tue, Thu, Sat

// Project assignments per day of week (1=Mon)
const DAY_PROJECTS = {
  1: 'TrueNorth Pathways',
  2: 'Job Search',
  3: 'TrueNorth Pathways',
  4: 'Job Search',
  5: 'Flex',
  6: 'Tarot App',
}

/**
 * Convert Vancouver local time to UTC ISO string.
 * @param {Date} baseDate - the day (in local tz)
 * @param {number} hours
 * @param {number} minutes
 */
function localToUTC(baseDate, hours, minutes = 0) {
  const local = new Date(baseDate)
  local.setHours(hours, minutes, 0, 0)
  return fromZonedTime(local, TZ).toISOString()
}

/**
 * Generate events for multiple weeks starting from Monday of current week.
 * @param {string} userId - Appwrite user ID
 * @param {number} weeks - number of weeks to generate (default 4)
 * @returns {Array} array of event objects ready for calendarEventStore.addEvent()
 */
export function generateWeekEvents(userId, weeks = 4) {
  const now = new Date()
  const monday = startOfWeek(now, { weekStartsOn: 1 })
  const events = []

  for (let dayOffset = 0; dayOffset < 7 * weeks; dayOffset++) {
    const date = addDays(monday, dayOffset)
    const dow = date.getDay() // 0=Sun, 1=Mon...
    const dayLabel = format(date, 'EEEE')

    // ─── Focus Block 1: 9:00-10:30 (Mon-Sat) ──────────────
    if (dow >= 1 && dow <= 6) {
      const project = DAY_PROJECTS[dow] || 'Flex'
      events.push({
        userId,
        type: EVENT_TYPES.PROJECT_BLOCK,
        title: project,
        subtitle: 'Bloque 1 — Cortisol Peak',
        startDate: localToUTC(date, 9, 0),
        endDate: localToUTC(date, 10, 30),
        icon: '🎯',
        color: 'var(--teal)',
        status: 'pending',
        metadata: { blockIndex: 0, project },
      })
    }

    // ─── Focus Block 2: 11:00-12:30 (Mon-Sat) ─────────────
    if (dow >= 1 && dow <= 6) {
      const project = DAY_PROJECTS[dow] || 'Flex'
      events.push({
        userId,
        type: EVENT_TYPES.PROJECT_BLOCK,
        title: project,
        subtitle: 'Bloque 2 — Segundo pico',
        startDate: localToUTC(date, 11, 0),
        endDate: localToUTC(date, 12, 30),
        icon: '🎯',
        color: 'var(--teal)',
        status: 'pending',
        metadata: { blockIndex: 1, project },
      })
    }

    // ─── Gym: 12:30-15:00 (Mon/Tue/Wed/Fri/Sat) ───────────
    if (GYM_DAYS.includes(dow)) {
      const routineNames = {
        1: 'Upper A (Espalda)',
        2: 'Lower A (Cuad + Glutes)',
        3: 'Push (Pecho + Hombros)',
        5: 'Lower B (Caderas + Glutes)',
        6: 'Pull (Espalda + Brazos)',
      }
      events.push({
        userId,
        type: EVENT_TYPES.GYM,
        title: routineNames[dow] || 'Gym',
        subtitle: '90 min + 20 min escalera',
        startDate: localToUTC(date, 12, 30),
        endDate: localToUTC(date, 15, 0),
        icon: '🏋️',
        color: 'var(--orange)',
        status: 'pending',
        metadata: { routineDay: dow },
      })
    }

    // ─── Meditation: 18:00-18:30 (daily) ───────────────────
    events.push({
      userId,
      type: EVENT_TYPES.MEDITATION,
      title: 'Meditacion',
      subtitle: '30 min — hipnosis/mindfulness',
      startDate: localToUTC(date, 18, 0),
      endDate: localToUTC(date, 18, 30),
      icon: '🧘',
      color: 'var(--purple)',
      status: 'pending',
      metadata: {},
    })

    // ─── Focus Block 3: 19:30-21:00 (Tue/Thu/Sat = Tarot) ──
    if (TAROT_DAYS.includes(dow)) {
      events.push({
        userId,
        type: EVENT_TYPES.PROJECT_BLOCK,
        title: 'Tarot App',
        subtitle: 'Bloque 3 — Sesion nocturna',
        startDate: localToUTC(date, 19, 30),
        endDate: localToUTC(date, 21, 0),
        icon: '🔮',
        color: 'var(--teal)',
        status: 'pending',
        metadata: { blockIndex: 2, project: 'Tarot App' },
      })
    }

    // ─── Meals (5 per day) ─────────────────────────────────
    const meals = [
      { time: [7, 30], name: 'Desayuno', icon: '🍳' },
      { time: [10, 30], name: 'Colacion AM', icon: '🍎' },
      { time: [15, 30], name: 'Comida', icon: '🍽️' },
      { time: [17, 0], name: 'Colacion PM', icon: '🥤' },
      { time: [21, 30], name: 'Cena', icon: '🥗' },
    ]
    for (const meal of meals) {
      events.push({
        userId,
        type: EVENT_TYPES.MEAL,
        title: meal.name,
        startDate: localToUTC(date, meal.time[0], meal.time[1]),
        endDate: localToUTC(date, meal.time[0], meal.time[1] + 30),
        icon: meal.icon,
        color: 'var(--green)',
        status: 'pending',
        metadata: {},
      })
    }

    // ─── Medication: 2x daily (8:00 AM + 8:00 PM) ─────────
    events.push({
      userId,
      type: EVENT_TYPES.MEDICATION,
      title: 'Anticoagulante AM',
      subtitle: 'Dosis de la manana',
      startDate: localToUTC(date, 8, 0),
      endDate: localToUTC(date, 8, 15),
      icon: '💊',
      color: 'var(--red)',
      status: 'pending',
      metadata: { doseCycle: 'morning' },
    })
    events.push({
      userId,
      type: EVENT_TYPES.MEDICATION,
      title: 'Anticoagulante PM',
      subtitle: 'Dosis de la noche',
      startDate: localToUTC(date, 20, 0),
      endDate: localToUTC(date, 20, 15),
      icon: '💊',
      color: 'var(--red)',
      status: 'pending',
      metadata: { doseCycle: 'evening' },
    })
  }

  return events
}
