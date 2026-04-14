import { useState } from 'react'
import useWellnessStore, { MOODS } from '../../store/wellnessStore'
import { Card, Btn, Input, ModalOverlay, SectionTitle } from '../UI'
import { getDayKey } from '../../utils/date'

const MOOD_BY_ID = MOODS.reduce((acc, m) => { acc[m.id] = m; return acc }, {})
const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

export default function MoodGrid() {
  const logMood = useWellnessStore((s) => s.logMood)
  const getTodayMood = useWellnessStore((s) => s.getTodayMood)
  const getMoodHeatmap = useWellnessStore((s) => s.getMoodHeatmap)
  const avgStress = useWellnessStore((s) => s.getAvgStressThisWeek)()

  const [showForm, setShowForm] = useState(false)
  const [viewOffset, setViewOffset] = useState(0) // 0 = current month, -1 = last month

  const now = new Date()
  const targetMonth = new Date(now.getFullYear(), now.getMonth() + viewOffset, 1)
  const heatmap = getMoodHeatmap(targetMonth.getFullYear(), targetMonth.getMonth())
  const today = getTodayMood()
  const todayKey = getDayKey()

  // Days-logged count for header
  const loggedDays = heatmap.filter((d) => d.mood).length

  return (
    <Card accent="purple">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>💭</span>
          <div>
            <SectionTitle>Mood & Stress</SectionTitle>
            <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--mono)', letterSpacing: '0.12em' }}>
              ESTRÉS 7D: {avgStress}/10 · REG: {loggedDays}
            </div>
          </div>
        </div>
        <Btn size="sm" variant="primary" onClick={() => setShowForm(true)}>
          {today ? 'Otra entrada' : '+ Registrar'}
        </Btn>
      </div>

      {/* Today quick view */}
      {today && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 12px', borderRadius: 10, marginBottom: 12,
          background: 'var(--bg3)', border: `1px solid ${MOOD_BY_ID[today.mood]?.color || 'var(--border)'}`,
        }}>
          <span style={{ fontSize: 22 }}>{MOOD_BY_ID[today.mood]?.emoji || '❓'}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--display)', fontSize: 13, fontWeight: 800, color: MOOD_BY_ID[today.mood]?.color || 'var(--text)' }}>
              {MOOD_BY_ID[today.mood]?.label || today.mood}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--mono)' }}>
              ESTRÉS {today.stress}/10
            </div>
          </div>
        </div>
      )}

      {/* Month nav */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <button
          onClick={() => setViewOffset(viewOffset - 1)}
          style={{ background: 'none', border: 'none', color: 'var(--text-mid)', cursor: 'pointer', fontSize: 16, padding: 4 }}
        >
          ‹
        </button>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-mid)', letterSpacing: '0.12em' }}>
          {MONTH_NAMES[targetMonth.getMonth()].toUpperCase()} {targetMonth.getFullYear()}
        </div>
        <button
          onClick={() => setViewOffset(Math.min(0, viewOffset + 1))}
          disabled={viewOffset >= 0}
          style={{
            background: 'none', border: 'none',
            color: viewOffset >= 0 ? 'var(--text-dim)' : 'var(--text-mid)',
            cursor: viewOffset >= 0 ? 'default' : 'pointer', fontSize: 16, padding: 4,
          }}
        >
          ›
        </button>
      </div>

      {/* Heatmap grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: 3,
      }}>
        {heatmap.map((cell) => {
          const m = MOOD_BY_ID[cell.mood]
          const isToday = cell.dateKey === todayKey
          return (
            <div
              key={cell.dateKey}
              title={m ? `${cell.day}: ${m.label} (estrés ${cell.stress})` : `${cell.day}: sin registro`}
              style={{
                aspectRatio: '1',
                borderRadius: 4,
                background: m ? m.color : 'var(--bg3)',
                opacity: m ? (cell.stress ? 0.4 + (cell.stress / 10) * 0.6 : 0.8) : 0.4,
                border: isToday ? '1.5px solid var(--text)' : '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, color: m ? 'var(--bg)' : 'var(--text-dim)',
                fontFamily: 'var(--mono)', fontWeight: m ? 700 : 400,
                position: 'relative',
              }}
            >
              {m ? m.emoji : cell.day}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div style={{ marginTop: 10, fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--mono)', letterSpacing: '0.08em', textAlign: 'center' }}>
        Intensidad = nivel de estrés
      </div>

      {showForm && (
        <MoodForm
          onClose={() => setShowForm(false)}
          onSave={(entry) => { logMood(entry); setShowForm(false) }}
        />
      )}
    </Card>
  )
}

function MoodForm({ onClose, onSave }) {
  const [mood, setMood] = useState(null)
  const [stress, setStress] = useState(5)
  const [note, setNote] = useState('')

  return (
    <ModalOverlay onClose={onClose}>
      <div style={{ padding: '4px 4px 20px', maxHeight: '80dvh', overflowY: 'auto' }}>
        <h2 style={{ fontFamily: 'var(--display)', fontSize: 20, fontWeight: 800, margin: '0 0 4px', color: 'var(--purple)' }}>
          💭 ¿Cómo andas?
        </h2>
        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 16, fontFamily: 'var(--mono)', letterSpacing: '0.1em' }}>
          REGISTRO RÁPIDO — HUMOR + ESTRÉS
        </div>

        {/* Mood grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 8,
          marginBottom: 16,
        }}>
          {MOODS.map((m) => {
            const active = mood === m.id
            return (
              <button
                key={m.id}
                onClick={() => setMood(m.id)}
                style={{
                  padding: '14px 8px',
                  borderRadius: 10,
                  border: `1px solid ${active ? m.color : 'var(--border-mid)'}`,
                  background: active ? 'var(--bg3)' : 'var(--bg2)',
                  color: active ? m.color : 'var(--text-mid)',
                  cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  transition: 'var(--transition)',
                  boxShadow: active ? `0 0 0 2px ${m.color}33` : 'none',
                }}
              >
                <span style={{ fontSize: 22 }}>{m.emoji}</span>
                <span style={{ fontSize: 11, fontWeight: active ? 700 : 400 }}>{m.label}</span>
              </button>
            )
          })}
        </div>

        {/* Stress slider */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--mono)', letterSpacing: '0.15em', display: 'block', marginBottom: 6 }}>
            NIVEL DE ESTRÉS ({stress}/10)
          </label>
          <input
            type="range" min="1" max="10" value={stress}
            onChange={(e) => setStress(Number(e.target.value))}
            style={{
              width: '100%',
              accentColor: stress >= 8 ? 'var(--red)' : stress >= 5 ? 'var(--orange)' : 'var(--green)',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--text-dim)', fontFamily: 'var(--mono)', marginTop: 2 }}>
            <span>CHILL</span>
            <span>NEUTRAL</span>
            <span>BURN</span>
          </div>
        </div>

        {/* Note */}
        <div style={{ marginBottom: 16 }}>
          <Input
            multiline
            value={note}
            onChange={setNote}
            placeholder="¿Qué está pasando? (opcional — Cortana puede usar esto)"
            style={{ minHeight: 60, fontSize: 13 }}
          />
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <Btn variant="ghost" onClick={onClose} style={{ flex: 1 }}>Cancelar</Btn>
          <Btn
            variant="primary"
            onClick={() => onSave({ mood, stress, note })}
            style={{ flex: 1 }}
            disabled={!mood}
          >
            Guardar
          </Btn>
        </div>
      </div>
    </ModalOverlay>
  )
}
