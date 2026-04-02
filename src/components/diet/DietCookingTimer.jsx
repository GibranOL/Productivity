import { useState, useEffect } from 'react'
import useDietStore from '../../store/dietStore'
import { STEP_COLORS } from '../../services/diet/cookingSequenceOptimizer'
import { playSuccessSound } from '../../utils/sound'

export default function DietCookingTimer() {
  const cookingSteps   = useDietStore((s) => s.cookingSteps)
  const updateStep     = useDietStore((s) => s.updateCookingStep)
  const [now, setNow]  = useState(Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  if (cookingSteps.length === 0) return null

  const activeIdx = cookingSteps.findIndex((s) => s.status === 'active')
  const doneCount = cookingSteps.filter((s) => s.status === 'done').length

  function startStep(idx) {
    updateStep(idx, { status: 'active', timerStart: Date.now() })
  }

  function completeStep(idx) {
    updateStep(idx, { status: 'done' })
    playSuccessSound()
    // Auto-start next pending
    const next = cookingSteps.findIndex((s, i) => i > idx && s.status === 'pending')
    if (next !== -1) setTimeout(() => startStep(next), 300)
  }

  function fmt(ms) {
    const s = Math.max(0, Math.floor(ms / 1000))
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  return (
    <div>
      <div className="row-between" style={{ marginBottom: 12 }}>
        <div className="label">Secuencia de cocina</div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--green)' }}>
          {doneCount}/{cookingSteps.length} pasos
        </div>
      </div>
      <div className="stack" style={{ gap: 8 }}>
        {cookingSteps.map((step, idx) => {
          const color = STEP_COLORS[step.type] || 'var(--text-dim)'
          const isActive = step.status === 'active'
          const isDone   = step.status === 'done'
          const elapsed  = isActive && step.timerStart ? now - step.timerStart : 0
          const total    = step.durationMin * 60 * 1000
          const progress = isActive ? Math.min(1, elapsed / total) : isDone ? 1 : 0

          return (
            <div key={step.id} style={{
              background: isDone ? 'var(--bg3)' : isActive ? `${color}18` : 'var(--bg3)',
              border: `1px solid ${isActive ? color + '88' : isDone ? 'var(--green-mid)' : 'var(--border-mid)'}`,
              borderLeft: `3px solid ${isDone ? 'var(--green)' : color}`,
              borderRadius: 10,
              padding: '10px 14px',
              opacity: isDone ? 0.55 : 1,
              transition: 'all 0.2s',
            }}>
              <div className="row-between">
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13 }}>
                      {isDone ? '✅' : isActive ? '⏱️' : `${idx + 1}.`}
                    </span>
                    <span style={{ fontWeight: 600, fontSize: 13, color: isActive ? color : isDone ? 'var(--text-dim)' : 'var(--text)' }}>
                      {step.title}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--mono)' }}>
                      ~{step.durationMin}min
                    </span>
                  </div>
                  {!isDone && (
                    <div style={{ fontSize: 12, color: 'var(--text-mid)', marginTop: 3 }}>
                      {step.description}
                    </div>
                  )}
                  {isActive && (
                    <div style={{ marginTop: 6 }}>
                      <div style={{ height: 3, background: 'var(--bg4)', borderRadius: 2, overflow: 'hidden', marginBottom: 4 }}>
                        <div style={{ height: '100%', width: `${progress * 100}%`, background: color, transition: 'width 1s linear' }} />
                      </div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color }}>
                        {fmt(elapsed)} / {fmt(total)}
                        {elapsed > total && <span style={{ color: 'var(--orange)', marginLeft: 8 }}>⚠ tiempo extra</span>}
                      </div>
                    </div>
                  )}
                </div>
                {!isDone && step.status !== 'active' && idx === cookingSteps.findIndex((s) => s.status !== 'done') && (
                  <button onClick={() => startStep(idx)} style={{
                    background: `${color}18`, border: `1px solid ${color}44`,
                    borderRadius: 6, color, fontFamily: 'var(--mono)', fontSize: 11,
                    padding: '4px 10px', cursor: 'pointer', whiteSpace: 'nowrap',
                  }}>▶</button>
                )}
                {isActive && (
                  <button onClick={() => completeStep(idx)} style={{
                    background: 'var(--green-dim)', border: '1px solid var(--green-mid)',
                    borderRadius: 6, color: 'var(--green)', fontFamily: 'var(--mono)',
                    fontSize: 11, padding: '4px 10px', cursor: 'pointer',
                  }}>✓</button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
