import useAuthStore from '../store/authStore'
import useUIStore from '../store/uiStore'
import { formatDateFull, getCircadianInsight } from '../lib/dateUtils'

export default function Header() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)
  const sidebarOpen = useUIStore((s) => s.sidebarOpen)

  const circadian = getCircadianInsight()
  const today = formatDateFull(new Date())

  return (
    <header style={styles.header}>
      <div style={styles.left}>
        {/* Cortana toggle */}
        <button
          style={styles.sidebarToggle}
          onClick={toggleSidebar}
          title={sidebarOpen ? 'Cerrar Cortana' : 'Abrir Cortana'}
        >
          {sidebarOpen ? '◀' : '🤖'}
        </button>

        <div>
          <h1 style={styles.title}>GIBRAN OS</h1>
          <p style={styles.date}>{today}</p>
        </div>
      </div>

      <div style={styles.right}>
        {/* Circadian insight pill */}
        <div style={{ ...styles.pill, borderColor: circadian.color }}>
          <span style={{ ...styles.pillDot, background: circadian.color }} />
          <span style={styles.pillLabel}>{circadian.label}</span>
        </div>

        {/* User avatar */}
        {user && (
          <button style={styles.avatar} onClick={logout} title="Cerrar sesion">
            {user.name?.charAt(0)?.toUpperCase() || 'G'}
          </button>
        )}
      </div>
    </header>
  )
}

const styles = {
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 'calc(12px + env(safe-area-inset-top, 0px)) 16px 12px',
    background: 'var(--bg)',
    borderBottom: '1px solid var(--border)',
    position: 'sticky',
    top: 0,
    zIndex: 20,
    backdropFilter: 'blur(12px)',
    gap: '12px',
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  sidebarToggle: {
    background: 'var(--bg3)',
    border: '1px solid var(--border-mid)',
    borderRadius: '10px',
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.1rem',
    cursor: 'pointer',
    transition: 'all 0.18s ease',
    color: 'var(--text-mid)',
  },
  title: {
    fontFamily: 'var(--display)',
    fontSize: '1.1rem',
    fontWeight: 800,
    color: 'var(--teal)',
    margin: 0,
    letterSpacing: '2px',
  },
  date: {
    fontFamily: 'var(--mono)',
    fontSize: '0.6rem',
    color: 'var(--text-dim)',
    margin: 0,
    textTransform: 'capitalize',
    letterSpacing: '0.5px',
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  pill: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    borderRadius: '20px',
    border: '1px solid',
    background: 'var(--bg2)',
  },
  pillDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  pillLabel: {
    fontFamily: 'var(--mono)',
    fontSize: '0.55rem',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    color: 'var(--text-mid)',
    whiteSpace: 'nowrap',
  },
  avatar: {
    width: '34px',
    height: '34px',
    borderRadius: '50%',
    background: 'var(--teal-dim)',
    border: '1px solid var(--teal-glow)',
    color: 'var(--teal)',
    fontFamily: 'var(--display)',
    fontSize: '0.9rem',
    fontWeight: 800,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.18s ease',
  },
}
