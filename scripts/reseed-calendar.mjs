#!/usr/bin/env node
/**
 * Reseed script: deletes ALL calendar events and re-creates them
 * for the current week + 3 future weeks (4 weeks total).
 *
 * Usage: node scripts/reseed-calendar.mjs
 */
import { Client, Databases, Query, ID, Permission, Role } from 'node-appwrite'
import { startOfWeek, addDays, format } from 'date-fns'
import { fromZonedTime } from 'date-fns-tz'

const ENDPOINT = 'https://tor.cloud.appwrite.io/v1'
const PROJECT_ID = '69db1b880015847e1eb0'
const API_KEY = process.env.APPWRITE_API_KEY
const USER_ID = '69db2e7bb18daee23fff'

if (!API_KEY) {
  console.error('Set APPWRITE_API_KEY env var first')
  process.exit(1)
}

const client = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID)
  .setKey(API_KEY)

const db = new Databases(client)
const DATABASE_ID = 'gibran_os'
const COLLECTION_ID = 'calendar_events'

const TZ = 'America/Vancouver'
const GYM_DAYS = [1, 2, 3, 5, 6]
const TAROT_DAYS = [2, 4, 6]
const DAY_PROJECTS = {
  1: 'TrueNorth Pathways',
  2: 'Job Search',
  3: 'TrueNorth Pathways',
  4: 'Job Search',
  5: 'Flex',
  6: 'Tarot App',
}

function localToUTC(baseDate, hours, minutes = 0) {
  const local = new Date(baseDate)
  local.setHours(hours, minutes, 0, 0)
  return fromZonedTime(local, TZ).toISOString()
}

function generateEvents(userId, weeks = 4) {
  const now = new Date()
  const monday = startOfWeek(now, { weekStartsOn: 1 })
  const events = []

  for (let dayOffset = 0; dayOffset < 7 * weeks; dayOffset++) {
    const date = addDays(monday, dayOffset)
    const dow = date.getDay()

    // Focus Block 1: 9:00-10:30 (Mon-Sat)
    if (dow >= 1 && dow <= 6) {
      const project = DAY_PROJECTS[dow] || 'Flex'
      events.push({
        user_id: userId,
        type: 'project_block',
        title: project,
        subtitle: 'Bloque 1 — Cortisol Peak',
        start_date: localToUTC(date, 9, 0),
        end_date: localToUTC(date, 10, 30),
        icon: '🎯',
        color: 'var(--teal)',
        status: 'pending',
        all_day: false,
        metadata_json: JSON.stringify({ blockIndex: 0, project }),
      })
    }

    // Focus Block 2: 11:00-12:30 (Mon-Sat)
    if (dow >= 1 && dow <= 6) {
      const project = DAY_PROJECTS[dow] || 'Flex'
      events.push({
        user_id: userId,
        type: 'project_block',
        title: project,
        subtitle: 'Bloque 2 — Segundo pico',
        start_date: localToUTC(date, 11, 0),
        end_date: localToUTC(date, 12, 30),
        icon: '🎯',
        color: 'var(--teal)',
        status: 'pending',
        all_day: false,
        metadata_json: JSON.stringify({ blockIndex: 1, project }),
      })
    }

    // Gym: 12:30-15:00
    if (GYM_DAYS.includes(dow)) {
      const routineNames = {
        1: 'Upper A (Espalda)',
        2: 'Lower A (Cuad + Glutes)',
        3: 'Push (Pecho + Hombros)',
        5: 'Lower B (Caderas + Glutes)',
        6: 'Pull (Espalda + Brazos)',
      }
      events.push({
        user_id: userId,
        type: 'gym',
        title: routineNames[dow] || 'Gym',
        subtitle: '90 min + 20 min escalera',
        start_date: localToUTC(date, 12, 30),
        end_date: localToUTC(date, 15, 0),
        icon: '🏋️',
        color: 'var(--orange)',
        status: 'pending',
        all_day: false,
        metadata_json: JSON.stringify({ routineDay: dow }),
      })
    }

    // Meditation: 18:00-18:30 (daily)
    events.push({
      user_id: userId,
      type: 'meditation',
      title: 'Meditacion',
      subtitle: '30 min — hipnosis/mindfulness',
      start_date: localToUTC(date, 18, 0),
      end_date: localToUTC(date, 18, 30),
      icon: '🧘',
      color: 'var(--purple)',
      status: 'pending',
      all_day: false,
      metadata_json: JSON.stringify({}),
    })

    // Focus Block 3: 19:30-21:00 (Tue/Thu/Sat = Tarot)
    if (TAROT_DAYS.includes(dow)) {
      events.push({
        user_id: userId,
        type: 'project_block',
        title: 'Tarot App',
        subtitle: 'Bloque 3 — Sesion nocturna',
        start_date: localToUTC(date, 19, 30),
        end_date: localToUTC(date, 21, 0),
        icon: '🔮',
        color: 'var(--teal)',
        status: 'pending',
        all_day: false,
        metadata_json: JSON.stringify({ blockIndex: 2, project: 'Tarot App' }),
      })
    }

    // Meals (5 per day)
    const meals = [
      { time: [7, 30], name: 'Desayuno', icon: '🍳' },
      { time: [10, 30], name: 'Colacion AM', icon: '🍎' },
      { time: [15, 30], name: 'Comida', icon: '🍽️' },
      { time: [17, 0], name: 'Colacion PM', icon: '🥤' },
      { time: [21, 30], name: 'Cena', icon: '🥗' },
    ]
    for (const meal of meals) {
      events.push({
        user_id: userId,
        type: 'meal',
        title: meal.name,
        start_date: localToUTC(date, meal.time[0], meal.time[1]),
        end_date: localToUTC(date, meal.time[0], meal.time[1] + 30),
        icon: meal.icon,
        color: 'var(--green)',
        status: 'pending',
        all_day: false,
        metadata_json: JSON.stringify({}),
      })
    }

    // Medication: 2x daily
    events.push({
      user_id: userId,
      type: 'medication',
      title: 'Anticoagulante AM',
      subtitle: 'Dosis de la manana',
      start_date: localToUTC(date, 8, 0),
      end_date: localToUTC(date, 8, 15),
      icon: '💊',
      color: 'var(--red)',
      status: 'pending',
      all_day: false,
      metadata_json: JSON.stringify({ doseCycle: 'morning' }),
    })
    events.push({
      user_id: userId,
      type: 'medication',
      title: 'Anticoagulante PM',
      subtitle: 'Dosis de la noche',
      start_date: localToUTC(date, 20, 0),
      end_date: localToUTC(date, 20, 15),
      icon: '💊',
      color: 'var(--red)',
      status: 'pending',
      all_day: false,
      metadata_json: JSON.stringify({ doseCycle: 'evening' }),
    })
  }

  return events
}

async function main() {
  // Step 1: Delete all existing events
  console.log('🗑️  Deleting all existing calendar events...')
  let deleted = 0
  let offset = 0

  while (true) {
    const res = await db.listDocuments(DATABASE_ID, COLLECTION_ID, [
      Query.limit(100),
      Query.offset(0), // always 0 since we're deleting
    ])
    if (res.documents.length === 0) break

    for (const doc of res.documents) {
      await db.deleteDocument(DATABASE_ID, COLLECTION_ID, doc.$id)
      deleted++
    }
    console.log(`  Deleted ${deleted}...`)
  }
  console.log(`  Total deleted: ${deleted}`)

  // Step 2: Generate new events (4 weeks)
  const events = generateEvents(USER_ID, 4)
  console.log(`\n📅 Creating ${events.length} events (4 weeks)...`)

  const permissions = [
    Permission.read(Role.user(USER_ID)),
    Permission.update(Role.user(USER_ID)),
    Permission.delete(Role.user(USER_ID)),
  ]

  let created = 0
  const batchSize = 10
  for (let i = 0; i < events.length; i += batchSize) {
    const batch = events.slice(i, i + batchSize)
    await Promise.all(
      batch.map((evt) =>
        db.createDocument(DATABASE_ID, COLLECTION_ID, ID.unique(), evt, permissions)
      )
    )
    created += batch.length
    if (created % 50 === 0 || created === events.length) {
      console.log(`  Created ${created}/${events.length}...`)
    }
  }

  console.log(`\n✅ Done! ${created} events created for 4 weeks.`)
}

main().catch(console.error)
