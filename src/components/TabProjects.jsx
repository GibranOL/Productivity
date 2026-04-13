import { useState, useCallback } from 'react'
import useStore from '../store/index'
import useProjectStore from '../store/projectStore'
import useJobStore from '../store/jobStore'
import useCortanaStore from '../store/cortanaStore'
import { Card, Btn, Input, ProgressBar, Badge, ModalOverlay, SectionTitle, Divider } from './UI'
import ProjectDetail from './ProjectDetail'
import KanbanBoard from './projects/KanbanBoard'
import JobPipeline from './jobs/JobPipeline'
import { AddJobModal, EditJobModal } from './jobs/AddJobModal'
import { buildJDAnalysisPrompt, parseMatchScore } from '../lib/jdAnalyzer'
import { chat, buildSystemPromptWithMemory } from '../services/ollamaService'

const STATUS_CONFIG = {
  aplicado:     { label: 'Aplicado',     color: 'teal' },
  'phone screen': { label: 'Phone Screen', color: 'yellow' },
  entrevista:   { label: 'Entrevista',   color: 'orange' },
  oferta:       { label: 'Oferta 🎉',    color: 'green' },
  rechazado:    { label: 'Rechazado',    color: 'red' },
}

const PROJECT_FILTERS = [
  { id: 'all',       label: 'Todos',       icon: '📁' },
  { id: 'truenorth', label: 'TrueNorth',   icon: '🧭' },
  { id: 'jobsearch', label: 'Job Search',  icon: '💼' },
  { id: 'tarot',     label: 'Tarot App',   icon: '🔮' },
]

const VIEW_TABS = [
  { id: 'kanban',   label: 'KANBAN' },
  { id: 'pipeline', label: 'JOB PIPELINE' },
  { id: 'cards',    label: 'CARDS' },
]

export default function TabProjects() {
  const modal = useStore((s) => s.modal)
  const openModal = useStore((s) => s.openModal)
  const closeModal = useStore((s) => s.closeModal)
  const updateJob = useJobStore((s) => s.updateJob)
  const [detailProject, setDetailProject] = useState(null)
  const [view, setView] = useState('kanban')
  const [projectFilter, setProjectFilter] = useState('all')
  const [showAddJob, setShowAddJob] = useState(false)
  const [editingJob, setEditingJob] = useState(null)
  const [analyzingJob, setAnalyzingJob] = useState(null) // job being analyzed
  const [analyzing, setAnalyzing] = useState(false)

  // JD Analysis via Cortana (Ollama)
  const handleAnalyzeJD = useCallback(async (job) => {
    if (!job.jdText || analyzing) return
    setAnalyzingJob(job)
    setAnalyzing(true)

    const prompt = buildJDAnalysisPrompt(job.jdText, job.company, job.role)
    const cortanaState = useCortanaStore.getState()
    const model = cortanaState.selectedModel

    try {
      let fullResponse = ''
      const messages = [
        { role: 'system', content: 'Eres Cortana, asistente de job search de Gibran. Responde en español, sé directa y honesta.' },
        { role: 'user', content: prompt },
      ]

      for await (const chunk of chat(messages, model)) {
        fullResponse += chunk
      }

      // Parse match score from response
      const matchScore = parseMatchScore(fullResponse)

      // Update job with analysis results
      updateJob(job.id, {
        matchScore,
        matchAnalysis: fullResponse,
      })
    } catch (err) {
      // If Ollama is offline, show error in analysis field
      updateJob(job.id, {
        matchAnalysis: `Error: ${err.message || 'No se pudo conectar a Cortana. Verifica que Ollama esté corriendo.'}`,
      })
    } finally {
      setAnalyzing(false)
      setAnalyzingJob(null)
    }
  }, [analyzing, updateJob])

  if (detailProject) {
    return (
      <div style={{ paddingBottom: 80 }}>
        <ProjectDetail
          projectId={detailProject.id}
          projectName={detailProject.name}
          projectIcon={detailProject.icon}
          onBack={() => setDetailProject(null)}
        />
      </div>
    )
  }

  return (
    <div className="stack" style={{ gap: 16, paddingBottom: 80 }}>
      {/* View Toggle + Filters */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg3)', borderRadius: 8, padding: 3 }}>
          {VIEW_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setView(tab.id)}
              style={{
                padding: '5px 12px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
                fontFamily: 'var(--mono)', letterSpacing: '0.1em', border: 'none',
                background: view === tab.id ? 'var(--teal-dim)' : 'transparent',
                color: view === tab.id ? 'var(--teal)' : 'var(--text-dim)',
                transition: 'var(--transition)',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Kanban project filter */}
        {view === 'kanban' && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {PROJECT_FILTERS.map((pf) => (
              <button
                key={pf.id}
                onClick={() => setProjectFilter(pf.id)}
                style={{
                  padding: '4px 10px', borderRadius: 6, fontSize: 10, cursor: 'pointer',
                  fontFamily: 'var(--mono)', border: '1px solid',
                  background: projectFilter === pf.id ? 'var(--bg4)' : 'transparent',
                  borderColor: projectFilter === pf.id ? 'var(--border-bright)' : 'var(--border)',
                  color: projectFilter === pf.id ? 'var(--text)' : 'var(--text-dim)',
                  transition: 'var(--transition)',
                }}
              >
                {pf.icon} {pf.label}
              </button>
            ))}
          </div>
        )}

        {/* Pipeline add button */}
        {view === 'pipeline' && (
          <Btn variant="primary" size="sm" onClick={() => setShowAddJob(true)}>
            + Vacante
          </Btn>
        )}
      </div>

      {/* Analyzing indicator */}
      {analyzing && analyzingJob && (
        <div style={{
          background: 'var(--bg3)', border: '1px solid var(--teal-mid)', borderRadius: 10,
          padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8,
          animation: 'pulse 1.5s infinite',
        }}>
          <span style={{
            width: 24, height: 24, borderRadius: 8,
            background: 'linear-gradient(135deg, var(--teal-dim), var(--purple-dim))',
            border: '1px solid var(--teal-glow)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--display)', fontSize: 11, fontWeight: 800, color: 'var(--teal)',
          }}>C</span>
          <span style={{ fontSize: 12, color: 'var(--text-mid)' }}>
            Cortana analizando JD de <strong style={{ color: 'var(--teal)' }}>{analyzingJob.company}</strong>...
          </span>
        </div>
      )}

      {/* Kanban View */}
      {view === 'kanban' && (
        <KanbanBoard projectFilter={projectFilter} />
      )}

      {/* Pipeline View */}
      {view === 'pipeline' && (
        <JobPipeline
          onAddJob={() => setShowAddJob(true)}
          onEditJob={(job) => setEditingJob(job)}
          onAnalyzeJD={handleAnalyzeJD}
        />
      )}

      {/* Cards View (original) */}
      {view === 'cards' && (
        <>
          <TrueNorthCard onDetail={() => setDetailProject({ id: 'truenorth', name: 'TrueNorth Pathways', icon: '🧭' })} />
          <JobSearchCard />
          <TarotCard onDetail={() => setDetailProject({ id: 'tarot', name: 'Tarot App', icon: '🔮' })} />
        </>
      )}

      {/* Job modals */}
      {showAddJob && <AddJobModal onClose={() => setShowAddJob(false)} />}
      {editingJob && <EditJobModal job={editingJob} onClose={() => setEditingJob(null)} />}

      {modal === 'addJob'     && <AddJobAppModal />}
      {modal === 'addFeature' && <AddFeatureModal />}
    </div>
  )
}

// ─── TRUENORTH ────────────────────────────────────────────────────────────────
function TrueNorthCard({ onDetail }) {
  const project    = useStore((s) => s.projects.truenorth)
  const getTasksForProject = useProjectStore((s) => s.getTasksForProject)
  const nextTask = getTasksForProject('truenorth').find((t) => t.status === 'todo')
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
        <div style={{ display: 'flex', gap: 6 }}>
          <Btn variant="ghost" size="sm" onClick={editing ? save : startEdit}>
            {editing ? 'Guardar' : 'Editar'}
          </Btn>
          <Btn variant="primary" size="sm" onClick={onDetail}>Ver →</Btn>
        </div>
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
          {nextTask && (
            <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-dim)' }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.1em' }}>PRÓX. TAREA: </span>
              {nextTask.title}
            </div>
          )}
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
function TarotCard({ onDetail }) {
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
          <Btn variant="ghost" size="sm" onClick={onDetail}>Ver →</Btn>
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
