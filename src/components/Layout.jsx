import useUIStore from '../store/uiStore'
import Header from './Header'
import CalendarView from './calendar/CalendarView'
import CortanaSidebar from './cortana/CortanaSidebar'

export default function Layout() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen)
  const closeSidebar = useUIStore((s) => s.closeSidebar)

  return (
    <div style={styles.container}>
      {/* Cortana Sidebar */}
      {sidebarOpen && (
        <CortanaSidebar onClose={closeSidebar} />
      )}

      {/* Main content */}
      <div style={styles.main}>
        <Header />
        <div style={styles.calendarWrapper}>
          <CalendarView />
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: {
    display: 'flex',
    minHeight: '100dvh',
    background: 'var(--bg)',
    position: 'relative',
    zIndex: 1,
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    overflow: 'hidden',
  },
  calendarWrapper: {
    flex: 1,
    padding: '0 12px 12px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
}
