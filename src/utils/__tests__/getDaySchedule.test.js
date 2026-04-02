import { describe, it, expect } from 'vitest'
import { getDaySchedule, GYM_DAYS } from '../date.js'

// dow convention: 0=Dom, 1=Lun, 2=Mar, 3=Mié, 4=Jue, 5=Vie, 6=Sáb

describe('getDaySchedule', () => {
  // ── Return shape ──────────────────────────────────────────────────────────

  it('returns an array for every day of the week', () => {
    for (let dow = 0; dow <= 6; dow++) {
      expect(Array.isArray(getDaySchedule(dow))).toBe(true)
    }
  })

  it('every block has required fields: time, name, tag, icon, habit', () => {
    const schedule = getDaySchedule(1) // Lunes
    for (const block of schedule) {
      expect(block).toHaveProperty('time')
      expect(block).toHaveProperty('name')
      expect(block).toHaveProperty('tag')
      expect(block).toHaveProperty('icon')
      expect(block).toHaveProperty('habit')
    }
  })

  it('always starts with 8:00 AM breakfast block', () => {
    for (let dow = 0; dow <= 6; dow++) {
      const first = getDaySchedule(dow)[0]
      expect(first.time).toBe('8:00 AM')
    }
  })

  it('always ends with a sleep block', () => {
    for (let dow = 0; dow <= 6; dow++) {
      const blocks = getDaySchedule(dow)
      const last = blocks[blocks.length - 1]
      expect(last.tag).toBe('sleep')
    }
  })

  // ── Gym blocks ────────────────────────────────────────────────────────────

  it('includes a gym block on gym days (Lun/Mar/Mié/Vie/Sáb = 1,2,3,5,6)', () => {
    for (const dow of GYM_DAYS) {
      const blocks = getDaySchedule(dow)
      const hasGym = blocks.some((b) => b.tag === 'gym')
      expect(hasGym, `Expected gym block on dow=${dow}`).toBe(true)
    }
  })

  it('does NOT include a gym block on rest days (Dom=0, Jue=4)', () => {
    for (const dow of [0, 4]) {
      const blocks = getDaySchedule(dow)
      const hasGym = blocks.some((b) => b.tag === 'gym')
      expect(hasGym, `Did not expect gym block on dow=${dow}`).toBe(false)
    }
  })

  // ── Focus blocks ──────────────────────────────────────────────────────────

  it('includes fb0 and fb1 habit keys on weekdays', () => {
    for (let dow = 1; dow <= 5; dow++) {
      const blocks = getDaySchedule(dow)
      const habits = blocks.map((b) => b.habit)
      expect(habits).toContain('fb0')
      expect(habits).toContain('fb1')
    }
  })

  it('includes fb2 (Bloque 3 — Tarot) only on Mar/Jue/Sáb (dow 2,4,6)', () => {
    for (const dow of [2, 4, 6]) {
      const blocks = getDaySchedule(dow)
      const hasFb2 = blocks.some((b) => b.habit === 'fb2')
      expect(hasFb2, `Expected fb2 on dow=${dow}`).toBe(true)
    }
  })

  it('does NOT include fb2 on days without Bloque 3 (dow 0,1,3,5)', () => {
    for (const dow of [0, 1, 3, 5]) {
      const blocks = getDaySchedule(dow)
      const hasFb2 = blocks.some((b) => b.habit === 'fb2')
      expect(hasFb2, `Did not expect fb2 on dow=${dow}`).toBe(false)
    }
  })

  // ── Project names ─────────────────────────────────────────────────────────

  it('Lun(1) and Mié(3) use TrueNorth in Bloque 1', () => {
    for (const dow of [1, 3]) {
      const blocks = getDaySchedule(dow)
      const b1 = blocks.find((b) => b.habit === 'fb0')
      expect(b1.name).toMatch(/TrueNorth/)
    }
  })

  it('Mar(2) and Jue(4) use Job Search in Bloque 1', () => {
    for (const dow of [2, 4]) {
      const blocks = getDaySchedule(dow)
      const b1 = blocks.find((b) => b.habit === 'fb0')
      expect(b1.name).toMatch(/Job Search/)
    }
  })

  // ── Meditation ────────────────────────────────────────────────────────────

  it('includes a meditation block every day', () => {
    for (let dow = 0; dow <= 6; dow++) {
      const blocks = getDaySchedule(dow)
      const hasMed = blocks.some((b) => b.tag === 'med')
      expect(hasMed, `Expected meditation on dow=${dow}`).toBe(true)
    }
  })

  it('meditation habit key is present every day', () => {
    for (let dow = 0; dow <= 6; dow++) {
      const blocks = getDaySchedule(dow)
      const hasMed = blocks.some((b) => b.habit === 'meditation')
      expect(hasMed).toBe(true)
    }
  })
})
