import { useState, useEffect } from 'react'
import useSchedulerStore, { SECTIONS } from '../store/schedulerStore'
import { playBlockEndSound } from '../utils/sound'
import { scheduleBlockEndNotification, cancelBlockNotification } from '../utils/notifications'

// This component mounts a fixed bar below the header when a block is active.
// It also detects when timerEnd passes and triggers the transition.

export default function ActiveBlockTimer({ onBlockEnded }) {
  const activeBlockId = useSchedulerStore((s) => s.activeBlockId)
  const blocks        = useSchedulerStore((s) => s.blocks)
  const completeBlock = useSchedulerStore((s) => s.completeBlock)

  const [now, setNow]   = useState(Date.now())
  const [fired, setFired] = useState(false)

  const block = blocks.find((b) => b.id === activeBlockId) || null

  // Live clock tick
  useEffect(() => {
    if (!block) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [block?.id])

  // Schedule web notification when block starts / changes
  useEffect(() => {
    if (!block) return
    setFired(false)
    scheduleBlockEndNotification(block)
    return () => cancelBlockNotification(block.id)
  }, [block?.id, block?.timerEnd])

  // Detect end and fire transition
  useEffect(() => {
    if (!block || fired) return
    if (block.timerEnd && now >= block.timerEnd) {
      setFired(true)
      playBlockEndSound()
      onBlockEnded(block)
    }
  }, [now, block, fired])

  // Guard: no block, or block not properly started (malformed / stale state)
  if (!block) return null
  if (
    typeof block.timerStart !== 'number' || block.timerStart <= 0 ||
    typeof block.timerEnd   !== 'number' || block.timerEnd   <= 0
  ) return null

  const sec       = SECTIONS[block.section] || SECTIONS.project
  const elapsed   = block.timerStart ? Math.max(0, now - block.timerStart) : 0
  const total     = block.duration * 60 * 1000
  const remaining = block.timerEnd  ? Math.max(0, block.timerEnd - now) : 0
  const progress  = Math.min(1, elapsed / total)

  const isOvertime = remaining === 0

  function fmt(ms) {
    const s = Math.floor(ms / 1000)
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
    return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
  }

  return (
    <div style={{
      position: 'sticky',
      top: 0,
      zIndex: 19,
      background: isOvertime ? 'var(--red-dim)' : sec.dim,
      borderBottom: `1px solid ${isOvertime ? 'var(--red-mid)' : sec.mid}`,
      padding: '8px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      animation: 'slideDown 0.2s ease',
    }}>
      {/* Icon + title */}
      <span style={{ fontSize: 18 }}>{block.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12,
          fontWeight: 600,
          color: isOvertime ? 'var(--red)' : sec.color,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {block.title || sec.label}
        </div>

        {/* Progress bar */}
        <div style={{
          height: 3,
          background: 'var(--bg4)',
          borderRadius: 2,
          marginTop: 4,
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${progress * 100}%`,
            background: isOvertime ? 'var(--red)' : sec.color,
            borderRadius: 2,
            transition: 'width 1s linear',
          }} />
        </div>
      </div>

      {/* Timer */}
      <div style={{
        fontFamily: 'var(--mono)',
        fontSize: 13,
        fontWeight: 700,
        color: isOvertime ? 'var(--red)' : sec.color,
        minWidth: 56,
        textAlign: 'right',
        animation: isOvertime ? 'pulse 1s infinite' : 'none',
      }}>
        {isOvertime ? `+${fmt(elapsed - total)}` : fmt(remaining)}
      </div>

      {/* Done button */}
      <button
        onClick={() => { cancelBlockNotification(block.id); completeBlock(block.id) }}
        style={{
          background: 'var(--green-dim)',
          border: '1px solid var(--green-mid)',
          borderRadius: 6,
          color: 'var(--green)',
          fontFamily: 'var(--mono)',
          fontSize: 11,
          fontWeight: 700,
          padding: '4px 10px',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        ✓
      </button>
    </div>
  )
}
