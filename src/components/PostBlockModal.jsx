import { useState, useEffect } from 'react'
import useProjectStore from '../store/projectStore'

export default function PostBlockModal({ block, onClose, onSave }) {
  const [notes, setNotes] = useState('')
  const [selectedTaskIds, setSelectedTaskIds] = useState([])
  const [completedTaskIds, setCompletedTaskIds] = useState([])
  const [toast, setToast] = useState('')

  const tasks = useProjectStore((s) => s.tasks)
  const addSession = useProjectStore((s) => s.addSession)
  const completeTask = useProjectStore((s) => s.completeTask)
  const getProjectPct = useProjectStore((s) => s.getProjectPct)

  const projectTasks = tasks.filter(
    (t) => t.projectId === block.projectId && (t.status === 'todo' || t.status === 'in_progress')
  )

  const hours = Math.floor((block.actualDuration || block.duration || 0) / 60)
  const mins = (block.actualDuration || block.duration || 0) % 60

  function toggleTask(id) {
    setSelectedTaskIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  function toggleComplete(id) {
    setCompletedTaskIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  async function handleSave() {
    const prevPct = getProjectPct(block.projectId)

    addSession({
      projectId: block.projectId,
      durationMinutes: block.actualDuration || block.duration || 0,
      notes,
      tasksWorked: selectedTaskIds,
    })

    completedTaskIds.forEach((id) => completeTask(id))

    // Small delay to let store update
    setTimeout(() => {
      const newPct = getProjectPct(block.projectId)
      if (newPct !== null && prevPct !== null && newPct !== prevPct) {
        setToast(`${block.title} subió de ${prevPct}% a ${newPct}%`)
        setTimeout(() => {
          onSave?.()
          onClose?.()
        }, 1800)
      } else {
        onSave?.()
        onClose?.()
      }
    }, 50)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 58, background: 'rgba(0,0,0,0.55)' }}
      />

      {/* Sheet */}
      <div style={{
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        zIndex: 59,
        background: 'var(--bg2)',
        borderRadius: '18px 18px 0 0',
        border: '1px solid var(--border-mid)',
        borderBottom: 'none',
        paddingBottom: 'env(safe-area-inset-bottom)',
        maxHeight: '85dvh',
        overflowY: 'auto',
        maxWidth: 640,
        margin: '0 auto',
        animation: 'slideUp 0.22s ease',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 16px 12px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontFamily: 'var(--display)', fontSize: 15, fontWeight: 800 }}>
              ✓ Bloque completado
            </div>
            <div style={{ fontSize: 13, color: 'var(--teal)', marginTop: 2 }}>{block.title}</div>
            {(hours > 0 || mins > 0) && (
              <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--mono)', marginTop: 2 }}>
                {hours > 0 ? `${hours}h ` : ''}{mins > 0 ? `${mins}min` : ''}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              width: 30, height: 30, borderRadius: '50%',
              border: '1px solid var(--border-mid)', background: 'var(--bg3)',
              color: 'var(--text-mid)', cursor: 'pointer', fontSize: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >×</button>
        </div>

        <div style={{ padding: '16px' }}>
          {/* Tasks */}
          {projectTasks.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{
                fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.12em',
                color: 'var(--text-dim)', marginBottom: 10,
              }}>
                TAREAS DE ESTA SESIÓN
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {projectTasks.map((task) => (
                  <div key={task.id} style={{
                    background: 'var(--bg3)',
                    borderRadius: 10,
                    padding: '10px 12px',
                    border: `1px solid ${selectedTaskIds.includes(task.id) ? 'var(--teal-mid)' : 'var(--border-mid)'}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <button
                        onClick={() => toggleTask(task.id)}
                        style={{
                          width: 18, height: 18, borderRadius: 4,
                          border: `2px solid ${selectedTaskIds.includes(task.id) ? 'var(--teal)' : 'var(--border-mid)'}`,
                          background: selectedTaskIds.includes(task.id) ? 'var(--teal)' : 'transparent',
                          cursor: 'pointer', flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'var(--bg)',
                          fontSize: 11,
                        }}
                      >
                        {selectedTaskIds.includes(task.id) ? '✓' : ''}
                      </button>
                      <span style={{ fontSize: 13, flex: 1 }}>{task.title}</span>
                      {selectedTaskIds.includes(task.id) && (
                        <button
                          onClick={() => toggleComplete(task.id)}
                          style={{
                            fontSize: 10, padding: '2px 8px', borderRadius: 8, cursor: 'pointer',
                            background: completedTaskIds.includes(task.id) ? 'var(--green-dim)' : 'var(--bg4)',
                            border: `1px solid ${completedTaskIds.includes(task.id) ? 'var(--green-mid)' : 'var(--border-mid)'}`,
                            color: completedTaskIds.includes(task.id) ? 'var(--green)' : 'var(--text-dim)',
                          }}
                        >
                          {completedTaskIds.includes(task.id) ? '✓ Completada' : 'Marcar done'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div style={{ marginBottom: 20 }}>
            <div style={{
              fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.12em',
              color: 'var(--text-dim)', marginBottom: 8,
            }}>
              NOTAS DE LA SESIÓN
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="¿Qué hiciste? ¿Dónde quedaste? ¿Próximo paso?"
              rows={3}
              style={{
                width: '100%',
                background: 'var(--bg3)',
                border: '1px solid var(--border-mid)',
                borderRadius: 10,
                padding: '10px 12px',
                color: 'var(--text)',
                fontSize: 13,
                fontFamily: 'var(--sans)',
                resize: 'vertical',
                outline: 'none',
                lineHeight: 1.5,
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Toast */}
          {toast && (
            <div style={{
              background: 'var(--green-dim)',
              border: '1px solid var(--green-mid)',
              borderRadius: 10,
              padding: '10px 14px',
              color: 'var(--green)',
              fontSize: 13,
              marginBottom: 16,
              animation: 'fadeIn 0.2s ease',
            }}>
              🎉 {toast}
            </div>
          )}

          {/* Save button */}
          <button
            onClick={handleSave}
            style={{
              width: '100%',
              padding: '13px',
              background: 'var(--teal)',
              border: 'none',
              borderRadius: 12,
              color: 'var(--bg)',
              fontSize: 14,
              fontFamily: 'var(--sans)',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.18s',
            }}
          >
            Guardar sesión →
          </button>
        </div>
      </div>
    </>
  )
}
