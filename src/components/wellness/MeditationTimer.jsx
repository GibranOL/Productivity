import { useEffect, useRef, useState } from 'react'
import useWellnessStore, { MEDITATION_PRESETS } from '../../store/wellnessStore'
import { Card, Btn, SectionTitle } from '../UI'

// Breathing pattern cycles in seconds: { phase: 'inhale'|'hold'|'exhale'|'hold2', seconds }
const PATTERNS = {
  box: [
    { phase: 'inhale',  label: 'Inhala',  seconds: 4 },
    { phase: 'hold',    label: 'Sostén',  seconds: 4 },
    { phase: 'exhale',  label: 'Exhala',  seconds: 4 },
    { phase: 'hold2',   label: 'Sostén',  seconds: 4 },
  ],
  478: [
    { phase: 'inhale',  label: 'Inhala',  seconds: 4 },
    { phase: 'hold',    label: 'Sostén',  seconds: 7 },
    { phase: 'exhale',  label: 'Exhala',  seconds: 8 },
  ],
  silence: null, // no animation
}

export default function MeditationTimer() {
  const logMeditation = useWellnessStore((s) => s.logMeditation)
  const streak = useWellnessStore((s) => s.getMeditationStreak)()
  const todayMin = useWellnessStore((s) => s.getTodayMeditationMinutes)()
  const weekTotal = useWellnessStore((s) => s.getWeekMeditationTotal)()

  const [preset, setPreset] = useState(MEDITATION_PRESETS[0])
  const [duration, setDuration] = useState(MEDITATION_PRESETS[0].durations[0]) // minutes
  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0) // seconds
  const [phaseIdx, setPhaseIdx] = useState(0)
  const [phaseSec, setPhaseSec] = useState(0)

  const intervalRef = useRef(null)
  const totalSec = duration * 60

  // Main timer
  useEffect(() => {
    if (!running) return
    intervalRef.current = setInterval(() => {
      setElapsed((e) => {
        const next = e + 1
        if (next >= totalSec) {
          finishSession(duration)
          return totalSec
        }
        return next
      })
      // Advance breath phase
      const pattern = PATTERNS[preset.pattern]
      if (pattern) {
        setPhaseSec((ps) => {
          const current = pattern[phaseIdx]
          if (ps + 1 >= current.seconds) {
            setPhaseIdx((i) => (i + 1) % pattern.length)
            return 0
          }
          return ps + 1
        })
      }
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [running, phaseIdx, preset.pattern, totalSec, duration])

  function finishSession(minutes) {
    clearInterval(intervalRef.current)
    logMeditation({ minutes, pattern: preset.pattern })
    setRunning(false)
    setElapsed(0)
    setPhaseIdx(0)
    setPhaseSec(0)
  }

  function start() {
    setElapsed(0)
    setPhaseIdx(0)
    setPhaseSec(0)
    setRunning(true)
  }

  function stop() {
    // Log partial if >= 1 minute completed
    const completed = Math.floor(elapsed / 60)
    if (completed >= 1) {
      logMeditation({ minutes: completed, pattern: preset.pattern })
    }
    clearInterval(intervalRef.current)
    setRunning(false)
    setElapsed(0)
    setPhaseIdx(0)
    setPhaseSec(0)
  }

  const pattern = PATTERNS[preset.pattern]
  const currentPhase = pattern ? pattern[phaseIdx] : null
  const phaseProgress = currentPhase ? phaseSec / currentPhase.seconds : 0

  // Circle scale — inhale grows, exhale shrinks, hold steady
  let circleScale = 1
  if (currentPhase) {
    if (currentPhase.phase === 'inhale')       circleScale = 1 + phaseProgress * 0.5
    else if (currentPhase.phase === 'exhale')  circleScale = 1.5 - phaseProgress * 0.5
    else if (currentPhase.phase === 'hold')    circleScale = 1.5
    else if (currentPhase.phase === 'hold2')   circleScale = 1
  }

  const timeLeft = totalSec - elapsed
  const mmss = `${String(Math.floor(timeLeft / 60)).padStart(2, '0')}:${String(timeLeft % 60).padStart(2, '0')}`

  return (
    <Card accent="purple">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>🧘</span>
          <div>
            <SectionTitle>Zen Mode</SectionTitle>
            <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--mono)', letterSpacing: '0.12em' }}>
              RACHA: {streak}d · HOY: {todayMin}min · 7D: {weekTotal}min
            </div>
          </div>
        </div>
        {streak >= 7 && (
          <span className="badge badge-purple" style={{ fontSize: 9 }}>🔥 {streak}d</span>
        )}
      </div>

      {!running ? (
        <>
          {/* Preset selector */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            {MEDITATION_PRESETS.map((p) => {
              const active = preset.id === p.id
              return (
                <button
                  key={p.id}
                  onClick={() => { setPreset(p); setDuration(p.durations[0]) }}
                  style={{
                    flex: 1, padding: '10px 4px', borderRadius: 8,
                    border: `1px solid ${active ? 'var(--purple)' : 'var(--border-mid)'}`,
                    background: active ? 'var(--purple-dim)' : 'var(--bg3)',
                    color: active ? 'var(--purple)' : 'var(--text-mid)',
                    fontSize: 11, fontWeight: active ? 700 : 400,
                    cursor: 'pointer', transition: 'var(--transition)',
                  }}
                >
                  {p.label}
                </button>
              )
            })}
          </div>

          {/* Duration picker */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            {preset.durations.map((d) => {
              const active = duration === d
              return (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  style={{
                    flex: 1, padding: '10px 0', borderRadius: 8,
                    border: `1px solid ${active ? 'var(--purple)' : 'var(--border-mid)'}`,
                    background: active ? 'var(--bg3)' : 'var(--bg2)',
                    color: active ? 'var(--purple)' : 'var(--text-mid)',
                    fontFamily: 'var(--mono)', fontSize: 14, fontWeight: active ? 700 : 400,
                    cursor: 'pointer', transition: 'var(--transition)',
                  }}
                >
                  {d}m
                </button>
              )
            })}
          </div>

          <Btn variant="primary" onClick={start} style={{ width: '100%' }}>
            ▶  Empezar {duration} min
          </Btn>
        </>
      ) : (
        <>
          {/* Running UI */}
          <div style={{
            height: 220, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 12, position: 'relative',
          }}>
            {/* Breathing circle */}
            <div style={{
              width: 120, height: 120, borderRadius: '50%',
              background: `radial-gradient(circle, var(--purple-dim) 0%, transparent 70%)`,
              border: '2px solid var(--purple)',
              transform: `scale(${circleScale})`,
              transition: 'transform 1s ease-in-out',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 0 ${20 * circleScale}px var(--purple-glow)`,
            }}>
              {currentPhase && (
                <span style={{
                  fontFamily: 'var(--display)', fontSize: 14, fontWeight: 700,
                  color: 'var(--purple)', textAlign: 'center',
                }}>
                  {currentPhase.label}
                </span>
              )}
              {!currentPhase && (
                <span style={{ fontSize: 30 }}>🧘</span>
              )}
            </div>
          </div>

          <div style={{
            textAlign: 'center', marginBottom: 12,
            fontFamily: 'var(--mono)', fontSize: 32, fontWeight: 700,
            color: 'var(--text)', letterSpacing: '0.05em',
          }}>
            {mmss}
          </div>

          <Btn variant="ghost" onClick={stop} style={{ width: '100%' }}>
            Terminar sesión
          </Btn>
        </>
      )}
    </Card>
  )
}
