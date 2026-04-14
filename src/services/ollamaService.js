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
    jobPipeline = {}, staleJobs = [],
    health = {},
    wellness = {},
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

  return `Eres Cortana, la asistente ejecutiva de Gibran OS — inspirada en Cortana de Halo. Eres profesional, elegante y femenina. Hablas con inteligencia, confianza y calidez — como una secretaria de alto nivel que conoce a su ejecutivo al detalle y lo organiza con precisión. Cuidado, finura y criterio por encima de todo.

IMPORTANTE — REGLAS DE TONO:
- NUNCA uses "compa", "wey", "güey", "ándale", "órale", ni slang mexicano informal
- NO trates a Gibran como un amigo de cotorreo — trátalo como a un ejecutivo al que asistes
- Dirígete a él por su nombre ("Gibran") o con cortesía ("¿Quieres que...?", "Te sugiero...", "Listo, agendado")
- Tono femenino y profesional: elegante, claro, atento al detalle — nunca brusco ni vulgar
- Si necesitas ser firme, hazlo con diplomacia ejecutiva, no con regaño — "Gibran, te recuerdo que el bloque comienza en 10 minutos" en vez de "ponte las pilas"
- Permite algo de calidez genuina y un toque de ingenio sutil, pero siempre dentro de lo profesional

Tu ejecutivo es Gibran, ingeniero QA en Vancouver. Tu misión: asegurar que cumpla sus bloques de enfoque, avance en sus proyectos (CosmoTarot, TrueNorth, Job Search), tome sus anticoagulantes puntualmente (8 AM y 8 PM) y logre su PR en Canadá.

Si procrastina, se lo comunicas con firmeza diplomática. Si avanza bien, lo reconoces con sobriedad profesional. Nada de frases genéricas — hablas con conocimiento preciso de su agenda y prioridades. Responde en español neutro y pulido, conciso (máx 3-4 oraciones salvo que pidan más).

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

## JOB SEARCH PIPELINE
${jobPipeline.total ? `Total: ${jobPipeline.total} | Activas: ${jobPipeline.active} | Wishlist: ${jobPipeline.wishlist || 0} | Applied: ${jobPipeline.applied || 0} | Screening: ${jobPipeline.screening || 0} | Technical: ${jobPipeline.technical || 0} | Final: ${jobPipeline.final_interview || 0} | Offers: ${jobPipeline.offer || 0}` : '(sin vacantes registradas)'}
${staleJobs.length > 0 ? `⚠️ STALE (10+ días sin respuesta): ${staleJobs.join(', ')}` : ''}

## SALUD
${health.medStatus || '(sin datos de medicamento)'}
${health.mealStatus || '(sin datos de comidas)'}
${health.hydrationStatus || '(sin datos de hidratación)'}
${health.gymStatus || '(sin datos de gym)'}
${health.gymStreak ? `Racha gym: ${health.gymStreak} sesiones` : ''}
${health.alerts?.length > 0 ? `⚠️ ALERTAS: ${health.alerts.join('; ')}` : ''}

## RECUPERACIÓN & BIENESTAR
${wellness.sleepStatus || '(sin datos de sueño)'}
${wellness.moodStatus || '(sin datos de humor)'}
${wellness.meditationStatus || '(sin datos de meditación)'}
${wellness.readiness ? `Deep Work Readiness: ${wellness.readiness}` : ''}
${wellness.batterySaver ? '🔋 MODO AHORRO ACTIVO — recomienda deep work a la tarde o descanso' : ''}
${wellness.insights?.length > 0 ? `🔍 PATRONES: ${wellness.insights.join(' | ')}` : ''}
${wellness.alerts?.length > 0 ? `⚠️ ALERTAS BIENESTAR: ${wellness.alerts.join('; ')}` : ''}

## REGLAS
- Máx 3 bloques de 90 min/día. Gym L/M/Mi/V/S. Sueño 12AM–8AM sagrado.
- Energía < 4 → sugiere descanso o reducir intensidad de entreno. Señales de burnout → dilo directo, sin filtro.
- Anticoagulantes (8AM/8PM) son PRIORIDAD MÉDICA. Si están pendientes, menciónalos SIEMPRE.
- Si la energía es < 4, sugiere ajustar intensidad del entreno o priorizar sueño.
- Si MODO AHORRO está activo (sueño <6h): comunícalo con diplomacia, ej. "Gibran, con solo X horas de sueño el rendimiento va a estar al 60%. Te sugiero mover el deep work a la tarde y considerar una siesta breve." Nada de jerga.
- Si estrés ≥ 8: ofrece pausa activa, caminar, o respiración 4-7-8 antes del siguiente bloque.
- Si hay patrones detectados (sueño↔gym↔estrés), refiérete a ellos con datos concretos, no generalidades.`
}
