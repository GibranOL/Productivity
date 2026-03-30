// ─── NOTIFICATION SCHEDULE ───────────────────────────────────────────────────
// All times in 24h. dow = 0 (Dom) – 6 (Sáb)

const DAILY_NOTIFICATIONS = [
  { h: 8,  m: 0,  title: 'Buenos días ☀️', body: 'Bloque 1 en 1 hora — desayuna y actívate' },
  { h: 9,  m: 0,  title: 'BLOQUE 1 🧠',   body: 'Arranca ahora — primer pico de cortisol' },
  { h: 10, m: 30, title: 'Break 10 min ☕', body: 'Cerraste 90 min — hidrátate, siguiente bloque a las 11' },
  { h: 11, m: 0,  title: 'BLOQUE 2 ⚡',    body: 'Segundo pico — mantén el momentum' },
  { h: 12, m: 30, title: 'Almuerzo 🥗',    body: 'Cierra el trabajo — a comer y luego al gym' },
  { h: 18, m: 0,  title: 'Meditación 🧘',  body: '30 minutos de meditación / hipnosis' },
  { h: 21, m: 0,  title: 'Wind down 🌙',   body: 'Pantallas off en 2.5 hrs — empieza a bajar el ritmo' },
  { h: 23, m: 30, title: 'Pantallas off 🌑', body: 'Sueño en 30 min — bye azul' },
]

const TAROT_NOTIFICATION = { h: 19, m: 30, title: 'BLOQUE 3 🔮', body: 'Tarot App — sesión de build' }

export async function requestNotificationPermission() {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export function scheduleNotificationsForToday() {
  if (!('Notification' in window)) return
  if (Notification.permission !== 'granted') return

  const now = new Date()
  const dow = now.getDay()
  const hasTarot = [2, 4, 6].includes(dow) // Mar/Jue/Sáb

  const all = hasTarot
    ? [...DAILY_NOTIFICATIONS, TAROT_NOTIFICATION]
    : DAILY_NOTIFICATIONS

  all.forEach(({ h, m, title, body }) => {
    const target = new Date()
    target.setHours(h, m, 0, 0)
    const ms = target.getTime() - now.getTime()
    if (ms > 0) {
      setTimeout(() => {
        new Notification(title, {
          body,
          icon: '/gibran-os/icons/icon-192.png',
          badge: '/gibran-os/icons/icon-192.png',
          silent: false,
        })
      }, ms)
    }
  })
}

export function sendNotification(title, body) {
  if (!('Notification' in window)) return
  if (Notification.permission !== 'granted') return
  new Notification(title, {
    body,
    icon: '/gibran-os/icons/icon-192.png',
  })
}
