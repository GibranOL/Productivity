const DAYS_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const MONTHS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

export const GYM_DAYS = [1, 2, 3, 5, 6] // Lun/Mar/Mié/Vie/Sáb

export function getDayKey(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function getTodayDow() {
  return new Date().getDay() // 0=Dom
}

export function formatDate(date = new Date()) {
  const dow = DAYS_ES[date.getDay()]
  const d = date.getDate()
  const m = MONTHS_ES[date.getMonth()]
  return `${dow} ${d} ${m}`
}

export function isGymDay(dow = getTodayDow()) {
  return GYM_DAYS.includes(dow)
}

export function getCircadianInsight() {
  const h = new Date().getHours()
  if (h >= 8 && h < 11) return {
    label: 'CORTISOL PEAK',
    color: 'var(--teal)',
    bg: 'var(--teal-dim)',
    text: 'Ventana cognitiva máxima — prioriza trabajo profundo',
    icon: '🧠',
  }
  if (h >= 11 && h < 13) return {
    label: 'ULTRADIAN DIP',
    color: 'var(--yellow)',
    bg: 'var(--yellow-dim)',
    text: 'Transición natural — gym, almuerzo o break',
    icon: '⚡',
  }
  if (h >= 13 && h < 15) return {
    label: 'POST-LUNCH DIP',
    color: 'var(--orange)',
    bg: 'var(--orange-dim)',
    text: 'Gym convierte adenosina en BDNF — movimiento ahora',
    icon: '🏋️',
  }
  if (h >= 15 && h < 18) return {
    label: 'SECOND PEAK',
    color: 'var(--teal)',
    bg: 'var(--teal-dim)',
    text: 'Segundo pico de foco — trabajo creativo y estratégico',
    icon: '⚡',
  }
  if (h >= 18 && h < 22) return {
    label: 'MELATONIN RISING',
    color: 'var(--purple)',
    bg: 'var(--purple-dim)',
    text: 'Trabajo creativo OK — cuidado con luz azul',
    icon: '🌙',
  }
  return {
    label: 'SLEEP WINDOW',
    color: 'var(--purple)',
    bg: 'var(--purple-dim)',
    text: 'Proteger ventana de sueño — pantallas off',
    icon: '🌑',
  }
}

// ─── SCHEDULE POR DÍA ────────────────────────────────────────────────────────
export function getDaySchedule(dow) {
  // dow: 0=Dom, 1=Lun, 2=Mar, 3=Mié, 4=Jue, 5=Vie, 6=Sáb
  const hasGym = GYM_DAYS.includes(dow)

  // Proyectos por día
  const proj1 = (() => {
    if (dow === 1 || dow === 3) return { name: 'TrueNorth Pathways', icon: '🧭', tag: 'work' }
    if (dow === 2 || dow === 4) return { name: 'Job Search', icon: '💼', tag: 'work' }
    if (dow === 5)              return { name: 'Flex', icon: '🎯', tag: 'work' }
    if (dow === 6)              return { name: 'Meal Prep', icon: '🥗', tag: 'rest' }
    return                              { name: 'Trabajo ligero', icon: '💤', tag: 'rest' } // Dom
  })()

  const blocks = [
    { time: '8:00 AM',  name: 'Desayuno + rutina mañana', tag: 'rest', icon: '☀️',  habit: null },
    { time: '9:00 AM',  name: `Bloque 1 — ${proj1.name}`, tag: proj1.tag, icon: proj1.icon, habit: 'fb0' },
    { time: '10:30 AM', name: 'Break 10 min',              tag: 'rest', icon: '☕',  habit: null },
    { time: '11:00 AM', name: `Bloque 2 — ${proj1.name}`, tag: proj1.tag, icon: proj1.icon, habit: 'fb1' },
  ]

  if (hasGym) {
    blocks.push({ time: '12:30 PM', name: 'Almuerzo',  tag: 'rest', icon: '🥗', habit: 'meals' })
    blocks.push({ time: '1:30 PM',  name: 'Gym 💪',    tag: 'gym',  icon: '🏋️', habit: 'gym' })
    blocks.push({ time: '4:00 PM',  name: 'Descanso',  tag: 'rest', icon: '🛁', habit: null })
  } else {
    blocks.push({ time: '12:30 PM', name: 'Almuerzo + Descanso', tag: 'rest', icon: '🥗', habit: 'meals' })
    blocks.push({ time: '1:30 PM',  name: 'Descanso / Recovery', tag: 'rest', icon: '🛁', habit: null })
  }

  blocks.push({ time: '6:00 PM',  name: 'Meditación / Hipnosis', tag: 'med', icon: '🧘', habit: 'meditation' })

  // Bloque 3: Mar/Jue/Sáb = Tarot
  if (dow === 2 || dow === 4 || dow === 6) {
    blocks.push({ time: '7:30 PM', name: 'Bloque 3 — Tarot App', tag: 'work', icon: '🔮', habit: 'fb2' })
    blocks.push({ time: '9:00 PM', name: 'Cierra trabajo', tag: 'rest', icon: '🌙', habit: null })
  } else if (dow === 5 || dow === 1 || dow === 3) {
    blocks.push({ time: '7:30 PM', name: 'Relax / Social', tag: 'rest', icon: '🍻', habit: null })
  } else {
    blocks.push({ time: '7:30 PM', name: 'Relax total', tag: 'rest', icon: '🌿', habit: null })
  }

  blocks.push({ time: '11:30 PM', name: 'Pantallas off', tag: 'sleep', icon: '🌑', habit: null })
  blocks.push({ time: '12:00 AM', name: 'Sueño 💤',      tag: 'sleep', icon: '🌙', habit: 'sleep' })

  return blocks
}

export function getTonightPlan(dow) {
  if (dow === 1 || dow === 3) return { label: 'Relax', icon: '🍻', text: 'Desconecta — cero trabajo esta noche' }
  if (dow === 2 || dow === 4) return { label: 'Tarot App', icon: '🔮', text: 'Bloque 3 — sesión de build 7:30–9 PM' }
  if (dow === 5)              return { label: 'Social', icon: '🎉', text: 'Sal — vida social activa hoy' }
  if (dow === 6)              return { label: 'Social + Tarot', icon: '🎉', text: 'Build session + noche social' }
  return                              { label: 'Recuperación', icon: '🌿', text: 'Domingo de recarga — sin trabajo pesado' }
}
