import useDietStore from '../../store/dietStore'
import { Card, ProgressBar } from '../UI'

// ─── Hydration Tracker — Daily water goal ────────────────────────────────────

const WATER_INCREMENTS = [0.25, 0.5, 1]

export default function HydrationTracker() {
  const logWater = useDietStore((s) => s.logWater)
  const getTodayHydration = useDietStore((s) => s.getTodayHydration)

  const { current, goal } = getTodayHydration()
  const pct = Math.min(100, Math.round((current / goal) * 100))
  const isComplete = current >= goal

  return (
    <Card accent={isComplete ? 'green' : 'teal'}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>💧</span>
          <div className="label">HIDRATACION</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{
            fontFamily: 'var(--display)', fontSize: 20, fontWeight: 800,
            color: isComplete ? 'var(--green)' : 'var(--teal)',
          }}>
            {current}L
          </span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-dim)', marginLeft: 4 }}>
            / {goal}L
          </span>
        </div>
      </div>

      <ProgressBar value={current} max={goal} color={isComplete ? 'var(--green)' : 'var(--teal)'} />

      <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
        {WATER_INCREMENTS.map((amt) => (
          <button
            key={amt}
            onClick={() => logWater(amt)}
            style={{
              flex: 1,
              padding: '8px 6px',
              borderRadius: 8,
              border: '1px solid var(--teal-mid)',
              background: 'var(--teal-dim)',
              color: 'var(--teal)',
              cursor: 'pointer',
              fontSize: 12,
              fontFamily: 'var(--mono)',
              fontWeight: 700,
              transition: 'var(--transition)',
            }}
          >
            +{amt}L
          </button>
        ))}
        <button
          onClick={() => logWater(-0.25)}
          style={{
            padding: '8px 10px',
            borderRadius: 8,
            border: '1px solid var(--border-mid)',
            background: 'var(--bg3)',
            color: 'var(--text-dim)',
            cursor: 'pointer',
            fontSize: 12,
            fontFamily: 'var(--mono)',
            transition: 'var(--transition)',
          }}
        >
          -
        </button>
      </div>

      {isComplete && (
        <div style={{
          marginTop: 8, textAlign: 'center',
          fontSize: 11, color: 'var(--green)', fontFamily: 'var(--mono)',
        }}>
          Meta alcanzada
        </div>
      )}
    </Card>
  )
}
