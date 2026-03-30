// ─── UI PRIMITIVES ────────────────────────────────────────────────────────────

export function Card({ children, accent = 'teal', className = '', style = {}, onClick }) {
  return (
    <div
      className={`card accent-${accent} ${className}`}
      style={style}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

export function Btn({ children, variant = 'primary', size = '', icon, onClick, disabled, className = '', style = {}, type = 'button' }) {
  return (
    <button
      type={type}
      className={`btn btn-${variant} ${size ? `btn-${size}` : ''} ${className}`}
      onClick={onClick}
      disabled={disabled}
      style={style}
    >
      {icon && <span>{icon}</span>}
      {children}
    </button>
  )
}

// 3-state toggle: null → true → false → null
export function Toggle({ value, onChange, labelTrue = '✓ SÍ', labelFalse = '✗ NO', labelNull = '— N/A' }) {
  function cycle() {
    if (value === null || value === undefined) onChange(true)
    else if (value === true) onChange(false)
    else onChange(null)
  }
  const stateClass = value === true ? 'state-true' : value === false ? 'state-false' : 'state-null'
  const label = value === true ? labelTrue : value === false ? labelFalse : labelNull
  return (
    <button type="button" className={`toggle-btn ${stateClass}`} onClick={cycle}>
      {label}
    </button>
  )
}

export function ProgressBar({ value = 0, max = 100, color = 'var(--teal)', height = 6 }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div className="progress-bar" style={{ height }}>
      <div
        className="progress-bar-fill"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  )
}

export function ModalOverlay({ children, onClose }) {
  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-sheet anim-slide-up">
        <div className="modal-handle" />
        {children}
      </div>
    </div>
  )
}

export function Input({ value, onChange, placeholder, type = 'text', className = '', style = {}, multiline = false }) {
  if (multiline) {
    return (
      <textarea
        className={`input ${className}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={style}
      />
    )
  }
  return (
    <input
      type={type}
      className={`input ${className}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={style}
    />
  )
}

export function Badge({ children, color = 'teal' }) {
  return <span className={`badge badge-${color}`}>{children}</span>
}

export function SectionTitle({ children }) {
  return <div className="section-title">{children}</div>
}

export function Divider() {
  return <div className="divider" />
}
