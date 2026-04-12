import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createSyncActions } from '../lib/syncEngine'
import { COLLECTIONS, EVENT_STATUS } from '../lib/appwriteCollections'
import { Query } from '../lib/appwrite'
import { durationMinutes } from '../lib/dateUtils'

/**
 * Maps an Appwrite document to local event shape.
 */
function mapFromDoc(doc) {
  return {
    id: doc.$id,
    userId: doc.user_id,
    type: doc.type,
    title: doc.title,
    subtitle: doc.subtitle || '',
    startDate: doc.start_date,
    endDate: doc.end_date,
    allDay: doc.all_day || false,
    color: doc.color || '',
    icon: doc.icon || '',
    status: doc.status || EVENT_STATUS.PENDING,
    recurrenceRule: doc.recurrence_rule || '',
    projectId: doc.project_id || null,
    exerciseRoutineId: doc.exercise_routine_id || null,
    mealTemplateId: doc.meal_template_id || null,
    metadata: doc.metadata_json ? JSON.parse(doc.metadata_json) : {},
    googleEventId: doc.google_event_id || null,
    pendingSync: doc.pending_sync || false,
    // Timer fields (stored in metadata)
    timerStart: null,
    timerEnd: null,
  }
}

/**
 * Maps local event fields to Appwrite document fields.
 * Only includes fields that are present in the input (for partial updates).
 */
function mapToDoc(data) {
  const doc = {}
  if (data.userId !== undefined) doc.user_id = data.userId
  if (data.type !== undefined) doc.type = data.type
  if (data.title !== undefined) doc.title = data.title
  if (data.subtitle !== undefined) doc.subtitle = data.subtitle
  if (data.startDate !== undefined) doc.start_date = data.startDate
  if (data.endDate !== undefined) doc.end_date = data.endDate
  if (data.allDay !== undefined) doc.all_day = data.allDay
  if (data.color !== undefined) doc.color = data.color
  if (data.icon !== undefined) doc.icon = data.icon
  if (data.status !== undefined) doc.status = data.status
  if (data.recurrenceRule !== undefined) doc.recurrence_rule = data.recurrenceRule
  if (data.projectId !== undefined) doc.project_id = data.projectId
  if (data.exerciseRoutineId !== undefined) doc.exercise_routine_id = data.exerciseRoutineId
  if (data.mealTemplateId !== undefined) doc.meal_template_id = data.mealTemplateId
  if (data.metadata !== undefined) doc.metadata_json = JSON.stringify(data.metadata)
  if (data.googleEventId !== undefined) doc.google_event_id = data.googleEventId
  if (data.pendingSync !== undefined) doc.pending_sync = data.pendingSync
  return doc
}

const syncActions = createSyncActions({
  collectionId: COLLECTIONS.CALENDAR_EVENTS,
  stateKey: 'events',
  mapFromDoc,
  mapToDoc,
  buildQueries: (userId) => [
    Query.equal('user_id', userId),
    Query.limit(5000),
    Query.orderAsc('start_date'),
  ],
})

const useCalendarEventStore = create(
  persist(
    (set, get) => ({
      events: [],
      activeEventId: null,

      // Sync actions from engine
      ...syncActions(set, get),

      // ─── Event CRUD ──────────────────────────────────────────

      async addEvent(eventData) {
        return get().createDocument(eventData)
      },

      async patchEvent(eventId, patch) {
        return get().updateDocument(eventId, patch)
      },

      async removeEvent(eventId) {
        return get().deleteDocument(eventId)
      },

      /**
       * Move event to new time (from drag-drop).
       * Updates start_date and end_date preserving duration.
       */
      async moveEvent(eventId, newStartDate, newEndDate) {
        return get().updateDocument(eventId, {
          startDate: newStartDate,
          endDate: newEndDate,
        })
      },

      /**
       * Resize event (change end time only, from drag resize).
       */
      async resizeEvent(eventId, newEndDate) {
        return get().updateDocument(eventId, { endDate: newEndDate })
      },

      // ─── Timer / Status ──────────────────────────────────────

      async startEvent(eventId) {
        const now = Date.now()
        const event = get().events.find((e) => e.id === eventId)
        if (!event) return

        const duration = durationMinutes(event.startDate, event.endDate)
        const timerEnd = now + duration * 60 * 1000

        set({ activeEventId: eventId })
        return get().updateDocument(eventId, {
          status: EVENT_STATUS.ACTIVE,
          metadata: { ...event.metadata, timerStart: now, timerEnd },
        })
      },

      async completeEvent(eventId) {
        const event = get().events.find((e) => e.id === eventId)
        if (!event) return

        const timerStart = event.metadata?.timerStart
        const actualDuration = timerStart
          ? Math.round((Date.now() - timerStart) / 60000)
          : null

        set({ activeEventId: null })
        return get().updateDocument(eventId, {
          status: EVENT_STATUS.DONE,
          metadata: { ...event.metadata, actualDuration },
        })
      },

      async skipEvent(eventId) {
        if (get().activeEventId === eventId) set({ activeEventId: null })
        return get().updateDocument(eventId, { status: EVENT_STATUS.SKIPPED })
      },

      // ─── Queries ─────────────────────────────────────────────

      getEventsForDay(dateStr) {
        return get().events.filter((e) => {
          const start = e.startDate.slice(0, 10)
          return start === dateStr
        })
      },

      getEventsForRange(startISO, endISO) {
        return get().events.filter(
          (e) => e.startDate >= startISO && e.startDate <= endISO
        )
      },

      getEventsByType(type) {
        return get().events.filter((e) => e.type === type)
      },

      getActiveEvent() {
        const id = get().activeEventId
        if (!id) return null
        return get().events.find((e) => e.id === id) || null
      },
    }),
    {
      name: 'gibran-os-calendar-v2',
      partialize: (state) => ({
        events: state.events,
        activeEventId: state.activeEventId,
      }),
    }
  )
)

export default useCalendarEventStore
