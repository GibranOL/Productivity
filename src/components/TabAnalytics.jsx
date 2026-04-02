import { useMemo, useState } from 'react'
import useStore from '../store/index'
import useSchedulerStore, { SECTIONS } from '../store/schedulerStore'
import { exportMetricsToCSV, exportMetricsToJSON } from '../utils/exportData'
import { Btn, SectionTitle } from './UI'

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const DAY_SHORT  = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const HOUR_LABEL = ['12a','2a','4a','6a','8a','10a','12p','2p','4p','6p','8p','10p']

const RANGES = [
  { id: 'week',   label: 'Esta semana' },
  { id: 'two',    label: '2 semanas'  },
  { id: 'month',  label: 'Mes'        },
  { id: 'all',    label: 'Todo'       },
]

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function getDayKey(date) {
  return date.toISOString().split('T')[0]
}

function getMonday(weeksBack = 0) {
  const d = new Date()
  const dow = d.getDay()
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1) - weeksBack * 7)
  d.setHours(0, 0, 0, 0)
  return d
}

function getRangeStart(rangeId) {
  if (rangeId === 'week')  return getMonday(0)
  if (rangeId === 'two')   return getMonday(1)
  if (rangeId === 'month') { const d = new Date(); d.setDate(d.getDate() - 30); d.setHours(0,0,0,0); return d }
  return new Date(0)
}

function blockDate(block) {
  if (block.timerStart) return new Date(block.timerStart)
  // No reliable date available — return null so the block is excluded
  // from range-based filters rather than being mis-attributed to this week.
  return null
}

function habitCount(log) {
  if (!log) return 0
  return [log.sleep, log.gym, log.meditation, log.meals].filter((h) => h === true).length
}

// ─── SVG MATH ─────────────────────────────────────────────────────────────────
function polar(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function donutArc(cx, cy, R, ri, start, end) {
  if (end - start >= 360) end = 359.999
  const s1 = polar(cx, cy, R,  start)
  const e1 = polar(cx, cy, R,  end)
  const s2 = polar(cx, cy, ri, end)
  const e2 = polar(cx, cy, ri, start)
  const lg = end - start > 180 ? 1 : 0
  return `M ${s1.x} ${s1.y} A ${R} ${R} 0 ${lg} 1 ${e1.x} ${e1.y} L ${s2.x} ${s2.y} A ${ri} ${ri} 0 ${lg} 0 ${e2.x} ${e2.y} Z`
}

// ─── CHARTS ───────────────────────────────────────────────────────────────────

function DonutChart({ data }) {
  // data: [{label, hours, color}]
  const total = data.reduce((s, d) => s + d.hours, 0)
  const [hovered, setHovered] = useState(null)
  if (total === 0) return <EmptyChart label="Sin datos de bloques completados" />

  let angle = 0
  const slices = data.filter((d) => d.hours > 0).map((d) => {
    const sweep = (d.hours / total) * 360
    const path  = donutArc(100, 100, 82, 52, angle, angle + sweep)
    const mid   = polar(100, 100, 67, angle + sweep / 2)
    const slice = { ...d, path, mid, startAngle: angle, sweep }
    angle += sweep
    return slice
  })

  const active = hovered !== null ? slices[hovered] : null

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
      <svg viewBox="0 0 200 200" style={{ width: 160, height: 160, flexShrink: 0 }}>
        {slices.map((s, i) => (
          <path
            key={s.label}
            d={s.path}
            fill={s.color}
            opacity={hovered === null || hovered === i ? 1 : 0.35}
            style={{ cursor: 'pointer', transition: 'opacity 0.15s' }}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          />
        ))}
        {/* Center text */}
        <text x="100" y="95" textAnchor="middle" style={{ fontFamily: 'var(--display)', fontSize: 22, fontWeight: 800, fill: 'var(--text)' }}>
          {active ? active.hours.toFixed(1) : total.toFixed(1)}
        </text>
        <text x="100" y="112" textAnchor="middle" style={{ fontFamily: 'var(--mono)', fontSize: 9, fill: 'var(--text-dim)', letterSpacing: '0.08em' }}>
          {active ? active.label.toUpperCase() : 'HRS TOTAL'}
        </text>
      </svg>

      {/* Legend */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {slices.map((s, i) => (
          <div
            key={s.label}
            style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', opacity: hovered === null || hovered === i ? 1 : 0.4 }}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            <div style={{ width: 10, height: 10, borderRadius: 2, background: s.color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: 'var(--text-mid)' }}>{s.label}</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text)', marginLeft: 'auto' }}>
              {s.hours.toFixed(1)}h
            </span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-dim)', minWidth: 32 }}>
              {Math.round((s.hours / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function BarChart({ data, maxVal, color = 'var(--teal)' }) {
  // data: [{label, value}]
  const W = 320, H = 160, padL = 28, padB = 24, padT = 10, padR = 8
  const chartW = W - padL - padR
  const chartH = H - padB - padT
  const max    = maxVal || Math.max(...data.map((d) => d.value), 0.5)
  const barW   = (chartW / data.length) * 0.6
  const gap    = chartW / data.length

  const yTicks = [0, max * 0.5, max].map((v) => ({
    val: v,
    y: padT + chartH - (v / max) * chartH,
  }))

  const [hovered, setHovered] = useState(null)

  if (data.every((d) => d.value === 0)) return <EmptyChart label="Sin datos en este rango" />

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: W }}>
      {/* Y grid lines */}
      {yTicks.map((t, i) => (
        <g key={i}>
          <line x1={padL} x2={W - padR} y1={t.y} y2={t.y} stroke="var(--border)" strokeWidth={0.5} />
          <text x={padL - 4} y={t.y + 3} textAnchor="end" style={{ fontSize: 8, fill: 'var(--text-dim)', fontFamily: 'var(--mono)' }}>
            {t.val > 0 ? t.val.toFixed(1) : '0'}
          </text>
        </g>
      ))}

      {/* Bars */}
      {data.map((d, i) => {
        const barH = max > 0 ? (d.value / max) * chartH : 0
        const x    = padL + i * gap + (gap - barW) / 2
        const y    = padT + chartH - barH
        const isHov = hovered === i
        return (
          <g key={d.label} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
            <rect x={x} y={y} width={barW} height={barH || 1} rx={3} fill={color} opacity={isHov ? 1 : 0.7} style={{ transition: 'opacity 0.15s' }} />
            {isHov && barH > 0 && (
              <text x={x + barW / 2} y={y - 4} textAnchor="middle" style={{ fontSize: 9, fill: 'var(--text)', fontFamily: 'var(--mono)' }}>
                {d.value.toFixed(1)}h
              </text>
            )}
            <text x={x + barW / 2} y={H - 6} textAnchor="middle" style={{ fontSize: 9, fill: i === new Date().getDay() - 1 ? 'var(--teal)' : 'var(--text-dim)', fontFamily: 'var(--mono)' }}>
              {d.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function LineChart({ data }) {
  // data: [{label, value, key}] — last 30 days, value 0-4
  const W = 320, H = 100, padL = 24, padB = 20, padT = 10, padR = 8
  const chartW = W - padL - padR
  const chartH = H - padB - padT
  const max = 4

  const [hovered, setHovered] = useState(null)

  const points = data.map((d, i) => ({
    ...d,
    x: padL + (i / (data.length - 1 || 1)) * chartW,
    y: padT + chartH - (d.value / max) * chartH,
  }))

  const polyline = points.map((p) => `${p.x},${p.y}`).join(' ')
  const area = `M ${points[0]?.x} ${padT + chartH} ` +
    points.map((p) => `L ${p.x} ${p.y}`).join(' ') +
    ` L ${points[points.length - 1]?.x} ${padT + chartH} Z`

  if (data.every((d) => d.value === 0)) return <EmptyChart label="Completa check-ins para ver tendencia" />

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: W }}>
      {/* Y grid */}
      {[0, 1, 2, 3, 4].map((v) => {
        const y = padT + chartH - (v / max) * chartH
        return (
          <g key={v}>
            <line x1={padL} x2={W - padR} y1={y} y2={y} stroke="var(--border)" strokeWidth={0.5} />
            <text x={padL - 4} y={y + 3} textAnchor="end" style={{ fontSize: 7, fill: 'var(--text-dim)', fontFamily: 'var(--mono)' }}>{v}</text>
          </g>
        )
      })}

      {/* Area fill */}
      <path d={area} fill="var(--teal)" opacity={0.08} />

      {/* Line */}
      <polyline points={polyline} fill="none" stroke="var(--teal)" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />

      {/* Dots */}
      {points.map((p, i) => (
        <g key={i} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
          <circle cx={p.x} cy={p.y} r={hovered === i ? 4 : 2.5} fill={p.value > 0 ? 'var(--teal)' : 'var(--bg3)'} stroke="var(--teal)" strokeWidth={1} style={{ cursor: 'pointer' }} />
          {hovered === i && (
            <>
              <rect x={p.x - 20} y={p.y - 22} width={40} height={14} rx={3} fill="var(--bg4)" />
              <text x={p.x} y={p.y - 12} textAnchor="middle" style={{ fontSize: 8, fill: 'var(--text)', fontFamily: 'var(--mono)' }}>
                {p.label} {p.value}/4
              </text>
            </>
          )}
        </g>
      ))}

      {/* X labels — every 7 days */}
      {points.filter((_, i) => i % 7 === 0 || i === points.length - 1).map((p, i) => (
        <text key={i} x={p.x} y={H - 4} textAnchor="middle" style={{ fontSize: 7, fill: 'var(--text-dim)', fontFamily: 'var(--mono)' }}>
          {p.label}
        </text>
      ))}
    </svg>
  )
}

function Heatmap({ blocks }) {
  // 7 rows (Mon=0..Sun=6) × 24 cols (0–23)
  const CELL_W = 11, CELL_H = 11, GAP = 2
  const padL = 28, padT = 14
  const grid = Array.from({ length: 7 }, () => new Array(24).fill(0))

  blocks.forEach((b) => {
    let h = null
    if (b.timerStart) {
      h = new Date(b.timerStart).getHours()
    } else {
      h = parseInt(b.startTime?.split(':')[0] ?? '0', 10)
    }
    if (h >= 0 && h < 24 && b.day >= 0 && b.day < 7) {
      grid[b.day][h]++
    }
  })

  const maxCount = Math.max(...grid.flat(), 1)

  const W = padL + 24 * (CELL_W + GAP) + 10
  const H = padT + 7  * (CELL_H + GAP) + 4

  const [hov, setHov] = useState(null)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: W, overflowX: 'auto' }}>
      {/* Hour labels */}
      {HOUR_LABEL.map((lbl, i) => (
        <text key={i} x={padL + i * 2 * (CELL_W + GAP) + CELL_W / 2} y={padT - 3} textAnchor="middle" style={{ fontSize: 6, fill: 'var(--text-dim)', fontFamily: 'var(--mono)' }}>
          {lbl}
        </text>
      ))}

      {/* Day labels */}
      {DAY_SHORT.map((d, row) => (
        <text key={row} x={padL - 4} y={padT + row * (CELL_H + GAP) + CELL_H - 2} textAnchor="end" style={{ fontSize: 7, fill: 'var(--text-dim)', fontFamily: 'var(--mono)' }}>
          {d}
        </text>
      ))}

      {/* Cells */}
      {grid.map((row, ri) =>
        row.map((count, ci) => {
          const x = padL + ci * (CELL_W + GAP)
          const y = padT + ri * (CELL_H + GAP)
          const opacity = count === 0 ? 0.07 : 0.2 + (count / maxCount) * 0.8
          const isHov = hov && hov.r === ri && hov.c === ci
          return (
            <rect
              key={`${ri}-${ci}`}
              x={x} y={y}
              width={CELL_W} height={CELL_H}
              rx={2}
              fill={count === 0 ? 'var(--bg4)' : 'var(--teal)'}
              opacity={opacity}
              style={{ cursor: count > 0 ? 'pointer' : 'default' }}
              onMouseEnter={() => setHov({ r: ri, c: ci, count })}
              onMouseLeave={() => setHov(null)}
            />
          )
        })
      )}

      {/* Tooltip */}
      {hov && hov.count > 0 && (
        <>
          <rect
            x={padL + hov.c * (CELL_W + GAP) - 10}
            y={padT + hov.r * (CELL_H + GAP) - 18}
            width={60} height={14} rx={3} fill="var(--bg4)"
          />
          <text
            x={padL + hov.c * (CELL_W + GAP) + 20}
            y={padT + hov.r * (CELL_H + GAP) - 7}
            textAnchor="middle"
            style={{ fontSize: 7.5, fill: 'var(--teal)', fontFamily: 'var(--mono)' }}
          >
            {DAY_SHORT[hov.r]} {String(hov.c).padStart(2,'0')}:00 · {hov.count}x
          </text>
        </>
      )}
    </svg>
  )
}

function EmptyChart({ label }) {
  return (
    <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-dim)', fontSize: 13 }}>
      {label}
    </div>
  )
}

// ─── STAT CARD ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color = 'var(--teal)' }) {
  return (
    <div style={{
      background: 'var(--bg2)',
      border: `1px solid var(--border-mid)`,
      borderRadius: 12,
      padding: '14px 16px',
      borderTop: `2px solid ${color}`,
    }}>
      <div style={{ fontSize: 18, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontFamily: 'var(--display)', fontSize: 22, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.1em', marginTop: 2 }}>
        {label}
      </div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function TabAnalytics() {
  const [range, setRange] = useState('week')
  const blocks = useSchedulerStore((s) => s.blocks)
  const logs   = useStore((s) => s.logs)
  const streak = useStore((s) => s.streak)

  const rangeStart = useMemo(() => getRangeStart(range), [range])

  // Filtered completed blocks within range.
  // Blocks without timerStart are excluded (no reliable date to compare).
  const doneBlocks = useMemo(() => {
    return blocks.filter((b) => {
      if (b.status !== 'done' && b.status !== 'extended') return false
      const d = blockDate(b)
      return d !== null && d >= rangeStart
    })
  }, [blocks, rangeStart])

  // ── METRICS ────────────────────────────────────────────────────────────────

  const totalHours = useMemo(
    () => doneBlocks.reduce((s, b) => s + (b.actualDuration ?? b.duration) / 60, 0),
    [doneBlocks]
  )

  const bySection = useMemo(() => {
    const acc = {}
    doneBlocks.forEach((b) => {
      acc[b.section] = (acc[b.section] || 0) + (b.actualDuration ?? b.duration) / 60
    })
    return acc
  }, [doneBlocks])

  const donutData = useMemo(
    () =>
      Object.entries(SECTIONS)
        .map(([key, sec]) => ({
          label: sec.label,
          hours: bySection[key] || 0,
          color: sec.color,
        }))
        .filter((d) => d.hours > 0)
        .sort((a, b) => b.hours - a.hours),
    [bySection]
  )

  // Hours by day of week (0=Mon…6=Sun) within range
  const hoursByDay = useMemo(() => {
    const acc = Array(7).fill(0)
    doneBlocks.forEach((b) => {
      acc[b.day] = (acc[b.day] || 0) + (b.actualDuration ?? b.duration) / 60
    })
    return DAY_SHORT.map((l, i) => ({ label: l, value: acc[i] }))
  }, [doneBlocks])

  // Habit score — last 30 days
  const habitTrend = useMemo(() => {
    const result = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key   = getDayKey(d)
      const log   = logs[key]
      const val   = log ? habitCount(log) : 0
      const label = `${d.getDate()}/${d.getMonth() + 1}`
      result.push({ label, value: val, key })
    }
    return result
  }, [logs])

  // Block completion rate — only counts blocks with a known date
  const completionRate = useMemo(() => {
    const relevant = blocks.filter((b) => {
      if (!['done', 'extended', 'skipped'].includes(b.status)) return false
      const d = blockDate(b)
      return d !== null && d >= rangeStart
    })
    if (!relevant.length) return 0
    const done = relevant.filter((b) => b.status !== 'skipped').length
    return Math.round((done / relevant.length) * 100)
  }, [blocks, rangeStart])

  // Habit score for range
  const habitScoreAvg = useMemo(() => {
    const days = Object.entries(logs).filter(([k]) => new Date(k) >= rangeStart)
    if (!days.length) return 0
    const total = days.reduce((s, [, log]) => s + habitCount(log), 0)
    return Math.round((total / (days.length * 4)) * 100)
  }, [logs, rangeStart])

  // Extended blocks — only those with a known date
  const extendedCount = useMemo(() => {
    return blocks.filter((b) => {
      if (b.status !== 'extended') return false
      const d = blockDate(b)
      return d !== null && d >= rangeStart
    }).length
  }, [blocks, rangeStart])

  // Top 5 blocks by actual duration
  const topBlocks = useMemo(
    () =>
      [...doneBlocks]
        .sort((a, b) => (b.actualDuration ?? b.duration) - (a.actualDuration ?? a.duration))
        .slice(0, 5),
    [doneBlocks]
  )

  // Top projects by hours
  const topProjects = useMemo(() => {
    const acc = {}
    doneBlocks
      .filter((b) => b.section === 'project' && b.projectId)
      .forEach((b) => {
        acc[b.projectId] = (acc[b.projectId] || 0) + (b.actualDuration ?? b.duration) / 60
      })
    return Object.entries(acc).sort((a, b) => b[1] - a[1]).slice(0, 5)
  }, [doneBlocks])

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div className="stack" style={{ paddingBottom: 100 }}>

      {/* ── HEADER ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <SectionTitle style={{ marginBottom: 0 }}>ANALYTICS</SectionTitle>
        <div style={{ display: 'flex', gap: 6 }}>
          <Btn variant="ghost" size="sm" onClick={() => exportMetricsToCSV(blocks)}>↓ CSV</Btn>
          <Btn variant="ghost" size="sm" onClick={() => exportMetricsToJSON(blocks, logs)}>↓ JSON</Btn>
        </div>
      </div>

      {/* ── RANGE SELECTOR ── */}
      <div style={{ display: 'flex', gap: 6 }}>
        {RANGES.map((r) => (
          <button
            key={r.id}
            onClick={() => setRange(r.id)}
            style={{
              padding: '5px 12px',
              borderRadius: 20,
              border: `1px solid ${range === r.id ? 'var(--teal-mid)' : 'var(--border-mid)'}`,
              background: range === r.id ? 'var(--teal-dim)' : 'var(--bg3)',
              color: range === r.id ? 'var(--teal)' : 'var(--text-dim)',
              fontSize: 11,
              fontWeight: range === r.id ? 700 : 400,
              cursor: 'pointer',
              fontFamily: 'var(--sans)',
              transition: 'var(--transition)',
            }}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* ── STAT CARDS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
        <StatCard icon="⏱️" label="HORAS TOTALES"     value={totalHours.toFixed(1)}     color="var(--teal)"   sub={`${doneBlocks.length} bloques completados`} />
        <StatCard icon="🏅" label="HÁBITOS"           value={`${habitScoreAvg}%`}        color="var(--green)"  sub={`Streak actual: ${streak?.count ?? 0} días`} />
        <StatCard icon="✅" label="BLOQUES COMPLETADOS" value={`${completionRate}%`}      color="var(--orange)" sub={`${extendedCount} extendidos`} />
        <StatCard icon="📊" label="SECCIÓN TOP"       value={donutData[0]?.label || '—'} color="var(--purple)" sub={donutData[0] ? `${donutData[0].hours.toFixed(1)}h` : 'Sin datos'} />
      </div>

      {/* ── DONUT CHART ── */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border-mid)', borderRadius: 14, padding: 16, borderTop: '2px solid var(--teal)' }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.15em', marginBottom: 14 }}>
          TIEMPO POR SECCIÓN
        </div>
        <DonutChart data={donutData} />
      </div>

      {/* ── BAR CHART ── */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border-mid)', borderRadius: 14, padding: 16, borderTop: '2px solid var(--orange)' }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.15em', marginBottom: 14 }}>
          HORAS POR DÍA DE SEMANA
        </div>
        <BarChart data={hoursByDay} color="var(--orange)" />
      </div>

      {/* ── LINE CHART ── */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border-mid)', borderRadius: 14, padding: 16, borderTop: '2px solid var(--green)' }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.15em', marginBottom: 14 }}>
          HÁBITOS — ÚLTIMOS 30 DÍAS (0–4)
        </div>
        <LineChart data={habitTrend} />
      </div>

      {/* ── HEATMAP ── */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border-mid)', borderRadius: 14, padding: 16, borderTop: '2px solid var(--purple)', overflowX: 'auto' }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.15em', marginBottom: 14 }}>
          ACTIVIDAD POR HORA × DÍA
        </div>
        <Heatmap blocks={doneBlocks} />
      </div>

      {/* ── TABLES ── */}
      {topProjects.length > 0 && (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border-mid)', borderRadius: 14, padding: 16 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.15em', marginBottom: 12 }}>
            TOP PROYECTOS
          </div>
          <div className="stack" style={{ gap: 6 }}>
            {topProjects.map(([id, hrs]) => (
              <div key={id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--text-mid)', textTransform: 'capitalize' }}>{id}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 80, height: 6, background: 'var(--bg4)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${(hrs / (topProjects[0]?.[1] || 1)) * 100}%`, height: '100%', background: 'var(--teal)', borderRadius: 3 }} />
                  </div>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--teal)', minWidth: 36, textAlign: 'right' }}>
                    {hrs.toFixed(1)}h
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {topBlocks.length > 0 && (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border-mid)', borderRadius: 14, padding: 16 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.15em', marginBottom: 12 }}>
            BLOQUES MÁS LARGOS
          </div>
          <div className="stack" style={{ gap: 8 }}>
            {topBlocks.map((b) => {
              const sec = SECTIONS[b.section] || SECTIONS.project
              const actual = b.actualDuration ?? b.duration
              return (
                <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: sec.color, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.title || sec.label}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>{DAY_SHORT[b.day]} · {b.startTime}</div>
                  </div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: sec.color, flexShrink: 0 }}>
                    {Math.floor(actual / 60)}h{actual % 60 > 0 ? ` ${actual % 60}m` : ''}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {doneBlocks.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-dim)' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
          <div style={{ fontSize: 14, marginBottom: 6 }}>Sin datos para este rango</div>
          <div style={{ fontSize: 12 }}>Completa bloques en el Scheduler para ver tus métricas</div>
        </div>
      )}
    </div>
  )
}
