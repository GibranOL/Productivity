import { useState, useEffect } from 'react'
import useJobStore, {
  ACTIVE_STATUSES,
  TERMINAL_STATUSES,
  JOB_STATUS_CONFIG,
} from '../../store/jobStore'
import { Badge, ProgressBar } from '../UI'

// ─── Pipeline Columns (active only — terminal shown below) ───────────────────
const PIPELINE_COLS = ACTIVE_STATUSES

export default function JobPipeline({ onAddJob, onEditJob, onAnalyzeJD }) {
  const jobs = useJobStore((s) => s.jobs)
  const moveJob = useJobStore((s) => s.moveJob)
  const getDaysInStatus = useJobStore((s) => s.getDaysInStatus)
  const isStale = useJobStore((s) => s.isStale)
  const getPipelineCounts = useJobStore((s) => s.getPipelineCounts)
  const getWeeklyAppliedCount = useJobStore((s) => s.getWeeklyAppliedCount)

  const [draggedId, setDraggedId] = useState(null)
  const [dragOverCol, setDragOverCol] = useState(null)

  const counts = getPipelineCounts()
  const weeklyApplied = getWeeklyAppliedCount()

  function handleDragStart(e, jobId) {
    setDraggedId(jobId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', jobId)
  }

  function handleDragEnd() {
    setDraggedId(null)
    setDragOverCol(null)
  }

  function handleDragOver(e, col) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverCol(col)
  }

  function handleDrop(e, col) {
    e.preventDefault()
    const jobId = e.dataTransfer.getData('text/plain')
    if (jobId) moveJob(jobId, col)
    setDraggedId(null)
    setDragOverCol(null)
  }

  const terminalJobs = jobs.filter((j) => TERMINAL_STATUSES.includes(j.status))

  return (
    <div style={{ position: 'relative', zIndex: 1 }}>
      {/* Stats bar */}
      <div style={s.statsBar}>
        <StatPill label="PIPELINE" value={counts.active} color="var(--teal)" />
        <StatPill label="ESTA SEMANA" value={weeklyApplied} color="var(--orange)" />
        <StatPill label="OFERTAS" value={counts.offer || 0} color="var(--green)" />
        <StatPill label="TOTAL" value={counts.total} color="var(--text-mid)" />
      </div>

      {/* Pipeline columns */}
      <div className="job-pipeline-grid" style={s.pipelineGrid}>
        {PIPELINE_COLS.map((status) => {
          const cfg = JOB_STATUS_CONFIG[status]
          const colJobs = jobs.filter((j) => j.status === status)
          const isOver = dragOverCol === status

          return (
            <div
              key={status}
              style={{
                ...s.column,
                borderColor: isOver ? cfg.color : 'var(--border-mid)',
                background: isOver ? 'var(--bg3)' : 'var(--bg2)',
              }}
              onDragOver={(e) => handleDragOver(e, status)}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={(e) => handleDrop(e, status)}
            >
              {/* Column header */}
              <div style={s.colHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 12 }}>{cfg.icon}</span>
                  <span style={{ ...s.colTitle, color: cfg.color }}>{cfg.label}</span>
                </div>
                <span style={{ ...s.colCount, color: cfg.color, background: cfg.color + '18' }}>
                  {colJobs.length}
                </span>
              </div>

              {/* Jobs */}
              <div style={s.colBody}>
                {colJobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    isDragging={draggedId === job.id}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onClick={() => onEditJob(job)}
                    onAnalyze={() => onAnalyzeJD(job)}
                    daysInStatus={getDaysInStatus(job)}
                    stale={isStale(job)}
                  />
                ))}
                {colJobs.length === 0 && (
                  <div style={s.emptyCol}>
                    {status === 'wishlist' && 'Agrega vacantes'}
                    {status === 'applied' && 'CV enviados'}
                    {status === 'screening' && 'Llamadas RRHH'}
                    {status === 'technical' && 'Coding challenges'}
                    {status === 'final_interview' && 'Con el HM'}
                    {status === 'offer' && 'El objetivo'}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Terminal section (Rejected/Ghosted) */}
      {terminalJobs.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={s.terminalHeader}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.15em', color: 'var(--text-dim)' }}>
              CERRADAS ({terminalJobs.length})
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {terminalJobs.slice(0, 10).map((job) => {
              const cfg = JOB_STATUS_CONFIG[job.status]
              return (
                <div
                  key={job.id}
                  onClick={() => onEditJob(job)}
                  style={s.terminalCard}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                    <span style={{ fontSize: 12 }}>{cfg.icon}</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dim)' }}>{job.company}</div>
                      {job.role && <div style={{ fontSize: 10, color: 'var(--text-dim)', opacity: 0.7 }}>{job.role}</div>}
                    </div>
                  </div>
                  <span className={`badge badge-${cfg.colorName === 'text-dim' ? 'red' : cfg.colorName}`} style={{ fontSize: 9 }}>
                    {cfg.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Job Card ────────────────────────────────────────────────────────────────
function JobCard({ job, isDragging, onDragStart, onDragEnd, onClick, onAnalyze, daysInStatus, stale }) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, job.id)}
      onDragEnd={onDragEnd}
      style={{
        ...s.card,
        opacity: isDragging ? 0.4 : 1,
        borderColor: stale ? 'var(--red-mid)' : 'var(--border-mid)',
      }}
    >
      {/* Company + stale */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', lineHeight: 1.3 }}>
          {job.company}
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
          {stale && (
            <span style={{
              fontSize: 8, fontFamily: 'var(--mono)', fontWeight: 700,
              padding: '1px 5px', borderRadius: 6,
              background: 'var(--red-dim)', color: 'var(--red)',
              border: '1px solid var(--red-mid)',
              letterSpacing: '0.08em',
            }}>
              STALE
            </span>
          )}
          {daysInStatus > 0 && (
            <span style={{
              fontFamily: 'var(--mono)', fontSize: 9,
              color: stale ? 'var(--red)' : 'var(--text-dim)',
            }}>
              {daysInStatus}d
            </span>
          )}
        </div>
      </div>

      {/* Role */}
      {job.role && (
        <div style={{ fontSize: 11, color: 'var(--text-mid)', marginBottom: 4 }}>{job.role}</div>
      )}

      {/* Salary + Location */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
        {job.salary && (
          <span style={{ fontSize: 10, color: 'var(--green)', fontFamily: 'var(--mono)' }}>
            {job.salary}
          </span>
        )}
        {job.location && (
          <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>
            {job.location}
          </span>
        )}
      </div>

      {/* Match score */}
      {job.matchScore !== null && job.matchScore !== undefined && (
        <div style={{ marginBottom: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
            <span style={{ fontSize: 9, fontFamily: 'var(--mono)', color: 'var(--text-dim)', letterSpacing: '0.1em' }}>
              MATCH
            </span>
            <span style={{
              fontSize: 11, fontFamily: 'var(--display)', fontWeight: 800,
              color: job.matchScore >= 70 ? 'var(--green)' : job.matchScore >= 40 ? 'var(--yellow)' : 'var(--red)',
            }}>
              {job.matchScore}%
            </span>
          </div>
          <ProgressBar
            value={job.matchScore}
            max={100}
            color={job.matchScore >= 70 ? 'var(--green)' : job.matchScore >= 40 ? 'var(--yellow)' : 'var(--red)'}
            height={3}
          />
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={(e) => { e.stopPropagation(); onClick() }} style={s.cardBtn}>
          Editar
        </button>
        {job.jdText && (
          <button onClick={(e) => { e.stopPropagation(); onAnalyze() }} style={{ ...s.cardBtn, color: 'var(--teal)' }}>
            Analizar
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function StatPill({ label, value, color }) {
  return (
    <div style={s.statPill}>
      <span style={{ fontFamily: 'var(--display)', fontSize: 18, fontWeight: 800, color }}>{value}</span>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: '0.15em', color: 'var(--text-dim)' }}>{label}</span>
    </div>
  )
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const s = {
  statsBar: {
    display: 'flex',
    gap: 8,
    marginBottom: 14,
    overflowX: 'auto',
  },
  statPill: {
    flex: 1,
    minWidth: 70,
    background: 'var(--bg2)',
    border: '1px solid var(--border-mid)',
    borderRadius: 10,
    padding: '8px 10px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  pipelineGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(6, 1fr)',
    gap: 8,
    minHeight: 300,
  },
  column: {
    borderRadius: 10,
    border: '1px solid var(--border-mid)',
    background: 'var(--bg2)',
    display: 'flex',
    flexDirection: 'column',
    transition: 'all 0.18s ease',
    overflow: 'hidden',
    minWidth: 0,
  },
  colHeader: {
    padding: '8px 8px',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0,
  },
  colTitle: {
    fontFamily: 'var(--mono)',
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
  },
  colCount: {
    fontFamily: 'var(--mono)',
    fontSize: 10,
    fontWeight: 700,
    borderRadius: 8,
    padding: '1px 6px',
  },
  colBody: {
    flex: 1,
    padding: 6,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    overflowY: 'auto',
    minHeight: 80,
  },
  emptyCol: {
    textAlign: 'center',
    padding: '16px 4px',
    color: 'var(--text-dim)',
    fontSize: 10,
    fontStyle: 'italic',
  },
  card: {
    background: 'var(--bg3)',
    border: '1px solid var(--border-mid)',
    borderRadius: 8,
    padding: '8px 10px',
    cursor: 'grab',
    transition: 'all 0.15s ease',
    userSelect: 'none',
  },
  cardBtn: {
    fontSize: 10,
    fontFamily: 'var(--mono)',
    color: 'var(--text-dim)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '2px 4px',
    letterSpacing: '0.05em',
  },
  terminalHeader: {
    marginBottom: 8,
  },
  terminalCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 10px',
    background: 'var(--bg2)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'var(--transition)',
    opacity: 0.7,
  },
}
