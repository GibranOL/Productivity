import { useEffect, useRef, useCallback } from 'react'
import useCortanaStore from '../../store/cortanaStore'
import useStore from '../../store/index'
import useSchedulerStore from '../../store/schedulerStore'
import useAIMemoryStore from '../../store/aiMemoryStore'
import useJobStore from '../../store/jobStore'
import { checkOllamaStatus, chat, buildSystemPromptWithMemory } from '../../services/ollamaService'
import { getTodayDow } from '../../utils/date'
import { getHealthContext } from '../../lib/healthCheck'
import { getWellnessContext } from '../../lib/recoveryAnalysis'

// ─── Quick Actions ───────────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  { label: '¿Qué hago?',       icon: '⚡', prompt: 'Basándote en mi schedule de hoy, energía actual y hábitos completados, ¿qué debería hacer en este momento? Sé directo.' },
  { label: 'Mi semana',         icon: '📊', prompt: 'Revisa mis métricas de esta semana y dime qué está funcionando, qué no, y qué ajustar.' },
  { label: 'Anti-burnout',      icon: '🔥', prompt: '¿Hay señales de que me esté quemando? Revisa mis horas, hábitos y patrones de esta semana.' },
  { label: 'Job Pipeline',      icon: '💼', prompt: 'Revisa mi pipeline de job search. ¿Hay vacantes estancadas? ¿Qué debería priorizar esta semana para avanzar hacia una oferta? Sé directo y estratégico.' },
]

// ─── Status Indicator ────────────────────────────────────────────────────────
function StatusIndicator({ status }) {
  const cfg = {
    idle:     { color: 'var(--text-dim)', label: '...' },
    checking: { color: 'var(--yellow)',   label: 'CONECTANDO' },
    online:   { color: 'var(--green)',    label: 'ONLINE' },
    offline:  { color: 'var(--red)',      label: 'OFFLINE' },
  }[status] || { color: 'var(--text-dim)', label: '...' }

  return (
    <span style={s.statusWrap}>
      <span style={{ ...s.statusDot, background: cfg.color, boxShadow: `0 0 6px ${cfg.color}` }} />
      <span style={{ ...s.statusLabel, color: cfg.color }}>{cfg.label}</span>
    </span>
  )
}

// ─── Message Bubble ──────────────────────────────────────────────────────────
function MessageBubble({ msg }) {
  const isUser = msg.role === 'user'
  const isErr  = msg.role === 'error'

  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
      <div style={{
        maxWidth: '88%',
        padding: '8px 12px',
        borderRadius: isUser ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
        background: isUser
          ? 'var(--teal-dim)'
          : isErr ? 'var(--red-dim)' : 'var(--bg4)',
        border: `1px solid ${isUser ? 'var(--teal-glow)' : isErr ? 'var(--red-mid)' : 'var(--border-mid)'}`,
        fontSize: 13,
        lineHeight: 1.55,
        color: isErr ? 'var(--red)' : 'var(--text)',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}>
        {msg.content}
        {msg.streaming && (
          <span style={{
            display: 'inline-block', width: 5, height: 14,
            background: 'var(--teal)', borderRadius: 1, marginLeft: 2,
            animation: 'pulse 0.8s infinite', verticalAlign: 'middle',
          }} />
        )}
      </div>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function CortanaSidebar({ onClose }) {
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)
  const abortRef  = useRef(null)

  // Cortana store
  const messages          = useCortanaStore((s) => s.messages)
  const streaming         = useCortanaStore((s) => s.streaming)
  const connectionStatus  = useCortanaStore((s) => s.connectionStatus)
  const selectedModel     = useCortanaStore((s) => s.selectedModel)
  const availableModels   = useCortanaStore((s) => s.availableModels)
  const thinkMode         = useCortanaStore((s) => s.thinkMode)

  // Context stores
  const logs       = useStore((s) => s.logs)
  const projects   = useStore((s) => s.projects)
  const streak     = useStore((s) => s.streak)
  const getTodayLog  = useStore((s) => s.getTodayLog)
  const getWeekStats = useStore((s) => s.getWeekStats)
  const blocks     = useSchedulerStore((s) => s.blocks)
  const memoryStore = useAIMemoryStore()
  const jobPipeline = useJobStore((s) => s.getPipelineCounts)
  const jobStaleCheck = useJobStore((s) => s.jobs)

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Check Ollama on mount
  useEffect(() => {
    checkConnection()
  }, [])

  // Focus input when online
  useEffect(() => {
    if (connectionStatus === 'online') inputRef.current?.focus()
  }, [connectionStatus])

  const checkConnection = useCallback(async () => {
    useCortanaStore.getState().setConnectionStatus('checking')
    const { online, models } = await checkOllamaStatus()
    const store = useCortanaStore.getState()
    store.setAvailableModels(models)
    store.setConnectionStatus(online ? 'online' : 'offline')
    if (online && models.length > 0 && !models.includes(store.selectedModel)) {
      store.setSelectedModel(models[0])
    }
  }, [])

  function buildContext() {
    const log       = getTodayLog()
    const weekStats = getWeekStats ? getWeekStats() : {}
    const dow       = new Date().getDay()
    const hour      = new Date().getHours()
    const todaySD   = [6, 0, 1, 2, 3, 4, 5][dow]
    const todayBlocks = (blocks || []).filter((b) => b.day === todaySD)

    // Job pipeline summary
    const pipelineCounts = jobPipeline()
    const staleJobs = jobStaleCheck
      .filter((j) => j.status === 'applied')
      .filter((j) => {
        const last = j.statusHistory?.[j.statusHistory.length - 1]
        if (!last) return false
        return (Date.now() - new Date(last.date).getTime()) / (1000*60*60*24) >= 10
      })

    // Health context
    const health = getHealthContext()

    // Wellness / recovery context (sleep, mood, meditation, correlations)
    const wellness = getWellnessContext()

    return {
      dow, hour,
      todayBlocks,
      habits: {
        'Sueño':      log.sleep,
        'Gym':        log.gym,
        'Meditación': log.meditation,
        'Comidas':    log.meals,
      },
      energy:   log.energy ?? 5,
      weekStats,
      projects: Object.fromEntries(
        Object.entries(projects).map(([k, v]) => [k, { pct: v.pct }])
      ),
      streak: streak?.count ?? 0,
      jobPipeline: pipelineCounts,
      staleJobs: staleJobs.map((j) => j.company),
      health,
      wellness,
    }
  }

  async function sendMessage(text) {
    if (!text.trim() || streaming) return
    if (connectionStatus !== 'online') return

    const store = useCortanaStore.getState()
    store.addMessage('user', text.trim())
    store.setStreaming(true)

    // Build API messages
    const memoryCtx    = memoryStore.generateContextString()
    const systemPrompt = buildSystemPromptWithMemory(memoryCtx, buildContext())
    const conversation = store.getConversationForAPI()
    const apiMessages  = [
      { role: 'system', content: systemPrompt },
      ...conversation,
    ]

    // Start streaming placeholder
    store.addMessage('assistant', '', { streaming: true })

    const ctrl = new AbortController()
    abortRef.current = ctrl

    try {
      let full = ''
      for await (const chunk of chat(apiMessages, store.selectedModel, ctrl.signal, store.thinkMode)) {
        full += chunk
        store.updateStreamingMessage(full)
      }
      store.finalizeStreaming()
    } catch (err) {
      // Remove streaming message, add error
      store.finalizeStreaming()
      const errMsg = typeof err === 'object' ? err.message : String(err)
      store.addMessage('error', errMsg)
      if (err.type === 'offline') store.setConnectionStatus('offline')
    } finally {
      store.setStreaming(false)
      abortRef.current = null
    }
  }

  function handleStop() {
    abortRef.current?.abort()
    useCortanaStore.getState().setStreaming(false)
    useCortanaStore.getState().finalizeStreaming()
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(inputRef.current?.value || '')
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const isOnline = connectionStatus === 'online'

  return (
    <aside style={s.sidebar}>
      {/* ── Header ── */}
      <div style={s.header}>
        <div style={s.headerLeft}>
          <div style={s.cortanaIcon}>C</div>
          <div>
            <div style={s.title}>CORTANA</div>
            <StatusIndicator status={connectionStatus} />
          </div>
        </div>
        <div style={s.headerRight}>
          {/* Think mode toggle */}
          <button
            onClick={() => useCortanaStore.getState().setThinkMode(!thinkMode)}
            title={thinkMode ? 'Modo profundo (30-60s)' : 'Modo rapido (2-5s)'}
            style={{
              ...s.modeBtn,
              background: thinkMode ? 'var(--purple-dim)' : 'var(--bg3)',
              borderColor: thinkMode ? 'var(--purple-mid)' : 'var(--border-mid)',
              color: thinkMode ? 'var(--purple)' : 'var(--text-dim)',
            }}
          >
            {thinkMode ? '🧠' : '⚡'}
          </button>
          {/* Model indicator */}
          <span style={s.modelLabel}>{selectedModel.split(':')[0]}</span>
          {/* Close */}
          <button onClick={onClose} style={s.closeBtn}>×</button>
        </div>
      </div>

      {/* ── Messages ── */}
      <div style={s.messagesArea}>
        {/* Welcome state */}
        {messages.length === 0 && isOnline && (
          <div style={s.welcome}>
            <div style={s.welcomeIcon}>C</div>
            <div style={s.welcomeTitle}>Cortana Intelligence</div>
            <div style={s.welcomeSub}>Tu asistente personal con contexto completo de tu dia, habitos y proyectos.</div>
          </div>
        )}

        {/* Offline state */}
        {connectionStatus === 'offline' && (
          <div style={s.offlineCard}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--red)', marginBottom: 8 }}>
              Ollama offline
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-dim)', lineHeight: 1.7 }}>
              <div style={s.codeBlock}>ollama serve</div>
              <div style={{ marginTop: 4 }}>
                Modelo: <span style={{ color: 'var(--teal)' }}>{selectedModel}</span>
              </div>
            </div>
            <button onClick={checkConnection} style={s.retryBtn}>Reintentar</button>
          </div>
        )}

        {connectionStatus === 'checking' && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-dim)', fontSize: 11, fontFamily: 'var(--mono)' }}>
            Verificando Ollama...
          </div>
        )}

        {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
        <div ref={bottomRef} />
      </div>

      {/* ── Quick Actions ── */}
      {isOnline && messages.length === 0 && (
        <div style={s.quickActions}>
          {QUICK_ACTIONS.map((a) => (
            <button
              key={a.label}
              onClick={() => sendMessage(a.prompt)}
              disabled={streaming}
              style={{
                ...s.quickBtn,
                opacity: streaming ? 0.4 : 1,
                cursor: streaming ? 'not-allowed' : 'pointer',
              }}
            >
              <span>{a.icon}</span>
              <span>{a.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── Input ── */}
      <div style={s.inputArea}>
        <div style={s.inputRow}>
          <textarea
            ref={inputRef}
            onKeyDown={handleKeyDown}
            placeholder={isOnline ? 'Preguntale algo a Cortana...' : 'Offline'}
            disabled={!isOnline || streaming}
            rows={1}
            style={s.textarea}
            onInput={(e) => {
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 80) + 'px'
            }}
          />
          {streaming ? (
            <button onClick={handleStop} style={s.stopBtn} title="Detener">■</button>
          ) : (
            <button
              onClick={() => {
                sendMessage(inputRef.current?.value || '')
                if (inputRef.current) inputRef.current.value = ''
              }}
              disabled={!isOnline}
              style={{
                ...s.sendBtn,
                background: isOnline ? 'var(--teal)' : 'var(--bg4)',
                borderColor: isOnline ? 'var(--teal)' : 'var(--border-mid)',
                color: isOnline ? 'var(--bg)' : 'var(--text-dim)',
                cursor: isOnline ? 'pointer' : 'not-allowed',
              }}
              title="Enviar"
            >
              →
            </button>
          )}
        </div>
        {/* Clear chat */}
        {messages.length > 0 && (
          <button
            onClick={() => useCortanaStore.getState().clearMessages()}
            style={s.clearBtn}
          >
            Limpiar chat
          </button>
        )}
      </div>
    </aside>
  )
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const s = {
  sidebar: {
    width: '340px',
    minWidth: '340px',
    background: 'linear-gradient(180deg, var(--bg2) 0%, var(--bg) 100%)',
    borderRight: '1px solid var(--border-mid)',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    zIndex: 30,
    height: '100%',
    overflow: 'hidden',
  },
  header: {
    padding: '14px 14px 12px',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0,
    background: 'var(--bg2)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  cortanaIcon: {
    width: '32px',
    height: '32px',
    borderRadius: '10px',
    background: 'linear-gradient(135deg, var(--teal-dim), var(--purple-dim))',
    border: '1px solid var(--teal-glow)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--display)',
    fontSize: '14px',
    fontWeight: 800,
    color: 'var(--teal)',
  },
  title: {
    fontFamily: 'var(--mono)',
    fontSize: '0.65rem',
    fontWeight: 700,
    color: 'var(--teal)',
    letterSpacing: '3px',
  },
  statusWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    marginTop: '2px',
  },
  statusDot: {
    width: '5px',
    height: '5px',
    borderRadius: '50%',
  },
  statusLabel: {
    fontFamily: 'var(--mono)',
    fontSize: '0.5rem',
    letterSpacing: '1px',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  modeBtn: {
    width: '28px',
    height: '28px',
    borderRadius: '8px',
    border: '1px solid',
    cursor: 'pointer',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.18s ease',
  },
  modelLabel: {
    fontFamily: 'var(--mono)',
    fontSize: '0.5rem',
    color: 'var(--text-dim)',
    letterSpacing: '0.5px',
  },
  closeBtn: {
    width: '26px',
    height: '26px',
    borderRadius: '8px',
    border: '1px solid var(--border-mid)',
    background: 'var(--bg3)',
    color: 'var(--text-dim)',
    cursor: 'pointer',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.18s ease',
  },
  messagesArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '12px 12px',
    WebkitOverflowScrolling: 'touch',
  },
  welcome: {
    textAlign: 'center',
    padding: '40px 16px 20px',
  },
  welcomeIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '14px',
    background: 'linear-gradient(135deg, var(--teal-dim), var(--purple-dim))',
    border: '1px solid var(--teal-glow)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--display)',
    fontSize: '20px',
    fontWeight: 800,
    color: 'var(--teal)',
    margin: '0 auto 12px',
    boxShadow: '0 0 20px var(--teal-dim)',
  },
  welcomeTitle: {
    fontFamily: 'var(--display)',
    fontSize: '15px',
    fontWeight: 800,
    color: 'var(--text)',
    marginBottom: '6px',
  },
  welcomeSub: {
    fontSize: '11px',
    color: 'var(--text-dim)',
    lineHeight: 1.5,
  },
  offlineCard: {
    padding: '16px',
    background: 'var(--bg3)',
    border: '1px solid var(--red-dim)',
    borderRadius: '12px',
    margin: '20px 0',
  },
  codeBlock: {
    background: 'var(--bg)',
    padding: '6px 10px',
    borderRadius: '6px',
    color: 'var(--teal)',
    fontSize: '11px',
  },
  retryBtn: {
    marginTop: '10px',
    padding: '6px 14px',
    background: 'var(--bg4)',
    border: '1px solid var(--border-mid)',
    borderRadius: '8px',
    color: 'var(--text-mid)',
    fontSize: '11px',
    cursor: 'pointer',
    fontFamily: 'var(--sans)',
  },
  quickActions: {
    padding: '8px 12px',
    borderTop: '1px solid var(--border)',
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '6px',
    flexShrink: 0,
  },
  quickBtn: {
    padding: '8px 10px',
    background: 'var(--bg3)',
    border: '1px solid var(--border-mid)',
    borderRadius: '10px',
    color: 'var(--text-mid)',
    fontSize: '11px',
    cursor: 'pointer',
    fontFamily: 'var(--sans)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.18s ease',
    textAlign: 'left',
  },
  inputArea: {
    padding: '10px 12px 14px',
    borderTop: '1px solid var(--border)',
    flexShrink: 0,
    background: 'var(--bg2)',
  },
  inputRow: {
    display: 'flex',
    gap: '6px',
    alignItems: 'flex-end',
  },
  textarea: {
    flex: 1,
    background: 'var(--bg3)',
    border: '1px solid var(--border-mid)',
    borderRadius: '10px',
    padding: '8px 10px',
    color: 'var(--text)',
    fontSize: '12px',
    fontFamily: 'var(--sans)',
    resize: 'none',
    minHeight: '36px',
    maxHeight: '80px',
    overflowY: 'auto',
    outline: 'none',
    lineHeight: 1.5,
    transition: 'border-color 0.15s',
  },
  sendBtn: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    border: '1px solid',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'all 0.18s ease',
  },
  stopBtn: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    background: 'var(--red-dim)',
    border: '1px solid var(--red-mid)',
    color: 'var(--red)',
    cursor: 'pointer',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  clearBtn: {
    marginTop: '6px',
    background: 'none',
    border: 'none',
    color: 'var(--text-dim)',
    fontSize: '10px',
    cursor: 'pointer',
    fontFamily: 'var(--mono)',
    letterSpacing: '0.5px',
    padding: '2px 0',
  },
}
