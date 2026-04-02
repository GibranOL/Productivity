import useDietStore from '../../store/dietStore'
import { getUpcomingRotation } from '../../services/diet/rotationResolver'
import { Card, SectionTitle } from '../UI'

const DOW_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

const LABEL_COLORS = {
  A: { color: 'var(--teal)',   dim: 'var(--teal-dim)'   },
  B: { color: 'var(--orange)', dim: 'var(--orange-dim)' },
  C: { color: 'var(--purple)', dim: 'var(--purple-dim)' },
}

export default function DietMeals() {
  const rotationOverrides  = useDietStore((s) => s.rotationOverrides)
  const setOverride        = useDietStore((s) => s.setRotationOverride)
  const templates          = useDietStore((s) => s.templates)

  const rotation = getUpcomingRotation(21, rotationOverrides)

  const today = new Date().toISOString().slice(0, 10)

  // Group into weeks of 7
  const weeks = []
  for (let i = 0; i < rotation.length; i += 7) {
    weeks.push(rotation.slice(i, i + 7))
  }

  function cycleLabel(dateStr, current) {
    const options = ['A', 'B', 'C', null]
    const idx = options.indexOf(current)
    const next = options[(idx + 1) % options.length]
    setOverride(dateStr, next)
  }

  return (
    <div className="stack" style={{ gap: 14 }}>
      {/* Legend */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {templates.map((t) => {
          const lc = LABEL_COLORS[t.label] || LABEL_COLORS.A
          return (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: lc.color }} />
              <span style={{ fontSize: 11, color: 'var(--text-mid)' }}>Template {t.label} — {t.sourceFile || 'Mundo Nutrition'}</span>
            </div>
          )
        })}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--bg5)' }} />
          <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Descanso</span>
        </div>
      </div>

      {/* Calendar weeks */}
      {weeks.map((week, wi) => (
        <Card key={wi}>
          <SectionTitle>Semana {wi + 1}</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 5 }}>
            {week.map(({ date, label, dow }) => {
              const isToday = date === today
              const lc = label ? LABEL_COLORS[label] || LABEL_COLORS.A : null
              return (
                <button
                  key={date}
                  onClick={() => cycleLabel(date, label)}
                  title={`${date} — Toca para cambiar`}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    padding: '8px 4px', borderRadius: 8, cursor: 'pointer',
                    border: `1px solid ${isToday ? 'var(--teal)' : lc ? lc.color + '44' : 'var(--border-mid)'}`,
                    background: lc ? lc.dim : 'var(--bg4)',
                    transition: 'var(--transition)',
                    boxShadow: isToday ? '0 0 0 2px var(--teal)' : 'none',
                  }}
                >
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: isToday ? 'var(--teal)' : 'var(--text-dim)' }}>
                    {DOW_LABELS[dow]}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 1 }}>
                    {date.slice(8)}
                  </span>
                  <span style={{
                    marginTop: 4,
                    fontFamily: 'var(--display)', fontSize: 14, fontWeight: 800,
                    color: lc ? lc.color : 'var(--text-dim)',
                  }}>
                    {label || '—'}
                  </span>
                </button>
              )
            })}
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-dim)' }}>
            Toca cualquier día para cambiar su template
          </div>
        </Card>
      ))}
    </div>
  )
}
