import { useState } from 'react'
import useStore from '../store/index'
import { Card, ProgressBar, Badge, SectionTitle } from './UI'
import { GYM_DAYS } from '../utils/date'

const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const DAY_FULL   = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

const MILESTONES = [
  '5 días sueño antes de 12 AM',
  '4+ sesiones de gym',
  '7 meditaciones esta semana',
  '10 job applications enviadas',
  '2 sesiones de Tarot App',
  '1 noche social / relax real',
  'Bloque 3 completado 2+ veces',
]

export default function TabWeekly() {
  const getWeekStats = useStore((s) => s.getWeekStats)
  const user = useStore((s) => s.user)
  const { days, sleep, gym, meditation, workHours } = getWeekStats()
  const todayDow = new Date().getDay()

  const [milestones, setMilestones] = useState(() => MILESTONES.map(() => false))

  function toggleMilestone(i) {
    setMilestones((m) => m.map((v, idx) => (idx === i ? !v : v)))
  }

  const showBurnout = sleep < 4 && workHours < 4

  return (
    <div className="stack" style={{ gap: 16, paddingBottom: 80 }}>
      {/* ── STATS GRID ── */}
      <div className="grid-2">
        <StatCard label="Sueño 🌙"      val={sleep}     target={7}            color="var(--purple)" unit="días" />
        <StatCard label="Gym 🏋️"        val={gym}       target={user.gymDays || 5} color="var(--orange)" unit="días" />
        <StatCard label="Meditación 🧘" val={meditation} target={7}            color="var(--teal)"   unit="días" />
        <StatCard label="Work hrs 💼"   val={workHours}  target={18}           color="var(--yellow)" unit="hrs" />
      </div>

      {/* ── WEEK GRID ── */}
      <Card accent="teal">
        <div className="label" style={{ marginBottom: 12 }}>Semana</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
          {days.map((d, i) => {
            // days array is Mon–Sun (indices 0–6 = Lun–Dom)
            const dowActual = d.dow // actual day of week
            const isToday = dowActual === todayDow
            const log = d.log
            const gymExpected = GYM_DAYS.includes(dowActual)

            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                <div style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 9,
                  color: isToday ? 'var(--teal)' : 'var(--text-dim)',
                  letterSpacing: '0.1em',
                }}>
                  {DAY_LABELS[i]}
                </div>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: isToday ? 'var(--teal-dim)' : 'var(--bg3)',
                  border: `1px solid ${isToday ? 'var(--teal)' : 'var(--border-mid)'}`,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 3,
                }}>
                  <Dot color={log?.sleep === true ? 'var(--purple)' : 'var(--bg5)'} />
                  {gymExpected
                    ? <Dot color={log?.gym === true ? 'var(--orange)' : 'var(--bg5)'} />
                    : <Dot color="transparent" />
                  }
                  <Dot color={log?.meditation === true ? 'var(--teal)' : 'var(--bg5)'} />
                </div>
              </div>
            )
          })}
        </div>
        <div style={{ marginTop: 12, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <LegendDot color="var(--purple)" label="Sueño" />
          <LegendDot color="var(--orange)" label="Gym" />
          <LegendDot color="var(--teal)"   label="Meditación" />
        </div>
      </Card>

      {/* ── BURNOUT ALERT ── */}
      {showBurnout && (
        <div style={{
          background: 'var(--red-dim)',
          border: '1px solid var(--red-mid)',
          borderRadius: 'var(--radius)',
          padding: '14px 16px',
          display: 'flex',
          gap: 12,
          alignItems: 'flex-start',
          animation: 'scaleIn 0.18s ease',
        }}>
          <span style={{ fontSize: 24 }}>⚠️</span>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--red)', marginBottom: 4 }}>Burnout Alert</div>
            <div style={{ fontSize: 13, color: 'var(--text-mid)' }}>
              Menos de 4 noches de sueño Y menos de 4 horas de trabajo esta semana.
              Prioriza sueño y una sesión hoy.
            </div>
          </div>
        </div>
      )}

      {/* ── MILESTONES ── */}
      <Card accent="green">
        <div className="label" style={{ marginBottom: 12 }}>Milestones Semana</div>
        <div className="stack" style={{ gap: 8 }}>
          {MILESTONES.map((m, i) => (
            <button
              key={i}
              onClick={() => toggleMilestone(i)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: milestones[i] ? 'var(--green-dim)' : 'var(--bg3)',
                border: `1px solid ${milestones[i] ? 'var(--green-mid)' : 'var(--border-mid)'}`,
                borderRadius: 8,
                padding: '10px 12px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'var(--transition)',
              }}
            >
              <span style={{ fontSize: 16 }}>{milestones[i] ? '✅' : '⬜'}</span>
              <span style={{ fontSize: 13, color: milestones[i] ? 'var(--green)' : 'var(--text-mid)', fontWeight: milestones[i] ? 600 : 400 }}>
                {m}
              </span>
            </button>
          ))}
        </div>
        <div style={{ marginTop: 12, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-dim)' }}>
          {milestones.filter(Boolean).length} / {MILESTONES.length} completados esta semana
        </div>
      </Card>
    </div>
  )
}

function StatCard({ label, val, target, color, unit }) {
  const pct = Math.min(100, Math.round((val / target) * 100))
  return (
    <Card>
      <div className="label" style={{ marginBottom: 8 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 8 }}>
        <span style={{ fontFamily: 'var(--display)', fontSize: 28, fontWeight: 800, color }}>{val}</span>
        <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>/ {target} {unit}</span>
      </div>
      <ProgressBar value={val} max={target} color={color} />
      <div style={{ marginTop: 6, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-dim)' }}>
        {pct}% del objetivo
      </div>
    </Card>
  )
}

function Dot({ color }) {
  return (
    <div style={{
      width: 6,
      height: 6,
      borderRadius: '50%',
      background: color,
      transition: 'background 0.2s',
    }} />
  )
}

function LegendDot({ color, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
      <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{label}</span>
    </div>
  )
}
