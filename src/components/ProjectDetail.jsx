import { useState } from 'react'
import useProjectStore from '../store/projectStore'
import useStore from '../store/index'
import { ProgressBar } from './UI'

const PRIORITY_CONFIG = {
  high: { label: 'Alta 🔥', color: 'var(--red)' },
  med:  { label: 'Media ⚡', color: 'var(--yellow)' },
  low:  { label: 'Baja 🌱', color: 'var(--green)' },
}

const STATUS_CYCLE = { todo: 'in_progress', in_progress: 'done', done: 'todo' }

export default function ProjectDetail({ projectId, projectName, projectIcon, onBack }) {
  const [showAddTask, setShowAddTask] = useState(false)
  const [newTask, setNewTask] = useState({ title: '', weight: 5, category: 'general' })

  const tasks = useProjectStore((s) => s.tasks)
  const sessions = useProjectStore((s) => s.sessions)
  const addTask = useProjectStore((s) => s.addTask)
  const updateTask = useProjectStore((s) => s.updateTask)
  const deleteTask = useProjectStore((s) => s.deleteTask)
  const getProjectPct = useProjectStore((s) => s.getProjectPct)

  // fallback to main store pct
  const mainProject = useStore((s) => s.projects[projectId])

  const projectTasks = tasks.filter((t) => t.projectId === projectId)
  const projectSessions = sessions.filter((s) => s.projectId === projectId)

  const computedPct = getProjectPct(projectId)
  const displayPct = computedPct !== null ? computedPct : (mainProject?.pct ?? 0)

  const totalMinutes = projectSessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0)
  const totalHours = (totalMinutes / 60).toFixed(1)

  const lastSession = projectSessions.length > 0
    ? [...projectSessions].sort((a, b) => b.date.localeCompare(a.date))[0]
    : null

  const todoTasks = projectTasks.filter((t) => t.status === 'todo')
  const inProgressTasks = projectTasks.filter((t) => t.status === 'in_progress')
  const doneTasks = projectTasks.filter((t) => t.status === 'done')

  function handleAddTask() {
    if (!newTask.title.trim()) return
    addTask({ ...newTask, projectId })
    setNewTask({ title: '', weight: 5, category: 'general' })
    setShowAddTask(false)
  }

  function cycleStatus(task) {
    updateTask(task.id, { status: STATUS_CYCLE[task.status] || 'todo' })
  }

  return (
    <div style={{ paddingBottom: 100, position: 'relative', zIndex: 1 }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        marginBottom: 20,
      }}>
        <button
          onClick={onBack}
          style={{
            width: 36, height: 36, borderRadius: 10,
            border: '1px solid var(--border-mid)', background: 'var(--bg2)',
            color: 'var(--text)', cursor: 'pointer', fontSize: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >←</button>
        <span style={{ fontSize: 26 }}>{projectIcon}</span>
        <div>
          <div style={{ fontFamily: 'var(--display)', fontSize: 20, fontWeight: 800 }}>{projectName}</div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--mono)' }}>
            {computedPct !== null ? 'Calculado desde tareas' : 'Progreso manual'}
          </div>
        </div>
        <div style={{ marginLeft: 'auto', fontFamily: 'var(--display)', fontSize: 36, fontWeight: 800, color: 'var(--teal)' }}>
          {displayPct}%
        </div>
      </div>

      {/* Progress bar */}
      <ProgressBar value={displayPct} max={100} color="var(--teal)" />

      {/* Stats */}
      <div style={{ display: 'flex', gap: 12, marginTop: 16, marginBottom: 20 }}>
        <StatBox label="HORAS TRABAJADAS" value={`${totalHours}h`} color="var(--teal)" />
        <StatBox label="SESIONES" value={String(projectSessions.length)} color="var(--orange)" />
        <StatBox label="TAREAS DONE" value={`${doneTasks.length}/${projectTasks.length}`} color="var(--green)" />
      </div>

      {lastSession && (
        <div style={{
          background: 'var(--bg2)', borderRadius: 10, padding: '10px 14px',
          border: '1px solid var(--border-mid)', marginBottom: 20,
          fontSize: 12, color: 'var(--text-dim)',
        }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.1em' }}>ÚLTIMA SESIÓN: </span>
          {lastSession.date} · {Math.round((lastSession.durationMinutes || 0) / 60 * 10) / 10}h
          {lastSession.notes ? ` · ${lastSession.notes.slice(0, 60)}${lastSession.notes.length > 60 ? '...' : ''}` : ''}
        </div>
      )}

      {/* Tasks section */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.12em', color: 'var(--text-dim)' }}>
            TAREAS
          </div>
          <button
            onClick={() => setShowAddTask((v) => !v)}
            style={{
              padding: '5px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer',
              background: 'var(--teal-dim)', border: '1px solid var(--teal-mid)',
              color: 'var(--teal)', fontFamily: 'var(--sans)',
            }}
          >
            {showAddTask ? '— Cancelar' : '+ Agregar'}
          </button>
        </div>

        {/* Add task form */}
        {showAddTask && (
          <div style={{
            background: 'var(--bg2)', borderRadius: 12, padding: '14px',
            border: '1px solid var(--border-mid)', marginBottom: 14,
            animation: 'slideDown 0.2s ease',
          }}>
            <input
              value={newTask.title}
              onChange={(e) => setNewTask((f) => ({ ...f, title: e.target.value }))}
              placeholder="Nombre de la tarea*"
              style={{
                width: '100%', background: 'var(--bg3)', border: '1px solid var(--border-mid)',
                borderRadius: 8, padding: '8px 10px', color: 'var(--text)', fontSize: 13,
                fontFamily: 'var(--sans)', outline: 'none', marginBottom: 10, boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--text-dim)', display: 'block', marginBottom: 4 }}>
                  PESO (1-10)
                </label>
                <input
                  type="number" min={1} max={10} value={newTask.weight}
                  onChange={(e) => setNewTask((f) => ({ ...f, weight: Number(e.target.value) }))}
                  style={{
                    width: '100%', background: 'var(--bg3)', border: '1px solid var(--border-mid)',
                    borderRadius: 8, padding: '8px 10px', color: 'var(--text)', fontSize: 13,
                    fontFamily: 'var(--mono)', outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
              <div style={{ flex: 2 }}>
                <label style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--text-dim)', display: 'block', marginBottom: 4 }}>
                  CATEGORÍA
                </label>
                <input
                  value={newTask.category}
                  onChange={(e) => setNewTask((f) => ({ ...f, category: e.target.value }))}
                  placeholder="general"
                  style={{
                    width: '100%', background: 'var(--bg3)', border: '1px solid var(--border-mid)',
                    borderRadius: 8, padding: '8px 10px', color: 'var(--text)', fontSize: 13,
                    fontFamily: 'var(--sans)', outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
            <button
              onClick={handleAddTask}
              style={{
                width: '100%', padding: '10px', background: 'var(--teal)', border: 'none',
                borderRadius: 10, color: 'var(--bg)', fontSize: 13, fontFamily: 'var(--sans)',
                fontWeight: 700, cursor: 'pointer',
              }}
            >
              Agregar tarea
            </button>
          </div>
        )}

        {/* In progress */}
        {inProgressTasks.length > 0 && (
          <TaskGroup label="🔄 EN PROGRESO" tasks={inProgressTasks} cycleStatus={cycleStatus} deleteTask={deleteTask} />
        )}

        {/* Todo */}
        {todoTasks.length > 0 && (
          <TaskGroup label="📋 POR HACER" tasks={todoTasks} cycleStatus={cycleStatus} deleteTask={deleteTask} />
        )}

        {/* Done */}
        {doneTasks.length > 0 && (
          <TaskGroup label="✅ COMPLETADAS" tasks={doneTasks} cycleStatus={cycleStatus} deleteTask={deleteTask} />
        )}

        {projectTasks.length === 0 && !showAddTask && (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-dim)', fontSize: 13 }}>
            Sin tareas — agrega una para trackear el progreso automáticamente
          </div>
        )}
      </div>

      {/* Sessions history */}
      {projectSessions.length > 0 && (
        <div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.12em', color: 'var(--text-dim)', marginBottom: 12 }}>
            HISTORIAL DE SESIONES
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[...projectSessions]
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 5)
              .map((session) => (
                <div key={session.id} style={{
                  background: 'var(--bg2)', borderRadius: 10, padding: '10px 14px',
                  border: '1px solid var(--border-mid)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--teal)' }}>
                      {session.date}
                    </span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-dim)' }}>
                      {(session.durationMinutes / 60).toFixed(1)}h
                    </span>
                  </div>
                  {session.notes && (
                    <div style={{ fontSize: 12, color: 'var(--text-mid)' }}>{session.notes}</div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

function TaskGroup({ label, tasks, cycleStatus, deleteTask }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 10, fontFamily: 'var(--mono)', letterSpacing: '0.1em', color: 'var(--text-dim)', marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {tasks.map((task) => (
          <div key={task.id} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'var(--bg2)', borderRadius: 10, padding: '9px 12px',
            border: '1px solid var(--border-mid)',
          }}>
            <button
              onClick={() => cycleStatus(task)}
              title="Cambiar estado"
              style={{
                width: 20, height: 20, borderRadius: 4, flexShrink: 0,
                border: `2px solid ${task.status === 'done' ? 'var(--green)' : task.status === 'in_progress' ? 'var(--orange)' : 'var(--border-mid)'}`,
                background: task.status === 'done' ? 'var(--green)' : task.status === 'in_progress' ? 'var(--orange)' : 'transparent',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, color: 'var(--bg)',
              }}
            >
              {task.status === 'done' ? '✓' : task.status === 'in_progress' ? '⟳' : ''}
            </button>
            <span style={{
              flex: 1, fontSize: 13,
              textDecoration: task.status === 'done' ? 'line-through' : 'none',
              color: task.status === 'done' ? 'var(--text-dim)' : 'var(--text)',
            }}>
              {task.title}
            </span>
            <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--text-dim)' }}>
              [{task.weight}%]
            </span>
            <button
              onClick={() => deleteTask(task.id)}
              style={{
                width: 20, height: 20, borderRadius: 4, border: 'none',
                background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer',
                fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >×</button>
          </div>
        ))}
      </div>
    </div>
  )
}

function StatBox({ label, value, color }) {
  return (
    <div style={{
      flex: 1, background: 'var(--bg2)', borderRadius: 10, padding: '10px 12px',
      border: '1px solid var(--border-mid)', textAlign: 'center',
    }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.1em', color: 'var(--text-dim)', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--display)', fontSize: 20, fontWeight: 800, color }}>{value}</div>
    </div>
  )
}
