import { useState } from 'react'
import useCalendarEventStore from '../../store/calendarEventStore'
import { EVENT_STATUS, EVENT_TYPES } from '../../lib/appwriteCollections'
import { TYPE_ICONS, getTypeLabel } from '../../lib/calendarAdapter'
import { formatTime, formatDateHeader, durationMinutes } from '../../lib/dateUtils'

export default function CalendarEventPopup({ event, onClose }) {
  const patchEvent = useCalendarEventStore((s) => s.patchEvent)
  const removeEvent = useCalendarEventStore((s) => s.removeEvent)
  const startEvent = useCalendarEventStore((s) => s.startEvent)
  const completeEvent = useCalendarEventStore((s) => s.completeEvent)
  const skipEvent = useCalendarEventStore((s) => s.skipEvent)

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(event.title)
  const [editNotes, setEditNotes] = useState(event.metadata?.notes || '')

  const icon = event.icon || TYPE_ICONS[event.type] || '📌'
  const duration = durationMinutes(event.startDate, event.endDate)
  const isActive = event.status === EVENT_STATUS.ACTIVE
  const isDone = event.status === EVENT_STATUS.DONE

  function handleSave() {
    patchEvent(event.id, {
      title: editTitle,
      metadata: { ...event.metadata, notes: editNotes },
    })
    setEditing(false)
  }

  function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    removeEvent(event.id)
    onClose()
  }

  function handleStatusAction(action) {
    if (action === 'start') startEvent(event.id)
    if (action === 'complete') completeEvent(event.id)
    if (action === 'skip') skipEvent(event.id)
    onClose()
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.sheet} onClick={(e) => e.stopPropagation()}>
        {/* Accent line */}
        <div style={{
          height: 3,
          borderRadius: '3px 3px 0 0',
          background: `linear-gradient(90deg, ${getAccentColor(event.type)}, transparent)`,
        }} />

        {/* Header */}
        <div style={styles.header}>
          <div style={styles.iconBadge}>{icon}</div>
          <div style={{ flex: 1 }}>
            {editing ? (
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                style={styles.editInput}
                autoFocus
              />
            ) : (
              <h3 style={styles.title}>{event.title}</h3>
            )}
            <div style={styles.meta}>
              <span style={styles.typeBadge}>{getTypeLabel(event.type)}</span>
              <span style={styles.statusBadge(event.status)}>
                {getStatusLabel(event.status)}
              </span>
            </div>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        {/* Time info */}
        <div style={styles.timeRow}>
          <span style={styles.timeLabel}>
            {formatDateHeader(event.startDate)}
          </span>
          <span style={styles.timeValue}>
            {formatTime(event.startDate)} — {formatTime(event.endDate)}
          </span>
          <span style={styles.duration}>{duration} min</span>
        </div>

        {/* Subtitle */}
        {event.subtitle && (
          <p style={styles.subtitle}>{event.subtitle}</p>
        )}

        {/* Notes */}
        <div style={styles.section}>
          <label style={styles.sectionLabel}>NOTAS</label>
          {editing ? (
            <textarea
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              style={styles.editTextarea}
              placeholder="Notas sobre esta actividad..."
              rows={3}
            />
          ) : (
            <p style={styles.notes}>
              {event.metadata?.notes || 'Sin notas'}
            </p>
          )}
        </div>

        {/* Metadata */}
        {event.metadata?.objectives?.length > 0 && (
          <div style={styles.section}>
            <label style={styles.sectionLabel}>OBJETIVOS</label>
            {event.metadata.objectives.map((obj, i) => (
              <div key={i} style={styles.objectiveItem}>
                <span style={{ color: 'var(--teal)' }}>▸</span> {obj}
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div style={styles.actions}>
          {editing ? (
            <>
              <button style={styles.btnGhost} onClick={() => setEditing(false)}>Cancelar</button>
              <button style={styles.btnPrimary} onClick={handleSave}>Guardar</button>
            </>
          ) : (
            <>
              {/* Status actions */}
              {event.status === EVENT_STATUS.PENDING && (
                <>
                  <button style={styles.btnPrimary} onClick={() => handleStatusAction('start')}>
                    ▶ Iniciar
                  </button>
                  <button style={styles.btnGhost} onClick={() => handleStatusAction('skip')}>
                    ⏭ Saltar
                  </button>
                </>
              )}
              {isActive && (
                <button style={styles.btnPrimary} onClick={() => handleStatusAction('complete')}>
                  ✓ Completar
                </button>
              )}
              {isDone && (
                <span style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem', color: 'var(--green)' }}>
                  ✓ Completado
                  {event.metadata?.actualDuration && ` (${event.metadata.actualDuration} min)`}
                </span>
              )}

              <div style={{ flex: 1 }} />

              <button style={styles.btnGhost} onClick={() => setEditing(true)}>
                ✏️ Editar
              </button>
              <button
                style={{ ...styles.btnGhost, color: confirmDelete ? 'var(--red)' : 'var(--text-dim)' }}
                onClick={handleDelete}
              >
                {confirmDelete ? '¿Seguro? Click de nuevo' : '🗑'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function getAccentColor(type) {
  const map = {
    [EVENT_TYPES.PROJECT_BLOCK]: 'var(--teal)',
    [EVENT_TYPES.GYM]: 'var(--orange)',
    [EVENT_TYPES.MEAL]: 'var(--green)',
    [EVENT_TYPES.MEDITATION]: 'var(--purple)',
    [EVENT_TYPES.SLEEP]: 'var(--indigo)',
    [EVENT_TYPES.RELAX]: 'var(--pink)',
    [EVENT_TYPES.MEDICATION]: 'var(--red)',
  }
  return map[type] || 'var(--teal)'
}

function getStatusLabel(status) {
  const map = {
    [EVENT_STATUS.PENDING]: 'Pendiente',
    [EVENT_STATUS.ACTIVE]: 'En curso',
    [EVENT_STATUS.DONE]: 'Completado',
    [EVENT_STATUS.SKIPPED]: 'Saltado',
    [EVENT_STATUS.EXTENDED]: 'Extendido',
  }
  return map[status] || status
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 100,
    background: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    animation: 'fadeIn 0.15s ease',
  },
  sheet: {
    background: 'var(--bg2)',
    border: '1px solid var(--border-mid)',
    borderRadius: '16px 16px 0 0',
    width: '100%',
    maxWidth: '560px',
    maxHeight: '85dvh',
    overflow: 'auto',
    animation: 'slideUp 0.2s ease',
    paddingBottom: 'calc(20px + env(safe-area-inset-bottom))',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '20px 20px 12px',
  },
  iconBadge: {
    fontSize: '1.8rem',
    lineHeight: 1,
    minWidth: '40px',
    textAlign: 'center',
  },
  title: {
    fontFamily: 'var(--display)',
    fontSize: '1.2rem',
    fontWeight: 800,
    color: 'var(--text)',
    margin: '0 0 6px',
  },
  meta: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  typeBadge: {
    fontFamily: 'var(--mono)',
    fontSize: '0.6rem',
    textTransform: 'uppercase',
    letterSpacing: '1.5px',
    color: 'var(--text-dim)',
    padding: '2px 8px',
    background: 'var(--bg3)',
    borderRadius: '4px',
  },
  statusBadge: (status) => ({
    fontFamily: 'var(--mono)',
    fontSize: '0.6rem',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    padding: '2px 8px',
    borderRadius: '4px',
    color: status === 'done' ? 'var(--green)' : status === 'active' ? 'var(--teal)' : 'var(--text-dim)',
    background: status === 'done' ? 'var(--green-dim)' : status === 'active' ? 'var(--teal-dim)' : 'var(--bg4)',
  }),
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-dim)',
    fontSize: '1.4rem',
    cursor: 'pointer',
    padding: '0 4px',
    lineHeight: 1,
  },
  timeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '0 20px 16px',
    flexWrap: 'wrap',
  },
  timeLabel: {
    fontFamily: 'var(--sans)',
    fontSize: '0.8rem',
    color: 'var(--text-mid)',
    textTransform: 'capitalize',
  },
  timeValue: {
    fontFamily: 'var(--mono)',
    fontSize: '0.8rem',
    color: 'var(--text)',
    letterSpacing: '0.5px',
  },
  duration: {
    fontFamily: 'var(--mono)',
    fontSize: '0.7rem',
    color: 'var(--text-dim)',
    padding: '2px 8px',
    background: 'var(--bg3)',
    borderRadius: '4px',
  },
  subtitle: {
    fontFamily: 'var(--sans)',
    fontSize: '0.85rem',
    color: 'var(--text-mid)',
    padding: '0 20px 12px',
    margin: 0,
  },
  section: {
    padding: '0 20px 16px',
  },
  sectionLabel: {
    fontFamily: 'var(--mono)',
    fontSize: '0.6rem',
    textTransform: 'uppercase',
    letterSpacing: '2px',
    color: 'var(--text-dim)',
    display: 'block',
    marginBottom: '8px',
  },
  notes: {
    fontFamily: 'var(--sans)',
    fontSize: '0.85rem',
    color: 'var(--text-mid)',
    margin: 0,
    lineHeight: 1.5,
  },
  objectiveItem: {
    fontFamily: 'var(--sans)',
    fontSize: '0.8rem',
    color: 'var(--text)',
    padding: '4px 0',
    display: 'flex',
    gap: '6px',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 20px 0',
    borderTop: '1px solid var(--border)',
    flexWrap: 'wrap',
  },
  btnPrimary: {
    background: 'var(--teal-dim)',
    color: 'var(--teal)',
    border: '1px solid var(--teal-glow)',
    borderRadius: '8px',
    padding: '8px 16px',
    fontFamily: 'var(--mono)',
    fontSize: '0.7rem',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    cursor: 'pointer',
    transition: 'all 0.18s ease',
  },
  btnGhost: {
    background: 'transparent',
    color: 'var(--text-mid)',
    border: '1px solid var(--border-mid)',
    borderRadius: '8px',
    padding: '8px 16px',
    fontFamily: 'var(--mono)',
    fontSize: '0.7rem',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    cursor: 'pointer',
    transition: 'all 0.18s ease',
  },
  editInput: {
    width: '100%',
    background: 'var(--bg3)',
    border: '1px solid var(--border-bright)',
    borderRadius: '8px',
    padding: '8px 10px',
    color: 'var(--text)',
    fontFamily: 'var(--display)',
    fontSize: '1.1rem',
    fontWeight: 700,
    marginBottom: '6px',
    outline: 'none',
  },
  editTextarea: {
    width: '100%',
    background: 'var(--bg3)',
    border: '1px solid var(--border-bright)',
    borderRadius: '8px',
    padding: '8px 10px',
    color: 'var(--text)',
    fontFamily: 'var(--sans)',
    fontSize: '0.85rem',
    resize: 'vertical',
    outline: 'none',
    lineHeight: 1.5,
  },
}
