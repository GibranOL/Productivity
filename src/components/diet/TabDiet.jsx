import { useState } from 'react'
import DietToday from './DietToday'
import DietShopping from './DietShopping'
import DietInventory from './DietInventory'
import DietMeals from './DietMeals'
import DietUpload from './DietUpload'

const SUB_TABS = [
  { id: 'today',     label: 'Hoy',        icon: '🥗' },
  { id: 'shopping',  label: 'Compras',    icon: '🛒' },
  { id: 'inventory', label: 'Inventario', icon: '📦' },
  { id: 'calendar',  label: 'Calendario', icon: '📅' },
  { id: 'upload',    label: 'PDF',        icon: '📄' },
]

export default function TabDiet() {
  const [activeSubTab, setActiveSubTab] = useState('today')

  return (
    <div className="stack" style={{ gap: 0 }}>
      {/* Sub-tab bar */}
      <div style={{
        display: 'flex',
        gap: 4,
        padding: '8px 0 12px',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
      }}>
        {SUB_TABS.map((tab) => {
          const isActive = activeSubTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '6px 12px',
                borderRadius: 20,
                border: `1px solid ${isActive ? 'var(--teal-mid)' : 'var(--border-mid)'}`,
                background: isActive ? 'var(--teal-dim)' : 'var(--bg3)',
                color: isActive ? 'var(--teal)' : 'var(--text-dim)',
                fontSize: 12,
                fontWeight: isActive ? 700 : 400,
                cursor: 'pointer',
                transition: 'var(--transition)',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              <span>{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div>
        {activeSubTab === 'today'     && <DietToday />}
        {activeSubTab === 'shopping'  && <DietShopping />}
        {activeSubTab === 'inventory' && <DietInventory />}
        {activeSubTab === 'calendar'  && <DietMeals />}
        {activeSubTab === 'upload'    && <DietUpload />}
      </div>
    </div>
  )
}
