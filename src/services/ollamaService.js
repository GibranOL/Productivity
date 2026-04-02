// ─── Ollama Service ───────────────────────────────────────────────────────────
// Connects to Ollama running locally at http://localhost:11434
// No auth required — Ollama is local-only by default

const OLLAMA_BASE  = 'http://localhost:11434'
const DEFAULT_MODEL = 'llama3.2:3b'
const TIMEOUT_MS    = 30000

// ─── STATUS ──────────────────────────────────────────────────────────────────

export async function checkOllamaStatus() {
  try {
    const ctrl = new AbortController()
    const tid  = setTimeout(() => ctrl.abort(), 5000)
    const res  = await fetch(`${OLLAMA_BASE}/api/tags`, { signal: ctrl.signal })
    clearTimeout(tid)
    if (!res.ok) return { online: false, models: [] }
    const data = await res.json()
    const models = (data.models || []).map((m) => m.name)
    return { online: true, models }
  } catch {
    return { online: false, models: [] }
  }
}

// ─── STREAMING CHAT ──────────────────────────────────────────────────────────
// Returns an AsyncGenerator that yields string chunks as they stream in.
// Throws with { type: 'offline' | 'model_missing' | 'timeout' | 'error', message }

export async function* chat(messages, model = DEFAULT_MODEL, signal) {
  const ctrl    = signal ? null : new AbortController()
  const abortSg = signal || ctrl.signal
  const timeout = ctrl
    ? setTimeout(() => ctrl.abort(), TIMEOUT_MS)
    : setTimeout(() => {}, 0) // no-op if external signal

  let res
  try {
    res = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, stream: true }),
      signal: abortSg,
    })
  } catch (e) {
    clearTimeout(timeout)
    if (e.name === 'AbortError') throw { type: 'timeout', message: 'Tiempo agotado (30s). ¿Ollama está corriendo?' }
    throw { type: 'offline', message: 'No se puede conectar a Ollama. ¿Está corriendo?' }
  }

  if (res.status === 404) {
    clearTimeout(timeout)
    throw { type: 'model_missing', message: `Modelo "${model}" no encontrado. Corre: ollama pull ${model}` }
  }
  if (!res.ok) {
    clearTimeout(timeout)
    const txt = await res.text().catch(() => '')
    throw { type: 'error', message: `Error ${res.status}: ${txt}` }
  }

  const reader  = res.body.getReader()
  const decoder = new TextDecoder()

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value, { stream: true })
      for (const line of chunk.split('\n')) {
        if (!line.trim()) continue
        try {
          const obj = JSON.parse(line)
          if (obj.message?.content) yield obj.message.content
          if (obj.done) return
        } catch {
          // partial JSON line — skip
        }
      }
    }
  } finally {
    clearTimeout(timeout)
    reader.releaseLock()
  }
}

// ─── SYSTEM PROMPT BUILDER ───────────────────────────────────────────────────

export function buildSystemPrompt(context) {
  const {
    dow, hour, todayBlocks = [], habits = {}, energy = 5,
    weekStats = {}, projects = {}, streak = 0,
  } = context

  const DAY_NAMES  = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  const dayName    = DAY_NAMES[dow] || 'Hoy'
  const timeStr    = `${String(hour).padStart(2, '0')}:00`

  const activeBlock  = todayBlocks.find((b) => b.status === 'active')
  const pendingBlocks = todayBlocks.filter((b) => b.status === 'pending')
  const doneBlocks   = todayBlocks.filter((b) => b.status === 'done' || b.status === 'extended')

  const habitLines = Object.entries(habits)
    .map(([k, v]) => `  • ${k}: ${v === true ? '✓' : v === false ? '✗' : '—'}`)
    .join('\n')

  const blockLines = (arr) =>
    arr.length
      ? arr.map((b) => `  • ${b.startTime}–${b.endTime} ${b.title || b.section}`).join('\n')
      : '  (ninguno)'

  const projectLines = Object.entries(projects)
    .map(([k, p]) => `  • ${k}: ${p.pct ?? 0}% completado`)
    .join('\n')

  return `Eres el asistente personal de Gibran, integrado en Gibran OS — su sistema operativo personal.
Tu rol es ayudarle a gestionar su tiempo, energía y proyectos de forma honesta y directa.
Responde siempre en español. Sé conciso (máx. 3-4 oraciones salvo que pidan más detalle).
No uses listas largas innecesarias. Prioriza claridad sobre exhaustividad.

## CONTEXTO ACTUAL
- Día: ${dayName}, ${timeStr} hrs
- Energía de Gibran: ${energy}/10
- Streak de hábitos: ${streak} días consecutivos

## HÁBITOS HOY
${habitLines || '  (sin datos)'}

## BLOQUES DE HOY
Activo ahora:
${activeBlock ? `  • ${activeBlock.startTime}–${activeBlock.endTime} ${activeBlock.title || activeBlock.section}` : '  (ninguno)'}
Pendientes:
${blockLines(pendingBlocks)}
Completados hoy:
${blockLines(doneBlocks)}

## PROYECTOS ACTIVOS
${projectLines || '  (sin datos)'}

## SEMANA (resumen)
- Horas de trabajo completadas: ${weekStats.workHours?.toFixed(1) ?? 0}h
- Días de gym: ${weekStats.gym ?? 0}
- Días de meditación: ${weekStats.meditation ?? 0}

## PRINCIPIOS ANTI-BURNOUT DE GIBRAN OS
- Máx. 3 bloques de foco profundo (90 min c/u) por día
- Gym Lun/Mar/Mié/Vie/Sáb — descanso Jue/Dom
- Sueño sagrado: 12 AM – 8 AM, no negociable
- Al menos 1-2 noches de relax/social por semana
- Si energía < 4, sugerir descanso antes que más trabajo

Cuando detectes señales de burnout (energía baja + pocas horas + hábitos fallando), dilo directamente.`
}
