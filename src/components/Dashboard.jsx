import useStore from '../store/index'
import TabToday from './TabToday'
import TabWeekly from './TabWeekly'
import TabProjects from './TabProjects'
import CheckInModal from './CheckInModal'
import { formatDate, getTodayDow } from '../utils/date'
import { useEffect } from 'react'
import { scheduleNotificationsForToday } from '../utils/notifications'

const TABS = [
  { id: 'today',    label: 'Hoy',       icon: '⚡' },
  { id: 'weekly',   label: 'Semana',    icon: '📊' },
  { id: 'projects', label: 'Proyectos', icon: '🚀' },
]

export default function Dashboard() {
  const activeTab  = useStore((s) => s.activeTab)
  const modal      = useStore((s) => s.modal)
  const setTab     = useStore((s) => s.setTab)
  const openModal  = useStore((s) => s.openModal)
  const user       = useStore((s) => s.user)
  const getTodayLog = useStore((s) => s.getTodayLog)

  const log = getTodayLog()
  const dow = getTodayDow()

  // Schedule notifications once per day on mount
  useEffect(() => {
    if (user.notificationsEnabled) {
      scheduleNotificationsForToday()
    }
  }, [])

  const dateLabel = formatDate()

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
      {/* ── HEADER ── */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        background: 'rgba(10, 12, 15, 0.92)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)',
        paddingTop: 'env(safe-area-inset-top)',
      }}>
        <div style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: 'var(--display)', fontSize: 18, fontWeight: 800, color: 'var(--teal)', letterSpacing: '-0.02em' }}>
              Gibran OS
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-dim)', marginTop: 1 }}>
              {dateLabel}
            </div>
          </div>

          {/* Energy pill */}
          <button
            onClick={() => openModal('checkin')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'var(--bg3)',
              border: '1px solid var(--border-mid)',
              borderRadius: 20,
              padding: '6px 12px',
              cursor: 'pointer',
              transition: 'var(--transition)',
            }}
          >
            <span style={{ fontSize: 14 }}>🔋</span>
            <span style={{
              fontFamily: 'var(--mono)',
              fontSize: 14,
              fontWeight: 700,
              color: log.energy >= 7 ? 'var(--green)' : log.energy >= 4 ? 'var(--orange)' : 'var(--red)',
            }}>
              {log.energy}
            </span>
            {log.checkinDone && <span style={{ fontSize: 12 }}>✓</span>}
          </button>
        </div>

        {/* Tab nav */}
        <div style={{ display: 'flex', padding: '0 16px 0', gap: 4 }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                flex: 1,
                padding: '8px 4px',
                background: 'none',
                border: 'none',
                borderBottom: `2px solid ${activeTab === t.id ? 'var(--teal)' : 'transparent'}`,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                transition: 'var(--transition)',
                color: activeTab === t.id ? 'var(--teal)' : 'var(--text-dim)',
                fontFamily: 'var(--sans)',
                fontWeight: activeTab === t.id ? 600 : 400,
                fontSize: 13,
              }}
            >
              <span style={{ fontSize: 14 }}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </header>

      {/* ── CONTENT ── */}
      <main style={{ flex: 1, padding: '16px 16px 0', maxWidth: 600, width: '100%', margin: '0 auto' }}>
        {activeTab === 'today'    && <TabToday />}
        {activeTab === 'weekly'   && <TabWeekly />}
        {activeTab === 'projects' && <TabProjects />}
      </main>

      {/* ── FAB ── */}
      <button className="fab" onClick={() => openModal('checkin')} aria-label="Check-in">
        ✍️
      </button>

      {/* ── MODALS ── */}
      {modal === 'checkin' && <CheckInModal />}
    </div>
  )
}
