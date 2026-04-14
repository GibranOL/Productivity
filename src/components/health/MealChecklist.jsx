import useDietStore, { MEAL_TYPES } from '../../store/dietStore'
import { Card, ProgressBar } from '../UI'

// ─── Meal Checklist — 5 meals/day with consumed toggle ──────────────────────

export default function MealChecklist() {
  const toggleMealDone = useDietStore((s) => s.toggleMealDone)
  const getTodayMealCompletion = useDietStore((s) => s.getTodayMealCompletion)
  const getMealsConsumedCount = useDietStore((s) => s.getMealsConsumedCount)

  const completion = getTodayMealCompletion()
  const consumed = getMealsConsumedCount()
  const total = MEAL_TYPES.length

  return (
    <Card accent="green">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>🍽️</span>
          <div className="label">COMIDAS HOY</div>
        </div>
        <span style={{
          fontFamily: 'var(--display)', fontSize: 18, fontWeight: 800,
          color: consumed >= total ? 'var(--green)' : consumed > 0 ? 'var(--yellow)' : 'var(--text-dim)',
        }}>
          {consumed}/{total}
        </span>
      </div>

      <ProgressBar value={consumed} max={total} color={consumed >= total ? 'var(--green)' : 'var(--yellow)'} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
        {MEAL_TYPES.map((meal) => {
          const done = !!completion[meal.key]
          return (
            <button
              key={meal.key}
              onClick={() => toggleMealDone(meal.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 10px',
                borderRadius: 8,
                border: `1px solid ${done ? 'var(--green-mid)' : 'var(--border-mid)'}`,
                background: done ? 'var(--green-dim)' : 'var(--bg3)',
                cursor: 'pointer',
                transition: 'var(--transition)',
                textAlign: 'left',
              }}
            >
              <span style={{
                width: 20, height: 20, borderRadius: 4, flexShrink: 0,
                border: `2px solid ${done ? 'var(--green)' : 'var(--border-mid)'}`,
                background: done ? 'var(--green)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, color: 'var(--bg)',
                transition: 'var(--transition)',
              }}>
                {done ? '✓' : ''}
              </span>
              <span style={{ fontSize: 14 }}>{meal.icon}</span>
              <span style={{
                fontSize: 13, fontWeight: 500,
                color: done ? 'var(--green)' : 'var(--text)',
                textDecoration: done ? 'line-through' : 'none',
                opacity: done ? 0.8 : 1,
              }}>
                {meal.label}
              </span>
            </button>
          )
        })}
      </div>
    </Card>
  )
}
