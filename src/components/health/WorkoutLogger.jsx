import { useState } from 'react'
import useGymStore, { SPLIT_SCHEDULE, GYM_DAYS } from '../../store/gymStore'
import { Card, Btn, ProgressBar } from '../UI'

// ─── Workout Logger — Fast 3-tap set entry ───────────────────────────────────

export default function WorkoutLogger() {
  const getTodaySplit = useGymStore((s) => s.getTodaySplit)
  const isGymDay = useGymStore((s) => s.isGymDay)
  const getTodayLog = useGymStore((s) => s.getTodayLog)
  const startWorkout = useGymStore((s) => s.startWorkout)
  const logSet = useGymStore((s) => s.logSet)
  const removeLastSet = useGymStore((s) => s.removeLastSet)
  const completeWorkout = useGymStore((s) => s.completeWorkout)
  const updateWorkoutNotes = useGymStore((s) => s.updateWorkoutNotes)
  const getWorkoutVolume = useGymStore((s) => s.getWorkoutVolume)
  const getWeeklyVolume = useGymStore((s) => s.getWeeklyVolume)
  const getVolumeTrend = useGymStore((s) => s.getVolumeTrend)
  const getGymStreak = useGymStore((s) => s.getGymStreak)

  const todaySplit = getTodaySplit()
  const todayLog = getTodayLog()
  const today = new Date().toISOString().slice(0, 10)
  const gymDay = isGymDay()
  const streak = getGymStreak()

  // Rest day
  if (!gymDay) {
    return (
      <Card accent="purple" style={{ textAlign: 'center', padding: 20 }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>🧘</div>
        <div style={{ fontFamily: 'var(--display)', fontSize: 18, fontWeight: 700 }}>Dia de descanso</div>
        <div style={{ color: 'var(--text-mid)', marginTop: 6, fontSize: 13 }}>
          Recuperacion activa — estira, camina, hidratate
        </div>
        {streak > 0 && (
          <div style={{ marginTop: 10, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--green)' }}>
            Racha: {streak} sesiones consecutivas
          </div>
        )}
      </Card>
    )
  }

  // Not started yet
  if (!todayLog && todaySplit) {
    return (
      <Card accent="orange">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <span style={{ fontSize: 26 }}>{todaySplit.icon}</span>
          <div>
            <div style={{ fontFamily: 'var(--display)', fontSize: 18, fontWeight: 800 }}>
              {todaySplit.label}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
              {todaySplit.muscles.join(' / ')}
            </div>
          </div>
        </div>
        <Btn variant="primary" onClick={() => startWorkout(todaySplit.id)} style={{ width: '100%' }}>
          Iniciar Entrenamiento
        </Btn>
        {streak > 0 && (
          <div style={{ marginTop: 8, textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--green)' }}>
            Racha: {streak} sesiones
          </div>
        )}
      </Card>
    )
  }

  if (!todayLog) return null

  // Active workout
  const volume = getWorkoutVolume(today)
  const weeklyVol = getWeeklyVolume()
  const trend = getVolumeTrend()
  const isCompleted = !!todayLog.completedAt
  const totalSets = todayLog.exercises.reduce((t, ex) => t + ex.sets.length, 0)
  const targetSets = todayLog.exercises.reduce((t, ex) => t + ex.targetSets, 0)

  return (
    <div className="stack" style={{ gap: 12 }}>
      {/* Header */}
      <Card accent={isCompleted ? 'green' : 'orange'}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>{todaySplit?.icon || '🏋️'}</span>
            <div>
              <div style={{ fontFamily: 'var(--display)', fontSize: 16, fontWeight: 800 }}>
                {todaySplit?.label || todayLog.splitId}
              </div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.1em' }}>
                {isCompleted ? 'COMPLETADO' : 'EN PROGRESO'}
              </div>
            </div>
          </div>
          {!isCompleted && (
            <Btn variant="primary" size="sm" onClick={() => completeWorkout(today)}>
              Terminar
            </Btn>
          )}
        </div>

        {/* Progress */}
        <ProgressBar value={totalSets} max={targetSets} color={isCompleted ? 'var(--green)' : 'var(--orange)'} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-dim)' }}>
            {totalSets}/{targetSets} sets
          </span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-dim)' }}>
            Vol: {(volume / 1000).toFixed(1)}k kg
          </span>
        </div>

        {/* Volume trend mini chart */}
        {trend.some((v) => v > 0) && (
          <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', marginTop: 10, height: 32 }}>
            {trend.map((vol, i) => {
              const maxVol = Math.max(...trend, 1)
              const h = Math.max(4, (vol / maxVol) * 32)
              const isCurrent = i === trend.length - 1
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <div style={{
                    width: '100%', height: h, borderRadius: 3,
                    background: isCurrent ? 'var(--orange)' : 'var(--bg5)',
                    transition: 'height 0.3s ease',
                  }} />
                  <span style={{ fontSize: 7, fontFamily: 'var(--mono)', color: 'var(--text-dim)' }}>
                    S{i + 1}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Exercises */}
      {todayLog.exercises.map((ex, idx) => (
        <ExerciseCard
          key={idx}
          exercise={ex}
          exerciseIdx={idx}
          date={today}
          onLogSet={logSet}
          onRemoveSet={removeLastSet}
          disabled={isCompleted}
        />
      ))}

      {/* Notes */}
      {!isCompleted && (
        <Card>
          <textarea
            value={todayLog.notes || ''}
            onChange={(e) => updateWorkoutNotes(today, e.target.value)}
            placeholder="Notas del entreno..."
            className="input"
            style={{ minHeight: 50, fontSize: 12 }}
          />
        </Card>
      )}
    </div>
  )
}

// ─── Exercise Card — Fast 3-tap set entry ────────────────────────────────────
function ExerciseCard({ exercise, exerciseIdx, date, onLogSet, onRemoveSet, disabled }) {
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')
  const [rpe, setRpe] = useState(null)

  const setsCompleted = exercise.sets.length
  const isComplete = setsCompleted >= exercise.targetSets

  function handleLog() {
    if (!weight && !reps) return
    onLogSet(date, exerciseIdx, {
      weight: Number(weight) || 0,
      reps: Number(reps) || 0,
      rpe,
    })
    // Keep weight for next set, clear reps and RPE
    setReps('')
    setRpe(null)
  }

  // Calculate set volume
  const totalVol = exercise.sets.reduce((s, set) => s + (set.weight * set.reps), 0)

  return (
    <div style={{
      background: 'var(--bg2)',
      border: `1px solid ${isComplete ? 'var(--green-mid)' : 'var(--border-mid)'}`,
      borderRadius: 12,
      padding: '12px',
      opacity: isComplete ? 0.85 : 1,
    }}>
      {/* Exercise header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: isComplete ? 'var(--green)' : 'var(--text)' }}>
            {exercise.name}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--mono)' }}>
            {exercise.muscleGroup} · {exercise.targetSets}x{exercise.targetReps}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{
            fontFamily: 'var(--display)', fontSize: 16, fontWeight: 800,
            color: isComplete ? 'var(--green)' : 'var(--orange)',
          }}>
            {setsCompleted}/{exercise.targetSets}
          </span>
        </div>
      </div>

      {/* Logged sets */}
      {exercise.sets.length > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
          {exercise.sets.map((set, i) => (
            <span key={i} style={{
              fontSize: 10, fontFamily: 'var(--mono)',
              padding: '3px 8px', borderRadius: 6,
              background: 'var(--bg4)', color: 'var(--text-mid)',
              border: '1px solid var(--border-mid)',
            }}>
              {set.weight}kg x{set.reps}
              {set.rpe ? ` @${set.rpe}` : ''}
            </span>
          ))}
          {totalVol > 0 && (
            <span style={{
              fontSize: 9, fontFamily: 'var(--mono)', color: 'var(--text-dim)',
              padding: '3px 6px', alignSelf: 'center',
            }}>
              = {(totalVol / 1000).toFixed(1)}k
            </span>
          )}
        </div>
      )}

      {/* Quick input row — 3 taps: weight, reps, log */}
      {!disabled && !isComplete && (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            type="number"
            placeholder="kg"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            style={inputStyle}
          />
          <input
            type="number"
            placeholder="reps"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            style={inputStyle}
          />
          {/* RPE quick select */}
          <select
            value={rpe || ''}
            onChange={(e) => setRpe(e.target.value ? Number(e.target.value) : null)}
            style={{ ...inputStyle, width: 52, padding: '6px 2px', color: rpe ? 'var(--orange)' : 'var(--text-dim)' }}
          >
            <option value="">RPE</option>
            {[6, 7, 8, 9, 10].map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
          <button onClick={handleLog} style={logBtnStyle}>
            +
          </button>
        </div>
      )}

      {/* Undo last set */}
      {!disabled && exercise.sets.length > 0 && (
        <button
          onClick={() => onRemoveSet(date, exerciseIdx)}
          style={{
            marginTop: 6, fontSize: 10, fontFamily: 'var(--mono)',
            color: 'var(--text-dim)', background: 'none', border: 'none',
            cursor: 'pointer', padding: '2px 0',
          }}
        >
          Deshacer ultimo set
        </button>
      )}
    </div>
  )
}

const inputStyle = {
  width: 56,
  padding: '6px 8px',
  borderRadius: 8,
  border: '1px solid var(--border-mid)',
  background: 'var(--bg3)',
  color: 'var(--text)',
  fontSize: 13,
  fontFamily: 'var(--mono)',
  outline: 'none',
  textAlign: 'center',
  boxSizing: 'border-box',
}

const logBtnStyle = {
  width: 36,
  height: 36,
  borderRadius: 8,
  border: 'none',
  background: 'var(--orange)',
  color: 'var(--bg)',
  fontSize: 18,
  fontWeight: 700,
  cursor: 'pointer',
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}
