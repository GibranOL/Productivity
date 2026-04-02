// ─── Google Calendar Service ──────────────────────────────────────────────────
// Uses Google Calendar REST API v3 directly (fetch + access token from OAuth2)
// Access token is managed by @react-oauth/google and passed in via setAccessToken()

let _accessToken = null

export function setAccessToken(token) {
  _accessToken = token
}

export function getAccessToken() {
  return _accessToken
}

export function clearAccessToken() {
  _accessToken = null
}

// ─── SECTION → GOOGLE CALENDAR COLOR ID ──────────────────────────────────────
// Google Calendar colorId: 1=lavender 2=sage 3=grape 4=flamingo 5=banana
// 6=tangerine 7=peacock 8=blueberry 9=basil 10=tomato 11=cocoa
const SECTION_COLOR_ID = {
  sleep:      '8', // blueberry (deep blue — sleep)
  gym:        '6', // tangerine (orange — gym/energy)
  project:    '7', // peacock (teal — work)
  study:      '1', // lavender (blue — study)
  mealprep:   '2', // sage (green — food)
  meditation: '3', // grape (purple — meditation)
  relax:      '4', // flamingo (pink — relax)
  reading:    '5', // banana (yellow — reading)
  outdoor:    '9', // basil (green — outdoor)
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

// Convert scheduler day (0=Lun) + time string to ISO datetime
// weekOffset: 0 = current week starting this Monday
function blockToDateTime(day, timeStr, weekOffset = 0) {
  const now = new Date()
  const jsDow = now.getDay() // 0=Sun
  // Scheduler day 0=Mon → JS day 1; day 6=Sun → JS day 0
  const schedToJs = [1, 2, 3, 4, 5, 6, 0]
  const targetJsDow = schedToJs[day]

  // Find this Monday
  const thisMon = new Date(now)
  thisMon.setDate(now.getDate() - (jsDow === 0 ? 6 : jsDow - 1))
  thisMon.setHours(0, 0, 0, 0)

  const target = new Date(thisMon)
  target.setDate(thisMon.getDate() + day + weekOffset * 7)

  const [h, m] = timeStr.split(':').map(Number)
  target.setHours(h, m, 0, 0)
  return target.toISOString()
}

function blockToGCalEvent(block, weekOffset = 0) {
  return {
    summary: block.title || `${block.icon} ${block.section}`,
    description: [
      block.subtitle,
      block.objectives?.length ? `Objetivos:\n${block.objectives.map((o) => `• ${o}`).join('\n')}` : '',
      block.notes,
    ].filter(Boolean).join('\n\n'),
    start: {
      dateTime: blockToDateTime(block.day, block.startTime, weekOffset),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    end: {
      dateTime: blockToDateTime(block.day, block.endTime, weekOffset),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    colorId: SECTION_COLOR_ID[block.section] || '7',
    source: {
      title: 'Gibran OS',
      url: window.location.origin,
    },
  }
}

async function gcalFetch(path, options = {}) {
  if (!_accessToken) throw new Error('No access token — sign in first')

  const url = `https://www.googleapis.com/calendar/v3${path}`
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${_accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (res.status === 401) {
    clearAccessToken()
    throw new Error('Token expirado — vuelve a iniciar sesión')
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `HTTP ${res.status}`)
  }
  if (res.status === 204) return null
  return res.json()
}

// ─── PUBLIC API ───────────────────────────────────────────────────────────────

export async function fetchCalendarEvents(startDate, endDate) {
  const params = new URLSearchParams({
    timeMin: new Date(startDate).toISOString(),
    timeMax: new Date(endDate).toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '100',
  })
  const data = await gcalFetch(`/calendars/primary/events?${params}`)
  return data.items || []
}

export async function createCalendarEvent(block, weekOffset = 0) {
  return gcalFetch('/calendars/primary/events', {
    method: 'POST',
    body: JSON.stringify(blockToGCalEvent(block, weekOffset)),
  })
}

export async function updateCalendarEvent(googleEventId, block, weekOffset = 0) {
  return gcalFetch(`/calendars/primary/events/${googleEventId}`, {
    method: 'PUT',
    body: JSON.stringify(blockToGCalEvent(block, weekOffset)),
  })
}

export async function deleteCalendarEvent(googleEventId) {
  return gcalFetch(`/calendars/primary/events/${googleEventId}`, {
    method: 'DELETE',
  })
}

// Sync all blocks for the current week to Google Calendar
// Returns { created, updated, deleted, errors }
export async function syncWeekToCalendar(blocks, weekOffset = 0) {
  const results = { created: 0, updated: 0, deleted: 0, errors: [] }

  for (const block of blocks) {
    try {
      if (block.googleEventId) {
        await updateCalendarEvent(block.googleEventId, block, weekOffset)
        results.updated++
      } else {
        const event = await createCalendarEvent(block, weekOffset)
        // Return {blockId, googleEventId} so caller can update the store
        results.created++
        if (!results.createdIds) results.createdIds = []
        results.createdIds.push({ blockId: block.id, googleEventId: event.id })
      }
    } catch (e) {
      results.errors.push({ blockId: block.id, message: e.message })
    }
  }

  return results
}

// Import events from Google Calendar as scheduler blocks (read-only preview)
// Returns array of partial ScheduleBlock objects (not yet saved to store)
export async function importWeekFromCalendar(weekOffset = 0) {
  const now = new Date()
  const jsDow = now.getDay()
  const thisMon = new Date(now)
  thisMon.setDate(now.getDate() - (jsDow === 0 ? 6 : jsDow - 1) + weekOffset * 7)
  thisMon.setHours(0, 0, 0, 0)

  const weekEnd = new Date(thisMon)
  weekEnd.setDate(thisMon.getDate() + 7)

  const events = await fetchCalendarEvents(thisMon, weekEnd)

  // Map to partial blocks — section defaults to 'relax' (user can edit)
  return events.map((event) => {
    const start = new Date(event.start.dateTime || event.start.date)
    const end   = new Date(event.end.dateTime   || event.end.date)

    // Map JS dow back to scheduler day (0=Lun)
    const jsToSched = [6, 0, 1, 2, 3, 4, 5]
    const day = jsToSched[start.getDay()]

    const pad = (n) => String(n).padStart(2, '0')
    const startTime = `${pad(start.getHours())}:${pad(start.getMinutes())}`
    const endTime   = `${pad(end.getHours())}:${pad(end.getMinutes())}`

    return {
      day,
      startTime,
      endTime,
      title: event.summary || 'Evento importado',
      subtitle: '',
      section: 'relax',
      googleEventId: event.id,
      notes: event.description || '',
    }
  })
}
