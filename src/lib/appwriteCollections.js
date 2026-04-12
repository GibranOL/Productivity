/**
 * Appwrite Database & Collection IDs
 * All collection IDs match the schema defined in the plan.
 */

export const DATABASE_ID = 'gibran_os'

export const COLLECTIONS = {
  USERS: 'users',
  CALENDAR_EVENTS: 'calendar_events',
  PROJECTS: 'projects',
  PROJECT_TASKS: 'project_tasks',
  PROJECT_SESSIONS: 'project_sessions',
  JOB_APPLICATIONS: 'job_applications',
  DIET_TEMPLATES: 'diet_templates',
  DIET_INVENTORY: 'diet_inventory',
  DIET_SHOPPING: 'diet_shopping',
  EXERCISE_ROUTINES: 'exercise_routines',
  EXERCISE_LOGS: 'exercise_logs',
  SLEEP_LOGS: 'sleep_logs',
  MOOD_LOGS: 'mood_logs',
  MEDICATION_LOGS: 'medication_logs',
  MINDSET_QUOTES: 'mindset_quotes',
  CORTANA_CONVERSATIONS: 'cortana_conversations',
  CORTANA_SUGGESTIONS: 'cortana_suggestions',
}

// Calendar event types
export const EVENT_TYPES = {
  PROJECT_BLOCK: 'project_block',
  GYM: 'gym',
  MEAL: 'meal',
  MEDITATION: 'meditation',
  SLEEP: 'sleep',
  RELAX: 'relax',
  READING: 'reading',
  OUTDOOR: 'outdoor',
  MEALPREP: 'mealprep',
  MEDICATION: 'medication',
  CUSTOM: 'custom',
}

// Calendar event statuses
export const EVENT_STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  DONE: 'done',
  SKIPPED: 'skipped',
  EXTENDED: 'extended',
}

// Project states (Jira-like flow)
export const PROJECT_STATES = {
  BACKLOG: 'backlog',
  IN_PROGRESS: 'in_progress',
  MVP_DONE: 'mvp_done',
  SCALING: 'scaling',
  MAINTENANCE: 'maintenance',
}

// Project task statuses
export const TASK_STATUS = {
  BACKLOG: 'backlog',
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  DONE: 'done',
}

// Job application statuses
export const JOB_STATUS = {
  SAVED: 'saved',
  APPLIED: 'applied',
  PHONE_SCREEN: 'phone_screen',
  TECHNICAL: 'technical',
  ONSITE: 'onsite',
  OFFER: 'offer',
  REJECTED: 'rejected',
  WITHDRAWN: 'withdrawn',
}

// Inventory statuses
export const INVENTORY_STATUS = {
  OK: 'ok',
  EXPIRING_SOON: 'expiring_soon',
  USE_NEXT: 'use_next',
  EXPIRED: 'expired',
  OUT_OF_STOCK: 'out_of_stock',
}

// Cortana suggestion statuses
export const SUGGESTION_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
}

// Mindset quote contexts
export const QUOTE_CONTEXTS = {
  LOGIN: 'login',
  POST_MEDITATION: 'post_meditation',
  BURNOUT: 'burnout',
  REJECTION: 'rejection',
}
