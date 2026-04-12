import useUIStore from '../store/uiStore'
import Header from './Header'
import CalendarView from './calendar/CalendarView'

export default function Layout() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen)

  return (
    <div style={styles.container}>
      {/* Cortana Sidebar — placeholder until Sprint 3 */}
      {sidebarOpen && (
        <aside style={styles.sidebar}>
          <div style={styles.sidebarHeader}>
            <span style={styles.sidebarTitle}>CORTANA</span>
            <span style={styles.sidebarStatus}>
              <span style={styles.statusDot} /> Offline
            </span>
          </div>
          <div style={styles.sidebarBody}>
            <p style={styles.sidebarPlaceholder}>
              Cortana estara disponible en Sprint 3.
              <br /><br />
              Conectara con Gemma via Ollama para ser tu secretaria inteligente.
            </p>
          </div>
        </aside>
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
  sidebar: {
    width: '300px',
    minWidth: '300px',
    background: 'var(--bg2)',
    borderRight: '1px solid var(--border-mid)',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    zIndex: 30,
    // Mobile: overlay
    '@media (max-width: 768px)': {
      position: 'fixed',
      inset: 0,
      width: '85vw',
    },
  },
  sidebarHeader: {
    padding: '16px',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sidebarTitle: {
    fontFamily: 'var(--mono)',
    fontSize: '0.7rem',
    fontWeight: 700,
    color: 'var(--teal)',
    letterSpacing: '3px',
  },
  sidebarStatus: {
    fontFamily: 'var(--mono)',
    fontSize: '0.6rem',
    color: 'var(--text-dim)',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  statusDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: 'var(--text-dim)',
  },
  sidebarBody: {
    flex: 1,
    padding: '20px 16px',
    overflow: 'auto',
  },
  sidebarPlaceholder: {
    fontFamily: 'var(--sans)',
    fontSize: '0.85rem',
    color: 'var(--text-dim)',
    lineHeight: 1.6,
    textAlign: 'center',
    padding: '40px 0',
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
