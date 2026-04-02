import { useEffect } from 'react'
import useSchedulerStore, { SECTIONS } from '../store/schedulerStore'
import useStore from '../store/index'
import { playSuccessSound } from '../utils/sound'
import { scheduleBlockEndNotification, cancelBlockNotification } from '../utils/notifications'

const EXTEND_OPTIONS = [
  { label: '+15 min', minutes: 15 },
  { label: '+30 min', minutes: 30 },
  { label: '+1 hora', minutes: 60 },
]

export default function BlockTransitionModal({ block, onClose }) {
  const completeBlock  = useSchedulerStore((s) => s.completeBlock)
  const extendBlock    = useSchedulerStore((s) => s.extendBlock)
  const blocks         = useSchedulerStore((s) => s.blocks)
  const startBlock     = useSchedulerStore((s) => s.startBlock)
  const logProjectTime = useStore((s) => s.logProjectTime)

  const sec = SECTIONS[block.section] || SECTIONS.project

  // Find the next pending block (same day, next start time)
  const nextBlock = blocks
    .filter((b) => b.day === block.day && b.status === 'pending' && b.startTime > block.startTime)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))[0] || null

  function handleDone() {
    cancelBlockNotification(block.id)
    completeBlock(block.id)
    playSuccessSound()
    // Log time to project if applicable
    if (block.projectId && block.actualDuration) {
      logProjectTime(block.projectId, block.actualDuration)
    } else if (block.projectId && block.duration) {
      logProjectTime(block.projectId, block.duration)
    }
    onClose()
  }

  function handleExtend(minutes) {
    cancelBlockNotification(block.id)
    extendBlock(block.id, minutes)
    // Re-schedule notification for extended time
    const updated = { ...block, timerEnd: (block.timerEnd || Date.now()) + minutes * 60 * 1000 }
    scheduleBlockEndNotification(updated)
    onClose()
  }

  function handleStartNext() {
    handleDone()
    if (nextBlock) startBlock(nextBlock.id)
  }

  const elapsed = block.timerStart
    ? Math.round((Date.now() - block.timerStart) / 60000)
    : block.duration

  function fmtMin(min) {
    const h = Math.floor(min / 60)
    const m = min % 60
    if (h > 0 && m > 0) return `${h}h ${m}min`
    if (h > 0) return `${h}h`
    return `${m}min`
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.75)',
      backdropFilter: 'blur(6px)',
      zIndex: 200,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      animation: 'fadeIn 0.18s ease',
    }}>
      <div style={{
        background: 'var(--bg2)',
        border: `1px solid ${sec.mid}`,
        borderRadius: 'var(--radius-lg)',
        padding: '28px 24px',
        maxWidth: 340,
        width: '100%',
        textAlign: 'center',
        animation: 'scaleIn 0.2s ease',
        boxShadow: `0 20px 60px ${sec.color}22`,
      }}>
        {/* Icon + timer icon */}
        <div style={{ fontSize: 40, marginBottom: 12 }}>⏱️</div>

        <h3 style={{ fontFamily: 'var(--display)', fontSize: 22, marginBottom: 6 }}>
          Terminó el bloque
        </h3>

        <div style={{
          fontSize: 16,
          fontWeight: 600,
          color: sec.color,
          marginBottom: 4,
        }}>
          {block.icon} {block.title || sec.label}
        </div>

        <div style={{
          fontFamily: 'var(--mono)',
          fontSize: 13,
          color: 'var(--text-mid)',
          marginBottom: 24,
        }}>
          {fmtMin(elapsed)} completados
        </div>

        <div style={{
          fontSize: 15,
          color: 'var(--text-mid)',
          marginBottom: 20,
        }}>
          ¿Le seguimos o ya quedó?
        </div>

        {/* Extend options */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {EXTEND_OPTIONS.map(({ label, minutes }) => (
            <button
              key={minutes}
              onClick={() => handleExtend(minutes)}
              style={{
                flex: 1,
                padding: '10px 4px',
                borderRadius: 10,
                border: `1px solid ${sec.mid}`,
                background: sec.dim,
                color: sec.color,
                fontFamily: 'var(--mono)',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'var(--transition)',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Done button */}
        <button
          onClick={handleDone}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: 12,
            border: '1px solid var(--green-mid)',
            background: 'var(--green-dim)',
            color: 'var(--green)',
            fontFamily: 'var(--sans)',
            fontSize: 16,
            fontWeight: 700,
            cursor: 'pointer',
            marginBottom: nextBlock ? 10 : 0,
            transition: 'var(--transition)',
          }}
        >
          ✓ Terminé
        </button>

        {/* Auto-start next block */}
        {nextBlock && (
          <button
            onClick={handleStartNext}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: 10,
              border: '1px solid var(--border-mid)',
              background: 'var(--bg3)',
              color: 'var(--text-mid)',
              fontFamily: 'var(--sans)',
              fontSize: 13,
              cursor: 'pointer',
              transition: 'var(--transition)',
            }}
          >
            ✓ Terminé + Iniciar "{nextBlock.title || nextBlock.section}"
          </button>
        )}
      </div>
    </div>
  )
}
