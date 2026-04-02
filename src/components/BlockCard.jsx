import { useState, useEffect, useRef } from 'react'
import useSchedulerStore, { SECTIONS } from '../store/schedulerStore'

export default function BlockCard({ block, onEdit, compact = false }) {
  const startBlock    = useSchedulerStore((s) => s.startBlock)
  const completeBlock = useSchedulerStore((s) => s.completeBlock)
  const skipBlock     = useSchedulerStore((s) => s.skipBlock)
  const activeBlockId = useSchedulerStore((s) => s.activeBlockId)

  const isActive = activeBlockId === block.id
  const [now, setNow] = useState(Date.now())

  // Live clock for active block
  useEffect(() => {
    if (!isActive) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [isActive])

  const elapsed   = isActive && block.timerStart ? Math.max(0, now - block.timerStart) : 0
  const remaining = isActive && block.timerEnd   ? Math.max(0, block.timerEnd - now) : 0
  const progress  = block.duration > 0
    ? Math.min(1, elapsed / (block.duration * 60 * 1000))
    : 0

  const sec = SECTIONS[block.section] || SECTIONS.project

  function fmt(ms) {
    const total = Math.floor(ms / 1000)
    const h = Math.floor(total / 3600)
    const m = Math.floor((total % 3600) / 60)
    const s = total % 60
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const statusDot = {
    pending:  { bg: 'var(--bg5)',       border: 'var(--border-mid)' },
    active:   { bg: sec.dim,            border: sec.mid              },
    done:     { bg: 'var(--green-dim)', border: 'var(--green-mid)'  },
    extended: { bg: sec.dim,            border: sec.mid              },
    skipped:  { bg: 'var(--bg4)',       border: 'var(--border)'     },
  }[block.status] || { bg: 'var(--bg5)', border: 'var(--border-mid)' }

  // ── DRAG ──────────────────────────────────────────────────────────────────
  const cardRef = useRef(null)

  function onDragStart(e) {
    e.dataTransfer.setData('blockId', block.id)
    e.dataTransfer.effectAllowed = 'move'
    setTimeout(() => {
      if (cardRef.current) cardRef.current.style.opacity = '0.4'
    }, 0)
  }

  function onDragEnd() {
    if (cardRef.current) cardRef.current.style.opacity = '1'
  }

  return (
    <div
      ref={cardRef}
      draggable={block.status !== 'active'}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={() => onEdit && onEdit(block)}
      style={{
        background: statusDot.bg,
        border: `1px solid ${statusDot.border}`,
        borderLeft: `3px solid ${sec.color}`,
        borderRadius: 8,
        padding: compact ? '6px 8px' : '10px 12px',
        cursor: 'grab',
        userSelect: 'none',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.15s ease',
        opacity: block.status === 'skipped' ? 0.45 : 1,
      }}
    >
      {/* Active progress bar */}
      {(isActive || block.status === 'active') && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0,
          height: 3,
          width: `${progress * 100}%`,
          background: sec.color,
          transition: 'width 1s linear',
          borderRadius: '0 2px 2px 0',
        }} />
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <span style={{ fontSize: compact ? 14 : 16, lineHeight: 1.3 }}>{block.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Time */}
          <div style={{
            fontFamily: 'var(--mono)',
            fontSize: 9,
            color: 'var(--text-dim)',
            letterSpacing: '0.08em',
            marginBottom: 2,
          }}>
            {block.startTime} – {block.endTime}
          </div>

          {/* Title */}
          <div style={{
            fontSize: compact ? 11 : 12,
            fontWeight: 600,
            color: block.status === 'done' ? 'var(--green)' : block.status === 'skipped' ? 'var(--text-dim)' : 'var(--text)',
            textDecoration: block.status === 'done' ? 'line-through' : 'none',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {block.title || sec.label}
          </div>

          {/* Live timer */}
          {isActive && (
            <div style={{
              fontFamily: 'var(--mono)',
              fontSize: 10,
              color: sec.color,
              marginTop: 3,
              fontWeight: 700,
            }}>
              {fmt(remaining)} restante
            </div>
          )}

          {/* Duration label (not active) */}
          {!isActive && !compact && (
            <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>
              {block.duration} min
            </div>
          )}
        </div>

        {/* Status icon */}
        {block.status === 'done'    && <span style={{ fontSize: 12 }}>✅</span>}
        {block.status === 'skipped' && <span style={{ fontSize: 12 }}>⏭</span>}
      </div>

      {/* Action buttons (visible on non-compact, non-done blocks) */}
      {!compact && block.status === 'pending' && (
        <div
          style={{ display: 'flex', gap: 4, marginTop: 8 }}
          onClick={(e) => e.stopPropagation()}
        >
          <ActionBtn color={sec.color} onClick={() => startBlock(block.id)}>▶ Iniciar</ActionBtn>
          <ActionBtn color="var(--text-dim)" onClick={() => skipBlock(block.id)}>⏭</ActionBtn>
        </div>
      )}

      {!compact && block.status === 'active' && (
        <div
          style={{ display: 'flex', gap: 4, marginTop: 8 }}
          onClick={(e) => e.stopPropagation()}
        >
          <ActionBtn color="var(--green)" onClick={() => completeBlock(block.id)}>✓ Listo</ActionBtn>
        </div>
      )}
    </div>
  )
}

function ActionBtn({ children, color, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'var(--bg4)',
        border: `1px solid ${color}44`,
        borderRadius: 5,
        color,
        fontSize: 11,
        fontWeight: 600,
        padding: '3px 8px',
        cursor: 'pointer',
        transition: 'all 0.15s',
        fontFamily: 'var(--mono)',
      }}
    >
      {children}
    </button>
  )
}
