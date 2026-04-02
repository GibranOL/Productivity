import { useState, useRef } from 'react'
import useSchedulerStore, { SECTIONS } from '../store/schedulerStore'
import BlockCard from './BlockCard'
import BlockEditor from './BlockEditor'
import { Btn, SectionTitle } from './UI'

const DAY_LABELS  = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const DAY_FULL    = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

// Map scheduler day (0=Lun) to JS dow (0=Dom)
const SCHED_TO_DOW = [1, 2, 3, 4, 5, 6, 0]

export default function Scheduler() {
  const blocks       = useSchedulerStore((s) => s.blocks)
  const generateWeek = useSchedulerStore((s) => s.generateWeek)
  const moveBlock    = useSchedulerStore((s) => s.moveBlock)

  const [editorBlock, setEditorBlock] = useState(null) // null = closed, {} = new, {id,...} = edit
  const [editorOpen, setEditorOpen]   = useState(false)
  const [generated, setGenerated]     = useState(blocks.length > 0)
  const [dragOverDay, setDragOverDay] = useState(null)

  // Determine today's scheduler day (0=Lun)
  const jsDow   = new Date().getDay() // 0=Dom
  const todaySD = SCHED_TO_DOW.indexOf(jsDow) // scheduler day index

  function openNew(day) {
    setEditorBlock({ day })
    setEditorOpen(true)
  }

  function openEdit(block) {
    setEditorBlock(block)
    setEditorOpen(true)
  }

  function closeEditor() {
    setEditorOpen(false)
    setEditorBlock(null)
  }

  function handleGenerate() {
    generateWeek()
    setGenerated(true)
  }

  // ── DRAG & DROP ───────────────────────────────────────────────────────────
  function onDrop(e, day) {
    e.preventDefault()
    const blockId = e.dataTransfer.getData('blockId')
    if (!blockId) return
    // Drop at 09:00 as default — user can edit to change time
    moveBlock(blockId, day, '09:00')
    setDragOverDay(null)
  }

  function onDragOver(e, day) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverDay(day)
  }

  function onDragLeave() {
    setDragOverDay(null)
  }

  // Sort blocks by startTime within each day
  function blocksForDay(day) {
    return blocks
      .filter((b) => b.day === day)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
  }

  // ── EMPTY STATE ───────────────────────────────────────────────────────────
  if (!generated && blocks.length === 0) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        gap: 20,
        padding: '0 24px',
        textAlign: 'center',
        position: 'relative',
        zIndex: 1,
      }}>
        <div style={{ fontSize: 48 }}>🗓</div>
        <h2 style={{ fontFamily: 'var(--display)', fontSize: 24 }}>Tu semana está vacía</h2>
        <p style={{ color: 'var(--text-mid)', fontSize: 14, maxWidth: 300 }}>
          Genera tu semana estándar basada en tu rutina, o agrega bloques manualmente.
        </p>
        <Btn variant="primary" size="lg" onClick={handleGenerate}>
          ⚡ Generar semana estándar
        </Btn>
        <Btn variant="ghost" onClick={() => openNew(todaySD >= 0 ? todaySD : 0)}>
          + Agregar bloque manual
        </Btn>
      </div>
    )
  }

  return (
    <div style={{ paddingBottom: 100, position: 'relative', zIndex: 1 }}>
      {/* ── HEADER ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 8 }}>
        <SectionTitle style={{ marginBottom: 0 }}>SCHEDULER SEMANAL</SectionTitle>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn variant="ghost" size="sm" onClick={handleGenerate}>↺ Regenerar</Btn>
          <Btn variant="primary" size="sm" onClick={() => openNew(todaySD >= 0 ? todaySD : 0)}>+ Bloque</Btn>
        </div>
      </div>

      {/* ── LEGEND ── */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        {Object.entries(SECTIONS).map(([key, s]) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: s.color }} />
            <span style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--mono)' }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* ── WEEK GRID — horizontal scroll on mobile ── */}
      <div style={{
        display: 'flex',
        gap: 8,
        overflowX: 'auto',
        paddingBottom: 8,
        scrollSnapType: 'x mandatory',
        WebkitOverflowScrolling: 'touch',
      }}>
        {DAY_LABELS.map((label, day) => {
          const isToday  = day === todaySD
          const isDragOver = dragOverDay === day
          const dayBlocks = blocksForDay(day)

          return (
            <div
              key={day}
              onDrop={(e) => onDrop(e, day)}
              onDragOver={(e) => onDragOver(e, day)}
              onDragLeave={onDragLeave}
              style={{
                minWidth: 140,
                maxWidth: 180,
                flex: '0 0 auto',
                scrollSnapAlign: 'start',
                background: isDragOver ? 'var(--teal-dim)' : isToday ? 'var(--bg3)' : 'var(--bg2)',
                border: `1px solid ${isDragOver ? 'var(--teal-mid)' : isToday ? 'var(--teal)' : 'var(--border-mid)'}`,
                borderRadius: 'var(--radius)',
                padding: '10px 8px',
                transition: 'var(--transition)',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              {/* Day header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 4,
              }}>
                <div>
                  <div style={{
                    fontFamily: 'var(--mono)',
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.15em',
                    color: isToday ? 'var(--teal)' : 'var(--text-dim)',
                  }}>
                    {label}
                  </div>
                  {isToday && (
                    <div style={{ fontSize: 9, color: 'var(--teal)', fontFamily: 'var(--mono)' }}>HOY</div>
                  )}
                </div>
                <button
                  onClick={() => openNew(day)}
                  style={{
                    width: 20, height: 20,
                    borderRadius: 4,
                    border: '1px solid var(--border-mid)',
                    background: 'var(--bg4)',
                    color: 'var(--text-dim)',
                    cursor: 'pointer',
                    fontSize: 14,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    lineHeight: 1,
                  }}
                >
                  +
                </button>
              </div>

              {/* Blocks */}
              {dayBlocks.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  color: 'var(--text-dim)',
                  fontSize: 10,
                  padding: '20px 0',
                  fontStyle: 'italic',
                }}>
                  Suelta aquí
                </div>
              ) : (
                dayBlocks.map((block) => (
                  <BlockCard
                    key={block.id}
                    block={block}
                    onEdit={openEdit}
                    compact
                  />
                ))
              )}

              {/* Drop hint when dragging */}
              {isDragOver && (
                <div style={{
                  border: '2px dashed var(--teal)',
                  borderRadius: 8,
                  height: 40,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  color: 'var(--teal)',
                  animation: 'pulse 1s infinite',
                }}>
                  Soltar aquí
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── TODAY DETAIL — full cards for today's blocks ── */}
      {todaySD >= 0 && blocksForDay(todaySD).length > 0 && (
        <div style={{ marginTop: 20 }}>
          <SectionTitle>HOY — {DAY_FULL[todaySD]}</SectionTitle>
          <div className="stack" style={{ gap: 8 }}>
            {blocksForDay(todaySD).map((block) => (
              <BlockCard key={block.id} block={block} onEdit={openEdit} compact={false} />
            ))}
          </div>
        </div>
      )}

      {/* ── ANTI-BURNOUT WARNING ── */}
      <WorkWarning blocks={blocks} todaySD={todaySD} />

      {/* ── BLOCK EDITOR ── */}
      {editorOpen && (
        <BlockEditor block={editorBlock} onClose={closeEditor} />
      )}
    </div>
  )
}

// Warn if 4+ consecutive work blocks in any day
function WorkWarning({ blocks, todaySD }) {
  const todayWorkBlocks = blocks.filter(
    (b) => b.day === todaySD && b.section === 'project'
  ).length

  if (todayWorkBlocks < 4) return null

  return (
    <div style={{
      marginTop: 16,
      background: 'var(--yellow-dim)',
      border: '1px solid var(--yellow-mid)',
      borderRadius: 'var(--radius)',
      padding: '12px 16px',
      display: 'flex',
      gap: 12,
      alignItems: 'flex-start',
    }}>
      <span style={{ fontSize: 20 }}>⚠️</span>
      <div>
        <div style={{ fontWeight: 700, color: 'var(--yellow)', marginBottom: 4 }}>
          Anti-burnout warning
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-mid)' }}>
          Tienes {todayWorkBlocks} bloques de trabajo hoy. El máximo recomendado son 3 (4.5 hrs). Considera mover uno a otro día.
        </div>
      </div>
    </div>
  )
}
