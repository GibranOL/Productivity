import { useState, useEffect } from 'react'
import useStore from '../store/index'
import useSchedulerStore from '../store/schedulerStore'
import { getDayKey, formatDate } from '../utils/date'
import { generateBriefingInsight } from '../utils/dailyBriefingGenerator'
import { isSupported, startListening, stopListening } from '../utils/speechRecognition'
import { parseVoiceCommand } from '../utils/voiceCommandParser'

const SECTIONS_COLOR = {
  sleep: 'var(--purple)',
  gym: 'var(--orange)',
  project: 'var(--teal)',
  study: 'var(--blue)',
  mealprep: 'var(--green)',
  meditation: 'var(--purple)',
  relax: 'var(--pink)',
  reading: 'var(--yellow)',
  outdoor: 'var(--lime)',
}

function getColorForSection(section) {
  return SECTIONS_COLOR[section] || 'var(--teal)'
}

export default function DailyBriefing({ onComplete }) {
  const [aiData, setAiData] = useState(null)
  const [aiLoading, setAiLoading] = useState(true)
  const [voiceTranscript, setVoiceTranscript] = useState('')
  const [voiceInterim, setVoiceInterim] = useState('')
  const [voiceConfirmation, setVoiceConfirmation] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [recognitionRef, setRecognitionRef] = useState(null)

  const logs = useStore((s) => s.logs)
  const projects = useStore((s) => s.projects)
  const getWeekStats = useStore((s) => s.getWeekStats)
  const setTab = useStore((s) => s.setTab)
  const moveBlock = useSchedulerStore((s) => s.moveBlock)
  const deleteBlock = useSchedulerStore((s) => s.deleteBlock)
  const blocks = useSchedulerStore((s) => s.blocks)

  // Determine today's scheduler day (0=Lun)
  const jsDow = new Date().getDay() // 0=Dom
  const todaySD = jsDow === 0 ? 6 : jsDow - 1
  const todayBlocks = blocks
    .filter((b) => b.day === todaySD)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))

  // Yesterday's log
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayKey = getDayKey(yesterday)
  const yesterdayLog = logs[yesterdayKey] || null

  const weekStats = getWeekStats ? getWeekStats() : {}

  useEffect(() => {
    async function loadInsight() {
      setAiLoading(true)
      try {
        const result = await generateBriefingInsight({
          dow: new Date().getDay(),
          yesterdayLog,
          projects,
          weekStats,
        })
        setAiData(result)
      } catch {
        setAiData(null)
      } finally {
        setAiLoading(false)
      }
    }
    loadInsight()
  }, [])

  function handleApprove() {
    const todayKey = getDayKey()
    localStorage.setItem(`briefing-shown-${todayKey}`, 'true')
    onComplete()
  }

  function handleSkip() {
    const todayKey = getDayKey()
    localStorage.setItem(`briefing-shown-${todayKey}`, 'true')
    onComplete()
  }

  function handleEdit() {
    const todayKey = getDayKey()
    localStorage.setItem(`briefing-shown-${todayKey}`, 'true')
    setTab('scheduler')
    onComplete()
  }

  function handleVoice() {
    if (isListening) {
      stopListening(recognitionRef)
      setIsListening(false)
      setRecognitionRef(null)
      return
    }

    if (!isSupported()) {
      setVoiceConfirmation('Tu navegador no soporta reconocimiento de voz')
      return
    }

    setVoiceTranscript('')
    setVoiceInterim('')
    setVoiceConfirmation('')
    setIsListening(true)

    const rec = startListening(
      async (final) => {
        setVoiceTranscript(final)
        setVoiceInterim('')
        setIsListening(false)
        setRecognitionRef(null)

        // Parse and apply command
        const result = await parseVoiceCommand(final, todayBlocks)
        setVoiceConfirmation(result.confirmation || 'Comando recibido')

        // Apply action
        if (result.action === 'move' && result.targetBlock && result.newStartTime) {
          const target = todayBlocks.find((b) =>
            b.title?.toLowerCase().includes(result.targetBlock.toLowerCase()) ||
            b.section?.toLowerCase().includes(result.targetBlock.toLowerCase())
          )
          if (target) {
            moveBlock(target.id, todaySD, result.newStartTime)
          }
        } else if (result.action === 'delete' && result.targetBlock) {
          const target = todayBlocks.find((b) =>
            b.title?.toLowerCase().includes(result.targetBlock.toLowerCase()) ||
            b.section?.toLowerCase().includes(result.targetBlock.toLowerCase())
          )
          if (target) deleteBlock(target.id)
        } else if (result.action === 'reduce_workload') {
          const lastWorkBlock = [...todayBlocks]
            .reverse()
            .find((b) => b.section === 'project' || b.section === 'study')
          if (lastWorkBlock) deleteBlock(lastWorkBlock.id)
        }
      },
      (interim) => setVoiceInterim(interim),
      (err) => {
        setIsListening(false)
        setRecognitionRef(null)
        setVoiceConfirmation(`Error: ${err}`)
      }
    )
    setRecognitionRef(rec)
  }

  const yesterdayHabits = yesterdayLog
    ? [yesterdayLog.sleep, yesterdayLog.gym, yesterdayLog.meditation, yesterdayLog.meals]
        .filter((v) => v === true).length
    : null

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--bg)',
      paddingTop: 'env(safe-area-inset-top)',
      paddingBottom: 'calc(80px + env(safe-area-inset-bottom))',
      overflowY: 'auto',
      position: 'relative',
    }}>
      {/* Grid background */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
        backgroundSize: '44px 44px',
        opacity: 0.25,
      }} />

      <div style={{ position: 'relative', zIndex: 1, padding: '24px 16px', maxWidth: 560, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 24, animation: 'fadeIn 0.3s ease' }}>
          <div style={{ fontFamily: 'var(--display)', fontSize: 26, fontWeight: 800, marginBottom: 4 }}>
            Buenos días, Gibran 🌅
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.12em' }}>
            {formatDate().toUpperCase()}
          </div>
        </div>

        {/* Yesterday summary */}
        {yesterdayLog && (
          <div style={{
            background: 'var(--bg2)',
            borderRadius: 14,
            borderTop: '2px solid var(--purple)',
            padding: '16px',
            marginBottom: 16,
            animation: 'slideUp 0.25s ease',
          }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.15em', color: 'var(--purple)', marginBottom: 12 }}>
              RESUMEN DE AYER
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Stat label="HÁBITOS" value={`${yesterdayHabits}/4`} color="var(--purple)" />
              <Stat label="ENERGÍA" value={`${yesterdayLog.energy || 0}/10`} color="var(--teal)" />
              <Stat
                label="BLOQUES"
                value={`${(yesterdayLog.focusBlocks || []).filter((b) => b.done).length}/3`}
                color="var(--orange)"
              />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              {[
                { key: 'sleep', label: 'Sueño', icon: '🌙' },
                { key: 'gym', label: 'Gym', icon: '🏋️' },
                { key: 'meditation', label: 'Med', icon: '🧘' },
                { key: 'meals', label: 'Comidas', icon: '🥗' },
              ].map(({ key, label, icon }) => (
                <div key={key} style={{
                  padding: '4px 10px',
                  borderRadius: 8,
                  fontSize: 11,
                  background: yesterdayLog[key] === true ? 'var(--green-dim)' : yesterdayLog[key] === false ? 'var(--red-dim)' : 'var(--bg3)',
                  border: `1px solid ${yesterdayLog[key] === true ? 'var(--green-mid)' : yesterdayLog[key] === false ? 'var(--red-mid)' : 'var(--border-mid)'}`,
                  color: yesterdayLog[key] === true ? 'var(--green)' : yesterdayLog[key] === false ? 'var(--red)' : 'var(--text-dim)',
                }}>
                  {icon} {label}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Today's schedule */}
        <div style={{
          background: 'var(--bg2)',
          borderRadius: 14,
          borderTop: '2px solid var(--orange)',
          padding: '16px',
          marginBottom: 16,
          animation: 'slideUp 0.3s ease',
        }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.15em', color: 'var(--orange)', marginBottom: 12 }}>
            TU DÍA PROPUESTO
          </div>
          {todayBlocks.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text-dim)', fontStyle: 'italic' }}>
              Sin bloques programados — genera tu semana desde el Scheduler
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {todayBlocks.map((block) => (
                <div key={block.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 10px',
                  background: 'var(--bg3)',
                  borderRadius: 8,
                  borderLeft: `3px solid ${getColorForSection(block.section)}`,
                }}>
                  <span style={{ fontSize: 16 }}>{block.icon || '🎯'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{block.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--mono)' }}>
                      {block.startTime} – {block.endTime}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Insight */}
        {(aiLoading || (aiData && aiData.aiInsight)) && (
          <div style={{
            background: 'var(--bg2)',
            borderRadius: 14,
            borderTop: '2px solid var(--teal)',
            padding: '16px',
            marginBottom: 24,
            animation: 'slideUp 0.35s ease',
          }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.15em', color: 'var(--teal)', marginBottom: 12 }}>
              AI DICE
            </div>
            {aiLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ height: 14, background: 'var(--bg3)', borderRadius: 4, width: '90%', animation: 'pulse 1.5s infinite' }} />
                <div style={{ height: 14, background: 'var(--bg3)', borderRadius: 4, width: '75%', animation: 'pulse 1.5s infinite' }} />
                <div style={{ height: 14, background: 'var(--bg3)', borderRadius: 4, width: '80%', animation: 'pulse 1.5s infinite' }} />
              </div>
            ) : (
              <>
                <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text)', marginBottom: 12 }}>
                  {aiData.aiInsight}
                </p>
                {aiData.dailyPriorities?.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {aiData.dailyPriorities.map((p, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12 }}>
                        <span style={{ color: 'var(--teal)', fontFamily: 'var(--mono)', fontWeight: 700 }}>{i + 1}.</span>
                        <span style={{ color: 'var(--text-mid)' }}>{p}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Voice transcript / confirmation */}
        {(voiceTranscript || voiceInterim || voiceConfirmation) && (
          <div style={{
            background: 'var(--bg2)',
            border: '1px solid var(--border-mid)',
            borderRadius: 12,
            padding: '12px 14px',
            marginBottom: 16,
            animation: 'fadeIn 0.2s ease',
          }}>
            {voiceInterim && (
              <div style={{ fontSize: 13, color: 'var(--text-dim)', fontStyle: 'italic', marginBottom: 4 }}>
                {voiceInterim}...
              </div>
            )}
            {voiceTranscript && (
              <div style={{ fontSize: 13, color: 'var(--text)', marginBottom: voiceConfirmation ? 8 : 0 }}>
                "{voiceTranscript}"
              </div>
            )}
            {voiceConfirmation && (
              <div style={{ fontSize: 12, color: 'var(--teal)', fontFamily: 'var(--mono)' }}>
                ✓ {voiceConfirmation}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating action buttons */}
      <div style={{
        position: 'fixed',
        bottom: 'calc(20px + env(safe-area-inset-bottom))',
        left: 0, right: 0,
        padding: '0 16px',
        maxWidth: 560,
        margin: '0 auto',
        display: 'flex',
        gap: 10,
        zIndex: 10,
      }}>
        {isSupported() && (
          <button
            onClick={handleVoice}
            style={{
              flex: '0 0 auto',
              padding: '12px 18px',
              borderRadius: 14,
              border: `1px solid ${isListening ? 'var(--red-mid)' : 'var(--border-mid)'}`,
              background: isListening ? 'var(--red-dim)' : 'var(--bg2)',
              color: isListening ? 'var(--red)' : 'var(--text)',
              fontSize: 13,
              fontFamily: 'var(--sans)',
              cursor: 'pointer',
              transition: 'all 0.18s',
              animation: isListening ? 'pulse 1s infinite' : 'none',
            }}
          >
            {isListening ? '⏹ Parar' : '🎤 Hablar'}
          </button>
        )}
        <button
          onClick={handleEdit}
          style={{
            flex: '0 0 auto',
            padding: '12px 18px',
            borderRadius: 14,
            border: '1px solid var(--border-mid)',
            background: 'var(--bg2)',
            color: 'var(--text)',
            fontSize: 13,
            fontFamily: 'var(--sans)',
            cursor: 'pointer',
            transition: 'all 0.18s',
          }}
        >
          ✏️ Editar
        </button>
        <button
          onClick={handleApprove}
          style={{
            flex: 1,
            padding: '12px',
            borderRadius: 14,
            border: '1px solid var(--teal-mid)',
            background: 'var(--teal-dim)',
            color: 'var(--teal)',
            fontSize: 14,
            fontFamily: 'var(--sans)',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.18s',
          }}
        >
          ✓ Aprobar día
        </button>
        <button
          onClick={handleSkip}
          style={{
            flex: '0 0 auto',
            padding: '12px 18px',
            borderRadius: 14,
            border: '1px solid var(--border)',
            background: 'var(--bg2)',
            color: 'var(--text-dim)',
            fontSize: 13,
            fontFamily: 'var(--sans)',
            cursor: 'pointer',
            transition: 'all 0.18s',
          }}
        >
          Saltar
        </button>
      </div>
    </div>
  )
}

function Stat({ label, value, color }) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.12em', marginBottom: 2 }}>{label}</div>
      <div style={{ fontFamily: 'var(--display)', fontSize: 22, fontWeight: 800, color }}>{value}</div>
    </div>
  )
}
