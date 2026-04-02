import { useState, useEffect } from 'react'
import { useGoogleLogin } from '@react-oauth/google'
import useSchedulerStore from '../store/schedulerStore'
import {
  setAccessToken,
  clearAccessToken,
  syncWeekToCalendar,
  importWeekFromCalendar,
  deleteCalendarEvent,
} from '../services/googleCalendar'
import { Btn } from './UI'

function timeSince(ts) {
  if (!ts) return null
  const mins = Math.round((Date.now() - ts) / 60000)
  if (mins < 1) return 'ahora mismo'
  if (mins === 1) return 'hace 1 min'
  if (mins < 60) return `hace ${mins} min`
  return `hace ${Math.round(mins / 60)} h`
}

export default function CalendarSync() {
  const blocks               = useSchedulerStore((s) => s.blocks)
  const deletedIds           = useSchedulerStore((s) => s.deletedGoogleEventIds)
  const syncStatus           = useSchedulerStore((s) => s.syncStatus)
  const lastSyncedAt         = useSchedulerStore((s) => s.lastSyncedAt)
  const syncError            = useSchedulerStore((s) => s.syncError)
  const setSyncStatus        = useSchedulerStore((s) => s.setSyncStatus)
  const setGoogleEventId     = useSchedulerStore((s) => s.setGoogleEventId)
  const clearPendingSync     = useSchedulerStore((s) => s.clearPendingSync)
  const addBlock             = useSchedulerStore((s) => s.addBlock)

  const [signedIn, setSignedIn]     = useState(false)
  const [importing, setImporting]   = useState(false)
  const [importItems, setImportItems] = useState([])  // preview list
  const [showImport, setShowImport]  = useState(false)
  const [tick, setTick]             = useState(0)

  // Re-render every minute to keep "hace X min" fresh
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 60000)
    return () => clearInterval(t)
  }, [])

  const pendingCount = blocks.filter((b) => b.pendingSync).length

  const login = useGoogleLogin({
    scope: 'https://www.googleapis.com/auth/calendar',
    onSuccess: (tokenResponse) => {
      setAccessToken(tokenResponse.access_token)
      setSignedIn(true)
    },
    onError: () => {
      setSyncStatus('error', 'Error de autenticación con Google')
    },
  })

  function handleSignOut() {
    clearAccessToken()
    setSignedIn(false)
    setSyncStatus('idle')
  }

  async function handleSync() {
    setSyncStatus('syncing')
    try {
      // 1. Delete removed blocks from GCal
      for (const eventId of deletedIds) {
        await deleteCalendarEvent(eventId).catch(() => {})
      }

      // 2. Sync current blocks
      const result = await syncWeekToCalendar(blocks)

      // 3. Update store with new googleEventIds
      if (result.createdIds) {
        for (const { blockId, googleEventId } of result.createdIds) {
          setGoogleEventId(blockId, googleEventId)
        }
      }

      clearPendingSync()

      if (result.errors.length > 0) {
        setSyncStatus('error', `${result.errors.length} error(es) al sincronizar`)
      } else {
        setSyncStatus('synced')
      }
    } catch (e) {
      setSyncStatus('error', e.message)
    }
  }

  async function handleImportPreview() {
    setImporting(true)
    try {
      const items = await importWeekFromCalendar()
      setImportItems(items)
      setShowImport(true)
    } catch (e) {
      setSyncStatus('error', e.message)
    } finally {
      setImporting(false)
    }
  }

  function confirmImport() {
    for (const partial of importItems) {
      addBlock(partial)
    }
    setShowImport(false)
    setImportItems([])
  }

  // ── STATUS BADGE ──────────────────────────────────────────────────────────
  function StatusBadge() {
    if (!signedIn) return null

    const cfg = {
      idle:    { color: 'var(--text-dim)',  icon: '○', label: pendingCount > 0 ? `${pendingCount} pendiente${pendingCount > 1 ? 's' : ''}` : 'Al día' },
      syncing: { color: 'var(--yellow)',    icon: '↻', label: 'Sincronizando...' },
      synced:  { color: 'var(--green)',     icon: '✓', label: `Sincronizado ${timeSince(lastSyncedAt)}` },
      error:   { color: 'var(--red)',       icon: '✗', label: syncError || 'Error' },
    }[syncStatus] || {}

    return (
      <span style={{
        fontFamily: 'var(--mono)',
        fontSize: 10,
        color: cfg.color,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
      }}>
        <span style={{ animation: syncStatus === 'syncing' ? 'spin 1s linear infinite' : 'none' }}>
          {cfg.icon}
        </span>
        {cfg.label}
      </span>
    )
  }

  // ── IMPORT PREVIEW SHEET ──────────────────────────────────────────────────
  if (showImport) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'flex-end',
      }}>
        <div style={{
          background: 'var(--bg2)',
          borderRadius: '14px 14px 0 0',
          border: '1px solid var(--border-mid)',
          width: '100%',
          maxHeight: '80vh',
          overflow: 'auto',
          padding: '20px 20px calc(20px + env(safe-area-inset-bottom))',
        }}>
          <div style={{ fontFamily: 'var(--display)', fontSize: 18, fontWeight: 800, marginBottom: 4 }}>
            Importar desde Calendar
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 16 }}>
            {importItems.length} evento{importItems.length !== 1 ? 's' : ''} encontrado{importItems.length !== 1 ? 's' : ''}. Se agregarán como bloques de "Relax" — puedes editarlos después.
          </div>

          {importItems.length === 0 ? (
            <div style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '20px 0' }}>
              No hay eventos esta semana en tu Google Calendar
            </div>
          ) : (
            <div className="stack" style={{ gap: 6, marginBottom: 16 }}>
              {importItems.map((item, i) => (
                <div key={i} style={{
                  padding: '8px 12px',
                  background: 'var(--bg3)',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{item.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--mono)' }}>
                    {['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'][item.day]} · {item.startTime}–{item.endTime}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variant="ghost" style={{ flex: 1 }} onClick={() => { setShowImport(false); setImportItems([]) }}>
              Cancelar
            </Btn>
            {importItems.length > 0 && (
              <Btn variant="primary" style={{ flex: 1 }} onClick={confirmImport}>
                Importar {importItems.length} bloque{importItems.length !== 1 ? 's' : ''}
              </Btn>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── MAIN RENDER ───────────────────────────────────────────────────────────
  if (!signedIn) {
    return (
      <Btn variant="ghost" size="sm" onClick={() => login()}>
        📅 Conectar Calendar
      </Btn>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <StatusBadge />
      <Btn
        variant={pendingCount > 0 ? 'primary' : 'ghost'}
        size="sm"
        onClick={handleSync}
        disabled={syncStatus === 'syncing'}
      >
        {syncStatus === 'syncing' ? '↻ Sync...' : `↑ Sync${pendingCount > 0 ? ` (${pendingCount})` : ''}`}
      </Btn>
      <Btn variant="ghost" size="sm" onClick={handleImportPreview} disabled={importing}>
        {importing ? '...' : '↓ Importar'}
      </Btn>
      <button
        onClick={handleSignOut}
        style={{
          background: 'none', border: 'none',
          color: 'var(--text-dim)', cursor: 'pointer',
          fontSize: 14, padding: '0 2px',
        }}
        title="Desconectar Google"
      >
        ×
      </button>
    </div>
  )
}
