import { useState } from 'react'
import MedTracker from './MedTracker'
import MealChecklist from './MealChecklist'
import HydrationTracker from './HydrationTracker'
import WorkoutLogger from './WorkoutLogger'
import SleepTracker from '../wellness/SleepTracker'
import MoodGrid from '../wellness/MoodGrid'
import MeditationTimer from '../wellness/MeditationTimer'
import useGymStore from '../../store/gymStore'
import useDietStore from '../../store/dietStore'
import useWellnessStore from '../../store/wellnessStore'
import { Card } from '../UI'

const SUB_TABS = [
  { id: 'overview',  label: 'Overview',  icon: '📊' },
  { id: 'gym',       label: 'Gym',       icon: '🏋️' },
  { id: 'nutrition', label: 'Nutrición', icon: '🍽️' },
  { id: 'wellness',  label: 'Bienestar', icon: '🧘' },
]

export default function TabHealth() {
  const [subTab, setSubTab] = useState('overview')
  const getTodayMeds = useDietStore((s) => s.getTodayMeds)
  const isMedOverdue = useDietStore((s) => s.isMedOverdue)
  const amOverdue = isMedOverdue('am')
  const pmOverdue = isMedOverdue('pm')
  const anyMedOverdue = amOverdue || pmOverdue

  return (
    <div className="stack" style={{ gap: 14, paddingBottom: 80 }}>
      {/* Med Tracker is ALWAYS visible — highest priority */}
      <MedTracker />

      {/* Sub-tab navigation */}
      <div style={{
        display: 'flex',
        gap: 4,
        padding: '4px 0',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
      }}>
        {SUB_TABS.map((tab) => {
          const isActive = subTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id)}
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
      {subTab === 'overview' && <OverviewSection />}
      {subTab === 'gym' && <WorkoutLogger />}
      {subTab === 'nutrition' && (
        <div className="stack" style={{ gap: 14 }}>
          <HydrationTracker />
          <MealChecklist />
        </div>
      )}
      {subTab === 'wellness' && (
        <div className="stack" style={{ gap: 14 }}>
          <SleepTracker />
          <MoodGrid />
          <MeditationTimer />
        </div>
      )}
    </div>
  )
}

// ─── Overview: snapshot of all health metrics ────────────────────────────────
function OverviewSection() {
  const getGymStreak = useGymStore((s) => s.getGymStreak)
  const getWeeklyVolume = useGymStore((s) => s.getWeeklyVolume)
  const isGymDay = useGymStore((s) => s.isGymDay)
  const getTodayLog = useGymStore((s) => s.getTodayLog)
  const getTodaySplit = useGymStore((s) => s.getTodaySplit)
  const didMissGymToday = useGymStore((s) => s.didMissGymToday)

  const getMealsConsumedCount = useDietStore((s) => s.getMealsConsumedCount)
  const getTodayHydration = useDietStore((s) => s.getTodayHydration)

  const getTodaySleep = useWellnessStore((s) => s.getTodaySleep)
  const getReadiness = useWellnessStore((s) => s.getDeepWorkReadiness)
  const getMeditationStreak = useWellnessStore((s) => s.getMeditationStreak)

  const streak = getGymStreak()
  const weeklyVol = getWeeklyVolume()
  const gymDay = isGymDay()
  const todayWorkout = getTodayLog()
  const todaySplit = getTodaySplit()
  const missed = didMissGymToday()

  const meals = getMealsConsumedCount()
  const { current: water, goal: waterGoal } = getTodayHydration()

  const sleep = getTodaySleep()
  const readiness = getReadiness()
  const medStreak = getMeditationStreak()

  return (
    <div className="stack" style={{ gap: 14 }}>
      {/* Quick stats */}
      <div className="grid-3">
        <StatBox
          label="GYM STREAK"
          value={streak}
          unit="sesiones"
          color={streak > 0 ? 'var(--green)' : 'var(--text-dim)'}
          icon="🔥"
        />
        <StatBox
          label="VOL. SEMANAL"
          value={weeklyVol > 0 ? Math.round(weeklyVol / 1000) : 0}
          unit="k kg"
          color="var(--orange)"
          icon="💪"
        />
        <StatBox
          label="COMIDAS"
          value={`${meals}/6`}
          color={meals >= 5 ? 'var(--green)' : 'var(--yellow)'}
          icon="🍽️"
        />
      </div>

      <div className="grid-2">
        <StatBox
          label="HIDRATACION"
          value={`${water}L`}
          unit={`/ ${waterGoal}L`}
          color={water >= waterGoal ? 'var(--green)' : 'var(--teal)'}
          icon="💧"
        />
        <StatBox
          label="HOY"
          value={gymDay ? (todayWorkout?.completedAt ? 'DONE' : missed ? 'MISS' : 'TODO') : 'REST'}
          color={
            !gymDay ? 'var(--purple)' :
            todayWorkout?.completedAt ? 'var(--green)' :
            missed ? 'var(--red)' : 'var(--orange)'
          }
          icon={todaySplit?.icon || '🧘'}
          sub={todaySplit?.label}
        />
      </div>

      {/* Wellness stat row */}
      <div className="grid-3">
        <StatBox
          label="SUEÑO"
          value={sleep ? `${sleep.hours}h` : '—'}
          unit={sleep ? `q${sleep.quality}/5` : ''}
          color={!sleep ? 'var(--text-dim)' : sleep.hours >= 7 ? 'var(--green)' : sleep.hours >= 6 ? 'var(--teal)' : 'var(--red)'}
          icon="🌙"
        />
        <StatBox
          label="READINESS"
          value={readiness.tier === 'beast' ? 'BEAST' :
                 readiness.tier === 'strong' ? 'STRONG' :
                 readiness.tier === 'saver'  ? 'SAVER' :
                 readiness.tier === 'normal' ? 'OK' : '—'}
          color={readiness.color}
          icon={readiness.tier === 'beast' ? '🔥' : readiness.tier === 'saver' ? '🔋' : '⚡'}
        />
        <StatBox
          label="ZEN"
          value={medStreak}
          unit="días"
          color={medStreak > 0 ? 'var(--purple)' : 'var(--text-dim)'}
          icon="🧘"
        />
      </div>

      {/* Hydration + meals preview */}
      <HydrationTracker />
      <MealChecklist />

      {/* Missed gym alert */}
      {missed && (
        <Card accent="red">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }}>⚠️</span>
            <div>
              <div style={{ fontFamily: 'var(--display)', fontSize: 14, fontWeight: 700, color: 'var(--red)' }}>
                Gym no registrado
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-mid)', marginTop: 2 }}>
                Hoy tocaba {todaySplit?.label}. ¿Falta de energía o mucho trabajo?
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}

function StatBox({ label, value, unit, color, icon, sub }) {
  return (
    <div style={{
      background: 'var(--bg2)',
      border: '1px solid var(--border-mid)',
      borderRadius: 12,
      padding: '10px 12px',
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
    }}>
      {icon && <div style={{ fontSize: 16 }}>{icon}</div>}
      <div style={{
        fontFamily: 'var(--display)', fontSize: 20, fontWeight: 800,
        color, lineHeight: 1,
      }}>
        {value}
        {unit && <span style={{ fontFamily: 'var(--mono)', fontSize: 11, marginLeft: 3, color: 'var(--text-dim)' }}>{unit}</span>}
      </div>
      <div style={{
        fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.15em',
        color: 'var(--text-dim)', fontWeight: 700,
      }}>
        {label}
      </div>
      {sub && (
        <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>{sub}</div>
      )}
    </div>
  )
}
