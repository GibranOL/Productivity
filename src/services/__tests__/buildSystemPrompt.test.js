import { describe, it, expect } from 'vitest'
import { buildSystemPrompt } from '../ollamaService.js'

// Minimal context object that satisfies buildSystemPrompt's destructuring
const baseCtx = {
  dow: 1,       // Lunes
  hour: 9,
  energy: 7,
  streak: 3,
  todayBlocks: [],
  habits: {},
  weekStats: { workHours: 6, gym: 3, meditation: 4 },
  projects: { truenorth: { pct: 45 }, jobsearch: { pct: 20 } },
}

describe('buildSystemPrompt', () => {
  // ── Return type ───────────────────────────────────────────────────────────

  it('returns a non-empty string', () => {
    const result = buildSystemPrompt(baseCtx)
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(100)
  })

  // ── Day/time ──────────────────────────────────────────────────────────────

  it('includes the correct Spanish day name', () => {
    const ctx = { ...baseCtx, dow: 1 }
    expect(buildSystemPrompt(ctx)).toContain('Lunes')
  })

  it('includes the time formatted as HH:00', () => {
    const ctx = { ...baseCtx, hour: 9 }
    expect(buildSystemPrompt(ctx)).toContain('09:00')
  })

  it('includes zero-padded hour for single digits', () => {
    const ctx = { ...baseCtx, hour: 8 }
    expect(buildSystemPrompt(ctx)).toContain('08:00')
  })

  it('includes the correct day for each dow', () => {
    const names = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
    for (let dow = 0; dow <= 6; dow++) {
      const result = buildSystemPrompt({ ...baseCtx, dow })
      expect(result).toContain(names[dow])
    }
  })

  // ── Energy ────────────────────────────────────────────────────────────────

  it('includes the energy level', () => {
    const ctx = { ...baseCtx, energy: 7 }
    expect(buildSystemPrompt(ctx)).toContain('7/10')
  })

  it('reflects different energy levels', () => {
    for (const energy of [1, 5, 10]) {
      expect(buildSystemPrompt({ ...baseCtx, energy })).toContain(`${energy}/10`)
    }
  })

  // ── Streak ────────────────────────────────────────────────────────────────

  it('includes the streak count', () => {
    const ctx = { ...baseCtx, streak: 5 }
    expect(buildSystemPrompt(ctx)).toContain('5')
  })

  // ── Block sections ────────────────────────────────────────────────────────

  it('marks no active block when todayBlocks is empty', () => {
    const result = buildSystemPrompt({ ...baseCtx, todayBlocks: [] })
    expect(result).toContain('(ninguno)')
  })

  it('shows active block title when a block has status active', () => {
    const ctx = {
      ...baseCtx,
      todayBlocks: [
        { status: 'active', startTime: '09:00', endTime: '10:30', title: 'TrueNorth Sprint', section: 'project' },
      ],
    }
    const result = buildSystemPrompt(ctx)
    expect(result).toContain('TrueNorth Sprint')
  })

  it('shows pending blocks and completed blocks separately', () => {
    const ctx = {
      ...baseCtx,
      todayBlocks: [
        { status: 'done',    startTime: '09:00', endTime: '10:30', title: 'Bloque 1', section: 'project' },
        { status: 'pending', startTime: '11:00', endTime: '12:30', title: 'Bloque 2', section: 'project' },
      ],
    }
    const result = buildSystemPrompt(ctx)
    expect(result).toContain('Bloque 2')
    expect(result).toContain('Bloque 1')
  })

  // ── Projects ──────────────────────────────────────────────────────────────

  it('includes project completion percentages', () => {
    const ctx = { ...baseCtx, projects: { truenorth: { pct: 42 } } }
    const result = buildSystemPrompt(ctx)
    expect(result).toContain('42%')
    expect(result).toContain('truenorth')
  })

  // ── Anti-burnout rules ────────────────────────────────────────────────────

  it('always includes the 3-block limit rule', () => {
    const result = buildSystemPrompt(baseCtx)
    expect(result).toContain('3 bloques')
  })

  it('always includes the sleep window rule', () => {
    const result = buildSystemPrompt(baseCtx)
    expect(result).toContain('12 AM')
  })

  // ── Graceful defaults ─────────────────────────────────────────────────────

  it('handles missing optional fields with defaults (no throw)', () => {
    expect(() => buildSystemPrompt({ dow: 0, hour: 10 })).not.toThrow()
  })

  it('handles empty habits object without crashing', () => {
    expect(() => buildSystemPrompt({ ...baseCtx, habits: {} })).not.toThrow()
  })

  it('handles empty weekStats without crashing', () => {
    expect(() => buildSystemPrompt({ ...baseCtx, weekStats: {} })).not.toThrow()
  })
})
