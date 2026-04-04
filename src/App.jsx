import { useState, useEffect } from 'react'
import useSchedulerStore from './store/schedulerStore'
import Dashboard from './components/Dashboard'
import DailyBriefing from './components/DailyBriefing'
import { getDayKey } from './utils/date'

function shouldShowBriefing() {
  const now = new Date()
  const hour = now.getHours()
  const todayKey = getDayKey()
  const briefingShownToday = localStorage.getItem(`briefing-shown-${todayKey}`)
  return hour >= 6 && !briefingShownToday
}

export default function App() {
  const [showBriefing, setShowBriefing] = useState(shouldShowBriefing())
  const initWeekIfEmpty = useSchedulerStore((s) => s.initWeekIfEmpty)

  useEffect(() => {
    initWeekIfEmpty()
  }, [])

  if (showBriefing) return <DailyBriefing onComplete={() => setShowBriefing(false)} />
  return <Dashboard />
}
