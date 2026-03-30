import { useState } from 'react'
import useStore from '../store/index'
import { Btn, Input, ProgressBar, SectionTitle } from './UI'
import { requestNotificationPermission, scheduleNotificationsForToday } from '../utils/notifications'

const TOTAL_STEPS = 6

export default function Onboarding() {
  const setUser = useStore((s) => s.setUser)
  const setProject = useStore((s) => s.setProject)

  const [step, setStep] = useState(0)
  const [data, setData] = useState({
    sleepConfirm: 1,
    gymDays: 5,
    social: [],
    startEnergy: 7,
    // projects
    truenorthPct: '',
    truenorthDeadline: '',
    tarotMvpDate: '',
    jsAppsTarget: '10',
    notificationsEnabled: false,
  })

  function patch(key, val) {
    setData((d) => ({ ...d, [key]: val }))
  }

  function toggleSocial(val) {
    setData((d) => {
      const s = d.social.includes(val) ? d.social.filter((x) => x !== val) : [...d.social, val]
      return { ...d, social: s }
    })
  }

  async function finish() {
    let notifEnabled = false
    notifEnabled = await requestNotificationPermission()
    if (notifEnabled) scheduleNotificationsForToday()

    setUser({
      onboarded: true,
      gymDays: data.gymDays,
      sleepConfirm: data.sleepConfirm,
      social: data.social,
      startEnergy: data.startEnergy,
      notificationsEnabled: notifEnabled,
    })
    setProject('truenorth', {
      pct: Number(data.truenorthPct) || 0,
      deadline: data.truenorthDeadline,
    })
    setProject('jobsearch', {
      appsTarget: Number(data.jsAppsTarget) || 10,
    })
    setProject('tarot', {
      mvpDate: data.tarotMvpDate,
    })
  }

  const steps = [
    <StepSleep data={data} patch={patch} />,
    <StepGym data={data} patch={patch} />,
    <StepProjects data={data} patch={patch} />,
    <StepSocial data={data} toggleSocial={toggleSocial} />,
    <StepEnergy data={data} patch={patch} />,
    <StepConfirm data={data} onFinish={finish} />,
  ]

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 20px calc(40px + env(safe-area-inset-bottom))',
      paddingTop: 'calc(48px + env(safe-area-inset-top))',
      maxWidth: 480,
      margin: '0 auto',
      position: 'relative',
      zIndex: 1,
    }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div className="label" style={{ marginBottom: 8 }}>PASO {step + 1} / {TOTAL_STEPS}</div>
        <ProgressBar value={step + 1} max={TOTAL_STEPS} />
      </div>

      {/* Step content */}
      <div style={{ flex: 1, animation: 'fadeIn 0.2s ease' }} key={step}>
        {steps[step]}
      </div>

      {/* Nav buttons */}
      {step < TOTAL_STEPS - 1 && (
        <div style={{ marginTop: 32, display: 'flex', gap: 12 }}>
          {step > 0 && (
            <Btn variant="ghost" onClick={() => setStep((s) => s - 1)}>
              ← Atrás
            </Btn>
          )}
          <Btn
            variant="primary"
            style={{ flex: 1 }}
            onClick={() => setStep((s) => s + 1)}
          >
            Continuar →
          </Btn>
        </div>
      )}
    </div>
  )
}

// ─── STEP 1: SUEÑO ───────────────────────────────────────────────────────────
function StepSleep({ data, patch }) {
  const opts = [
    { val: 2, label: 'Siempre puntual 💯', sub: '12 AM en punto' },
    { val: 1, label: 'Casi siempre ✓',     sub: 'A veces me paso un poco' },
    { val: 0, label: 'En progreso 🔄',      sub: 'Trabajando en ello' },
  ]
  return (
    <div className="stack" style={{ gap: 20 }}>
      <div>
        <h2 style={{ fontSize: 28, marginBottom: 8 }}>Sueño 🌙</h2>
        <p style={{ color: 'var(--text-mid)', fontSize: 14 }}>
          Tu ventana es <strong style={{ color: 'var(--purple)' }}>12 AM – 8 AM</strong>.
          Dormir bien es el pilar de todo lo demás.
        </p>
      </div>
      <SectionTitle>¿Qué tan consistente eres?</SectionTitle>
      <div className="stack">
        {opts.map((o) => (
          <button
            key={o.val}
            type="button"
            onClick={() => patch('sleepConfirm', o.val)}
            style={{
              background: data.sleepConfirm === o.val ? 'var(--purple-dim)' : 'var(--bg3)',
              border: `1px solid ${data.sleepConfirm === o.val ? 'var(--purple-mid)' : 'var(--border-mid)'}`,
              borderRadius: 'var(--radius)',
              padding: '14px 16px',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'var(--transition)',
            }}
          >
            <div style={{ fontWeight: 600, color: data.sleepConfirm === o.val ? 'var(--purple)' : 'var(--text)' }}>{o.label}</div>
            <div style={{ fontSize: 13, color: 'var(--text-mid)', marginTop: 2 }}>{o.sub}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── STEP 2: GYM ─────────────────────────────────────────────────────────────
function StepGym({ data, patch }) {
  const opts = [
    { val: 5, label: '5 días/semana 🔥', sub: 'Lun/Mar/Mié/Vie/Sáb' },
    { val: 4, label: '4 días/semana ⚡', sub: 'Ajustado según energía' },
    { val: 3, label: '3 días/semana ✓',  sub: 'Mínimo viable' },
  ]
  return (
    <div className="stack" style={{ gap: 20 }}>
      <div>
        <h2 style={{ fontSize: 28, marginBottom: 8 }}>Gym 🏋️</h2>
        <p style={{ color: 'var(--text-mid)', fontSize: 14 }}>
          Tu ventana es <strong style={{ color: 'var(--orange)' }}>12:30 – 4 PM</strong>.
          Jueves y Domingo son descanso por default.
        </p>
      </div>
      <SectionTitle>Objetivo semanal</SectionTitle>
      <div className="stack">
        {opts.map((o) => (
          <button
            key={o.val}
            type="button"
            onClick={() => patch('gymDays', o.val)}
            style={{
              background: data.gymDays === o.val ? 'var(--orange-dim)' : 'var(--bg3)',
              border: `1px solid ${data.gymDays === o.val ? 'var(--orange-mid)' : 'var(--border-mid)'}`,
              borderRadius: 'var(--radius)',
              padding: '14px 16px',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'var(--transition)',
            }}
          >
            <div style={{ fontWeight: 600, color: data.gymDays === o.val ? 'var(--orange)' : 'var(--text)' }}>{o.label}</div>
            <div style={{ fontSize: 13, color: 'var(--text-mid)', marginTop: 2 }}>{o.sub}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── STEP 3: PROYECTOS ────────────────────────────────────────────────────────
function StepProjects({ data, patch }) {
  return (
    <div className="stack" style={{ gap: 20 }}>
      <div>
        <h2 style={{ fontSize: 28, marginBottom: 8 }}>Proyectos 🚀</h2>
        <p style={{ color: 'var(--text-mid)', fontSize: 14 }}>
          ¿En qué punto estás con cada uno?
        </p>
      </div>

      <div className="card accent-teal" style={{ gap: 12, display: 'flex', flexDirection: 'column' }}>
        <SectionTitle>TrueNorth Pathways 🧭</SectionTitle>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label className="label" style={{ display: 'block', marginBottom: 6 }}>% Completado</label>
            <Input value={data.truenorthPct} onChange={(v) => patch('truenorthPct', v)} placeholder="0" type="number" />
          </div>
          <div style={{ flex: 2 }}>
            <label className="label" style={{ display: 'block', marginBottom: 6 }}>Deadline</label>
            <Input value={data.truenorthDeadline} onChange={(v) => patch('truenorthDeadline', v)} type="date" placeholder="ej. Abr 2026" />
          </div>
        </div>
      </div>

      <div className="card accent-orange" style={{ gap: 12, display: 'flex', flexDirection: 'column' }}>
        <SectionTitle>Job Search 💼</SectionTitle>
        <div>
          <label className="label" style={{ display: 'block', marginBottom: 6 }}>Target apps/semana</label>
          <Input value={data.jsAppsTarget} onChange={(v) => patch('jsAppsTarget', v)} placeholder="10" type="number" />
        </div>
      </div>

      <div className="card accent-purple" style={{ gap: 12, display: 'flex', flexDirection: 'column' }}>
        <SectionTitle>Tarot App 🔮</SectionTitle>
        <div>
          <label className="label" style={{ display: 'block', marginBottom: 6 }}>MVP Date</label>
          <Input value={data.tarotMvpDate} onChange={(v) => patch('tarotMvpDate', v)} type="date" placeholder="ej. May 2026" />
        </div>
      </div>
    </div>
  )
}

// ─── STEP 4: SOCIAL ───────────────────────────────────────────────────────────
function StepSocial({ data, toggleSocial }) {
  const opts = [
    { val: 'gaming',    label: '🎮 Gaming' },
    { val: 'salir',     label: '🍻 Salir' },
    { val: 'peliculas', label: '🎬 Películas' },
    { val: 'naturaleza',label: '🌿 Naturaleza' },
    { val: 'musica',    label: '🎵 Música' },
    { val: 'lectura',   label: '📚 Lectura' },
  ]
  return (
    <div className="stack" style={{ gap: 20 }}>
      <div>
        <h2 style={{ fontSize: 28, marginBottom: 8 }}>Relax & Social 🎉</h2>
        <p style={{ color: 'var(--text-mid)', fontSize: 14 }}>
          1-2 noches/semana de desconexión real. ¿Qué te recarga?
        </p>
      </div>
      <SectionTitle>Elige los que aplican</SectionTitle>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {opts.map((o) => {
          const active = data.social.includes(o.val)
          return (
            <button
              key={o.val}
              type="button"
              onClick={() => toggleSocial(o.val)}
              style={{
                background: active ? 'var(--green-dim)' : 'var(--bg3)',
                border: `1px solid ${active ? 'var(--green-mid)' : 'var(--border-mid)'}`,
                borderRadius: 20,
                padding: '8px 16px',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 600,
                color: active ? 'var(--green)' : 'var(--text-mid)',
                transition: 'var(--transition)',
              }}
            >
              {o.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── STEP 5: ENERGÍA ──────────────────────────────────────────────────────────
function StepEnergy({ data, patch }) {
  const opts = [
    { val: 9, label: '⚡ Alto', sub: 'Me siento excelente' },
    { val: 7, label: '✅ Bueno', sub: 'Listo para trabajar' },
    { val: 5, label: '😐 Normal', sub: 'Día promedio' },
    { val: 2, label: '😴 Bajo', sub: 'Voy cansado / en recuperación' },
  ]
  return (
    <div className="stack" style={{ gap: 20 }}>
      <div>
        <h2 style={{ fontSize: 28, marginBottom: 8 }}>Energía 🔋</h2>
        <p style={{ color: 'var(--text-mid)', fontSize: 14 }}>
          ¿Cómo te sientes en este momento?
        </p>
      </div>
      <div className="stack">
        {opts.map((o) => {
          const active = data.startEnergy === o.val
          return (
            <button
              key={o.val}
              type="button"
              onClick={() => patch('startEnergy', o.val)}
              style={{
                background: active ? 'var(--teal-dim)' : 'var(--bg3)',
                border: `1px solid ${active ? 'var(--teal-mid)' : 'var(--border-mid)'}`,
                borderRadius: 'var(--radius)',
                padding: '14px 16px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'var(--transition)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontWeight: 600, color: active ? 'var(--teal)' : 'var(--text)' }}>{o.label}</div>
                <div style={{ fontSize: 13, color: 'var(--text-mid)', marginTop: 2 }}>{o.sub}</div>
              </div>
              <div style={{
                fontFamily: 'var(--mono)',
                fontSize: 24,
                fontWeight: 700,
                color: active ? 'var(--teal)' : 'var(--text-dim)',
              }}>{o.val}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── STEP 6: CONFIRMACIÓN ─────────────────────────────────────────────────────
function StepConfirm({ data, onFinish }) {
  const gymLabels = { 5: '5 días', 4: '4 días', 3: '3 días' }
  const energyLabels = { 9: 'Alto ⚡', 7: 'Bueno ✅', 5: 'Normal 😐', 2: 'Bajo 😴' }

  const items = [
    { icon: '🌙', label: 'Sueño', val: '12 AM – 8 AM', color: 'var(--purple)' },
    { icon: '🏋️', label: 'Gym', val: gymLabels[data.gymDays] || `${data.gymDays} días`, color: 'var(--orange)' },
    { icon: '🧭', label: 'TrueNorth', val: data.truenorthPct ? `${data.truenorthPct}%` : 'Sin %, ok', color: 'var(--teal)' },
    { icon: '💼', label: 'Apps/semana', val: `${data.jsAppsTarget || 10} objetivo`, color: 'var(--yellow)' },
    { icon: '🔮', label: 'Tarot MVP', val: data.tarotMvpDate || 'Sin fecha, ok', color: 'var(--purple)' },
    { icon: '🔋', label: 'Energía inicial', val: energyLabels[data.startEnergy] || String(data.startEnergy), color: 'var(--green)' },
  ]

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div>
        <h2 style={{ fontSize: 28, marginBottom: 8 }}>Todo listo 🚀</h2>
        <p style={{ color: 'var(--text-mid)', fontSize: 14 }}>
          Tu OS está configurado. Puedes cambiar todo esto después.
        </p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {items.map((item) => (
          <div
            key={item.label}
            style={{
              background: 'var(--bg3)',
              border: '1px solid var(--border-mid)',
              borderRadius: 'var(--radius)',
              padding: '12px 14px',
            }}
          >
            <div style={{ fontSize: 20, marginBottom: 4 }}>{item.icon}</div>
            <div className="label" style={{ marginBottom: 2 }}>{item.label}</div>
            <div style={{ fontWeight: 600, fontSize: 13, color: item.color }}>{item.val}</div>
          </div>
        ))}
      </div>
      <Btn variant="primary" size="lg" style={{ width: '100%', marginTop: 8 }} onClick={onFinish}>
        Iniciar Gibran OS ⚡
      </Btn>
    </div>
  )
}
