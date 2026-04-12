import { useEffect, useState } from 'react'
import useAuthStore from './store/authStore'
import useCalendarEventStore from './store/calendarEventStore'
import useUIStore from './store/uiStore'
import AuthGate from './components/AuthGate'
import Layout from './components/Layout'
import { setupConnectivityListener } from './lib/syncEngine'
import { generateWeekEvents } from './lib/weekSeeder'

export default function App() {
  const init = useAuthStore((s) => s.init)
  const user = useAuthStore((s) => s.user)
  const setStoresReady = useUIStore((s) => s.setStoresReady)
  const storesReady = useUIStore((s) => s.storesReady)

  // Initialize auth on mount
  useEffect(() => {
    init()
  }, [init])

  // Hydrate stores from Appwrite when user is authenticated
  useEffect(() => {
    if (!user) {
      setStoresReady(false)
      return
    }

    let cancelled = false
    async function hydrate() {
      const userId = user.$id
      try {
        // Load data from Appwrite in parallel
        await Promise.all([
          useCalendarEventStore.getState().loadFromAppwrite(userId),
          // Future stores will be added here:
          // useProjectStore.getState().loadFromAppwrite(userId),
          // useDietStore.getState().loadFromAppwrite(userId),
          // useJobStore.getState().loadFromAppwrite(userId),
          // useExerciseStore.getState().loadFromAppwrite(userId),
          // useWellnessStore.getState().loadFromAppwrite(userId),
        ])

        // Seed default week if calendar is empty
        const events = useCalendarEventStore.getState().events
        if (events.length === 0) {
          console.log('[app] Calendar empty — seeding default week...')
          const seedEvents = generateWeekEvents(userId)
          // Write all events in parallel batches of 10
          const store = useCalendarEventStore.getState()
          const batchSize = 10
          for (let i = 0; i < seedEvents.length; i += batchSize) {
            const batch = seedEvents.slice(i, i + batchSize)
            await Promise.all(batch.map((evt) => store.addEvent(evt)))
          }
          console.log(`[app] Seeded ${seedEvents.length} events`)
        }

        // Subscribe to realtime updates
        useCalendarEventStore.getState().subscribeRealtime()

        // Setup offline/online connectivity handler
        setupConnectivityListener([useCalendarEventStore])

        if (!cancelled) setStoresReady(true)
      } catch (err) {
        console.error('[app] Failed to hydrate stores:', err)
        // Still show the app with cached localStorage data
        if (!cancelled) setStoresReady(true)
      }
    }

    hydrate()
    return () => {
      cancelled = true
      useCalendarEventStore.getState().unsubscribeRealtime()
    }
  }, [user, setStoresReady])

  return (
    <AuthGate>
      {storesReady ? (
        <Layout />
      ) : (
        <div
          style={{
            minHeight: '100dvh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg)',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                width: 40,
                height: 40,
                border: '3px solid var(--border-mid)',
                borderTopColor: 'var(--teal)',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                margin: '0 auto 16px',
              }}
            />
            <p
              style={{
                fontFamily: 'var(--mono)',
                fontSize: '0.8rem',
                color: 'var(--text-mid)',
                letterSpacing: '1px',
              }}
            >
              Sincronizando datos...
            </p>
          </div>
        </div>
      )}
    </AuthGate>
  )
}
