import { useState } from 'react'
import useSchedulerStore, { SECTIONS } from '../store/schedulerStore'
import { ModalOverlay, Btn, Input, SectionTitle } from './UI'

const DAY_LABELS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

const PROJECT_OPTIONS = [
  { id: 'truenorth', label: 'TrueNorth Pathways', icon: '🧭' },
  { id: 'jobsearch', label: 'Job Search',         icon: '💼' },
  { id: 'tarot',     label: 'Tarot App',           icon: '🔮' },
  { id: null,        label: 'Otro / Sin proyecto', icon: '🎯' },
]

export default function BlockEditor({ block, onClose }) {
  const addBlock    = useSchedulerStore((s) => s.addBlock)
  const updateBlock = useSchedulerStore((s) => s.updateBlock)
  const deleteBlock = useSchedulerStore((s) => s.deleteBlock)

  const isNew = !block?.id

  const [form, setForm] = useState({
    day:          block?.day          ?? 0,
    startTime:    block?.startTime    ?? '09:00',
    endTime:      block?.endTime      ?? '10:30',
    section:      block?.section      ?? 'project',
    title:        block?.title        ?? '',
    subtitle:     block?.subtitle     ?? '',
    projectId:    block?.projectId    ?? null,
    objectives:   block?.objectives   ?? [],
    studyTopic:   block?.studyTopic   ?? '',
    mealPlan:     block?.mealPlan     ?? '',
    readingBook:  block?.readingBook  ?? '',
    notes:        block?.notes        ?? '',
  })

  const [objInput, setObjInput] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  function p(key) { return (v) => setForm((f) => ({ ...f, [key]: v })) }

  function addObjective() {
    if (!objInput.trim()) return
    setForm((f) => ({ ...f, objectives: [...f.objectives, objInput.trim()] }))
    setObjInput('')
  }

  function removeObjective(i) {
    setForm((f) => ({ ...f, objectives: f.objectives.filter((_, idx) => idx !== i) }))
  }

  function save() {
    const sec = SECTIONS[form.section] || SECTIONS.project
    const data = {
      ...form,
      title: form.title.trim() || sec.label,
      color: sec.color,
      icon: sec.icon,
    }
    if (isNew) {
      addBlock(data)
    } else {
      updateBlock(block.id, data)
    }
    onClose()
  }

  function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return }
    deleteBlock(block.id)
    onClose()
  }

  const sec = SECTIONS[form.section] || SECTIONS.project

  return (
    <ModalOverlay onClose={onClose}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h3 style={{ fontFamily: 'var(--display)', fontSize: 20 }}>
          {isNew ? 'Nuevo bloque' : 'Editar bloque'}
        </h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 20 }}>✕</button>
      </div>

      <div className="stack" style={{ gap: 16 }}>

        {/* ── SECCIÓN ── */}
        <div>
          <SectionTitle>Tipo de bloque</SectionTitle>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {Object.entries(SECTIONS).map(([key, s]) => {
              const active = form.section === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, section: key }))}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '6px 12px',
                    borderRadius: 20,
                    border: `1px solid ${active ? s.mid : 'var(--border-mid)'}`,
                    background: active ? s.dim : 'var(--bg3)',
                    color: active ? s.color : 'var(--text-dim)',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: active ? 600 : 400,
                    transition: 'var(--transition)',
                  }}
                >
                  <span>{s.icon}</span> {s.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── DÍA + HORARIO ── */}
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 2 }}>
            <label className="label" style={{ display: 'block', marginBottom: 4 }}>Día</label>
            <select
              className="input"
              value={form.day}
              onChange={(e) => p('day')(Number(e.target.value))}
              style={{ appearance: 'none', cursor: 'pointer' }}
            >
              {DAY_LABELS.map((d, i) => (
                <option key={i} value={i}>{d}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1.5 }}>
            <label className="label" style={{ display: 'block', marginBottom: 4 }}>Inicio</label>
            <input
              type="time"
              className="input"
              value={form.startTime}
              onChange={(e) => p('startTime')(e.target.value)}
            />
          </div>
          <div style={{ flex: 1.5 }}>
            <label className="label" style={{ display: 'block', marginBottom: 4 }}>Fin</label>
            <input
              type="time"
              className="input"
              value={form.endTime}
              onChange={(e) => p('endTime')(e.target.value)}
            />
          </div>
        </div>

        {/* ── TÍTULO ── */}
        <div>
          <label className="label" style={{ display: 'block', marginBottom: 4 }}>Título</label>
          <Input value={form.title} onChange={p('title')} placeholder={sec.label} />
        </div>

        {/* ── CAMPOS ESPECÍFICOS POR SECCIÓN ── */}
        {form.section === 'project' && (
          <div className="stack" style={{ gap: 10 }}>
            <div>
              <label className="label" style={{ display: 'block', marginBottom: 6 }}>Proyecto</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {PROJECT_OPTIONS.map((opt) => {
                  const active = form.projectId === opt.id
                  return (
                    <button
                      key={String(opt.id)}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, projectId: opt.id }))}
                      style={{
                        padding: '6px 12px', borderRadius: 20, fontSize: 12,
                        border: `1px solid ${active ? 'var(--teal-mid)' : 'var(--border-mid)'}`,
                        background: active ? 'var(--teal-dim)' : 'var(--bg3)',
                        color: active ? 'var(--teal)' : 'var(--text-dim)',
                        cursor: 'pointer', fontWeight: active ? 600 : 400,
                        transition: 'var(--transition)',
                      }}
                    >
                      {opt.icon} {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>
            <div>
              <label className="label" style={{ display: 'block', marginBottom: 4 }}>Objetivos del bloque</label>
              <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                <Input
                  value={objInput}
                  onChange={setObjInput}
                  placeholder="ej. Terminar auth flow"
                  style={{ flex: 1 }}
                />
                <Btn variant="ghost" size="sm" onClick={addObjective}>+</Btn>
              </div>
              {form.objectives.length > 0 && (
                <div className="stack" style={{ gap: 4 }}>
                  {form.objectives.map((obj, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px', background: 'var(--bg3)', borderRadius: 6 }}>
                      <span style={{ flex: 1, fontSize: 13 }}>• {obj}</span>
                      <button onClick={() => removeObjective(i)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 14 }}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {form.section === 'study' && (
          <div className="stack" style={{ gap: 10 }}>
            <div>
              <label className="label" style={{ display: 'block', marginBottom: 4 }}>¿Qué estudias?</label>
              <Input value={form.studyTopic} onChange={p('studyTopic')} placeholder="ej. React Query, System Design..." />
            </div>
          </div>
        )}

        {form.section === 'mealprep' && (
          <div>
            <label className="label" style={{ display: 'block', marginBottom: 4 }}>¿Qué preparas?</label>
            <Input value={form.mealPlan} onChange={p('mealPlan')} multiline placeholder="Pollo al horno, arroz, verduras..." />
          </div>
        )}

        {form.section === 'reading' && (
          <div>
            <label className="label" style={{ display: 'block', marginBottom: 4 }}>Libro actual</label>
            <Input value={form.readingBook} onChange={p('readingBook')} placeholder="ej. Deep Work — Cal Newport" />
          </div>
        )}

        {form.section === 'relax' && (
          <div>
            <label className="label" style={{ display: 'block', marginBottom: 4 }}>Actividad planeada (opcional)</label>
            <Input value={form.notes} onChange={p('notes')} placeholder="ej. Gaming con amigos, serie, salir..." />
          </div>
        )}

        {/* ── NOTAS (todos excepto relax que ya las usa) ── */}
        {form.section !== 'relax' && (
          <div>
            <label className="label" style={{ display: 'block', marginBottom: 4 }}>Notas (opcional)</label>
            <Input value={form.notes} onChange={p('notes')} multiline placeholder="Contexto adicional..." />
          </div>
        )}

        {/* ── ACTIONS ── */}
        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          {!isNew && (
            <Btn
              variant={confirmDelete ? 'danger' : 'ghost'}
              size="sm"
              onClick={handleDelete}
            >
              {confirmDelete ? '¿Confirmar?' : '🗑'}
            </Btn>
          )}
          <Btn variant="ghost" style={{ flex: 1 }} onClick={onClose}>Cancelar</Btn>
          <Btn variant="primary" style={{ flex: 2 }} onClick={save}>
            {isNew ? 'Agregar ✓' : 'Guardar ✓'}
          </Btn>
        </div>

      </div>
    </ModalOverlay>
  )
}
