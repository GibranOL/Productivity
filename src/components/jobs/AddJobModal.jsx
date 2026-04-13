import { useState } from 'react'
import useJobStore, { JOB_STATUS_CONFIG, ACTIVE_STATUSES } from '../../store/jobStore'
import { Btn, Input, ModalOverlay } from '../UI'

// ─── Add Job Modal ───────────────────────────────────────────────────────────
export function AddJobModal({ onClose }) {
  const addJob = useJobStore((s) => s.addJob)
  const [form, setForm] = useState({
    company: '',
    role: '',
    url: '',
    salary: '',
    location: 'Vancouver, BC',
    jdText: '',
    notes: '',
    status: 'wishlist',
  })

  function p(key) {
    return (val) => setForm((f) => ({ ...f, [key]: val }))
  }

  function submit() {
    if (!form.company.trim()) return
    addJob(form)
    onClose()
  }

  return (
    <ModalOverlay onClose={onClose}>
      <h3 style={{ marginBottom: 16, fontFamily: 'var(--display)', fontSize: 20 }}>
        Nueva Vacante 💼
      </h3>
      <div className="stack" style={{ gap: 12 }}>
        {/* Company + Role */}
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label className="label" style={{ display: 'block', marginBottom: 4 }}>Empresa *</label>
            <Input value={form.company} onChange={p('company')} placeholder="ej. Google" />
          </div>
          <div style={{ flex: 1 }}>
            <label className="label" style={{ display: 'block', marginBottom: 4 }}>Rol</label>
            <Input value={form.role} onChange={p('role')} placeholder="ej. QA Engineer" />
          </div>
        </div>

        {/* URL */}
        <div>
          <label className="label" style={{ display: 'block', marginBottom: 4 }}>URL</label>
          <Input value={form.url} onChange={p('url')} placeholder="linkedin.com/jobs/..." type="url" />
        </div>

        {/* Salary + Location */}
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label className="label" style={{ display: 'block', marginBottom: 4 }}>Salario</label>
            <Input value={form.salary} onChange={p('salary')} placeholder="ej. $80-100K CAD" />
          </div>
          <div style={{ flex: 1 }}>
            <label className="label" style={{ display: 'block', marginBottom: 4 }}>Ubicacion</label>
            <Input value={form.location} onChange={p('location')} placeholder="Vancouver, BC" />
          </div>
        </div>

        {/* JD Text */}
        <div>
          <label className="label" style={{ display: 'block', marginBottom: 4 }}>
            Job Description (para analisis con Cortana)
          </label>
          <Input
            value={form.jdText}
            onChange={p('jdText')}
            multiline
            placeholder="Pega el JD aqui para que Cortana lo analice contra tu perfil..."
            style={{ minHeight: 100 }}
          />
        </div>

        {/* Notes */}
        <div>
          <label className="label" style={{ display: 'block', marginBottom: 4 }}>Notas</label>
          <Input value={form.notes} onChange={p('notes')} multiline placeholder="Contexto, referral, contacto..." />
        </div>

        {/* Status */}
        <div>
          <label className="label" style={{ display: 'block', marginBottom: 6 }}>Status inicial</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['wishlist', 'applied'].map((st) => {
              const cfg = JOB_STATUS_CONFIG[st]
              const active = form.status === st
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, status: st }))}
                  style={{
                    padding: '6px 14px', borderRadius: 8, cursor: 'pointer',
                    fontSize: 12, fontFamily: 'var(--sans)', fontWeight: 600,
                    background: active ? cfg.color + '2e' : 'var(--bg3)',
                    border: `1px solid ${active ? cfg.color + '66' : 'var(--border-mid)'}`,
                    color: active ? cfg.color : 'var(--text-dim)',
                    transition: 'var(--transition)',
                  }}
                >
                  {cfg.icon} {cfg.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <Btn variant="ghost" style={{ flex: 1 }} onClick={onClose}>Cancelar</Btn>
          <Btn variant="primary" style={{ flex: 2 }} onClick={submit} disabled={!form.company.trim()}>
            Agregar
          </Btn>
        </div>
      </div>
    </ModalOverlay>
  )
}

// ─── Edit Job Modal ──────────────────────────────────────────────────────────
export function EditJobModal({ job, onClose }) {
  const updateJob = useJobStore((s) => s.updateJob)
  const moveJob = useJobStore((s) => s.moveJob)
  const deleteJob = useJobStore((s) => s.deleteJob)
  const getDaysInStatus = useJobStore((s) => s.getDaysInStatus)

  const [form, setForm] = useState({
    company: job.company,
    role: job.role,
    url: job.url,
    salary: job.salary,
    location: job.location,
    jdText: job.jdText || '',
    notes: job.notes || '',
  })
  const [confirmDelete, setConfirmDelete] = useState(false)

  function p(key) {
    return (val) => setForm((f) => ({ ...f, [key]: val }))
  }

  function save() {
    updateJob(job.id, form)
    onClose()
  }

  function handleStatusChange(newStatus) {
    moveJob(job.id, newStatus)
    onClose()
  }

  function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return }
    deleteJob(job.id)
    onClose()
  }

  const days = getDaysInStatus(job)
  const cfg = JOB_STATUS_CONFIG[job.status]

  // Build timeline from history
  const history = job.statusHistory || []

  return (
    <ModalOverlay onClose={onClose}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <h3 style={{ fontFamily: 'var(--display)', fontSize: 20, marginBottom: 4 }}>
            {job.company}
          </h3>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span className={`badge badge-${cfg.colorName === 'text-dim' ? 'teal' : cfg.colorName}`}>
              {cfg.icon} {cfg.label}
            </span>
            {days > 0 && (
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-dim)' }}>
                {days} dias en este paso
              </span>
            )}
          </div>
        </div>
        {job.matchScore !== null && job.matchScore !== undefined && (
          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontFamily: 'var(--display)', fontSize: 28, fontWeight: 800,
              color: job.matchScore >= 70 ? 'var(--green)' : job.matchScore >= 40 ? 'var(--yellow)' : 'var(--red)',
            }}>
              {job.matchScore}%
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: '0.15em', color: 'var(--text-dim)' }}>
              MATCH
            </div>
          </div>
        )}
      </div>

      <div className="stack" style={{ gap: 12 }}>
        {/* Status flow buttons */}
        <div>
          <label className="label" style={{ display: 'block', marginBottom: 6 }}>Mover a</label>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {[...ACTIVE_STATUSES, 'rejected', 'ghosted'].map((st) => {
              const stCfg = JOB_STATUS_CONFIG[st]
              const isCurrent = job.status === st
              return (
                <button
                  key={st}
                  onClick={() => !isCurrent && handleStatusChange(st)}
                  disabled={isCurrent}
                  style={{
                    padding: '4px 8px', borderRadius: 6, cursor: isCurrent ? 'default' : 'pointer',
                    fontSize: 10, fontFamily: 'var(--mono)',
                    background: isCurrent ? stCfg.color + '2e' : 'var(--bg3)',
                    border: `1px solid ${isCurrent ? stCfg.color + '66' : 'var(--border)'}`,
                    color: isCurrent ? stCfg.color : 'var(--text-dim)',
                    opacity: isCurrent ? 1 : 0.8,
                    transition: 'var(--transition)',
                  }}
                >
                  {stCfg.icon} {stCfg.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Timeline */}
        {history.length > 1 && (
          <div>
            <label className="label" style={{ display: 'block', marginBottom: 6 }}>Timeline</label>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {history.map((h, i) => {
                const hCfg = JOB_STATUS_CONFIG[h.status]
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{
                      fontSize: 9, fontFamily: 'var(--mono)',
                      padding: '2px 6px', borderRadius: 4,
                      background: hCfg.color + '18', color: hCfg.color,
                    }}>
                      {hCfg.icon} {h.date.slice(5)}
                    </span>
                    {i < history.length - 1 && (
                      <span style={{ color: 'var(--text-dim)', fontSize: 10 }}>→</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Match analysis */}
        {job.matchAnalysis && (
          <div style={{
            background: 'var(--bg3)', borderRadius: 8, padding: '10px 12px',
            border: '1px solid var(--border-mid)',
          }}>
            <label className="label" style={{ display: 'block', marginBottom: 4 }}>Analisis de Cortana</label>
            <div style={{ fontSize: 12, color: 'var(--text-mid)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
              {job.matchAnalysis}
            </div>
          </div>
        )}

        {/* Editable fields */}
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label className="label" style={{ display: 'block', marginBottom: 4 }}>Empresa</label>
            <Input value={form.company} onChange={p('company')} />
          </div>
          <div style={{ flex: 1 }}>
            <label className="label" style={{ display: 'block', marginBottom: 4 }}>Rol</label>
            <Input value={form.role} onChange={p('role')} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label className="label" style={{ display: 'block', marginBottom: 4 }}>Salario</label>
            <Input value={form.salary} onChange={p('salary')} />
          </div>
          <div style={{ flex: 1 }}>
            <label className="label" style={{ display: 'block', marginBottom: 4 }}>Ubicacion</label>
            <Input value={form.location} onChange={p('location')} />
          </div>
        </div>

        <div>
          <label className="label" style={{ display: 'block', marginBottom: 4 }}>URL</label>
          <Input value={form.url} onChange={p('url')} />
        </div>

        <div>
          <label className="label" style={{ display: 'block', marginBottom: 4 }}>Job Description</label>
          <Input value={form.jdText} onChange={p('jdText')} multiline style={{ minHeight: 80 }} />
        </div>

        <div>
          <label className="label" style={{ display: 'block', marginBottom: 4 }}>Notas</label>
          <Input value={form.notes} onChange={p('notes')} multiline placeholder="Post-mortem, feedback, next steps..." />
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <Btn variant="danger" size="sm" onClick={handleDelete}>
            {confirmDelete ? 'Confirmar' : 'Eliminar'}
          </Btn>
          <div style={{ flex: 1 }} />
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn variant="primary" onClick={save}>Guardar</Btn>
        </div>
      </div>
    </ModalOverlay>
  )
}
