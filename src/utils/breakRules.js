export const BREAK_RULES = {
  afterWorkBlock: { minMinutes: 20, recommended: 30 },
  afterTwoBlocks: { minMinutes: 45, recommended: 60 },
  lunchBreak: { start: '12:00', minMinutes: 30 },
  noWorkAfter: '21:30',
  beforeSleep: { buffer: 90 },
}

export function validateSchedule(blocks) {
  const warnings = []
  const workBlocks = blocks
    .filter((b) => b.section === 'project' || b.section === 'study')
    .sort((a, b) => a.startTime.localeCompare(b.startTime))

  // Check no work after 21:30
  workBlocks.forEach((b) => {
    const [h, m] = b.startTime.split(':').map(Number)
    if (h * 60 + m > 21 * 60 + 30) {
      warnings.push({
        type: 'no_work_after',
        message: `Bloque "${b.title}" después de las 9:30 PM — riesgo de afectar el sueño`,
        severity: 'warning',
        blockId: b.id,
      })
    }
  })

  // Check too many work blocks (>3) per day
  const byDay = {}
  workBlocks.forEach((b) => {
    if (b.day !== undefined) {
      if (!byDay[b.day]) byDay[b.day] = []
      byDay[b.day].push(b)
    }
  })
  Object.entries(byDay).forEach(([day, dayBlocks]) => {
    if (dayBlocks.length > 3) {
      warnings.push({
        type: 'too_many_blocks',
        message: `${dayBlocks.length} bloques de trabajo el día ${Number(day) + 1} — máximo recomendado es 3`,
        severity: 'error',
      })
    }
  })

  // Check missing breaks between consecutive work blocks (same day)
  Object.values(byDay).forEach((dayBlocks) => {
    for (let i = 0; i < dayBlocks.length - 1; i++) {
      const curr = dayBlocks[i]
      const next = dayBlocks[i + 1]
      const [eh, em] = curr.endTime.split(':').map(Number)
      const [sh, sm] = next.startTime.split(':').map(Number)
      const gap = (sh * 60 + sm) - (eh * 60 + em)
      if (gap < BREAK_RULES.afterWorkBlock.minMinutes) {
        warnings.push({
          type: 'missing_break',
          message: `Solo ${gap} min entre "${curr.title}" y "${next.title}" — necesitas al menos 20 min`,
          severity: gap < 10 ? 'error' : 'warning',
        })
      }
    }
  })

  return warnings
}

export function getBreakBlocks(blocks) {
  // Returns virtual break blocks to display between work blocks
  const workBlocks = blocks
    .filter((b) => (b.section === 'project' || b.section === 'study') && b.day !== undefined)
    .sort((a, b) => a.day - b.day || a.startTime.localeCompare(b.startTime))

  const breaks = []
  // Group by day
  const byDay = {}
  workBlocks.forEach((b) => {
    if (!byDay[b.day]) byDay[b.day] = []
    byDay[b.day].push(b)
  })

  Object.entries(byDay).forEach(([day, dayBlocks]) => {
    for (let i = 0; i < dayBlocks.length - 1; i++) {
      const curr = dayBlocks[i]
      const next = dayBlocks[i + 1]
      const [eh, em] = curr.endTime.split(':').map(Number)
      const [sh, sm] = next.startTime.split(':').map(Number)
      const gap = (sh * 60 + sm) - (eh * 60 + em)

      if (gap >= 5 && gap <= 60) {
        // There's a gap — suggest it as a break
        breaks.push({
          id: `break-${curr.id}-${next.id}`,
          isBreak: true,
          day: parseInt(day),
          startTime: curr.endTime,
          endTime: next.startTime,
          duration: gap,
          title: gap >= 30 ? 'Break largo' : 'Break',
          icon: gap >= 30 ? '🚶' : '☕',
          section: 'rest',
        })
      }
    }
  })

  return breaks
}
