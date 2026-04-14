import useStore from '../store/index'
import useWellnessStore from '../store/wellnessStore'
import { defaultDayLog } from '../store/index'
import { Card, Btn, ProgressBar, Badge, SectionTitle, Toggle } from './UI'
import { getCircadianInsight, getDaySchedule, getTodayDow, getTonightPlan, isGymDay, getDayKey } from '../utils/date'
import SleepTracker from './wellness/SleepTracker'

const TAG_COLORS = {
  work:  'var(--teal)',
  gym:   'var(--orange)',
  rest:  'var(--text-dim)',
  med:   'var(--purple)',
  sleep: 'var(--purple)',
}

const FOCUS_PROJECTS = {
  1: 'TrueNorth Pathways 🧭', // Lun
  2: 'Job Search 💼',          // Mar
  3: 'TrueNorth Pathways 🧭', // Mié
  4: 'Job Search 💼',          // Jue
  5: 'Flex 🎯',                // Vie
  6: 'Meal Prep + Tarot 🔮',  // Sáb
  0: 'Trabajo ligero 💤',      // Dom
}

export default function TabToday() {
  const dow = getTodayDow()
  const insight = getCircadianInsight()
  const schedule = getDaySchedule(dow)
  const tonight = getTonightPlan(dow)
  const gymDay = isGymDay(dow)

  const setEnergy     = useStore((s) => s.setEnergy)
  const setHabit      = useStore((s) => s.setHabit)
  const patchFocusBlock = useStore((s) => s.patchFocusBlock)
  // Reactive subscription — re-renders whenever today's log changes
  const log = useStore((s) => s.logs[getDayKey()] || defaultDayLog())
  const hasTarot = [2, 4, 6].includes(dow)

  // Morning sleep prompt — show 8-11 AM if no sleep logged yet
  const todaySleep = useWellnessStore((s) => s.getTodaySleep())
  const hour = new Date().getHours()
  const showSleepPrompt = !todaySleep && hour >= 8 && hour < 11

  return (
    <div className="stack" style={{ gap: 16, paddingBottom: 80 }}>
      {/* ── MORNING SLEEP PROMPT (zero-friction entry 8-11 AM) ── */}
      {showSleepPrompt && <SleepTracker />}

      {/* ── CIRCADIAN BANNER ── */}
      <div style={{
        background: insight.bg,
        border: `1px solid ${insight.color}44`,
        borderRadius: 'var(--radius)',
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <span style={{ fontSize: 24 }}>{insight.icon}</span>
        <div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', color: insight.color }}>
            {insight.label}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-mid)', marginTop: 2 }}>{insight.text}</div>
        </div>
      </div>

      {/* ── ENERGY + HABITS ── */}
      <div className="grid-2">
        <EnergyCard energy={log.energy} setEnergy={setEnergy} />
        <HabitsCard log={log} setHabit={setHabit} gymDay={gymDay} />
      </div>

      {/* ── FOCUS BLOCKS ── */}
      <FocusBlocksCard
        dow={dow}
        log={log}
        hasTarot={hasTarot}
        patchFocusBlock={patchFocusBlock}
      />

      {/* ── SCHEDULE ── */}
      <ScheduleCard schedule={schedule} log={log} setHabit={setHabit} patchFocusBlock={patchFocusBlock} />

      {/* ── TONIGHT ── */}
      <TonightCard tonight={tonight} />
    </div>
  )
}

// ─── ENERGY CARD ─────────────────────────────────────────────────────────────
function EnergyCard({ energy, setEnergy }) {
  const color = energy >= 7 ? 'var(--green)' : energy >= 4 ? 'var(--orange)' : 'var(--red)'
  const r = 30
  const circ = 2 * Math.PI * r
  const offset = circ - (energy / 10) * circ

  return (
    <Card accent={energy >= 7 ? 'green' : energy >= 4 ? 'orange' : 'red'}>
      <div className="label" style={{ marginBottom: 10 }}>Energía</div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <svg width="76" height="76" viewBox="0 0 76 76">
          <circle cx="38" cy="38" r={r} fill="none" stroke="var(--bg4)" strokeWidth="6" />
          <circle
            cx="38" cy="38" r={r}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform="rotate(-90 38 38)"
            style={{ transition: 'stroke-dashoffset 0.4s ease' }}
          />
          <text x="38" y="43" textAnchor="middle"
            style={{ fontFamily: 'var(--display)', fontSize: 22, fontWeight: 800, fill: color }}>
            {energy}
          </text>
        </svg>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            aria-label="Reducir energía"
            onClick={() => setEnergy(energy - 1)}
            style={{ width: 44, height: 44, borderRadius: 8, border: '1px solid var(--border-mid)', background: 'var(--bg3)', color: 'var(--text)', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            −
          </button>
          <button
            aria-label="Aumentar energía"
            onClick={() => setEnergy(energy + 1)}
            style={{ width: 44, height: 44, borderRadius: 8, border: '1px solid var(--border-mid)', background: 'var(--bg3)', color: 'var(--text)', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            +
          </button>
        </div>
      </div>
    </Card>
  )
}

// ─── HABITS CARD ─────────────────────────────────────────────────────────────
function HabitsCard({ log, setHabit, gymDay }) {
  const habits = [
    { key: 'sleep',      icon: '🌙', label: 'Sueño',      color: 'var(--purple)' },
    { key: 'gym',        icon: '🏋️', label: 'Gym',        color: 'var(--orange)', skip: !gymDay },
    { key: 'meditation', icon: '🧘', label: 'Meditación', color: 'var(--teal)' },
    { key: 'meals',      icon: '🥗', label: 'Comidas',    color: 'var(--green)' },
  ].filter((h) => !h.skip)

  function cycleHabit(key) {
    const cur = log[key]
    const next = cur === null || cur === undefined ? true : cur === true ? false : null
    setHabit(key, next)
  }

  return (
    <Card accent="green">
      <div className="label" style={{ marginBottom: 10 }}>Hábitos</div>
      <div className="stack" style={{ gap: 8 }}>
        {habits.map((h) => {
          const val = log[h.key]
          const bg    = val === true ? 'var(--green-dim)' : val === false ? 'var(--red-dim)' : 'var(--bg3)'
          const border= val === true ? 'var(--green-mid)' : val === false ? 'var(--red-mid)' : 'var(--border-mid)'
          const tc    = val === true ? 'var(--green)' : val === false ? 'var(--red)' : 'var(--text-dim)'
          return (
            <button
              key={h.key}
              onClick={() => cycleHabit(h.key)}
              style={{
                background: bg,
                border: `1px solid ${border}`,
                borderRadius: 8,
                padding: '9px 10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                transition: 'var(--transition)',
              }}
            >
              <span style={{ fontSize: 16 }}>{h.icon}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: tc }}>{h.label}</span>
              <span style={{ marginLeft: 'auto', fontSize: 12, color: tc }}>
                {val === true ? '✓' : val === false ? '✗' : '—'}
              </span>
            </button>
          )
        })}
      </div>
    </Card>
  )
}

// ─── FOCUS BLOCKS CARD ───────────────────────────────────────────────────────
function FocusBlocksCard({ dow, log, hasTarot, patchFocusBlock }) {
  const mainProj = FOCUS_PROJECTS[dow] || 'Flex 🎯'
  const blocks = [
    { idx: 0, time: '9:00 – 10:30 AM', name: mainProj },
    { idx: 1, time: '11:00 AM – 12:30 PM', name: mainProj },
    ...(hasTarot ? [{ idx: 2, time: '7:30 – 9:00 PM', name: 'Tarot App 🔮' }] : []),
  ]

  return (
    <Card accent="teal">
      <div className="row-between" style={{ marginBottom: 12 }}>
        <div className="label">Bloques de Foco</div>
        <Badge color="teal">{log.focusBlocks.filter((b) => b.done).length}/{blocks.length}</Badge>
      </div>
      <div className="stack" style={{ gap: 8 }}>
        {blocks.map((b) => {
          const block = log.focusBlocks[b.idx]
          const done = block?.done
          return (
            <button
              key={b.idx}
              onClick={() => patchFocusBlock(b.idx, { done: !done })}
              style={{
                background: done ? 'var(--teal-dim)' : 'var(--bg3)',
                border: `1px solid ${done ? 'var(--teal-mid)' : 'var(--border-mid)'}`,
                borderRadius: 10,
                padding: '12px 14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                textAlign: 'left',
                transition: 'var(--transition)',
              }}
            >
              <span style={{ fontSize: 18 }}>{done ? '✅' : '⬜'}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: done ? 'var(--teal)' : 'var(--text)' }}>{b.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 1, fontFamily: 'var(--mono)' }}>{b.time}</div>
              </div>
            </button>
          )
        })}
      </div>
    </Card>
  )
}

// ─── SCHEDULE CARD ────────────────────────────────────────────────────────────
function ScheduleCard({ schedule, log, setHabit, patchFocusBlock }) {
  const now = new Date()

  function handleBlock(block) {
    if (!block.habit) return
    if (block.habit === 'fb0') patchFocusBlock(0, { done: !log.focusBlocks[0]?.done })
    else if (block.habit === 'fb1') patchFocusBlock(1, { done: !log.focusBlocks[1]?.done })
    else if (block.habit === 'fb2') patchFocusBlock(2, { done: !log.focusBlocks[2]?.done })
    else {
      const cur = log[block.habit]
      const next = cur === null || cur === undefined ? true : cur === true ? false : null
      setHabit(block.habit, next)
    }
  }

  function getHabitDone(habit) {
    if (habit === 'fb0') return log.focusBlocks[0]?.done
    if (habit === 'fb1') return log.focusBlocks[1]?.done
    if (habit === 'fb2') return log.focusBlocks[2]?.done
    return log[habit]
  }

  return (
    <Card accent="teal">
      <div className="label" style={{ marginBottom: 12 }}>Schedule de Hoy</div>
      <div className="stack" style={{ gap: 6 }}>
        {schedule.map((block, i) => {
          const color = TAG_COLORS[block.tag] || 'var(--text-dim)'
          const hasDone = block.habit && getHabitDone(block.habit) === true
          return (
            <div
              key={i}
              onClick={() => handleBlock(block)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '9px 12px',
                borderRadius: 8,
                background: hasDone ? `${color}15` : 'var(--bg3)',
                border: `1px solid ${hasDone ? color + '44' : 'var(--border)'}`,
                cursor: block.habit ? 'pointer' : 'default',
                transition: 'var(--transition)',
              }}
            >
              <span style={{ fontSize: 16, minWidth: 22, textAlign: 'center' }}>{block.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: hasDone ? color : 'var(--text)' }}>{block.name}</div>
                <div style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--text-dim)', marginTop: 1 }}>{block.time}</div>
              </div>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: color,
                opacity: block.tag === 'rest' ? 0.3 : 0.8,
                flexShrink: 0,
              }} />
            </div>
          )
        })}
      </div>
    </Card>
  )
}

// ─── TONIGHT CARD ─────────────────────────────────────────────────────────────
function TonightCard({ tonight }) {
  return (
    <Card accent="purple" style={{ textAlign: 'center', padding: '20px 16px' }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>{tonight.icon}</div>
      <div style={{ fontFamily: 'var(--display)', fontSize: 20, fontWeight: 700, marginBottom: 6 }}>
        Esta noche: {tonight.label}
      </div>
      <div style={{ fontSize: 14, color: 'var(--text-mid)' }}>{tonight.text}</div>
    </Card>
  )
}
