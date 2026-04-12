/**
 * Calendar Adapter — converts between Appwrite calendar events and FullCalendar events.
 */
import { EVENT_TYPES, EVENT_STATUS } from './appwriteCollections'

// Color map: event type -> CSS variable for background and border
const TYPE_COLORS = {
  [EVENT_TYPES.PROJECT_BLOCK]: { bg: 'var(--teal-dim)', border: 'var(--teal)', text: 'var(--teal)' },
  [EVENT_TYPES.GYM]:           { bg: 'var(--orange-dim)', border: 'var(--orange)', text: 'var(--orange)' },
  [EVENT_TYPES.MEAL]:          { bg: 'var(--green-dim)', border: 'var(--green)', text: 'var(--green)' },
  [EVENT_TYPES.MEDITATION]:    { bg: 'var(--purple-dim)', border: 'var(--purple)', text: 'var(--purple)' },
  [EVENT_TYPES.SLEEP]:         { bg: 'var(--indigo-dim)', border: 'var(--indigo)', text: 'var(--indigo)' },
  [EVENT_TYPES.RELAX]:         { bg: 'var(--pink-dim)', border: 'var(--pink)', text: 'var(--pink)' },
  [EVENT_TYPES.MEDICATION]:    { bg: 'var(--red-dim)', border: 'var(--red)', text: 'var(--red)' },
  [EVENT_TYPES.READING]:       { bg: 'var(--yellow-dim)', border: 'var(--yellow)', text: 'var(--yellow)' },
  [EVENT_TYPES.OUTDOOR]:       { bg: 'var(--lime-dim)', border: 'var(--lime)', text: 'var(--lime)' },
  [EVENT_TYPES.MEALPREP]:      { bg: 'var(--green-dim)', border: 'var(--green)', text: 'var(--green)' },
  [EVENT_TYPES.CUSTOM]:        { bg: 'var(--yellow-dim)', border: 'var(--yellow)', text: 'var(--yellow)' },
}

const TYPE_ICONS = {
  [EVENT_TYPES.PROJECT_BLOCK]: '🎯',
  [EVENT_TYPES.GYM]:           '🏋️',
  [EVENT_TYPES.MEAL]:          '🍽️',
  [EVENT_TYPES.MEDITATION]:    '🧘',
  [EVENT_TYPES.SLEEP]:         '🌙',
  [EVENT_TYPES.RELAX]:         '🎮',
  [EVENT_TYPES.MEDICATION]:    '💊',
  [EVENT_TYPES.READING]:       '📖',
  [EVENT_TYPES.OUTDOOR]:       '🌿',
  [EVENT_TYPES.MEALPREP]:      '🥗',
  [EVENT_TYPES.CUSTOM]:        '📌',
}

/**
 * Convert a store event (from calendarEventStore) to a FullCalendar event object.
 */
export function toFullCalendarEvent(event) {
  const colors = TYPE_COLORS[event.type] || TYPE_COLORS[EVENT_TYPES.CUSTOM]
  const icon = event.icon || TYPE_ICONS[event.type] || '📌'

  // Build CSS class list for status + type styling
  const classNames = [`event-type-${event.type}`]
  if (event.status === EVENT_STATUS.DONE) classNames.push('event-done')
  if (event.status === EVENT_STATUS.ACTIVE) classNames.push('event-active')
  if (event.status === EVENT_STATUS.SKIPPED) classNames.push('event-skipped')

  return {
    id: event.id,
    title: `${icon} ${event.title}`,
    start: event.startDate,
    end: event.endDate,
    allDay: event.allDay || false,
    backgroundColor: colors.bg,
    borderColor: colors.border,
    textColor: colors.text,
    classNames,
    editable: event.status !== EVENT_STATUS.ACTIVE, // can't drag active events
    extendedProps: {
      type: event.type,
      icon,
      status: event.status,
      subtitle: event.subtitle,
      projectId: event.projectId,
      exerciseRoutineId: event.exerciseRoutineId,
      mealTemplateId: event.mealTemplateId,
      metadata: event.metadata,
      originalEvent: event,
    },
  }
}

/**
 * Convert a FullCalendar eventDrop/eventResize info back to store patch.
 */
export function fromFullCalendarDrop(info) {
  return {
    startDate: info.event.start.toISOString(),
    endDate: info.event.end ? info.event.end.toISOString() : info.event.start.toISOString(),
  }
}

/**
 * Get display label for event type.
 */
export function getTypeLabel(type) {
  const labels = {
    [EVENT_TYPES.PROJECT_BLOCK]: 'Proyecto',
    [EVENT_TYPES.GYM]: 'Gym',
    [EVENT_TYPES.MEAL]: 'Comida',
    [EVENT_TYPES.MEDITATION]: 'Meditacion',
    [EVENT_TYPES.SLEEP]: 'Sueno',
    [EVENT_TYPES.RELAX]: 'Relax',
    [EVENT_TYPES.MEDICATION]: 'Medicamento',
    [EVENT_TYPES.READING]: 'Lectura',
    [EVENT_TYPES.OUTDOOR]: 'Aire libre',
    [EVENT_TYPES.MEALPREP]: 'Meal Prep',
    [EVENT_TYPES.CUSTOM]: 'Custom',
  }
  return labels[type] || type
}

export { TYPE_COLORS, TYPE_ICONS }
