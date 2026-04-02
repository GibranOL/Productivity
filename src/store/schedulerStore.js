import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// ─── SECTION CONFIG ───────────────────────────────────────────────────────────
export const SECTIONS = {
  sleep:      { label: 'Sueño',        icon: '🌙', color: 'var(--indigo)', dim: 'var(--indigo-dim)', mid: 'var(--indigo-mid)' },
  gym:        { label: 'Gym',          icon: '🏋️', color: 'var(--orange)', dim: 'var(--orange-dim)', mid: 'var(--orange-mid)' },
  project:    { label: 'Proyecto',     icon: '🎯', color: 'var(--teal)',   dim: 'var(--teal-dim)',   mid: 'var(--teal-mid)'   },
  study:      { label: 'Estudio',      icon: '📚', color: 'var(--blue)',   dim: 'var(--blue-dim)',   mid: 'var(--blue-mid)'   },
  mealprep:   { label: 'Meal Prep',    icon: '🍳', color: 'var(--green)',  dim: 'var(--green-dim)',  mid: 'var(--green-mid)'  },
  meditation: { label: 'Meditación',   icon: '🧘', color: 'var(--purple)', dim: 'var(--purple-dim)', mid: 'var(--purple-mid)' },
  relax:      { label: 'Relax/Social', icon: '🎮', color: 'var(--pink)',   dim: 'var(--pink-dim)',   mid: 'var(--pink-mid)'   },
  reading:    { label: 'Lectura',      icon: '📖', color: 'var(--yellow)', dim: 'var(--yellow-dim)', mid: 'var(--yellow-mid)' },
  outdoor:    { label: 'Caminata',     icon: '🌿', color: 'var(--lime)',   dim: 'var(--lime-dim)',   mid: 'var(--lime-mid)'   },
}

// day 0 = Lunes … 6 = Domingo
const GYM_DAYS = [0, 1, 2, 4, 5] // Lun/Mar/Mié/Vie/Sáb
const TAROT_DAYS = [1, 3, 5]       // Mar/Jue/Sáb

function makeBlock(partial) {
  return {
    id: crypto.randomUUID(),
    day: 0,
    startTime: '09:00',
    endTime: '10:30',
    section: 'project',
    title: '',
    subtitle: '',
    projectId: null,
    objectives: [],
    studyTopic: null,
    mealPlan: null,
    readingBook: null,
    color: SECTIONS.project.color,
    icon: SECTIONS.project.icon,
    duration: 90,
    status: 'pending',
    timerStart: null,
    timerEnd: null,
    actualDuration: null,
    notes: '',
    googleEventId: null,
    pendingSync: false,
    ...partial,
  }
}

function calcDuration(startTime, endTime) {
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  return (eh * 60 + em) - (sh * 60 + sm)
}

// ─── DEFAULT WEEK GENERATOR ───────────────────────────────────────────────────
function generateDefaultWeek() {
  const blocks = []

  for (let day = 0; day <= 6; day++) {
    const isGym    = GYM_DAYS.includes(day)
    const isTarot  = TAROT_DAYS.includes(day)
    const isSunday = day === 6

    // Sueño
    blocks.push(makeBlock({
      day, startTime: '00:00', endTime: '08:00', section: 'sleep',
      title: 'Sueño', icon: '🌙', color: SECTIONS.sleep.color,
      duration: 480,
    }))

    if (isSunday) {
      // Domingo: relax total
      blocks.push(makeBlock({
        day, startTime: '09:00', endTime: '11:00', section: 'relax',
        title: 'Recuperación', icon: '🌿', color: SECTIONS.relax.color, duration: 120,
      }))
    } else {
      // Proyecto mañana — Bloque 1
      const proj1 = (day === 0 || day === 2)
        ? { title: 'TrueNorth — Bloque 1', projectId: 'truenorth', icon: '🧭' }
        : (day === 1 || day === 3)
          ? { title: 'Job Search — Bloque 1', projectId: 'jobsearch', icon: '💼' }
          : { title: 'Flex — Bloque 1', projectId: null, icon: '🎯' }

      blocks.push(makeBlock({
        day, startTime: '09:00', endTime: '10:30', section: 'project',
        ...proj1, color: SECTIONS.project.color, duration: 90,
      }))

      // Break implícito 10:30–11:00 (no se crea bloque, es tiempo libre)

      // Bloque 2
      const proj2 = { ...proj1, title: proj1.title.replace('Bloque 1', 'Bloque 2') }
      blocks.push(makeBlock({
        day, startTime: '11:00', endTime: '12:30', section: 'project',
        ...proj2, color: SECTIONS.project.color, duration: 90,
      }))
    }

    // Meal prep — solo Sábado
    if (day === 5) {
      blocks.push(makeBlock({
        day, startTime: '08:30', endTime: '10:30', section: 'mealprep',
        title: 'Meal Prep semanal', icon: '🍳', color: SECTIONS.mealprep.color, duration: 120,
      }))
    }

    // Gym
    if (isGym) {
      blocks.push(makeBlock({
        day, startTime: '13:30', endTime: '16:00', section: 'gym',
        title: 'Gym 💪', icon: '🏋️', color: SECTIONS.gym.color, duration: 150,
      }))
    }

    // Meditación — todos los días
    blocks.push(makeBlock({
      day, startTime: '18:00', endTime: '18:30', section: 'meditation',
      title: 'Meditación / Hipnosis', icon: '🧘', color: SECTIONS.meditation.color, duration: 30,
    }))

    // Bloque 3 — Tarot (Mar/Jue/Sáb)
    if (isTarot) {
      blocks.push(makeBlock({
        day, startTime: '19:30', endTime: '21:00', section: 'project',
        title: 'Tarot App — Bloque 3', projectId: 'tarot', icon: '🔮',
        color: SECTIONS.project.color, duration: 90,
      }))
    }

    // Relax noche (Lun/Mié/Dom) o Social (Vie/Sáb)
    if (day === 0 || day === 2) {
      blocks.push(makeBlock({
        day, startTime: '19:30', endTime: '22:00', section: 'relax',
        title: 'Relax noche 🍻', icon: '🍻', color: SECTIONS.relax.color, duration: 150,
      }))
    } else if (day === 4 || day === 5) {
      blocks.push(makeBlock({
        day, startTime: '21:00', endTime: '23:00', section: 'relax',
        title: 'Social 🎉', icon: '🎉', color: SECTIONS.relax.color, duration: 120,
      }))
    }
  }

  return blocks
}

// ─── STORE ────────────────────────────────────────────────────────────────────
const useSchedulerStore = create(
  persist(
    (set, get) => ({
      blocks: [],
      currentWeekOffset: 0,
      activeBlockId: null,
      syncStatus: 'idle',          // 'idle' | 'syncing' | 'synced' | 'error'
      lastSyncedAt: null,          // timestamp
      syncError: null,
      deletedGoogleEventIds: [],   // gcal event IDs of deleted blocks (pending deletion on gcal)

      // ── CRUD ──────────────────────────────────────────────────────
      addBlock: (partial) => {
        const sec = SECTIONS[partial.section] || SECTIONS.project
        const block = makeBlock({
          color: sec.color,
          icon: sec.icon,
          duration: calcDuration(partial.startTime || '09:00', partial.endTime || '10:30'),
          ...partial,
        })
        set((s) => ({ blocks: [...s.blocks, block] }))
        return block.id
      },

      updateBlock: (id, patch) =>
        set((s) => ({
          blocks: s.blocks.map((b) => {
            if (b.id !== id) return b
            const updated = { ...b, ...patch, pendingSync: true }
            if (patch.startTime || patch.endTime) {
              updated.duration = calcDuration(updated.startTime, updated.endTime)
            }
            if (patch.section) {
              const sec = SECTIONS[patch.section] || SECTIONS.project
              updated.color = sec.color
              updated.icon = sec.icon
            }
            return updated
          }),
        })),

      deleteBlock: (id) => {
        // If it had a gcal event, we surface it via deletedGoogleEventIds for the sync component to delete
        const block = get().blocks.find((b) => b.id === id)
        set((s) => ({
          blocks: s.blocks.filter((b) => b.id !== id),
          activeBlockId: s.activeBlockId === id ? null : s.activeBlockId,
          deletedGoogleEventIds: block?.googleEventId
            ? [...(s.deletedGoogleEventIds || []), block.googleEventId]
            : (s.deletedGoogleEventIds || []),
        }))
      },

      moveBlock: (id, newDay, newStartTime) =>
        set((s) => ({
          blocks: s.blocks.map((b) => {
            if (b.id !== id) return b
            const [sh, sm] = newStartTime.split(':').map(Number)
            const endMinutes = sh * 60 + sm + b.duration
            const eh = Math.floor(endMinutes / 60) % 24
            const em = endMinutes % 60
            const newEndTime = `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`
            return { ...b, day: newDay, startTime: newStartTime, endTime: newEndTime, pendingSync: true }
          }),
        })),

      // ── WEEK GENERATOR ────────────────────────────────────────────
      generateWeek: () => {
        const defaultBlocks = generateDefaultWeek()
        set({ blocks: defaultBlocks })
      },

      // ── TIMER ACTIONS ─────────────────────────────────────────────
      startBlock: (id) => {
        const now = Date.now()
        const block = get().blocks.find((b) => b.id === id)
        if (!block) return
        const durationMs = block.duration * 60 * 1000
        set((s) => ({
          activeBlockId: id,
          blocks: s.blocks.map((b) =>
            b.id === id
              ? { ...b, status: 'active', timerStart: now, timerEnd: now + durationMs }
              : b
          ),
        }))
      },

      completeBlock: (id) => {
        const block = get().blocks.find((b) => b.id === id)
        if (!block) return
        const actual = block.timerStart
          ? Math.round((Date.now() - block.timerStart) / 60000)
          : block.duration
        set((s) => ({
          activeBlockId: s.activeBlockId === id ? null : s.activeBlockId,
          blocks: s.blocks.map((b) =>
            b.id === id
              ? { ...b, status: 'done', actualDuration: actual }
              : b
          ),
        }))
      },

      extendBlock: (id, extraMinutes) => {
        set((s) => ({
          blocks: s.blocks.map((b) => {
            if (b.id !== id) return b
            const newEnd = (b.timerEnd || Date.now()) + extraMinutes * 60 * 1000
            const [sh, sm] = b.startTime.split(':').map(Number)
            const newDuration = b.duration + extraMinutes
            const endMinutes = sh * 60 + sm + newDuration
            const eh = Math.floor(endMinutes / 60) % 24
            const em = endMinutes % 60
            return {
              ...b,
              status: 'extended',
              timerEnd: newEnd,
              duration: newDuration,
              endTime: `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`,
            }
          }),
        }))
      },

      skipBlock: (id) =>
        set((s) => ({
          blocks: s.blocks.map((b) =>
            b.id === id ? { ...b, status: 'skipped' } : b
          ),
        })),

      // ── WEEK NAVIGATION ───────────────────────────────────────────
      setWeekOffset: (n) => set({ currentWeekOffset: n }),

      // ── GOOGLE CALENDAR SYNC ──────────────────────────────────────
      setSyncStatus: (status, error = null) =>
        set({ syncStatus: status, syncError: error, lastSyncedAt: status === 'synced' ? Date.now() : undefined }),

      setGoogleEventId: (blockId, googleEventId) =>
        set((s) => ({
          blocks: s.blocks.map((b) =>
            b.id === blockId ? { ...b, googleEventId, pendingSync: false } : b
          ),
        })),

      clearPendingSync: () =>
        set((s) => ({
          blocks: s.blocks.map((b) => ({ ...b, pendingSync: false })),
          deletedGoogleEventIds: [],
        })),

      // ── SELECTORS ─────────────────────────────────────────────────
      getBlocksForDay: (day) => get().blocks.filter((b) => b.day === day),

      getActiveBlock: () => {
        const { blocks, activeBlockId } = get()
        return activeBlockId ? blocks.find((b) => b.id === activeBlockId) || null : null
      },
    }),

    {
      name: 'gibran-os-scheduler-v1',
      storage: createJSONStorage(() => localStorage),
    }
  )
)

export default useSchedulerStore
