import { ROTATION_MAP } from '../../store/dietStore'

// Returns the template label (A/B/C) for a JS Date object
export function getLabelForDate(date, overrides = {}) {
  const key = date.toISOString().slice(0, 10)
  if (overrides[key] !== undefined) return overrides[key]
  const dow = date.getDay() // 0=Dom
  const schedDow = dow === 0 ? 6 : dow - 1 // 0=Lun
  return ROTATION_MAP[schedDow] ?? null
}

// Returns 21 days of rotation starting from today
export function getUpcomingRotation(days = 21, overrides = {}) {
  const result = []
  const today = new Date()
  for (let i = 0; i < days; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    const dateStr = d.toISOString().slice(0, 10)
    const label = getLabelForDate(d, overrides)
    result.push({ date: dateStr, label, dow: d.getDay() })
  }
  return result
}
