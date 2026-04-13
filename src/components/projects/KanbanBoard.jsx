import { useState, useRef, useEffect } from 'react'
import useProjectStore, {
  KANBAN_COLUMNS,
  KANBAN_COLUMN_CONFIG,
  MVP_WIP_LIMIT,
  TECH_TAGS,
} from '../../store/projectStore'
import { Badge, Btn, Input, ModalOverlay } from '../UI'

// ─── Project Config ──────────────────────────────────────────────────────────
const PROJECT_CONFIG = {
  truenorth:  { label: 'TrueNorth',   icon: '🧭', color: 'teal' },
  jobsearch:  { label: 'Job Search',  icon: '💼', color: 'orange' },
  tarot:      { label: 'Tarot App',   icon: '🔮', color: 'purple' },
}

// ─── Main KanbanBoard ────────────────────────────────────────────────────────
export default function KanbanBoard({ projectFilter = 'all' }) {
  const tasks = useProjectStore((s) => s.tasks)
  const moveTask = useProjectStore((s) => s.moveTask)
  const wipWarning = useProjectStore((s) => s.wipWarning)
  const clearWipWarning = useProjectStore((s) => s.clearWipWarning)

  const [draggedId, setDraggedId] = useState(null)
  const [dragOverCol, setDragOverCol] = useState(null)
  const [showAddTask, setShowAddTask] = useState(null) // column id or null
  const [editingTask, setEditingTask] = useState(null)

  // Auto-dismiss WIP warning
  useEffect(() => {
    if (!wipWarning) return
    const t = setTimeout(clearWipWarning, 4000)
    return () => clearTimeout(t)
  }, [wipWarning, clearWipWarning])

  function handleDragStart(e, taskId) {
    setDraggedId(taskId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', taskId)
    // Add a slight delay to allow the drag image to render
    requestAnimationFrame(() => {
      document.querySelector(`[data-task-id="${taskId}"]`)?.classList.add('kanban-dragging')
    })
  }

  function handleDragEnd() {
    document.querySelector('.kanban-dragging')?.classList.remove('kanban-dragging')
    setDraggedId(null)
    setDragOverCol(null)
  }

  function handleDragOver(e, column) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverCol(column)
  }

  function handleDragLeave() {
    setDragOverCol(null)
  }

  function handleDrop(e, column) {
    e.preventDefault()
    const taskId = e.dataTransfer.getData('text/plain')
    if (taskId) moveTask(taskId, column)
    setDraggedId(null)
    setDragOverCol(null)
  }

  function getColumnTasks(column) {
    let filtered = tasks.filter((t) => t.column === column)
    if (projectFilter && projectFilter !== 'all') {
      filtered = filtered.filter((t) => t.projectId === projectFilter)
    }
    return filtered
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* WIP Warning Toast */}
      {wipWarning && (
        <div className="kanban-toast anim-slide-down" onClick={clearWipWarning}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={s.cortanaBadge}>C</span>
            <span style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.4 }}>
              {wipWarning.message}
            </span>
          </div>
        </div>
      )}

      {/* Kanban Columns */}
      <div className="kanban-board-grid" style={s.board}>
        {KANBAN_COLUMNS.map((col) => {
          const cfg = KANBAN_COLUMN_CONFIG[col]
          const colTasks = getColumnTasks(col)
          const isMvp = col === 'mvp'
          const mvpCount = isMvp ? tasks.filter((t) => t.column === 'mvp').length : 0
          const isOver = dragOverCol === col

          return (
            <div
              key={col}
              style={{
                ...s.column,
                borderColor: isOver ? cfg.color : 'var(--border-mid)',
                background: isOver ? 'var(--bg3)' : 'var(--bg2)',
              }}
              onDragOver={(e) => handleDragOver(e, col)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col)}
            >
              {/* Column Header */}
              <div style={s.colHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 14 }}>{cfg.icon}</span>
                  <span style={{ ...s.colTitle, color: cfg.color }}>{cfg.label}</span>
                  <span style={s.colCount}>{colTasks.length}</span>
                </div>
                {isMvp && (
                  <span style={{
                    ...s.wipBadge,
                    color: mvpCount >= MVP_WIP_LIMIT ? 'var(--red)' : 'var(--teal)',
                    background: mvpCount >= MVP_WIP_LIMIT ? 'var(--red-dim)' : 'var(--teal-dim)',
                    borderColor: mvpCount >= MVP_WIP_LIMIT ? 'var(--red-mid)' : 'var(--teal-mid)',
                  }}>
                    WIP {mvpCount}/{MVP_WIP_LIMIT}
                  </span>
                )}
                <button
                  onClick={() => setShowAddTask(col)}
                  style={s.addColBtn}
                  title={`Agregar tarea a ${cfg.label}`}
                >+</button>
              </div>

              {/* Tasks */}
              <div style={s.colBody}>
                {colTasks.map((task) => (
                  <KanbanCard
                    key={task.id}
                    task={task}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    isDragging={draggedId === task.id}
                    onEdit={() => setEditingTask(task)}
                  />
                ))}
                {colTasks.length === 0 && (
                  <div style={s.emptyCol}>
                    {col === 'backlog' ? 'Ideas y features futuras' :
                     col === 'mvp' ? 'Enfoque actual (max 3)' :
                     'Mejoras post-lanzamiento'}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Add Task Modal */}
      {showAddTask && (
        <AddKanbanTaskModal
          column={showAddTask}
          projectFilter={projectFilter}
          onClose={() => setShowAddTask(null)}
        />
      )}

      {/* Edit Task Modal */}
      {editingTask && (
        <EditKanbanTaskModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
        />
      )}
    </div>
  )
}

// ─── Kanban Card ─────────────────────────────────────────────────────────────
function KanbanCard({ task, onDragStart, onDragEnd, isDragging, onEdit }) {
  const getDaysInColumn = useProjectStore((s) => s.getDaysInColumn)
  const days = getDaysInColumn(task)
  const proj = PROJECT_CONFIG[task.projectId]
  const isStale = days >= 5

  return (
    <div
      data-task-id={task.id}
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      onDragEnd={onDragEnd}
      style={{
        ...s.card,
        opacity: isDragging ? 0.4 : 1,
        borderColor: isStale ? 'var(--red-mid)' : 'var(--border-mid)',
      }}
    >
      {/* Top row: project badge + days */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        {proj && (
          <span className={`badge badge-${proj.color}`} style={{ fontSize: 9 }}>
            {proj.icon} {proj.label}
          </span>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {isStale && <span style={{ fontSize: 10 }} title="Estancada">🚨</span>}
          {days > 0 && (
            <span style={{
              fontFamily: 'var(--mono)', fontSize: 9,
              color: isStale ? 'var(--red)' : 'var(--text-dim)',
            }}>
              {days}d
            </span>
          )}
        </div>
      </div>

      {/* Title */}
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4, lineHeight: 1.35 }}>
        {task.title}
      </div>

      {/* Description preview */}
      {task.description && (
        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 6, lineHeight: 1.4 }}>
          {task.description.length > 60 ? task.description.slice(0, 60) + '...' : task.description}
        </div>
      )}

      {/* Tech Tags */}
      {task.techTags?.length > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
          {task.techTags.map((tagId) => {
            const tag = TECH_TAGS.find((t) => t.id === tagId)
            if (!tag) return null
            return (
              <span key={tagId} style={{
                fontSize: 9, fontFamily: 'var(--mono)', letterSpacing: '0.05em',
                padding: '1px 6px', borderRadius: 10,
                background: tag.color + '18', color: tag.color,
                border: `1px solid ${tag.color}33`,
              }}>
                {tag.label}
              </span>
            )
          })}
        </div>
      )}

      {/* Bottom row: weight + status + edit */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text-dim)' }}>
          [{task.weight}pt]
        </span>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: task.status === 'done' ? 'var(--green)' :
                        task.status === 'in_progress' ? 'var(--orange)' : 'var(--text-dim)',
          }} />
          <button onClick={onEdit} style={s.editBtn} title="Editar">
            <span style={{ fontSize: 10 }}>...</span>
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Add Task Modal ──────────────────────────────────────────────────────────
function AddKanbanTaskModal({ column, projectFilter, onClose }) {
  const addTask = useProjectStore((s) => s.addTask)
  const [form, setForm] = useState({
    title: '',
    description: '',
    projectId: projectFilter !== 'all' ? projectFilter : 'truenorth',
    weight: 5,
    techTags: [],
  })

  function toggleTag(tagId) {
    setForm((f) => ({
      ...f,
      techTags: f.techTags.includes(tagId)
        ? f.techTags.filter((t) => t !== tagId)
        : [...f.techTags, tagId],
    }))
  }

  function submit() {
    if (!form.title.trim()) return
    addTask({ ...form, column })
    onClose()
  }

  return (
    <ModalOverlay onClose={onClose}>
      <h3 style={{ marginBottom: 16, fontFamily: 'var(--display)', fontSize: 20 }}>
        Nueva Tarea {KANBAN_COLUMN_CONFIG[column]?.icon}
      </h3>
      <div className="stack" style={{ gap: 12 }}>
        <div>
          <label className="label" style={{ display: 'block', marginBottom: 4 }}>Titulo *</label>
          <Input value={form.title} onChange={(v) => setForm((f) => ({ ...f, title: v }))} placeholder="ej. Implementar auth flow" />
        </div>
        <div>
          <label className="label" style={{ display: 'block', marginBottom: 4 }}>Descripcion</label>
          <Input value={form.description} onChange={(v) => setForm((f) => ({ ...f, description: v }))} multiline placeholder="Detalles..." />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label className="label" style={{ display: 'block', marginBottom: 4 }}>Proyecto</label>
            <select
              value={form.projectId}
              onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value }))}
              className="input"
              style={{ padding: '8px 10px' }}
            >
              {Object.entries(PROJECT_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.icon} {v.label}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 0 }}>
            <label className="label" style={{ display: 'block', marginBottom: 4 }}>Peso</label>
            <Input
              value={String(form.weight)}
              onChange={(v) => setForm((f) => ({ ...f, weight: Math.max(1, Math.min(10, Number(v) || 1)) }))}
              type="number"
              style={{ width: 64 }}
            />
          </div>
        </div>
        <div>
          <label className="label" style={{ display: 'block', marginBottom: 6 }}>Tech Tags</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {TECH_TAGS.map((tag) => {
              const active = form.techTags.includes(tag.id)
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  style={{
                    fontSize: 11, fontFamily: 'var(--mono)',
                    padding: '4px 10px', borderRadius: 10, cursor: 'pointer',
                    background: active ? tag.color + '2e' : 'var(--bg3)',
                    border: `1px solid ${active ? tag.color + '66' : 'var(--border-mid)'}`,
                    color: active ? tag.color : 'var(--text-dim)',
                    transition: 'var(--transition)',
                  }}
                >
                  {tag.label}
                </button>
              )
            })}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <Btn variant="ghost" style={{ flex: 1 }} onClick={onClose}>Cancelar</Btn>
          <Btn variant="primary" style={{ flex: 2 }} onClick={submit} disabled={!form.title.trim()}>
            Agregar
          </Btn>
        </div>
      </div>
    </ModalOverlay>
  )
}

// ─── Edit Task Modal ─────────────────────────────────────────────────────────
function EditKanbanTaskModal({ task, onClose }) {
  const updateTask = useProjectStore((s) => s.updateTask)
  const deleteTask = useProjectStore((s) => s.deleteTask)
  const moveTask = useProjectStore((s) => s.moveTask)

  const [form, setForm] = useState({
    title: task.title,
    description: task.description,
    projectId: task.projectId,
    weight: task.weight,
    techTags: task.techTags || [],
    status: task.status,
  })
  const [confirmDelete, setConfirmDelete] = useState(false)

  function toggleTag(tagId) {
    setForm((f) => ({
      ...f,
      techTags: f.techTags.includes(tagId)
        ? f.techTags.filter((t) => t !== tagId)
        : [...f.techTags, tagId],
    }))
  }

  function save() {
    updateTask(task.id, {
      title: form.title,
      description: form.description,
      projectId: form.projectId,
      weight: Math.max(1, Math.min(10, form.weight)),
      techTags: form.techTags,
      status: form.status,
    })
    onClose()
  }

  function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return }
    deleteTask(task.id)
    onClose()
  }

  function handleColumnMove(col) {
    moveTask(task.id, col)
    onClose()
  }

  return (
    <ModalOverlay onClose={onClose}>
      <h3 style={{ marginBottom: 16, fontFamily: 'var(--display)', fontSize: 20 }}>
        Editar Tarea
      </h3>
      <div className="stack" style={{ gap: 12 }}>
        <div>
          <label className="label" style={{ display: 'block', marginBottom: 4 }}>Titulo</label>
          <Input value={form.title} onChange={(v) => setForm((f) => ({ ...f, title: v }))} />
        </div>
        <div>
          <label className="label" style={{ display: 'block', marginBottom: 4 }}>Descripcion</label>
          <Input value={form.description} onChange={(v) => setForm((f) => ({ ...f, description: v }))} multiline />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label className="label" style={{ display: 'block', marginBottom: 4 }}>Proyecto</label>
            <select
              value={form.projectId}
              onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value }))}
              className="input"
              style={{ padding: '8px 10px' }}
            >
              {Object.entries(PROJECT_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.icon} {v.label}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 0 }}>
            <label className="label" style={{ display: 'block', marginBottom: 4 }}>Peso</label>
            <Input
              value={String(form.weight)}
              onChange={(v) => setForm((f) => ({ ...f, weight: Number(v) || 1 }))}
              type="number"
              style={{ width: 64 }}
            />
          </div>
        </div>

        {/* Move to column */}
        <div>
          <label className="label" style={{ display: 'block', marginBottom: 6 }}>Mover a columna</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {KANBAN_COLUMNS.map((col) => {
              const cfg = KANBAN_COLUMN_CONFIG[col]
              const isCurrent = task.column === col
              return (
                <button
                  key={col}
                  onClick={() => !isCurrent && handleColumnMove(col)}
                  disabled={isCurrent}
                  style={{
                    flex: 1, padding: '8px', borderRadius: 8, cursor: isCurrent ? 'default' : 'pointer',
                    background: isCurrent ? cfg.color + '2e' : 'var(--bg3)',
                    border: `1px solid ${isCurrent ? cfg.color + '66' : 'var(--border-mid)'}`,
                    color: isCurrent ? cfg.color : 'var(--text-dim)',
                    fontSize: 11, fontFamily: 'var(--mono)',
                    opacity: isCurrent ? 1 : 0.7,
                    transition: 'var(--transition)',
                  }}
                >
                  {cfg.icon} {cfg.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Tech Tags */}
        <div>
          <label className="label" style={{ display: 'block', marginBottom: 6 }}>Tech Tags</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {TECH_TAGS.map((tag) => {
              const active = form.techTags.includes(tag.id)
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  style={{
                    fontSize: 11, fontFamily: 'var(--mono)',
                    padding: '4px 10px', borderRadius: 10, cursor: 'pointer',
                    background: active ? tag.color + '2e' : 'var(--bg3)',
                    border: `1px solid ${active ? tag.color + '66' : 'var(--border-mid)'}`,
                    color: active ? tag.color : 'var(--text-dim)',
                    transition: 'var(--transition)',
                  }}
                >
                  {tag.label}
                </button>
              )
            })}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <Btn variant="danger" size="sm" onClick={handleDelete}>
            {confirmDelete ? 'Confirmar' : 'Eliminar'}
          </Btn>
          <div style={{ flex: 1 }} />
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn variant="primary" onClick={save} disabled={!form.title.trim()}>Guardar</Btn>
        </div>
      </div>
    </ModalOverlay>
  )
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const s = {
  board: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 12,
    minHeight: 400,
  },
  column: {
    borderRadius: 12,
    border: '1px solid var(--border-mid)',
    background: 'var(--bg2)',
    display: 'flex',
    flexDirection: 'column',
    transition: 'all 0.18s ease',
    overflow: 'hidden',
  },
  colHeader: {
    padding: '10px 12px',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    flexShrink: 0,
  },
  colTitle: {
    fontFamily: 'var(--mono)',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
  },
  colCount: {
    fontFamily: 'var(--mono)',
    fontSize: 10,
    color: 'var(--text-dim)',
    background: 'var(--bg4)',
    borderRadius: 10,
    padding: '1px 6px',
  },
  wipBadge: {
    fontFamily: 'var(--mono)',
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: '0.1em',
    padding: '2px 8px',
    borderRadius: 10,
    border: '1px solid',
  },
  addColBtn: {
    width: 22, height: 22, borderRadius: 6,
    background: 'var(--bg4)', border: '1px solid var(--border-mid)',
    color: 'var(--text-dim)', cursor: 'pointer', fontSize: 14,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'var(--transition)',
  },
  colBody: {
    flex: 1,
    padding: 8,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    overflowY: 'auto',
    minHeight: 100,
  },
  emptyCol: {
    textAlign: 'center',
    padding: '24px 12px',
    color: 'var(--text-dim)',
    fontSize: 11,
    fontStyle: 'italic',
  },
  card: {
    background: 'var(--bg3)',
    border: '1px solid var(--border-mid)',
    borderRadius: 10,
    padding: '10px 12px',
    cursor: 'grab',
    transition: 'all 0.15s ease',
    userSelect: 'none',
  },
  editBtn: {
    width: 20, height: 20, borderRadius: 4,
    background: 'transparent', border: 'none',
    color: 'var(--text-dim)', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 12,
  },
  cortanaBadge: {
    width: 24, height: 24, borderRadius: 8, flexShrink: 0,
    background: 'linear-gradient(135deg, var(--teal-dim), var(--purple-dim))',
    border: '1px solid var(--teal-glow)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'var(--display)', fontSize: 11, fontWeight: 800, color: 'var(--teal)',
  },
}
