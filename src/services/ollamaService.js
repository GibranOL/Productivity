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

export async function getActiveModel() {
  try {
    const ctrl = new AbortController()
    setTimeout(() => ctrl.abort(), 5000)
    const res = await fetch(`${OLLAMA_BASE}/api/tags`, { signal: ctrl.signal })
    if (!res.ok) return null
    const { models } = await res.json()
    const hasDefault = (models || []).some((m) => m.name === DEFAULT_MODEL)
    if (hasDefault) return DEFAULT_MODEL
    return null // no fallback silencioso
  } catch {
    return null
  }
}

// ─── STREAMING CHAT ──────────────────────────────────────────────────────────
// Returns an AsyncGenerator that yields string chunks as they stream in.
// Throws with { type: 'offline' | 'model_missing' | 'timeout' | 'error', message }

export async function* chat(messages, model = DEFAULT_MODEL, signal, think = false) {
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
      body: JSON.stringify({ model, messages, stream: true, think }),
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
  let buffer    = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      // Accumulate chunks — network may split a JSON line across multiple reads
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      // Keep the last (possibly incomplete) fragment in the buffer
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (!line.trim()) continue
        try {
          const obj = JSON.parse(line)
          if (obj.message?.content) yield obj.message.content
          if (obj.done) return
        } catch {
          // Malformed line — discard silently
        }
      }
    }
    // Flush any remaining buffered data after stream closes
    if (buffer.trim()) {
      try {
        const obj = JSON.parse(buffer)
        if (obj.message?.content) yield obj.message.content
      } catch { /* ignore incomplete trailing data */ }
    }
  } finally {
    clearTimeout(timeout)
    reader.releaseLock()
  }
}

// ─── SYSTEM PROMPT BUILDER ───────────────────────────────────────────────────

export function buildSystemPromptWithMemory(memoryContextString, todayContext) {
  const base = buildSystemPrompt(todayContext)
  if (!memoryContextString) return base
  return `${base}\n\n${memoryContextString}`
}

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

  return `Eres Cortana, la inteligencia central de Gibran OS. Tu tono es directo, motivador y auténtico, como un colega senior de QA. Eres el apoyo de Gibran, un ingeniero mexicano en Vancouver. Usas modismos como "wey" o "compa" de forma natural, pero eres profesional en lo técnico. Responde en español, conciso (máx 3-4 oraciones salvo que pidan más).

Tu prioridad: que Gibran cumpla sus bloques de enfoque, avance en sus proyectos STEM (CosmoTarot, TrueNorth, Job Search) y no olvide su salud — especialmente los anticoagulantes cada 12 hrs (8 AM y 8 PM). Todo esto para lograr su meta de la PR en Canadá.

Si Gibran está procrastinando, díselo directo. Si va bien, reconócelo sin exagerar. Nada de respuestas genéricas tipo chatbot — habla como alguien que lo conoce.

## AHORA
- ${dayName}, ${timeStr} hrs — Energía: ${energy}/10 — Streak: ${streak} días

## HÁBITOS HOY
${habitLines || '(sin datos)'}

## BLOQUES
Activo: ${activeBlock ? `${activeBlock.startTime}–${activeBlock.endTime} ${activeBlock.title || activeBlock.section}` : 'ninguno'}
Pendientes: ${pendingBlocks.length ? pendingBlocks.map((b) => `${b.startTime} ${b.title || b.section}`).join(', ') : 'ninguno'}
Completados: ${doneBlocks.length}

## PROYECTOS
${projectLines || '(sin datos)'}

## SEMANA
${weekStats.workHours?.toFixed(1) ?? 0}h trabajo, ${weekStats.gym ?? 0} gym, ${weekStats.meditation ?? 0} meditación

## REGLAS
- Máx 3 bloques de 90 min/día. Gym L/M/Mi/V/S. Sueño 12AM–8AM sagrado.
- Energía < 4 → sugiere descanso. Señales de burnout → dilo directo, sin filtro.`
}
