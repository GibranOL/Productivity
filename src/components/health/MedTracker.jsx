import { useState, useEffect } from 'react'
import useDietStore from '../../store/dietStore'
import { Card } from '../UI'

// ─── Medication Tracker — Anticoagulants 8AM / 8PM ───────────────────────────
// This is the HIGHEST priority health widget. Must be visually prominent.

export default function MedTracker() {
  const getTodayMeds = useDietStore((s) => s.getTodayMeds)
  const logMed = useDietStore((s) => s.logMed)
  const unlogMed = useDietStore((s) => s.unlogMed)
  const isMedOverdue = useDietStore((s) => s.isMedOverdue)

  const meds = getTodayMeds()
  const amOverdue = isMedOverdue('am')
  const pmOverdue = isMedOverdue('pm')

  // Force re-render every minute for countdown accuracy
  const [, setTick] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60000)
    return () => clearInterval(interval)
  }, [])

  const now = new Date()
  const hour = now.getHours()

  // Determine which dose is "next"
  const amDone = !!meds.am
  const pmDone = !!meds.pm

  function getCountdown(targetHour) {
    const target = new Date()
    target.setHours(targetHour, 0, 0, 0)
    const diff = target.getTime() - Date.now()
    if (diff <= 0) return null
    const h = Math.floor(diff / 3600000)
    const m = Math.floor((diff % 3600000) / 60000)
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  const amCountdown = !amDone ? getCountdown(8) : null
  const pmCountdown = !pmDone ? getCountdown(20) : null

  const anyOverdue = amOverdue || pmOverdue
  const allDone = amDone && pmDone

  return (
    <Card
      accent={anyOverdue ? 'red' : allDone ? 'green' : 'orange'}
      style={anyOverdue ? { animation: 'pulse 1.5s infinite' } : undefined}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 22 }}>💊</span>
        <div>
          <div style={{
            fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.2em',
            color: anyOverdue ? 'var(--red)' : 'var(--text-dim)',
            fontWeight: 700,
          }}>
            {anyOverdue ? 'ANTICOAGULANTE PENDIENTE' : 'ANTICOAGULANTES'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
            Ciclo 12h — 8:00 AM / 8:00 PM
          </div>
        </div>
        {allDone && (
          <span style={{
            marginLeft: 'auto',
            fontSize: 10, fontFamily: 'var(--mono)',
            color: 'var(--green)', fontWeight: 700,
          }}>
            OK
          </span>
        )}
      </div>

      {/* Dose buttons */}
      <div style={{ display: 'flex', gap: 10 }}>
        <DoseButton
          label="AM"
          time="8:00"
          done={amDone}
          overdue={amOverdue}
          countdown={amCountdown}
          takenAt={meds.am}
          onTake={() => logMed('am')}
          onUndo={() => unlogMed('am')}
        />
        <DoseButton
          label="PM"
          time="20:00"
          done={pmDone}
          overdue={pmOverdue}
          countdown={pmCountdown}
          takenAt={meds.pm}
          onTake={() => logMed('pm')}
          onUndo={() => unlogMed('pm')}
        />
      </div>

      {/* Overdue warning */}
      {anyOverdue && (
        <div style={{
          marginTop: 10, padding: '8px 12px', borderRadius: 8,
          background: 'var(--red-dim)', border: '1px solid var(--red-mid)',
          fontSize: 12, color: 'var(--red)', fontWeight: 600,
          textAlign: 'center',
        }}>
          {amOverdue && !pmOverdue && 'Dosis AM pasada de las 8:30'}
          {!amOverdue && pmOverdue && 'Dosis PM pasada de las 20:30'}
          {amOverdue && pmOverdue && 'Ambas dosis pendientes'}
        </div>
      )}
    </Card>
  )
}

function DoseButton({ label, time, done, overdue, countdown, takenAt, onTake, onUndo }) {
  const takenTime = takenAt ? new Date(takenAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : null

  return (
    <button
      onClick={done ? onUndo : onTake}
      style={{
        flex: 1,
        padding: '12px 10px',
        borderRadius: 12,
        border: `2px solid ${done ? 'var(--green-mid)' : overdue ? 'var(--red-mid)' : 'var(--border-mid)'}`,
        background: done ? 'var(--green-dim)' : overdue ? 'var(--red-dim)' : 'var(--bg3)',
        cursor: 'pointer',
        transition: 'var(--transition)',
        textAlign: 'center',
      }}
    >
      <div style={{
        fontFamily: 'var(--display)', fontSize: 20, fontWeight: 800,
        color: done ? 'var(--green)' : overdue ? 'var(--red)' : 'var(--text)',
        marginBottom: 2,
      }}>
        {done ? '✓' : label}
      </div>
      <div style={{
        fontFamily: 'var(--mono)', fontSize: 10,
        color: done ? 'var(--green)' : overdue ? 'var(--red)' : 'var(--text-dim)',
        letterSpacing: '0.1em',
      }}>
        {done ? `Tomado ${takenTime}` : overdue ? 'PENDIENTE' : countdown ? `en ${countdown}` : time}
      </div>
    </button>
  )
}
