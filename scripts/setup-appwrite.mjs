#!/usr/bin/env node
/**
 * Gibran OS — Appwrite Database Setup Script
 *
 * Creates the database, all 17 collections, attributes, and indexes.
 * Run once: node scripts/setup-appwrite.mjs
 *
 * Required env vars (or pass via CLI):
 *   APPWRITE_ENDPOINT  (default: https://cloud.appwrite.io/v1)
 *   APPWRITE_PROJECT   (default: 69db1b880015847e1eb0)
 *   APPWRITE_API_KEY   (required — create in Appwrite Console → Settings → API Keys)
 */

import { Client, Databases, ID } from 'node-appwrite'

// ─── Config ──────────────────────────────────────────────────
const ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1'
const PROJECT = process.env.APPWRITE_PROJECT || '69db1b880015847e1eb0'
const API_KEY = process.env.APPWRITE_API_KEY

if (!API_KEY) {
  console.error('❌ Missing APPWRITE_API_KEY. Create one in Appwrite Console → Settings → API Keys')
  process.exit(1)
}

const client = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT)
  .setKey(API_KEY)

const db = new Databases(client)
const DATABASE_ID = 'gibran_os'

// ─── Helpers ─────────────────────────────────────────────────

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function createDB() {
  try {
    await db.create(DATABASE_ID, 'Gibran OS')
    console.log('✅ Database created: gibran_os')
  } catch (e) {
    if (e.code === 409 || e.code === 403) {
      console.log('⏭️  Database already exists')
    } else throw e
  }
}

async function createCollection(id, name) {
  try {
    await db.createCollection(DATABASE_ID, id, name, [
      // Permissions: only authenticated user who owns the document
      'read("any")',
      'create("users")',
      'update("users")',
      'delete("users")',
    ])
    console.log(`  ✅ Collection: ${name}`)
  } catch (e) {
    if (e.code === 409) {
      console.log(`  ⏭️  Collection exists: ${name}`)
    } else throw e
  }
  // Small delay to avoid rate limiting
  await sleep(300)
}

async function attr(collectionId, type, key, opts = {}) {
  const { size = 256, required = false, def, array = false, min, max, xdefault } = opts
  try {
    switch (type) {
      case 'string':
        await db.createStringAttribute(DATABASE_ID, collectionId, key, size, required, def || undefined, array)
        break
      case 'boolean':
        await db.createBooleanAttribute(DATABASE_ID, collectionId, key, required, xdefault !== undefined ? xdefault : undefined)
        break
      case 'integer':
        await db.createIntegerAttribute(DATABASE_ID, collectionId, key, required, min, max, xdefault !== undefined ? xdefault : undefined)
        break
      case 'float':
        await db.createFloatAttribute(DATABASE_ID, collectionId, key, required, min, max, xdefault !== undefined ? xdefault : undefined)
        break
    }
  } catch (e) {
    if (e.code === 409) return // attribute already exists
    throw e
  }
  await sleep(200)
}

async function createIndex(collectionId, key, type, attributes, orders) {
  try {
    await db.createIndex(DATABASE_ID, collectionId, key, type, attributes, orders)
  } catch (e) {
    if (e.code === 409) return
    throw e
  }
  await sleep(200)
}

// ─── Collection Definitions ──────────────────────────────────

async function setupUsers() {
  const C = 'users'
  await createCollection(C, 'Users')
  await attr(C, 'string', 'name', { size: 128, required: true })
  await attr(C, 'string', 'timezone', { size: 64, def: 'America/Vancouver' })
  await attr(C, 'string', 'gym_schedule', { size: 8, array: true })
  await attr(C, 'string', 'sleep_start', { size: 8, def: '00:00' })
  await attr(C, 'string', 'sleep_end', { size: 8, def: '08:00' })
  await attr(C, 'boolean', 'notifications_enabled', { xdefault: false })
  await attr(C, 'boolean', 'onboarded', { xdefault: true })
  await attr(C, 'string', 'preferences_json', { size: 4096 })
}

async function setupCalendarEvents() {
  const C = 'calendar_events'
  await createCollection(C, 'Calendar Events')
  await attr(C, 'string', 'user_id', { size: 36, required: true })
  await attr(C, 'string', 'type', { size: 32, required: true })
  await attr(C, 'string', 'title', { size: 256, required: true })
  await attr(C, 'string', 'subtitle', { size: 256 })
  await attr(C, 'string', 'start_date', { size: 32, required: true })
  await attr(C, 'string', 'end_date', { size: 32, required: true })
  await attr(C, 'boolean', 'all_day', { xdefault: false })
  await attr(C, 'string', 'color', { size: 32 })
  await attr(C, 'string', 'icon', { size: 16 })
  await attr(C, 'string', 'status', { size: 16, def: 'pending' })
  await attr(C, 'string', 'recurrence_rule', { size: 256 })
  await attr(C, 'string', 'project_id', { size: 36 })
  await attr(C, 'string', 'exercise_routine_id', { size: 36 })
  await attr(C, 'string', 'meal_template_id', { size: 36 })
  await attr(C, 'string', 'metadata_json', { size: 16384 })
  await attr(C, 'string', 'google_event_id', { size: 256 })
  await attr(C, 'boolean', 'pending_sync', { xdefault: false })
  // Indexes
  await sleep(2000) // wait for attributes to be ready
  await createIndex(C, 'idx_user_start', 'key', ['user_id', 'start_date'], ['ASC', 'ASC'])
  await createIndex(C, 'idx_user_type', 'key', ['user_id', 'type'], ['ASC', 'ASC'])
  await createIndex(C, 'idx_user_project', 'key', ['user_id', 'project_id'], ['ASC', 'ASC'])
}

async function setupProjects() {
  const C = 'projects'
  await createCollection(C, 'Projects')
  await attr(C, 'string', 'user_id', { size: 36, required: true })
  await attr(C, 'string', 'name', { size: 128, required: true })
  await attr(C, 'string', 'slug', { size: 64, required: true })
  await attr(C, 'string', 'icon', { size: 16 })
  await attr(C, 'string', 'state', { size: 32, def: 'backlog' })
  await attr(C, 'string', 'description', { size: 2048 })
  await attr(C, 'string', 'repo_path', { size: 512 })
  await attr(C, 'string', 'deadline', { size: 32 })
  await attr(C, 'string', 'created_at', { size: 32, required: true })
  await attr(C, 'string', 'metadata_json', { size: 4096 })
  await sleep(2000)
  await createIndex(C, 'idx_user', 'key', ['user_id'], ['ASC'])
  await createIndex(C, 'idx_user_state', 'key', ['user_id', 'state'], ['ASC', 'ASC'])
}

async function setupProjectTasks() {
  const C = 'project_tasks'
  await createCollection(C, 'Project Tasks')
  await attr(C, 'string', 'user_id', { size: 36, required: true })
  await attr(C, 'string', 'project_id', { size: 36, required: true })
  await attr(C, 'string', 'title', { size: 256, required: true })
  await attr(C, 'string', 'description', { size: 2048 })
  await attr(C, 'integer', 'weight', { min: 1, max: 10, xdefault: 5 })
  await attr(C, 'string', 'status', { size: 16, def: 'backlog' })
  await attr(C, 'string', 'category', { size: 64 })
  await attr(C, 'float', 'estimated_hours')
  await attr(C, 'float', 'actual_hours', { xdefault: 0 })
  await attr(C, 'string', 'completed_at', { size: 32 })
  await attr(C, 'string', 'created_at', { size: 32, required: true })
  await sleep(2000)
  await createIndex(C, 'idx_user_project', 'key', ['user_id', 'project_id'], ['ASC', 'ASC'])
  await createIndex(C, 'idx_project_status', 'key', ['project_id', 'status'], ['ASC', 'ASC'])
}

async function setupProjectSessions() {
  const C = 'project_sessions'
  await createCollection(C, 'Project Sessions')
  await attr(C, 'string', 'user_id', { size: 36, required: true })
  await attr(C, 'string', 'project_id', { size: 36, required: true })
  await attr(C, 'string', 'calendar_event_id', { size: 36 })
  await attr(C, 'string', 'start_time', { size: 32, required: true })
  await attr(C, 'string', 'end_time', { size: 32 })
  await attr(C, 'integer', 'duration_minutes', { required: true })
  await attr(C, 'string', 'notes', { size: 2048 })
  await attr(C, 'string', 'tasks_worked', { size: 36, array: true })
  await attr(C, 'string', 'git_commits_json', { size: 4096 })
  await sleep(2000)
  await createIndex(C, 'idx_user_project', 'key', ['user_id', 'project_id'], ['ASC', 'ASC'])
}

async function setupJobApplications() {
  const C = 'job_applications'
  await createCollection(C, 'Job Applications')
  await attr(C, 'string', 'user_id', { size: 36, required: true })
  await attr(C, 'string', 'company', { size: 128, required: true })
  await attr(C, 'string', 'role', { size: 256, required: true })
  await attr(C, 'string', 'url', { size: 512 })
  await attr(C, 'string', 'jd_text', { size: 16384 })
  await attr(C, 'string', 'status', { size: 32, def: 'saved' })
  await attr(C, 'string', 'applied_date', { size: 32 })
  await attr(C, 'string', 'salary_range', { size: 64 })
  await attr(C, 'string', 'location', { size: 128 })
  await attr(C, 'boolean', 'is_stem', { xdefault: false })
  await attr(C, 'string', 'notes', { size: 2048 })
  await attr(C, 'string', 'skill_gaps_json', { size: 4096 })
  await attr(C, 'string', 'created_at', { size: 32, required: true })
  await sleep(2000)
  await createIndex(C, 'idx_user', 'key', ['user_id'], ['ASC'])
  await createIndex(C, 'idx_user_status', 'key', ['user_id', 'status'], ['ASC', 'ASC'])
}

async function setupDietTemplates() {
  const C = 'diet_templates'
  await createCollection(C, 'Diet Templates')
  await attr(C, 'string', 'user_id', { size: 36, required: true })
  await attr(C, 'string', 'label', { size: 16, required: true })
  await attr(C, 'boolean', 'active', { xdefault: true })
  await attr(C, 'string', 'pdf_file_id', { size: 36 })
  await attr(C, 'string', 'parsed_data_json', { size: 1048576 })
  await attr(C, 'string', 'parsed_at', { size: 32 })
  await attr(C, 'integer', 'confidence')
  await sleep(2000)
  await createIndex(C, 'idx_user', 'key', ['user_id'], ['ASC'])
  await createIndex(C, 'idx_user_label', 'key', ['user_id', 'label'], ['ASC', 'ASC'])
}

async function setupDietInventory() {
  const C = 'diet_inventory'
  await createCollection(C, 'Diet Inventory')
  await attr(C, 'string', 'user_id', { size: 36, required: true })
  await attr(C, 'string', 'ingredient_name', { size: 128, required: true })
  await attr(C, 'string', 'category', { size: 32, required: true })
  await attr(C, 'float', 'quantity', { required: true })
  await attr(C, 'string', 'unit', { size: 16 })
  await attr(C, 'string', 'purchase_date', { size: 32 })
  await attr(C, 'string', 'expiry_date', { size: 32 })
  await attr(C, 'string', 'status', { size: 16, def: 'ok' })
  await sleep(2000)
  await createIndex(C, 'idx_user', 'key', ['user_id'], ['ASC'])
  await createIndex(C, 'idx_user_status', 'key', ['user_id', 'status'], ['ASC', 'ASC'])
}

async function setupDietShopping() {
  const C = 'diet_shopping'
  await createCollection(C, 'Diet Shopping')
  await attr(C, 'string', 'user_id', { size: 36, required: true })
  await attr(C, 'string', 'name', { size: 128, required: true })
  await attr(C, 'string', 'category', { size: 32 })
  await attr(C, 'float', 'quantity')
  await attr(C, 'string', 'unit', { size: 16 })
  await attr(C, 'boolean', 'checked', { xdefault: false })
  await attr(C, 'boolean', 'from_template', { xdefault: false })
  await attr(C, 'string', 'list_date', { size: 32 })
  await sleep(2000)
  await createIndex(C, 'idx_user', 'key', ['user_id'], ['ASC'])
}

async function setupExerciseRoutines() {
  const C = 'exercise_routines'
  await createCollection(C, 'Exercise Routines')
  await attr(C, 'string', 'user_id', { size: 36, required: true })
  await attr(C, 'string', 'name', { size: 128, required: true })
  await attr(C, 'integer', 'day_of_week', { required: true, min: 0, max: 6 })
  await attr(C, 'string', 'structure', { size: 32, required: true })
  await attr(C, 'string', 'exercises_json', { size: 16384, required: true })
  await attr(C, 'integer', 'duration_minutes', { xdefault: 90 })
  await sleep(2000)
  await createIndex(C, 'idx_user', 'key', ['user_id'], ['ASC'])
  await createIndex(C, 'idx_user_dow', 'key', ['user_id', 'day_of_week'], ['ASC', 'ASC'])
}

async function setupExerciseLogs() {
  const C = 'exercise_logs'
  await createCollection(C, 'Exercise Logs')
  await attr(C, 'string', 'user_id', { size: 36, required: true })
  await attr(C, 'string', 'routine_id', { size: 36, required: true })
  await attr(C, 'string', 'calendar_event_id', { size: 36 })
  await attr(C, 'string', 'date', { size: 32, required: true })
  await attr(C, 'string', 'exercises_done_json', { size: 16384, required: true })
  await attr(C, 'integer', 'duration_minutes')
  await attr(C, 'string', 'notes', { size: 1024 })
  await sleep(2000)
  await createIndex(C, 'idx_user_date', 'key', ['user_id', 'date'], ['ASC', 'DESC'])
  await createIndex(C, 'idx_user_routine', 'key', ['user_id', 'routine_id'], ['ASC', 'ASC'])
}

async function setupSleepLogs() {
  const C = 'sleep_logs'
  await createCollection(C, 'Sleep Logs')
  await attr(C, 'string', 'user_id', { size: 36, required: true })
  await attr(C, 'string', 'date', { size: 32, required: true })
  await attr(C, 'string', 'bedtime', { size: 32 })
  await attr(C, 'string', 'wake_time', { size: 32 })
  await attr(C, 'float', 'duration_hours')
  await attr(C, 'integer', 'quality', { min: 1, max: 5 })
  await attr(C, 'string', 'notes', { size: 512 })
  await sleep(2000)
  await createIndex(C, 'idx_user_date', 'key', ['user_id', 'date'], ['ASC', 'DESC'])
}

async function setupMoodLogs() {
  const C = 'mood_logs'
  await createCollection(C, 'Mood Logs')
  await attr(C, 'string', 'user_id', { size: 36, required: true })
  await attr(C, 'string', 'date', { size: 32, required: true })
  await attr(C, 'integer', 'mood', { required: true, min: 1, max: 10 })
  await attr(C, 'integer', 'energy', { min: 1, max: 10 })
  await attr(C, 'boolean', 'meditation_done', { xdefault: false })
  await attr(C, 'integer', 'meditation_minutes', { xdefault: 30 })
  await attr(C, 'string', 'notes', { size: 1024 })
  await sleep(2000)
  await createIndex(C, 'idx_user_date', 'key', ['user_id', 'date'], ['ASC', 'DESC'])
}

async function setupMedicationLogs() {
  const C = 'medication_logs'
  await createCollection(C, 'Medication Logs')
  await attr(C, 'string', 'user_id', { size: 36, required: true })
  await attr(C, 'string', 'medication_name', { size: 128, def: 'Anticoagulante' })
  await attr(C, 'string', 'dose_time', { size: 32, required: true })
  await attr(C, 'string', 'next_dose_due', { size: 32, required: true })
  await attr(C, 'boolean', 'taken', { xdefault: false })
  await attr(C, 'string', 'notes', { size: 512 })
  await sleep(2000)
  await createIndex(C, 'idx_user', 'key', ['user_id'], ['ASC'])
  await createIndex(C, 'idx_user_next', 'key', ['user_id', 'next_dose_due'], ['ASC', 'ASC'])
}

async function setupMindsetQuotes() {
  const C = 'mindset_quotes'
  await createCollection(C, 'Mindset Quotes')
  await attr(C, 'string', 'category', { size: 32, required: true })
  await attr(C, 'string', 'text', { size: 1024, required: true })
  await attr(C, 'string', 'author', { size: 128 })
  await attr(C, 'string', 'context', { size: 32, required: true })
  await sleep(2000)
  await createIndex(C, 'idx_category', 'key', ['category'], ['ASC'])
  await createIndex(C, 'idx_context', 'key', ['context'], ['ASC'])
}

async function setupCortanaConversations() {
  const C = 'cortana_conversations'
  await createCollection(C, 'Cortana Conversations')
  await attr(C, 'string', 'user_id', { size: 36, required: true })
  await attr(C, 'string', 'started_at', { size: 32, required: true })
  await attr(C, 'string', 'messages_json', { size: 1048576, required: true })
  await attr(C, 'string', 'context_snapshot_json', { size: 16384 })
  await sleep(2000)
  await createIndex(C, 'idx_user', 'key', ['user_id'], ['ASC'])
}

async function setupCortanaSuggestions() {
  const C = 'cortana_suggestions'
  await createCollection(C, 'Cortana Suggestions')
  await attr(C, 'string', 'user_id', { size: 36, required: true })
  await attr(C, 'string', 'conversation_id', { size: 36 })
  await attr(C, 'string', 'type', { size: 32, required: true })
  await attr(C, 'string', 'proposal_json', { size: 16384, required: true })
  await attr(C, 'string', 'status', { size: 16, def: 'pending' })
  await attr(C, 'string', 'created_at', { size: 32, required: true })
  await attr(C, 'string', 'resolved_at', { size: 32 })
  await sleep(2000)
  await createIndex(C, 'idx_user_status', 'key', ['user_id', 'status'], ['ASC', 'ASC'])
}

async function setupImmigrationGoals() {
  const C = 'immigration_goals'
  await createCollection(C, 'Immigration Goals')
  await attr(C, 'string', 'user_id', { size: 36, required: true })
  await attr(C, 'string', 'goal_type', { size: 64, def: 'PR' })
  await attr(C, 'string', 'status', { size: 32, def: 'in_progress' })
  await attr(C, 'string', 'target_date', { size: 32 })
  await attr(C, 'string', 'milestones_json', { size: 8192 })
  await attr(C, 'string', 'documents_json', { size: 4096 })
  await attr(C, 'string', 'notes', { size: 2048 })
  await attr(C, 'string', 'created_at', { size: 32, required: true })
  await attr(C, 'string', 'updated_at', { size: 32 })
  await sleep(2000)
  await createIndex(C, 'idx_user', 'key', ['user_id'], ['ASC'])
}

// ─── Seed: Mindset Quotes ────────────────────────────────────

async function seedMindsetQuotes() {
  console.log('\n📝 Seeding mindset quotes...')
  const quotes = [
    // Stoicism
    { category: 'stoicism', context: 'login', text: 'No es porque las cosas son dificiles que no nos atrevemos; es porque no nos atrevemos que son dificiles.', author: 'Seneca' },
    { category: 'stoicism', context: 'burnout', text: 'El impedimento a la accion avanza la accion. Lo que se interpone en el camino se convierte en el camino.', author: 'Marco Aurelio' },
    { category: 'stoicism', context: 'rejection', text: 'La suerte es lo que sucede cuando la preparacion se encuentra con la oportunidad.', author: 'Seneca' },
    { category: 'stoicism', context: 'login', text: 'No desees que las cosas sean mas faciles, desea ser mejor.', author: 'Epicteto' },
    { category: 'stoicism', context: 'burnout', text: 'Concentra cada minuto en hacer lo que esta frente a ti con seriedad precisa y genuina.', author: 'Marco Aurelio' },
    // Empowerment
    { category: 'empowerment', context: 'login', text: 'No estas aqui para sobrevivir. Estas aqui para dominar tu propio juego.', author: 'Gibran OS' },
    { category: 'empowerment', context: 'rejection', text: 'Cada rechazo es un filtro. Te esta acercando al equipo que realmente te merece.', author: 'Gibran OS' },
    { category: 'empowerment', context: 'login', text: 'Senior Engineer no es un titulo. Es una mentalidad. Actua como si ya lo fueras.', author: 'Gibran OS' },
    { category: 'empowerment', context: 'burnout', text: 'Hoy no se trata de motivacion. Se trata de disciplina. Muevete aunque no quieras.', author: 'Gibran OS' },
    { category: 'empowerment', context: 'rejection', text: 'Tu portafolio habla mas fuerte que cualquier CV. Sigue construyendo, cabron.', author: 'Gibran OS' },
    // Reflection / Post-meditation
    { category: 'reflection', context: 'post_meditation', text: 'La mente descansada resuelve en 5 minutos lo que la mente agotada no resuelve en 5 horas.', author: 'Gibran OS' },
    { category: 'reflection', context: 'post_meditation', text: 'Acabas de invertir 30 minutos en tu arma mas poderosa: tu claridad mental.', author: 'Gibran OS' },
    { category: 'reflection', context: 'post_meditation', text: 'No meditas para escapar del ruido. Meditas para volver al ruido con mas poder.', author: 'Gibran OS' },
    // Technical / Growth
    { category: 'technical', context: 'login', text: 'El codigo que escribes hoy es la demo que te abrira la puerta manana.', author: 'Gibran OS' },
    { category: 'technical', context: 'login', text: 'Cada commit es un paso mas hacia donde quieres estar. No pares.', author: 'Gibran OS' },
    { category: 'technical', context: 'rejection', text: 'No te rechazaron por malo. Te rechazaron porque aun no conocen lo que estas construyendo.', author: 'Gibran OS' },
  ]

  for (const q of quotes) {
    try {
      await db.createDocument(DATABASE_ID, 'mindset_quotes', ID.unique(), q)
    } catch (e) {
      if (e.code === 409) continue
      console.error(`  ⚠️  Failed to seed quote: ${e.message}`)
    }
    await sleep(150)
  }
  console.log(`  ✅ ${quotes.length} quotes seeded`)
}

// ─── Main ────────────────────────────────────────────────────

async function main() {
  console.log('🚀 Gibran OS — Appwrite Setup')
  console.log(`   Endpoint: ${ENDPOINT}`)
  console.log(`   Project:  ${PROJECT}`)
  console.log('')

  // 1. Create database
  await createDB()
  console.log('')

  // 2. Create all 18 collections
  console.log('📦 Creating collections...')
  await setupUsers()
  await setupCalendarEvents()
  await setupProjects()
  await setupProjectTasks()
  await setupProjectSessions()
  await setupJobApplications()
  await setupDietTemplates()
  await setupDietInventory()
  await setupDietShopping()
  await setupExerciseRoutines()
  await setupExerciseLogs()
  await setupSleepLogs()
  await setupMoodLogs()
  await setupMedicationLogs()
  await setupMindsetQuotes()
  await setupCortanaConversations()
  await setupCortanaSuggestions()
  await setupImmigrationGoals()

  // 3. Seed data
  await seedMindsetQuotes()

  console.log('\n🎉 Setup complete! 18 collections created with attributes and indexes.')
  console.log('   Database: gibran_os')
  console.log('   Ready for Sprint 1 verification.\n')
}

main().catch((e) => {
  console.error('\n❌ Setup failed:', e.message)
  if (e.response) console.error('   Response:', JSON.stringify(e.response, null, 2))
  process.exit(1)
})
