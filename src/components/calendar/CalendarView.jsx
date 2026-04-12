import { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import listPlugin from '@fullcalendar/list'
import interactionPlugin from '@fullcalendar/interaction'
import useCalendarEventStore from '../../store/calendarEventStore'
import useUIStore from '../../store/uiStore'
import { toFullCalendarEvent, fromFullCalendarDrop } from '../../lib/calendarAdapter'
import { TZ } from '../../lib/dateUtils'
import CalendarEventPopup from './CalendarEventPopup'
import '../../styles/fullcalendar-overrides.css'

function useIsMobile() {
  const [mobile, setMobile] = useState(window.innerWidth <= 768)
  useEffect(() => {
    const handler = () => setMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return mobile
}

export default function CalendarView() {
  const calendarRef = useRef(null)
  const isMobile = useIsMobile()
  const events = useCalendarEventStore((s) => s.events)
  const moveEvent = useCalendarEventStore((s) => s.moveEvent)
  const resizeEvent = useCalendarEventStore((s) => s.resizeEvent)
  const openModal = useUIStore((s) => s.openModal)

  const [popupEvent, setPopupEvent] = useState(null)

  // Convert store events to FullCalendar format — memoized to prevent infinite re-renders
  const fcEvents = useMemo(() => events.map(toFullCalendarEvent), [events])

  // Drag & drop handler
  const handleEventDrop = useCallback((info) => {
    const patch = fromFullCalendarDrop(info)
    moveEvent(info.event.id, patch.startDate, patch.endDate)
  }, [moveEvent])

  // Resize handler
  const handleEventResize = useCallback((info) => {
    const newEnd = info.event.end ? info.event.end.toISOString() : info.event.start.toISOString()
    resizeEvent(info.event.id, newEnd)
  }, [resizeEvent])

  // Click handler — open popup
  const handleEventClick = useCallback((info) => {
    info.jsEvent.preventDefault()
    const original = info.event.extendedProps.originalEvent
    setPopupEvent(original)
  }, [])

  // Click on empty slot — create new event
  const handleDateSelect = useCallback((info) => {
    openModal('createEvent', {
      startDate: info.start.toISOString(),
      endDate: info.end.toISOString(),
      allDay: info.allDay,
    })
  }, [openModal])

  // Custom event content renderer
  const renderEventContent = useCallback((eventInfo) => {
    const { icon, status, subtitle } = eventInfo.event.extendedProps
    const isShort = eventInfo.event.end && eventInfo.event.start &&
      (eventInfo.event.end - eventInfo.event.start) < 45 * 60 * 1000 // < 45 min

    return (
      <div style={{
        padding: '1px 2px',
        overflow: 'hidden',
        lineHeight: 1.3,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: isShort ? 0 : 2,
      }}>
        <div style={{
          fontFamily: 'var(--sans)',
          fontWeight: 600,
          fontSize: isShort ? '0.65rem' : '0.73rem',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {eventInfo.event.title}
        </div>
        {!isShort && subtitle && (
          <div style={{
            fontFamily: 'var(--mono)',
            fontSize: '0.55rem',
            opacity: 0.7,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {subtitle}
          </div>
        )}
        {!isShort && status === 'active' && (
          <div style={{
            fontFamily: 'var(--mono)',
            fontSize: '0.55rem',
            color: 'var(--teal)',
            fontWeight: 700,
          }}>
            ▶ EN CURSO
          </div>
        )}
      </div>
    )
  }, [])

  return (
    <div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
        initialView={isMobile ? 'listWeek' : 'timeGridWeek'}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: isMobile
            ? 'listWeek,listDay'
            : 'timeGridWeek,timeGridDay,dayGridMonth',
        }}
        events={fcEvents}
        editable={true}
        selectable={true}
        selectMirror={true}
        droppable={true}
        eventDrop={handleEventDrop}
        eventResize={handleEventResize}
        eventClick={handleEventClick}
        select={handleDateSelect}
        eventContent={renderEventContent}
        locale="es"
        timeZone={TZ}
        nowIndicator={true}
        allDaySlot={false}
        slotMinTime="06:00:00"
        slotMaxTime="01:00:00"
        slotDuration="00:30:00"
        slotLabelInterval="01:00:00"
        expandRows={true}
        dayMaxEvents={true}
        weekends={true}
        firstDay={1}
        height="calc(100vh - 120px)"
        stickyHeaderDates={true}
        eventMaxStack={3}
        scrollTime="08:00:00"
        businessHours={{
          daysOfWeek: [1, 2, 3, 4, 5, 6],
          startTime: '08:00',
          endTime: '22:00',
        }}
      />

      {popupEvent && (
        <CalendarEventPopup
          event={popupEvent}
          onClose={() => setPopupEvent(null)}
        />
      )}
    </div>
  )
}
