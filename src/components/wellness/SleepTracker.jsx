import { useState } from 'react'
import useWellnessStore, {
  SACRED_SLEEP_HOURS,
  MIN_HEALTHY_SLEEP,
  computeSleepHours,
} from '../../store/wellnessStore'
import { Card, Btn, Input, ModalOverlay, SectionTitle } from '../UI'
import { getDayKey } from '../../utils/date'

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

function barColor(hours) {
  if (hours === 0) return 'var(--bg4)'
  if (hours >= 7.5) return 'var(--green)'
  if (hours >= MIN_HEALTHY_SLEEP) return 'var(--teal)'
  if (hours >= 4) return 'var(--orange)'
  return 'var(--red)'
}

export default function SleepTracker() {
  const logSleep = useWellnessStore((s) => s.logSleep)
  const getWeekSleep = useWellnessStore((s) => s.getWeekSleep)
  const getAvg = useWellnessStore((s) => s.getAvgSleepThisWeek)
  const getToday = useWellnessStore((s) => s.getTodaySleep)
  const readiness = useWellnessStore((s) => s.getDeepWorkReadiness)()

  const [showForm, setShowForm] = useState(false)

  const week = getWeekSleep()
  const avg = getAvg()
  const today = getToday()
  const maxHours = 10 // chart ceiling

  return (
    <Card accent={today ? 'teal' : 'orange'}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>🌙</span>
          <div>
            <SectionTitle>Sleep Intelligence</SectionTitle>
            <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--mono)', letterSpacing: '0.12em' }}>
              PROMEDIO 7D: {avg}h
            </div>
          </div>
        </div>
        <Btn size="sm" variant={today ? 'secondary' : 'primary'} onClick={() => setShowForm(true)}>
          {today ? 'Editar' : '+ Registrar'}
        </Btn>
      </div>

      {/* Readiness badge */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 12px', borderRadius: 10,
        background: 'var(--bg3)', border: `1px solid ${readiness.color}`,
        marginBottom: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>
            {readiness.tier === 'beast' ? '🔥' :
             readiness.tier === 'strong' ? '💪' :
             readiness.tier === 'saver' ? '🔋' : '⚡'}
          </span>
          <div>
            <div style={{ fontFamily: 'var(--display)', fontSize: 13, fontWeight: 800, color: readiness.color }}>
              {readiness.label}
            </div>
            {readiness.reasons[0] && (
              <div style={{ fontSize: 10, color: 'var(--text-mid)', marginTop: 1 }}>
                {readiness.reasons[0]}
              </div>
            )}
          </div>
        </div>
        {readiness.tier === 'beast' && (
          <span className="badge badge-orange" style={{ fontSize: 9 }}>BEAST</span>
        )}
      </div>

      {/* 7-night chart */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 4, height: 100, padding: '0 4px' }}>
        {week.map((night, idx) => {
          const dow = new Date(night.dateKey + 'T12:00').getDay()
          const heightPct = Math.min(100, (night.hours / maxHours) * 100)
          const isToday = night.dateKey === getDayKey()
          return (
            <div key={night.dateKey} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{
                fontFamily: 'var(--mono)', fontSize: 9,
                color: night.hours > 0 ? 'var(--text)' : 'var(--text-dim)',
                fontWeight: 700,
              }}>
                {night.hours > 0 ? night.hours : '—'}
              </div>
              <div style={{
                width: '100%', height: '100%', background: 'var(--bg3)',
                borderRadius: 4, position: 'relative', overflow: 'hidden',
                border: isToday ? '1px solid var(--teal)' : '1px solid var(--border)',
              }}>
                {/* Sacred sleep baseline line at 8h */}
                <div style={{
                  position: 'absolute', left: 0, right: 0,
                  bottom: `${(SACRED_SLEEP_HOURS / maxHours) * 100}%`,
                  height: 1, background: 'var(--border-bright)',
                  zIndex: 1,
                }} />
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  height: `${heightPct}%`, background: barColor(night.hours),
                  transition: 'height 0.3s ease',
                }} />
              </div>
              <div style={{
                fontFamily: 'var(--mono)', fontSize: 9,
                color: isToday ? 'var(--teal)' : 'var(--text-dim)',
                fontWeight: isToday ? 700 : 400,
                letterSpacing: '0.1em',
              }}>
                {DAY_LABELS[dow]}
              </div>
            </div>
          )
        })}
      </div>

      {today && (
        <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-mid)', display: 'flex', gap: 12, justifyContent: 'center' }}>
          <span>🛌 {today.bedtime} → {today.waketime}</span>
          <span>⭐ {today.quality}/5</span>
          <span>🔋 {today.wakeEnergy}/10</span>
        </div>
      )}

      {showForm && <SleepForm existing={today} onClose={() => setShowForm(false)} onSave={(entry) => { logSleep(entry); setShowForm(false) }} />}
    </Card>
  )
}

function SleepForm({ existing, onClose, onSave }) {
  const [bedtime, setBedtime] = useState(existing?.bedtime || '00:00')
  const [waketime, setWaketime] = useState(existing?.waketime || '08:00')
  const [quality, setQuality] = useState(existing?.quality || 3)
  const [wakeEnergy, setWakeEnergy] = useState(existing?.wakeEnergy || 5)
  const [note, setNote] = useState(existing?.note || '')

  const hours = computeSleepHours(bedtime, waketime)
  const sacred = hours >= SACRED_SLEEP_HOURS
  const healthy = hours >= MIN_HEALTHY_SLEEP

  return (
    <ModalOverlay onClose={onClose}>
      <div style={{ padding: '4px 4px 20px', maxHeight: '80dvh', overflowY: 'auto' }}>
        <h2 style={{ fontFamily: 'var(--display)', fontSize: 20, fontWeight: 800, margin: '0 0 4px', color: 'var(--teal)' }}>
          🌙 Registrar Sueño
        </h2>
        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 16, fontFamily: 'var(--mono)', letterSpacing: '0.1em' }}>
          VENTANA SAGRADA: 12 AM → 8 AM
        </div>

        {/* Time inputs */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--mono)', letterSpacing: '0.15em' }}>DORMÍ</label>
            <input
              type="time"
              className="input"
              value={bedtime}
              onChange={(e) => setBedtime(e.target.value)}
              style={{ width: '100%', marginTop: 4 }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--mono)', letterSpacing: '0.15em' }}>DESPERTÉ</label>
            <input
              type="time"
              className="input"
              value={waketime}
              onChange={(e) => setWaketime(e.target.value)}
              style={{ width: '100%', marginTop: 4 }}
            />
          </div>
        </div>

        {/* Computed hours badge */}
        <div style={{
          padding: 14, borderRadius: 12, textAlign: 'center', marginBottom: 16,
          background: 'var(--bg3)',
          border: `1px solid ${sacred ? 'var(--green)' : healthy ? 'var(--teal)' : 'var(--orange)'}`,
        }}>
          <div style={{
            fontFamily: 'var(--display)', fontSize: 32, fontWeight: 800,
            color: sacred ? 'var(--green)' : healthy ? 'var(--teal)' : 'var(--orange)',
            lineHeight: 1,
          }}>
            {hours}h
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-dim)', marginTop: 6, letterSpacing: '0.15em' }}>
            {sacred ? 'SUEÑO SAGRADO ✓' : healthy ? 'SALUDABLE' : hours >= 4 ? 'INSUFICIENTE' : 'CRÍTICO'}
          </div>
        </div>

        {/* Quality 1-5 */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--mono)', letterSpacing: '0.15em', display: 'block', marginBottom: 6 }}>
            CALIDAD DEL SUEÑO
          </label>
          <div style={{ display: 'flex', gap: 6 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setQuality(n)}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 8,
                  border: `1px solid ${quality === n ? 'var(--teal)' : 'var(--border-mid)'}`,
                  background: quality === n ? 'var(--teal-dim)' : 'var(--bg3)',
                  color: quality === n ? 'var(--teal)' : 'var(--text-mid)',
                  fontSize: 18, cursor: 'pointer', transition: 'var(--transition)',
                }}
              >
                {'⭐'.repeat(n === quality ? 1 : 1)}{n}
              </button>
            ))}
          </div>
        </div>

        {/* Wake energy 1-10 */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--mono)', letterSpacing: '0.15em', display: 'block', marginBottom: 6 }}>
            ENERGÍA AL DESPERTAR ({wakeEnergy}/10)
          </label>
          <input
            type="range" min="1" max="10" value={wakeEnergy}
            onChange={(e) => setWakeEnergy(Number(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--teal)' }}
          />
        </div>

        {/* Note */}
        <div style={{ marginBottom: 16 }}>
          <Input
            multiline
            value={note}
            onChange={setNote}
            placeholder="Notas (opcional): sueños, interrupciones, caffeine cutoff..."
            style={{ minHeight: 60, fontSize: 13 }}
          />
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <Btn variant="ghost" onClick={onClose} style={{ flex: 1 }}>Cancelar</Btn>
          <Btn
            variant="primary"
            onClick={() => onSave({ bedtime, waketime, quality, wakeEnergy, note })}
            style={{ flex: 1 }}
            disabled={!bedtime || !waketime}
          >
            Guardar
          </Btn>
        </div>
      </div>
    </ModalOverlay>
  )
}
