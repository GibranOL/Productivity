import { useState } from 'react'
import useStore from '../store/index'
import { defaultDayLog } from '../store/index'
import { ModalOverlay, Toggle, Btn, SectionTitle, Divider } from './UI'
import { isGymDay, getTodayDow, getDayKey } from '../utils/date'

const FOCUS_PROJECTS = {
  1: 'TrueNorth', 2: 'Job Search', 3: 'TrueNorth',
  4: 'Job Search', 5: 'Flex', 6: 'Tarot', 0: 'Ligero',
}

export default function CheckInModal() {
  const closeModal      = useStore((s) => s.closeModal)
  const setHabit        = useStore((s) => s.setHabit)
  const patchFocusBlock = useStore((s) => s.patchFocusBlock)
  const patchTodayLog   = useStore((s) => s.patchTodayLog)
  // Reactive subscription — always reflects current habit/focus state
  const log = useStore((s) => s.logs[getDayKey()] || defaultDayLog())

  const dow     = getTodayDow()
  const gymDay  = isGymDay(dow)
  const hasTarot = [2, 4, 6].includes(dow)

  const [scores, setScores] = useState([
    log.focusBlocks[0]?.score || null,
    log.focusBlocks[1]?.score || null,
    log.focusBlocks[2]?.score || null,
  ])
  const [notes, setNotes] = useState([
    log.focusBlocks[0]?.notes || '',
    log.focusBlocks[1]?.notes || '',
    log.focusBlocks[2]?.notes || '',
  ])
  const [dayScore, setDayScore] = useState(log.energy || 7)
  const [screensOff, setScreensOff] = useState(log.screensOff)

  function saveBlock(idx, score, note) {
    patchFocusBlock(idx, { score, notes: note })
  }

  function finish() {
    patchTodayLog({ energy: dayScore, screensOff, checkinDone: true })
    scores.forEach((s, i) => saveBlock(i, s, notes[i]))
    closeModal()
  }

  const habits = [
    { key: 'sleep',      icon: '🌙', label: 'Dormí 12-8 AM' },
    ...(gymDay ? [{ key: 'gym', icon: '🏋️', label: 'Fui al gym' }] : []),
    { key: 'meditation', icon: '🧘', label: 'Meditación 6 PM' },
    { key: 'meals',      icon: '🥗', label: 'Comidas en orden' },
  ]

  const habitsDone = habits.filter((h) => log[h.key] === true).length
  const habitsTotal = habits.length
  const pct = Math.round((habitsDone / habitsTotal) * 100)

  const feedbackMsg = () => {
    if (pct === 100) return { text: '💯 Día perfecto — consistencia = resultados', color: 'var(--green)' }
    if (pct >= 75)   return { text: '⚡ Sólido — mantén la racha', color: 'var(--teal)' }
    if (pct >= 50)   return { text: '📈 La mitad — mañana lo retomas', color: 'var(--yellow)' }
    return              { text: '🔄 Día de recuperación — sin drama, mañana va', color: 'var(--orange)' }
  }
  const fb = feedbackMsg()

  const focusBlocks = [
    { idx: 0, label: `Bloque 1 — ${FOCUS_PROJECTS[dow] || 'Trabajo'}`, time: '9–10:30 AM' },
    { idx: 1, label: `Bloque 2 — ${FOCUS_PROJECTS[dow] || 'Trabajo'}`, time: '11AM–12:30PM' },
    ...(hasTarot ? [{ idx: 2, label: 'Bloque 3 — Tarot App', time: '7:30–9PM' }] : []),
  ]

  return (
    <ModalOverlay onClose={closeModal}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h3 style={{ fontFamily: 'var(--display)', fontSize: 20 }}>Check-in Nocturno 🌙</h3>
        <button onClick={closeModal} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 20 }}>✕</button>
      </div>

      {/* ── HÁBITOS ── */}
      <SectionTitle>Hábitos del día</SectionTitle>
      <div className="stack" style={{ gap: 8, marginBottom: 16 }}>
        {habits.map((h) => (
          <div key={h.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg3)', borderRadius: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18 }}>{h.icon}</span>
              <span style={{ fontSize: 14, fontWeight: 500 }}>{h.label}</span>
            </div>
            <Toggle
              value={log[h.key]}
              onChange={(v) => setHabit(h.key, v)}
            />
          </div>
        ))}
      </div>

      <Divider />

      {/* ── BLOQUES DE FOCO ── */}
      <SectionTitle>Bloques de foco</SectionTitle>
      <div className="stack" style={{ gap: 12, marginBottom: 16 }}>
        {focusBlocks.map((b) => (
          <div key={b.idx} style={{ background: 'var(--bg3)', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{b.label}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-dim)', marginBottom: 10 }}>{b.time}</div>
            <div className="label" style={{ marginBottom: 6 }}>Score</div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
              {[1,2,3,4,5,6,7,8,9,10].map((n) => (
                <button
                  key={n}
                  onClick={() => setScores((s) => s.map((v, i) => i === b.idx ? n : v))}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 6,
                    border: `1px solid ${scores[b.idx] === n ? 'var(--teal)' : 'var(--border-mid)'}`,
                    background: scores[b.idx] === n ? 'var(--teal-dim)' : 'var(--bg4)',
                    color: scores[b.idx] === n ? 'var(--teal)' : 'var(--text-dim)',
                    fontFamily: 'var(--mono)',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'var(--transition)',
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
            <textarea
              className="input"
              placeholder="Notas del bloque (opcional)..."
              value={notes[b.idx]}
              onChange={(e) => setNotes((n) => n.map((v, i) => i === b.idx ? e.target.value : v))}
              style={{ minHeight: 60, fontSize: 13 }}
            />
          </div>
        ))}
      </div>

      <Divider />

      {/* ── ENERGÍA DEL DÍA ── */}
      <SectionTitle>Energía del día</SectionTitle>
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 16 }}>
        {[1,2,3,4,5,6,7,8,9,10].map((n) => (
          <button
            key={n}
            onClick={() => setDayScore(n)}
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              border: `1px solid ${dayScore === n ? 'var(--orange)' : 'var(--border-mid)'}`,
              background: dayScore === n ? 'var(--orange-dim)' : 'var(--bg3)',
              color: dayScore === n ? 'var(--orange)' : 'var(--text-dim)',
              fontFamily: 'var(--mono)',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'var(--transition)',
            }}
          >
            {n}
          </button>
        ))}
      </div>

      <Divider />

      {/* ── PANTALLAS ── */}
      <SectionTitle>Pantallas off</SectionTitle>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--bg3)', borderRadius: 10, marginBottom: 16 }}>
        <span style={{ fontSize: 14 }}>¿Off antes de 11:30 PM? 🌑</span>
        <Toggle value={screensOff} onChange={setScreensOff} />
      </div>

      <Divider />

      {/* ── RESUMEN ── */}
      <div style={{
        background: 'var(--bg3)',
        borderRadius: 'var(--radius)',
        padding: '14px 16px',
        marginBottom: 16,
        border: `1px solid ${fb.color}44`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div className="label">Resumen</div>
          <div style={{
            fontFamily: 'var(--mono)',
            fontSize: 18,
            fontWeight: 700,
            color: fb.color,
          }}>{habitsDone}/{habitsTotal}</div>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-mid)' }}>{fb.text}</div>
      </div>

      <Btn variant="primary" size="lg" style={{ width: '100%' }} onClick={finish}>
        Guardar check-in ✓
      </Btn>
    </ModalOverlay>
  )
}
