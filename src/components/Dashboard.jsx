import { useState, useEffect } from 'react'
import useStore from '../store/index'
import TabToday from './TabToday'
import TabWeekly from './TabWeekly'
import TabProjects from './TabProjects'
import Scheduler from './Scheduler'
import TabDiet from './diet/TabDiet'
import TabHealth from './health/TabHealth'
import TabAnalytics from './TabAnalytics'
import AIAssistant from './AIAssistant'
import CheckInModal from './CheckInModal'
import ActiveBlockTimer from './ActiveBlockTimer'
import BlockTransitionModal from './BlockTransitionModal'
import { formatDate, getTodayDow, getDayKey } from '../utils/date'
import { defaultDayLog } from '../store/index'
import { scheduleNotificationsForToday } from '../utils/notifications'

// En móvil solo icon; en desktop icon + label
const TABS = [
  { id: 'today',     label: 'Hoy',       icon: '⚡' },
  { id: 'weekly',    label: 'Semana',    icon: '📅' },
  { id: 'scheduler', label: 'Scheduler', icon: '🗓' },
  { id: 'projects',  label: 'Proyectos', icon: '🚀' },
  { id: 'health',    label: 'Salud',     icon: '💪' },
  { id: 'diet',      label: 'Dieta',     icon: '🥗' },
  { id: 'analytics', label: 'Analytics', icon: '📊' },
]

export default function Dashboard() {
  const activeTab = useStore((s) => s.activeTab)
  const modal     = useStore((s) => s.modal)
  const setTab    = useStore((s) => s.setTab)
  const openModal = useStore((s) => s.openModal)
  const user      = useStore((s) => s.user)
  // Reactive subscription to today's log — header pill updates instantly
  const log = useStore((s) => s.logs[getDayKey()] || defaultDayLog())

  const [transitionBlock, setTransitionBlock] = useState(null)
  const [showAI, setShowAI] = useState(false)

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
        <div style={{ display: 'flex', padding: '0 8px', gap: 2, overflowX: 'auto' }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                flex: '0 0 auto',
                padding: '8px 10px',
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
                fontSize: 12,
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ fontSize: 15 }}>{t.icon}</span>
              <span className="tab-label">{t.label}</span>
            </button>
          ))}
        </div>
      </header>

      {/* ── ACTIVE BLOCK TIMER BAR ── */}
      <ActiveBlockTimer onBlockEnded={(block) => setTransitionBlock(block)} />

      {/* ── CONTENT ── */}
      <main style={{ flex: 1, padding: '16px 16px 0', maxWidth: 600, width: '100%', margin: '0 auto' }}>
        {activeTab === 'today'     && <TabToday />}
        {activeTab === 'weekly'    && <TabWeekly />}
        {activeTab === 'scheduler' && <Scheduler />}
        {activeTab === 'projects'  && <TabProjects />}
        {activeTab === 'health'    && <TabHealth />}
        {activeTab === 'diet'      && <TabDiet />}
        {activeTab === 'analytics' && <TabAnalytics />}
      </main>

      {/* ── FABs ── */}
      {/* AI FAB — secundario, encima del check-in */}
      <button
        onClick={() => setShowAI(true)}
        aria-label="Asistente AI"
        style={{
          position: 'fixed',
          bottom: 'calc(76px + env(safe-area-inset-bottom))',
          right: 20,
          width: 46,
          height: 46,
          borderRadius: '50%',
          background: 'var(--bg3)',
          border: '1px solid var(--border-bright)',
          boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
          cursor: 'pointer',
          fontSize: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 30,
          transition: 'var(--transition)',
        }}
      >
        🤖
      </button>
      {/* Check-in FAB */}
      <button className="fab" onClick={() => openModal('checkin')} aria-label="Check-in">
        ✍️
      </button>

      {/* ── MODALS ── */}
      {modal === 'checkin' && <CheckInModal />}
      {showAI && <AIAssistant onClose={() => setShowAI(false)} />}
      {transitionBlock && (
        <BlockTransitionModal
          block={transitionBlock}
          onClose={() => setTransitionBlock(null)}
        />
      )}
    </div>
  )
}
