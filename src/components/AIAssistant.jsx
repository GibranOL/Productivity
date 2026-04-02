import { useState, useEffect, useRef, useCallback } from 'react'
import useStore from '../store/index'
import useSchedulerStore from '../store/schedulerStore'
import { checkOllamaStatus, chat, buildSystemPrompt } from '../services/ollamaService'
import { getTodayDow } from '../utils/date'

// ─── QUICK ACTIONS ────────────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  { label: '¿Qué hago ahora?',   prompt: 'Basándote en mi schedule de hoy, energía actual y hábitos completados, ¿qué debería hacer en este momento? Sé directo.' },
  { label: 'Analiza mi semana',  prompt: 'Revisa mis métricas de esta semana y dime qué está funcionando, qué no, y qué ajustar para la siguiente.' },
  { label: 'Ajusta mi schedule', prompt: '¿Hay algún bloque que debería mover o ajustar en mi semana basándote en mi energía y progreso actual?' },
  { label: 'Anti-burnout check', prompt: '¿Hay señales de que me esté quemando? Revisa mis horas, hábitos y patrones de esta semana.' },
  { label: 'Plan de mañana',     prompt: 'Ayúdame a planear el día de mañana basándote en lo que no terminé hoy y mis objetivos de semana.' },
]

const MODEL_OPTIONS = ['llama3.2:3b', 'llama3.1:8b', 'llama3.2:1b', 'mistral', 'phi3']

// ─── MESSAGE BUBBLE ───────────────────────────────────────────────────────────
function Bubble({ msg }) {
  const isUser = msg.role === 'user'
  const isErr  = msg.role === 'error'
  return (
    <div style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: 10,
    }}>
      <div style={{
        maxWidth: '82%',
        padding: '10px 13px',
        borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
        background: isUser
          ? 'var(--teal-dim)'
          : isErr ? 'var(--red-dim)' : 'var(--bg4)',
        border: `1px solid ${isUser ? 'var(--teal-mid)' : isErr ? 'var(--red-mid)' : 'var(--border-mid)'}`,
        fontSize: 13,
        lineHeight: 1.55,
        color: isErr ? 'var(--red)' : 'var(--text)',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}>
        {msg.content}
        {msg.streaming && (
          <span style={{ display: 'inline-block', width: 6, height: 13, background: 'var(--teal)', borderRadius: 1, marginLeft: 3, animation: 'pulse 0.8s infinite', verticalAlign: 'middle' }} />
        )}
      </div>
    </div>
  )
}

// ─── STATUS DOT ──────────────────────────────────────────────────────────────
function StatusDot({ status }) {
  const cfg = {
    checking: { color: 'var(--yellow)', label: 'Verificando...' },
    online:   { color: 'var(--green)',  label: 'Online' },
    offline:  { color: 'var(--red)',    label: 'Offline' },
  }[status] || { color: 'var(--text-dim)', label: '...' }

  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <span style={{
        width: 7, height: 7, borderRadius: '50%',
        background: cfg.color,
        boxShadow: `0 0 5px ${cfg.color}`,
        animation: status === 'online' ? 'none' : 'pulse 1.5s infinite',
      }} />
      <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: cfg.color }}>{cfg.label}</span>
    </span>
  )
}

// ─── SETUP INSTRUCTIONS ──────────────────────────────────────────────────────
function OfflineHelp({ models, onRetry }) {
  const needsModel = models !== undefined && models.length === 0

  return (
    <div style={{
      padding: '16px',
      background: 'var(--bg3)',
      border: '1px solid var(--border-mid)',
      borderRadius: 12,
      margin: '12px 0',
    }}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, color: 'var(--yellow)' }}>
        {needsModel ? '⚠️ Ollama online — falta el modelo' : '⚙️ Ollama no está corriendo'}
      </div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-mid)', lineHeight: 1.7 }}>
        {needsModel ? (
          <>
            <div style={{ marginBottom: 6 }}>Descarga el modelo recomendado:</div>
            <div style={{ background: 'var(--bg)', padding: '8px 10px', borderRadius: 6, color: 'var(--teal)', marginBottom: 8 }}>
              ollama pull llama3.2:3b
            </div>
            <div style={{ color: 'var(--text-dim)', fontSize: 10 }}>~2 GB · Rápido · Ideal para productividad</div>
          </>
        ) : (
          <>
            <div style={{ marginBottom: 6 }}>Para activar el asistente:</div>
            <div style={{ background: 'var(--bg)', padding: '8px 10px', borderRadius: 6, color: 'var(--teal)', marginBottom: 4 }}>
              # 1. Instalar Ollama
            </div>
            <div style={{ background: 'var(--bg)', padding: '8px 10px', borderRadius: 6, color: 'var(--teal)', marginBottom: 4 }}>
              curl -fsSL https://ollama.ai/install.sh | sh
            </div>
            <div style={{ background: 'var(--bg)', padding: '8px 10px', borderRadius: 6, color: 'var(--teal)', marginBottom: 4 }}>
              # 2. Descargar modelo
            </div>
            <div style={{ background: 'var(--bg)', padding: '8px 10px', borderRadius: 6, color: 'var(--teal)', marginBottom: 4 }}>
              ollama pull llama3.2:3b
            </div>
            <div style={{ background: 'var(--bg)', padding: '8px 10px', borderRadius: 6, color: 'var(--teal)', marginBottom: 8 }}>
              # 3. Iniciar (en otra terminal)
            </div>
            <div style={{ background: 'var(--bg)', padding: '8px 10px', borderRadius: 6, color: 'var(--teal)', marginBottom: 8 }}>
              ollama serve
            </div>
          </>
        )}
      </div>
      <button
        onClick={onRetry}
        style={{
          marginTop: 8,
          padding: '7px 14px',
          background: 'var(--bg4)',
          border: '1px solid var(--border-mid)',
          borderRadius: 8,
          color: 'var(--text)',
          fontSize: 12,
          cursor: 'pointer',
          fontFamily: 'var(--sans)',
        }}
      >
        ↻ Reintentar
      </button>
    </div>
  )
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function AIAssistant({ onClose }) {
  const [messages,     setMessages]     = useState([])
  const [input,        setInput]        = useState('')
  const [streaming,    setStreaming]     = useState(false)
  const [ollamaStatus, setOllamaStatus] = useState('checking') // checking|online|offline
  const [availModels,  setAvailModels]  = useState([])
  const [selectedModel, setSelectedModel] = useState('llama3.2:3b')
  const [showModelPicker, setShowModelPicker] = useState(false)

  const abortRef   = useRef(null)
  const bottomRef  = useRef(null)
  const inputRef   = useRef(null)

  // ── STORE CONTEXT ─────────────────────────────────────────────────────────
  const logs     = useStore((s) => s.logs)
  const projects = useStore((s) => s.projects)
  const streak   = useStore((s) => s.streak)
  const getTodayLog = useStore((s) => s.getTodayLog)
  const getWeekStats = useStore((s) => s.getWeekStats)
  const blocks   = useSchedulerStore((s) => s.blocks)

  // ── AUTO SCROLL ──────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── CHECK OLLAMA ─────────────────────────────────────────────────────────
  const checkStatus = useCallback(async () => {
    setOllamaStatus('checking')
    const { online, models } = await checkOllamaStatus()
    setAvailModels(models)
    setOllamaStatus(online ? (models.length > 0 ? 'online' : 'online') : 'offline')
    // Auto-select first available model if default not found
    if (online && models.length > 0 && !models.includes(selectedModel)) {
      setSelectedModel(models[0])
    }
  }, [selectedModel])

  useEffect(() => { checkStatus() }, [])

  // ── BUILD CONTEXT FOR SYSTEM PROMPT ──────────────────────────────────────
  function buildContext() {
    const log        = getTodayLog()
    const weekStats  = getWeekStats ? getWeekStats() : {}
    const dow        = new Date().getDay()
    const hour       = new Date().getHours()
    const todaySD    = [6, 0, 1, 2, 3, 4, 5][dow] // JS dow → scheduler day
    const todayBlocks = blocks.filter((b) => b.day === todaySD)

    return {
      dow, hour,
      todayBlocks,
      habits: {
        'Sueño':      log.sleep,
        'Gym':        log.gym,
        'Meditación': log.meditation,
        'Comidas':    log.meals,
      },
      energy:     log.energy ?? 5,
      weekStats,
      projects: Object.fromEntries(
        Object.entries(projects).map(([k, v]) => [k, { pct: v.pct }])
      ),
      streak: streak?.count ?? 0,
    }
  }

  // ── SEND MESSAGE ─────────────────────────────────────────────────────────
  async function sendMessage(userText) {
    if (!userText.trim() || streaming) return
    if (ollamaStatus !== 'online') return

    const userMsg = { role: 'user', content: userText.trim() }
    const history = [...messages, userMsg]
    setMessages(history)
    setInput('')
    setStreaming(true)

    // Build full messages list with system prompt
    const systemPrompt = buildSystemPrompt(buildContext())
    const apiMessages  = [
      { role: 'system', content: systemPrompt },
      ...history.map(({ role, content }) => ({ role, content })).filter((m) => m.role !== 'error'),
    ]

    // Placeholder streaming message
    const streamId = Date.now()
    setMessages((prev) => [...prev, { role: 'assistant', content: '', streaming: true, id: streamId }])

    const ctrl = new AbortController()
    abortRef.current = ctrl

    try {
      let full = ''
      for await (const chunk of chat(apiMessages, selectedModel, ctrl.signal)) {
        full += chunk
        setMessages((prev) =>
          prev.map((m) => (m.id === streamId ? { ...m, content: full } : m))
        )
      }
      // Finalize
      setMessages((prev) =>
        prev.map((m) => (m.id === streamId ? { ...m, streaming: false, id: undefined } : m))
      )
    } catch (err) {
      const errMsg = typeof err === 'object' ? err.message : String(err)
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== streamId),
        { role: 'error', content: `Error: ${errMsg}` },
      ])
      if (err.type === 'offline') setOllamaStatus('offline')
    } finally {
      setStreaming(false)
      abortRef.current = null
    }
  }

  function handleStop() {
    abortRef.current?.abort()
    setStreaming(false)
    // Mark streaming bubble as done
    setMessages((prev) => prev.map((m) => m.streaming ? { ...m, streaming: false, id: undefined } : m))
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  // ── RENDER ────────────────────────────────────────────────────────────────
  const noModels = ollamaStatus === 'online' && availModels.length === 0

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 48, background: 'rgba(0,0,0,0.55)' }}
      />

      {/* Sheet */}
      <div style={{
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        zIndex: 49,
        background: 'var(--bg2)',
        borderRadius: '18px 18px 0 0',
        border: '1px solid var(--border-mid)',
        borderBottom: 'none',
        display: 'flex',
        flexDirection: 'column',
        height: '88dvh',
        maxWidth: 640,
        margin: '0 auto',
        paddingBottom: 'env(safe-area-inset-bottom)',
        animation: 'slideUp 0.22s ease',
      }}>

        {/* ── HEADER ── */}
        <div style={{
          padding: '14px 16px 10px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>🤖</span>
            <div>
              <div style={{ fontFamily: 'var(--display)', fontSize: 15, fontWeight: 800 }}>GIBRAN AI</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 1 }}>
                {/* Model selector */}
                <button
                  onClick={() => setShowModelPicker((v) => !v)}
                  style={{
                    fontFamily: 'var(--mono)', fontSize: 9,
                    color: 'var(--text-dim)', background: 'none',
                    border: '1px solid var(--border)', borderRadius: 4,
                    padding: '1px 5px', cursor: 'pointer',
                  }}
                >
                  {selectedModel} ▾
                </button>
                <StatusDot status={ollamaStatus} />
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 30, height: 30,
              borderRadius: '50%',
              border: '1px solid var(--border-mid)',
              background: 'var(--bg3)',
              color: 'var(--text-mid)',
              cursor: 'pointer',
              fontSize: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ×
          </button>
        </div>

        {/* Model picker dropdown */}
        {showModelPicker && (
          <div style={{
            padding: '8px 16px',
            background: 'var(--bg3)',
            borderBottom: '1px solid var(--border)',
            display: 'flex', gap: 6, flexWrap: 'wrap',
            flexShrink: 0,
          }}>
            {(availModels.length > 0 ? availModels : MODEL_OPTIONS).map((m) => (
              <button
                key={m}
                onClick={() => { setSelectedModel(m); setShowModelPicker(false) }}
                style={{
                  padding: '4px 10px',
                  borderRadius: 12,
                  border: `1px solid ${selectedModel === m ? 'var(--teal-mid)' : 'var(--border-mid)'}`,
                  background: selectedModel === m ? 'var(--teal-dim)' : 'var(--bg4)',
                  color: selectedModel === m ? 'var(--teal)' : 'var(--text-dim)',
                  fontSize: 11, cursor: 'pointer', fontFamily: 'var(--mono)',
                }}
              >
                {m}
              </button>
            ))}
          </div>
        )}

        {/* ── MESSAGES ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', WebkitOverflowScrolling: 'touch' }}>

          {/* Welcome message */}
          {messages.length === 0 && ollamaStatus === 'online' && !noModels && (
            <div style={{
              textAlign: 'center', padding: '20px 0 8px',
              color: 'var(--text-dim)', fontSize: 13,
            }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🤖</div>
              <div style={{ marginBottom: 4, color: 'var(--text-mid)' }}>Tu asistente personal</div>
              <div style={{ fontSize: 11 }}>Contexto cargado — día, energía, schedule y proyectos</div>
            </div>
          )}

          {/* Offline / no model help */}
          {(ollamaStatus === 'offline' || noModels) && (
            <OfflineHelp models={noModels ? [] : undefined} onRetry={checkStatus} />
          )}

          {/* Checking spinner */}
          {ollamaStatus === 'checking' && (
            <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-dim)', fontSize: 12 }}>
              Verificando Ollama...
            </div>
          )}

          {messages.map((msg, i) => <Bubble key={i} msg={msg} />)}
          <div ref={bottomRef} />
        </div>

        {/* ── QUICK ACTIONS ── */}
        {ollamaStatus === 'online' && !noModels && (
          <div style={{
            padding: '8px 16px',
            borderTop: '1px solid var(--border)',
            display: 'flex', gap: 6, overflowX: 'auto',
            scrollbarWidth: 'none', flexShrink: 0,
          }}>
            {QUICK_ACTIONS.map((a) => (
              <button
                key={a.label}
                onClick={() => sendMessage(a.prompt)}
                disabled={streaming}
                style={{
                  padding: '6px 11px',
                  background: 'var(--bg3)',
                  border: '1px solid var(--border-mid)',
                  borderRadius: 14,
                  color: 'var(--text-mid)',
                  fontSize: 11,
                  cursor: streaming ? 'not-allowed' : 'pointer',
                  whiteSpace: 'nowrap',
                  fontFamily: 'var(--sans)',
                  transition: 'var(--transition)',
                  opacity: streaming ? 0.5 : 1,
                  flexShrink: 0,
                }}
              >
                {a.label}
              </button>
            ))}
          </div>
        )}

        {/* ── INPUT ── */}
        <div style={{
          padding: '10px 16px 14px',
          borderTop: '1px solid var(--border)',
          display: 'flex', gap: 8, alignItems: 'flex-end',
          flexShrink: 0,
        }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={ollamaStatus === 'online' ? 'Escríbeme algo... (Enter para enviar)' : 'Ollama offline — ver instrucciones arriba'}
            disabled={ollamaStatus !== 'online' || streaming}
            rows={1}
            style={{
              flex: 1,
              background: 'var(--bg3)',
              border: '1px solid var(--border-mid)',
              borderRadius: 12,
              padding: '9px 12px',
              color: 'var(--text)',
              fontSize: 13,
              fontFamily: 'var(--sans)',
              resize: 'none',
              minHeight: 40, maxHeight: 110,
              overflowY: 'auto',
              outline: 'none',
              lineHeight: 1.5,
              transition: 'border-color 0.15s',
            }}
            onInput={(e) => {
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 110) + 'px'
            }}
          />
          {streaming ? (
            <button
              onClick={handleStop}
              style={{
                width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                background: 'var(--red-dim)', border: '1px solid var(--red-mid)',
                color: 'var(--red)', cursor: 'pointer', fontSize: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
              title="Detener"
            >
              ■
            </button>
          ) : (
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || ollamaStatus !== 'online'}
              style={{
                width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                background: input.trim() && ollamaStatus === 'online' ? 'var(--teal)' : 'var(--bg4)',
                border: `1px solid ${input.trim() && ollamaStatus === 'online' ? 'var(--teal)' : 'var(--border-mid)'}`,
                color: input.trim() && ollamaStatus === 'online' ? 'var(--bg)' : 'var(--text-dim)',
                cursor: input.trim() && ollamaStatus === 'online' ? 'pointer' : 'not-allowed',
                fontSize: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'var(--transition)',
              }}
              title="Enviar (Enter)"
            >
              →
            </button>
          )}
        </div>
      </div>
    </>
  )
}
