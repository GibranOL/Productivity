/**
 * Date utilities for Gibran OS.
 * All dates stored in Appwrite as UTC ISO 8601.
 * All display converted to America/Vancouver.
 */
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, addDays, parseISO, differenceInMinutes, differenceInHours } from 'date-fns'
import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz'
import { es } from 'date-fns/locale'

export const TZ = 'America/Vancouver'

// ─── UTC Conversion ──────────────────────────────────────────

/** Convert a local Vancouver time to UTC ISO string for Appwrite storage */
export function toUTC(date) {
  if (typeof date === 'string') date = parseISO(date)
  return date.toISOString()
}

/** Create a UTC ISO string from Vancouver local hour/minute on a given date */
export function localTimeToUTC(dateStr, hours, minutes = 0) {
  const localDate = new Date(`${dateStr}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`)
  const utc = fromZonedTime(localDate, TZ)
  return utc.toISOString()
}

/** Get current time in Vancouver timezone */
export function nowVancouver() {
  return toZonedTime(new Date(), TZ)
}

// ─── Display Formatting ──────────────────────────────────────

/** Format a UTC ISO date for display in Vancouver timezone */
export function formatDisplay(utcDate, fmt = 'PPP') {
  if (typeof utcDate === 'string') utcDate = parseISO(utcDate)
  return formatInTimeZone(utcDate, TZ, fmt, { locale: es })
}

/** Format time only: "9:00 AM" */
export function formatTime(utcDate) {
  return formatInTimeZone(
    typeof utcDate === 'string' ? parseISO(utcDate) : utcDate,
    TZ,
    'h:mm a'
  )
}

/** Format date header: "Lunes 11 Abr" */
export function formatDateHeader(utcDate) {
  return formatInTimeZone(
    typeof utcDate === 'string' ? parseISO(utcDate) : utcDate,
    TZ,
    "EEEE d MMM",
    { locale: es }
  )
}

/** Format full: "Lunes 11 de Abril, 2026" */
export function formatDateFull(utcDate) {
  return formatInTimeZone(
    typeof utcDate === 'string' ? parseISO(utcDate) : utcDate,
    TZ,
    "EEEE d 'de' MMMM, yyyy",
    { locale: es }
  )
}

// ─── Day Keys ────────────────────────────────────────────────

/** Get YYYY-MM-DD key for today in Vancouver */
export function getTodayKey() {
  return formatInTimeZone(new Date(), TZ, 'yyyy-MM-dd')
}

/** Get YYYY-MM-DD from a UTC date */
export function getDayKey(utcDate) {
  if (!utcDate) return getTodayKey()
  return formatInTimeZone(
    typeof utcDate === 'string' ? parseISO(utcDate) : utcDate,
    TZ,
    'yyyy-MM-dd'
  )
}

/** Get day of week (0=Sunday) in Vancouver timezone */
export function getVancouverDow(utcDate) {
  const zoned = utcDate
    ? toZonedTime(typeof utcDate === 'string' ? parseISO(utcDate) : utcDate, TZ)
    : nowVancouver()
  return zoned.getDay()
}

/** Get current hour in Vancouver */
export function getVancouverHour() {
  return nowVancouver().getHours()
}

// ─── Range Helpers ───────────────────────────────────────────

/** Get UTC start/end of today in Vancouver */
export function getTodayRange() {
  const now = nowVancouver()
  const start = fromZonedTime(startOfDay(now), TZ)
  const end = fromZonedTime(endOfDay(now), TZ)
  return { start: start.toISOString(), end: end.toISOString() }
}

/** Get UTC start/end of current week (Mon-Sun) in Vancouver */
export function getWeekRange(weekOffset = 0) {
  const now = nowVancouver()
  const offsetDate = addDays(now, weekOffset * 7)
  const start = fromZonedTime(startOfWeek(offsetDate, { weekStartsOn: 1 }), TZ)
  const end = fromZonedTime(endOfWeek(offsetDate, { weekStartsOn: 1 }), TZ)
  return { start: start.toISOString(), end: end.toISOString() }
}

// ─── Duration Helpers ────────────────────────────────────────

/** Calculate duration in minutes between two UTC ISO dates */
export function durationMinutes(startUTC, endUTC) {
  return differenceInMinutes(
    typeof endUTC === 'string' ? parseISO(endUTC) : endUTC,
    typeof startUTC === 'string' ? parseISO(startUTC) : startUTC
  )
}

/** Calculate duration in hours between two UTC ISO dates */
export function durationHours(startUTC, endUTC) {
  return differenceInHours(
    typeof endUTC === 'string' ? parseISO(endUTC) : endUTC,
    typeof startUTC === 'string' ? parseISO(startUTC) : startUTC
  )
}

// ─── Circadian Insight (preserved from original) ─────────────

export function getCircadianInsight() {
  const hour = getVancouverHour()

  if (hour >= 8 && hour < 11) {
    return { label: 'CORTISOL PEAK', color: 'var(--teal)', text: 'Ventana cognitiva mas alta — maximo enfoque' }
  }
  if (hour >= 11 && hour < 13) {
    return { label: 'ULTRADIAN DIP', color: 'var(--yellow)', text: 'Transicion natural — gym o break' }
  }
  if (hour >= 13 && hour < 15) {
    return { label: 'POST-LUNCH DIP', color: 'var(--orange)', text: 'Gym convierte adenosina en BDNF' }
  }
  if (hour >= 15 && hour < 18) {
    return { label: 'SECOND PEAK', color: 'var(--teal)', text: 'Segundo pico — trabajo creativo y estrategico' }
  }
  if (hour >= 18 && hour < 22) {
    return { label: 'MELATONIN RISING', color: 'var(--purple)', text: 'Trabajo creativo OK — cuidado luz azul' }
  }
  return { label: 'SLEEP WINDOW', color: 'var(--purple)', text: 'Proteger ventana de sueno' }
}
