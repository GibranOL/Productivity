import { chat } from '../services/ollamaService.js'

const VOICE_COMMAND_PROMPT = `Interpreta el comando de voz del usuario sobre su schedule del día y retorna SOLO JSON válido sin texto adicional:
{
  "action": "move"|"add"|"delete"|"modify"|"reduce_workload"|"unknown",
  "targetBlock": "descripción del bloque afectado o null",
  "newStartTime": "HH:MM o null",
  "newEndTime": "HH:MM o null",
  "newDay": "0-6 o null",
  "confirmation": "confirma en español casual lo que harás, máx 1 oración"
}
Ejemplos:
- "Mueve el gym a las 3pm" → action:move, targetBlock:"gym", newStartTime:"15:00"
- "Agrega lectura a las 8pm" → action:add, targetBlock:"lectura", newStartTime:"20:00"
- "Estoy cansado, quita el tercer bloque" → action:reduce_workload
Solo JSON, sin markdown, sin explicaciones.`

export async function parseVoiceCommand(transcript, currentSchedule) {
  const messages = [
    { role: 'system', content: VOICE_COMMAND_PROMPT },
    { role: 'user', content: `Schedule actual: ${JSON.stringify(currentSchedule.map((b) => ({ title: b.title, startTime: b.startTime, endTime: b.endTime, section: b.section })))}\n\nComando: "${transcript}"` }
  ]

  let fullResponse = ''
  try {
    for await (const chunk of chat(messages, 'gemma4:e4b', null, false)) {
      fullResponse += chunk
    }
    return JSON.parse(fullResponse.trim())
  } catch {
    return { action: 'unknown', confirmation: 'No entendí el comando, intenta de nuevo' }
  }
}
