import { chat, checkOllamaStatus } from '../services/ollamaService.js'

const BRIEFING_SYSTEM_PROMPT = `Eres el asistente de productividad de Gibran. Analiza su contexto y responde SOLO con JSON válido (sin markdown):
{
  "aiInsight": "2-3 oraciones directas sobre qué priorizar hoy, basadas en los datos",
  "dailyPriorities": ["prioridad 1", "prioridad 2", "prioridad 3"]
}
Principios: máx 3 bloques de 90min, gym es inamovible, sueño 12am-8am sagrado.
Sé directo y específico, no genérico. Español casual.`

export async function generateBriefingInsight(context) {
  const { online } = await checkOllamaStatus()
  if (!online) return null

  const { dow, yesterdayLog, projects, weekStats } = context
  const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

  const messages = [
    { role: 'system', content: BRIEFING_SYSTEM_PROMPT },
    { role: 'user', content: `
Hoy es ${DAY_NAMES[dow]}.
Ayer: ${yesterdayLog ? `${[yesterdayLog.sleep, yesterdayLog.gym, yesterdayLog.meditation, yesterdayLog.meals].filter(Boolean).length}/4 hábitos, energía ${yesterdayLog.energy}/10` : 'sin datos'}.
Proyectos: ${Object.entries(projects).map(([k, p]) => `${k} ${p.pct}%`).join(', ')}.
Semana: ${weekStats.workHours?.toFixed(1) || 0}h trabajo, ${weekStats.gym || 0} días gym.
    `.trim() }
  ]

  let fullResponse = ''
  try {
    for await (const chunk of chat(messages, 'llama3.2:3b', null, false)) {
      fullResponse += chunk
    }
    return JSON.parse(fullResponse.trim())
  } catch {
    return { aiInsight: null, dailyPriorities: [] }
  }
}
