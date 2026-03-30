import { useState } from 'react'
import useStore from '../store/index'
import { Card, Btn, Input, ProgressBar, Badge, ModalOverlay, SectionTitle, Divider } from './UI'

const STATUS_CONFIG = {
  aplicado:     { label: 'Aplicado',     color: 'teal' },
  'phone screen': { label: 'Phone Screen', color: 'yellow' },
  entrevista:   { label: 'Entrevista',   color: 'orange' },
  oferta:       { label: 'Oferta 🎉',    color: 'green' },
  rechazado:    { label: 'Rechazado',    color: 'red' },
}

export default function TabProjects() {
  const modal = useStore((s) => s.modal)
  const openModal = useStore((s) => s.openModal)

  return (
    <div className="stack" style={{ gap: 16, paddingBottom: 80 }}>
      <TrueNorthCard />
      <JobSearchCard />
      <TarotCard />

      {modal === 'addJob'     && <AddJobAppModal />}
      {modal === 'addFeature' && <AddFeatureModal />}
    </div>
  )
}

// ─── TRUENORTH ────────────────────────────────────────────────────────────────
function TrueNorthCard() {
  const project    = useStore((s) => s.projects.truenorth)
  const setProject = useStore((s) => s.setProject)
  const [editing, setEditing] = useState(false)
  const [form, setForm]       = useState({})

  function startEdit() {
    setForm({ pct: String(project.pct), deadline: project.deadline, blocker: project.blocker, lastNote: project.lastNote })
    setEditing(true)
  }

  function save() {
    setProject('truenorth', {
      pct: Math.max(0, Math.min(100, Number(form.pct) || 0)),
      deadline: form.deadline,
      blocker: form.blocker,
      lastNote: form.lastNote,
    })
    setEditing(false)
  }

  return (
    <Card accent="teal">
      <div className="row-between" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', align: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>🧭</span>
          <div>
            <div className="label">TrueNorth Pathways</div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Lun / Mié — Bloques 1 & 2</div>
          </div>
        </div>
        <Btn variant="ghost" size="sm" onClick={editing ? save : startEdit}>
          {editing ? 'Guardar' : 'Editar'}
        </Btn>
      </div>

      {!editing ? (
        <>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 10 }}>
            <span style={{ fontFamily: 'var(--display)', fontSize: 40, fontWeight: 800, color: 'var(--teal)' }}>
              {project.pct}%
            </span>
            <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>completado</span>
          </div>
          <ProgressBar value={project.pct} max={100} color="var(--teal)" />
          <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {project.deadline && <Badge color="teal">📅 {project.deadline}</Badge>}
            {project.blocker  && <Badge color="red">🚫 {project.blocker}</Badge>}
          </div>
          {project.lastNote && (
            <div style={{ marginTop: 12, background: 'var(--bg3)', borderRadius: 8, padding: '10px 12px' }}>
              <div className="label" style={{ marginBottom: 4 }}>Última sesión</div>
              <div style={{ fontSize: 13, color: 'var(--text-mid)' }}>{project.lastNote}</div>
            </div>
          )}
        </>
      ) : (
        <div className="stack" style={{ gap: 10 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label className="label" style={{ display: 'block', marginBottom: 4 }}>% Completado</label>
              <Input value={form.pct} onChange={(v) => setForm((f) => ({ ...f, pct: v }))} type="number" placeholder="0" />
            </div>
            <div style={{ flex: 2 }}>
              <label className="label" style={{ display: 'block', marginBottom: 4 }}>Deadline</label>
              <Input value={form.deadline} onChange={(v) => setForm((f) => ({ ...f, deadline: v }))} type="date" placeholder="ej. Abr 2026" />
            </div>
          </div>
          <div>
            <label className="label" style={{ display: 'block', marginBottom: 4 }}>Blocker actual</label>
            <Input value={form.blocker} onChange={(v) => setForm((f) => ({ ...f, blocker: v }))} placeholder="ej. Falta diseño UI" />
          </div>
          <div>
            <label className="label" style={{ display: 'block', marginBottom: 4 }}>¿En qué me quedé?</label>
            <Input value={form.lastNote} onChange={(v) => setForm((f) => ({ ...f, lastNote: v }))} multiline placeholder="Nota de la última sesión..." />
          </div>
        </div>
      )}
    </Card>
  )
}

// ─── JOB SEARCH ───────────────────────────────────────────────────────────────
function JobSearchCard() {
  const project    = useStore((s) => s.projects.jobsearch)
  const setProject = useStore((s) => s.setProject)
  const updateJobApp = useStore((s) => s.updateJobApp)
  const openModal  = useStore((s) => s.openModal)
  const [editNote, setEditNote] = useState(false)
  const [note, setNote] = useState(project.lastNote || '')

  const recent = project.applications.slice(0, 5)

  function saveNote() {
    setProject('jobsearch', { lastNote: note })
    setEditNote(false)
  }

  return (
    <Card accent="orange">
      <div className="row-between" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>💼</span>
          <div>
            <div className="label">Job Search</div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Mar / Jue — Bloques 1 & 2</div>
          </div>
        </div>
        <Btn variant="primary" size="sm" onClick={() => openModal('addJob')}>+ Agregar</Btn>
      </div>

      {/* Stats */}
      <div className="grid-3" style={{ marginBottom: 12 }}>
        <Stat label="Apps/sem" val={project.appsWeek} color="var(--orange)" />
        <Stat label="Entrevistas" val={project.interviews} color="var(--yellow)" />
        <Stat label="Pipeline" val={project.applications.filter((a) => ['phone screen','entrevista','oferta'].includes(a.status)).length} color="var(--green)" />
      </div>
      <ProgressBar value={project.appsWeek} max={project.appsTarget} color="var(--orange)" />
      <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4, fontFamily: 'var(--mono)' }}>
        {project.appsWeek} / {project.appsTarget} apps esta semana
      </div>

      {/* Últimas aplicaciones */}
      {recent.length > 0 && (
        <>
          <Divider />
          <SectionTitle>Últimas aplicaciones</SectionTitle>
          <div className="stack" style={{ gap: 6 }}>
            {recent.map((app) => {
              const cfg = STATUS_CONFIG[app.status] || STATUS_CONFIG.aplicado
              return (
                <div key={app.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'var(--bg3)', borderRadius: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{app.empresa}</div>
                    {app.rol && <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{app.rol}</div>}
                  </div>
                  <StatusSelect value={app.status} onChange={(v) => updateJobApp(app.id, { status: v })} />
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Last note */}
      <Divider />
      {!editNote ? (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <div className="label" style={{ marginBottom: 4 }}>¿En qué me quedé?</div>
            <div style={{ fontSize: 13, color: project.lastNote ? 'var(--text-mid)' : 'var(--text-dim)', fontStyle: project.lastNote ? 'normal' : 'italic' }}>
              {project.lastNote || 'Sin nota...'}
            </div>
          </div>
          <Btn variant="ghost" size="sm" onClick={() => { setNote(project.lastNote || ''); setEditNote(true) }}>Editar</Btn>
        </div>
      ) : (
        <div className="stack" style={{ gap: 8 }}>
          <Input value={note} onChange={setNote} multiline placeholder="¿En qué me quedé? ¿Qué sigue?" />
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variant="ghost" size="sm" onClick={() => setEditNote(false)}>Cancelar</Btn>
            <Btn variant="primary" size="sm" onClick={saveNote}>Guardar</Btn>
          </div>
        </div>
      )}
    </Card>
  )
}

// ─── TAROT ────────────────────────────────────────────────────────────────────
function TarotCard() {
  const project        = useStore((s) => s.projects.tarot)
  const setProject     = useStore((s) => s.setProject)
  const toggleTarot    = useStore((s) => s.toggleTarotFeature)
  const openModal      = useStore((s) => s.openModal)
  const [editNote, setEditNote] = useState(false)
  const [note, setNote] = useState(project.lastNote || '')
  const [editMeta, setEditMeta] = useState(false)
  const [meta, setMeta] = useState({ pct: String(project.pct), hoursTotal: String(project.hoursTotal), mvpDate: project.mvpDate })

  function saveMeta() {
    setProject('tarot', {
      pct: Math.max(0, Math.min(100, Number(meta.pct) || 0)),
      hoursTotal: Number(meta.hoursTotal) || 0,
      mvpDate: meta.mvpDate,
    })
    setEditMeta(false)
  }

  function saveNote() {
    setProject('tarot', { lastNote: note })
    setEditNote(false)
  }

  const doneCount  = project.features.filter((f) => f.done).length
  const totalCount = project.features.length

  return (
    <Card accent="purple">
      <div className="row-between" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>🔮</span>
          <div>
            <div className="label">Tarot App</div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Mar / Jue / Sáb — Bloque 3</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <Btn variant="ghost" size="sm" onClick={() => { setMeta({ pct: String(project.pct), hoursTotal: String(project.hoursTotal), mvpDate: project.mvpDate }); setEditMeta(true) }}>
            Editar
          </Btn>
          <Btn variant="primary" size="sm" onClick={() => openModal('addFeature')}>+ Feature</Btn>
        </div>
      </div>

      {editMeta ? (
        <div className="stack" style={{ gap: 8, marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <label className="label" style={{ display: 'block', marginBottom: 4 }}>%</label>
              <Input value={meta.pct} onChange={(v) => setMeta((m) => ({ ...m, pct: v }))} type="number" />
            </div>
            <div style={{ flex: 1 }}>
              <label className="label" style={{ display: 'block', marginBottom: 4 }}>Horas</label>
              <Input value={meta.hoursTotal} onChange={(v) => setMeta((m) => ({ ...m, hoursTotal: v }))} type="number" />
            </div>
            <div style={{ flex: 2 }}>
              <label className="label" style={{ display: 'block', marginBottom: 4 }}>MVP Date</label>
              <Input value={meta.mvpDate} onChange={(v) => setMeta((m) => ({ ...m, mvpDate: v }))} type="date" placeholder="ej. May 2026" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variant="ghost" size="sm" onClick={() => setEditMeta(false)}>Cancelar</Btn>
            <Btn variant="primary" size="sm" onClick={saveMeta}>Guardar</Btn>
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 10 }}>
            <span style={{ fontFamily: 'var(--display)', fontSize: 40, fontWeight: 800, color: 'var(--purple)' }}>
              {project.pct}%
            </span>
            <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>completado</span>
            {project.hoursTotal > 0 && <span style={{ fontSize: 13, color: 'var(--text-dim)', marginLeft: 8 }}>· {project.hoursTotal}h totales</span>}
          </div>
          <ProgressBar value={project.pct} max={100} color="var(--purple)" />
          <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {project.mvpDate && <Badge color="purple">🎯 MVP {project.mvpDate}</Badge>}
            {totalCount > 0 && <Badge color="purple">{doneCount}/{totalCount} features</Badge>}
          </div>
        </>
      )}

      {/* Features list */}
      {project.features.length > 0 && (
        <>
          <Divider />
          <SectionTitle>Features</SectionTitle>
          <div className="stack" style={{ gap: 6 }}>
            {project.features.map((f) => {
              const prioColor = f.priority === 'high' ? 'var(--red)' : f.priority === 'med' ? 'var(--yellow)' : 'var(--green)'
              const prioIcon  = f.priority === 'high' ? '🔥' : f.priority === 'med' ? '⚡' : '🌱'
              return (
                <button
                  key={f.id}
                  onClick={() => toggleTarot(f.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    background: f.done ? 'var(--purple-dim)' : 'var(--bg3)',
                    border: `1px solid ${f.done ? 'var(--purple-mid)' : 'var(--border-mid)'}`,
                    borderRadius: 8,
                    padding: '10px 12px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'var(--transition)',
                  }}
                >
                  <span style={{ fontSize: 16, marginTop: 1 }}>{f.done ? '✅' : '⬜'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: f.done ? 'var(--purple)' : 'var(--text)', textDecoration: f.done ? 'line-through' : 'none', opacity: f.done ? 0.7 : 1 }}>
                      {f.name}
                    </div>
                    {f.notes && <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{f.notes}</div>}
                  </div>
                  <span style={{ fontSize: 14 }}>{prioIcon}</span>
                </button>
              )
            })}
          </div>
        </>
      )}

      {/* Last note */}
      <Divider />
      {!editNote ? (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <div className="label" style={{ marginBottom: 4 }}>¿En qué me quedé?</div>
            <div style={{ fontSize: 13, color: project.lastNote ? 'var(--text-mid)' : 'var(--text-dim)', fontStyle: project.lastNote ? 'normal' : 'italic' }}>
              {project.lastNote || 'Sin nota...'}
            </div>
          </div>
          <Btn variant="ghost" size="sm" onClick={() => { setNote(project.lastNote || ''); setEditNote(true) }}>Editar</Btn>
        </div>
      ) : (
        <div className="stack" style={{ gap: 8 }}>
          <Input value={note} onChange={setNote} multiline placeholder="¿Qué implementé? ¿Qué sigue?" />
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variant="ghost" size="sm" onClick={() => setEditNote(false)}>Cancelar</Btn>
            <Btn variant="primary" size="sm" onClick={saveNote}>Guardar</Btn>
          </div>
        </div>
      )}
    </Card>
  )
}

// ─── ADD JOB APP MODAL ────────────────────────────────────────────────────────
function AddJobAppModal() {
  const closeModal = useStore((s) => s.closeModal)
  const addJobApp  = useStore((s) => s.addJobApp)
  const [form, setForm] = useState({ empresa: '', rol: '', url: '', status: 'aplicado' })

  function p(k) { return (v) => setForm((f) => ({ ...f, [k]: v })) }

  function submit() {
    if (!form.empresa.trim()) return
    addJobApp(form)
    closeModal()
  }

  return (
    <ModalOverlay onClose={closeModal}>
      <h3 style={{ marginBottom: 16, fontFamily: 'var(--display)', fontSize: 20 }}>Nueva Aplicación 💼</h3>
      <div className="stack" style={{ gap: 12 }}>
        <div>
          <label className="label" style={{ display: 'block', marginBottom: 4 }}>Empresa *</label>
          <Input value={form.empresa} onChange={p('empresa')} placeholder="ej. Google" />
        </div>
        <div>
          <label className="label" style={{ display: 'block', marginBottom: 4 }}>Rol</label>
          <Input value={form.rol} onChange={p('rol')} placeholder="ej. Frontend Engineer" />
        </div>
        <div>
          <label className="label" style={{ display: 'block', marginBottom: 4 }}>URL</label>
          <Input value={form.url} onChange={p('url')} placeholder="linkedin.com/..." type="url" />
        </div>
        <div>
          <label className="label" style={{ display: 'block', marginBottom: 8 }}>Status</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <button
                key={key}
                type="button"
                onClick={() => setForm((f) => ({ ...f, status: key }))}
                className={`badge badge-${cfg.color}`}
                style={{
                  cursor: 'pointer',
                  border: `1px solid ${form.status === key ? 'currentColor' : 'transparent'}`,
                  padding: '6px 12px',
                  fontSize: 12,
                  opacity: form.status === key ? 1 : 0.5,
                  transition: 'var(--transition)',
                }}
              >
                {cfg.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <Btn variant="ghost" style={{ flex: 1 }} onClick={closeModal}>Cancelar</Btn>
          <Btn variant="primary" style={{ flex: 2 }} onClick={submit} disabled={!form.empresa.trim()}>
            Agregar ✓
          </Btn>
        </div>
      </div>
    </ModalOverlay>
  )
}

// ─── ADD FEATURE MODAL ────────────────────────────────────────────────────────
function AddFeatureModal() {
  const closeModal      = useStore((s) => s.closeModal)
  const addTarotFeature = useStore((s) => s.addTarotFeature)
  const [form, setForm] = useState({ name: '', notes: '', priority: 'med' })

  function p(k) { return (v) => setForm((f) => ({ ...f, [k]: v })) }

  function submit() {
    if (!form.name.trim()) return
    addTarotFeature(form)
    closeModal()
  }

  return (
    <ModalOverlay onClose={closeModal}>
      <h3 style={{ marginBottom: 16, fontFamily: 'var(--display)', fontSize: 20 }}>Nueva Feature 🔮</h3>
      <div className="stack" style={{ gap: 12 }}>
        <div>
          <label className="label" style={{ display: 'block', marginBottom: 4 }}>Nombre *</label>
          <Input value={form.name} onChange={p('name')} placeholder="ej. Deck selector UI" />
        </div>
        <div>
          <label className="label" style={{ display: 'block', marginBottom: 4 }}>Notas</label>
          <Input value={form.notes} onChange={p('notes')} multiline placeholder="Detalles, referencias, links..." />
        </div>
        <div>
          <label className="label" style={{ display: 'block', marginBottom: 8 }}>Prioridad</label>
          <div style={{ display: 'flex', gap: 10 }}>
            {[
              { val: 'high', icon: '🔥', label: 'Alta', color: 'var(--red)' },
              { val: 'med',  icon: '⚡', label: 'Media', color: 'var(--yellow)' },
              { val: 'low',  icon: '🌱', label: 'Baja', color: 'var(--green)' },
            ].map((p) => (
              <button
                key={p.val}
                type="button"
                onClick={() => setForm((f) => ({ ...f, priority: p.val }))}
                style={{
                  flex: 1,
                  padding: '10px 8px',
                  borderRadius: 10,
                  border: `1px solid ${form.priority === p.val ? p.color + '88' : 'var(--border-mid)'}`,
                  background: form.priority === p.val ? p.color + '18' : 'var(--bg3)',
                  cursor: 'pointer',
                  fontSize: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  transition: 'var(--transition)',
                }}
              >
                <span>{p.icon}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: form.priority === p.val ? p.color : 'var(--text-dim)' }}>{p.label}</span>
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <Btn variant="ghost" style={{ flex: 1 }} onClick={closeModal}>Cancelar</Btn>
          <Btn variant="primary" style={{ flex: 2 }} onClick={submit} disabled={!form.name.trim()}>
            Agregar ✓
          </Btn>
        </div>
      </div>
    </ModalOverlay>
  )
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function Stat({ label, val, color }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--display)', fontSize: 26, fontWeight: 800, color }}>{val}</div>
      <div className="label" style={{ marginTop: 2 }}>{label}</div>
    </div>
  )
}

function StatusSelect({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const cfg = STATUS_CONFIG[value] || STATUS_CONFIG.aplicado
  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`badge badge-${cfg.color}`}
        style={{ cursor: 'pointer', border: 'none' }}
      >
        {cfg.label}
      </button>
      {open && (
        <div style={{
          position: 'absolute',
          right: 0,
          top: '110%',
          background: 'var(--bg4)',
          border: '1px solid var(--border-bright)',
          borderRadius: 10,
          padding: 6,
          zIndex: 10,
          minWidth: 140,
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          animation: 'scaleIn 0.15s ease',
        }}>
          {Object.entries(STATUS_CONFIG).map(([k, c]) => (
            <button
              key={k}
              onClick={() => { onChange(k); setOpen(false) }}
              className={`badge badge-${c.color}`}
              style={{ display: 'block', width: '100%', cursor: 'pointer', marginBottom: 4, border: 'none', textAlign: 'left' }}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
