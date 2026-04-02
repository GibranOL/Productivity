import { describe, it, expect } from 'vitest'
import { calcDuration } from '../schedulerStore.js'

describe('calcDuration', () => {
  // ── Normal cases ──────────────────────────────────────────────────────────

  it('returns 90 for a standard 90-min block (09:00 → 10:30)', () => {
    expect(calcDuration('09:00', '10:30')).toBe(90)
  })

  it('returns 480 for a full sleep block (00:00 → 08:00)', () => {
    expect(calcDuration('00:00', '08:00')).toBe(480)
  })

  it('returns 30 for a 30-min block (18:00 → 18:30)', () => {
    expect(calcDuration('18:00', '18:30')).toBe(30)
  })

  it('returns 150 for a gym block (13:30 → 16:00)', () => {
    expect(calcDuration('13:30', '16:00')).toBe(150)
  })

  it('returns 0 for same start and end time', () => {
    expect(calcDuration('09:00', '09:00')).toBe(0)
  })

  // ── Midnight-crossing blocks (the bug we fixed) ───────────────────────────

  it('handles midnight-crossing: 23:00 → 01:00 = 120 min (NOT -1320)', () => {
    expect(calcDuration('23:00', '01:00')).toBe(120)
  })

  it('handles midnight-crossing: 23:30 → 00:30 = 60 min', () => {
    expect(calcDuration('23:30', '00:30')).toBe(60)
  })

  it('handles midnight-crossing: 22:00 → 02:00 = 240 min', () => {
    expect(calcDuration('22:00', '02:00')).toBe(240)
  })

  // ── Edge cases ────────────────────────────────────────────────────────────

  it('handles single-digit minutes correctly (09:05 → 09:50 = 45)', () => {
    expect(calcDuration('09:05', '09:50')).toBe(45)
  })

  it('returns 1439 for near-full-day block (00:01 → 00:00)', () => {
    // 00:00 end = 24:00 from midnight perspective — wraps to 1439
    expect(calcDuration('00:01', '00:00')).toBe(1439)
  })
})
