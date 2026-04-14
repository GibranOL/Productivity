import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// ─── Kanban Constants ─────────────────────────────────────────────────────────
export const KANBAN_COLUMNS = ['backlog', 'mvp', 'scaling']
export const MVP_WIP_LIMIT = 3

export const KANBAN_COLUMN_CONFIG = {
  backlog: { label: 'Backlog', icon: '📋', color: 'var(--text-dim)' },
  mvp:     { label: 'MVP', icon: '🎯', color: 'var(--teal)' },
  scaling: { label: 'Scaling', icon: '🚀', color: 'var(--purple)' },
}

// Pre-defined tech tags
export const TECH_TAGS = [
  { id: 'react',    label: 'React',    color: 'var(--blue, #3b82f6)' },
  { id: 'python',   label: 'Python',   color: 'var(--yellow)' },
  { id: 'css',      label: 'CSS',      color: 'var(--purple)' },
  { id: 'zustand',  label: 'Zustand',  color: 'var(--orange)' },
  { id: 'api',      label: 'API',      color: 'var(--green)' },
  { id: 'ui',       label: 'UI/UX',    color: 'var(--pink, #ec4899)' },
  { id: 'backend',  label: 'Backend',  color: 'var(--indigo, #6366f1)' },
  { id: 'testing',  label: 'Testing',  color: 'var(--lime, #84cc16)' },
  { id: 'devops',   label: 'DevOps',   color: 'var(--red)' },
]

const useProjectStore = create(
  persist(
    (set, get) => ({
      tasks: [],    // ProjectTask[]
      sessions: [], // WorkSession[]

      // ─── Kanban toast state (ephemeral) ─────────────────────────
      wipWarning: null, // { message: string, timestamp: number } | null
      clearWipWarning: () => set({ wipWarning: null }),

      addTask: (task) => set((s) => ({
        tasks: [...s.tasks, {
          id: crypto.randomUUID(),
          projectId: task.projectId,
          title: task.title,
          description: task.description || '',
          weight: task.weight || 5,
          status: 'todo',
          column: task.column || 'backlog',
          techTags: task.techTags || [],
          category: task.category || 'general',
          estimatedHours: task.estimatedHours || null,
          actualHours: 0,
          completedAt: null,
          createdAt: new Date().toISOString().slice(0, 10),
          movedAt: new Date().toISOString().slice(0, 10),
        }]
      })),

      updateTask: (id, patch) => set((s) => ({
        tasks: s.tasks.map((t) => t.id === id ? { ...t, ...patch } : t)
      })),

      // Move task to a Kanban column with WIP limit enforcement
      moveTask: (id, toColumn) => {
        const state = get()
        const task = state.tasks.find((t) => t.id === id)
        if (!task || task.column === toColumn) return false

        // WIP limit check for MVP column
        if (toColumn === 'mvp') {
          const mvpCount = state.tasks.filter(
            (t) => t.column === 'mvp' && t.id !== id
          ).length
          if (mvpCount >= MVP_WIP_LIMIT) {
            set({
              wipWarning: {
                message: `Gibran, ya tienes ${mvpCount} tareas activas en el MVP. Te sugiero cerrar una antes de agregar otra — el foco paga más que el multitasking.`,
                timestamp: Date.now(),
              }
            })
            return false
          }
        }

        const today = new Date().toISOString().slice(0, 10)
        const patch = { column: toColumn, movedAt: today }

        // Auto-complete when moving out of MVP to scaling with status done
        if (toColumn === 'scaling' && task.status !== 'done') {
          patch.status = 'done'
          patch.completedAt = today
        }
        // Set in_progress when moving to MVP
        if (toColumn === 'mvp' && task.status === 'todo') {
          patch.status = 'in_progress'
        }

        set((s) => ({
          tasks: s.tasks.map((t) => t.id === id ? { ...t, ...patch } : t),
        }))
        return true
      },

      completeTask: (id) => set((s) => ({
        tasks: s.tasks.map((t) => t.id === id
          ? { ...t, status: 'done', completedAt: new Date().toISOString().slice(0, 10) }
          : t
        )
      })),

      deleteTask: (id) => set((s) => ({
        tasks: s.tasks.filter((t) => t.id !== id)
      })),

      addSession: (session) => set((s) => ({
        sessions: [...s.sessions, {
          id: crypto.randomUUID(),
          projectId: session.projectId,
          date: new Date().toISOString().slice(0, 10),
          startTime: session.startTime || '',
          endTime: session.endTime || '',
          durationMinutes: session.durationMinutes || 0,
          notes: session.notes || '',
          tasksWorked: session.tasksWorked || [],
        }]
      })),

      getTasksForProject: (projectId) => get().tasks.filter((t) => t.projectId === projectId),
      getSessionsForProject: (projectId) => get().sessions.filter((s) => s.projectId === projectId),

      getTasksByColumn: (column, projectFilter) => {
        let tasks = get().tasks.filter((t) => t.column === column)
        if (projectFilter && projectFilter !== 'all') {
          tasks = tasks.filter((t) => t.projectId === projectFilter)
        }
        return tasks
      },

      getMvpCount: () => get().tasks.filter((t) => t.column === 'mvp').length,

      getDaysInColumn: (task) => {
        if (!task.movedAt) return 0
        const moved = new Date(task.movedAt)
        const now = new Date()
        return Math.floor((now - moved) / (1000 * 60 * 60 * 24))
      },

      getProjectPct: (projectId) => {
        const tasks = get().tasks.filter((t) => t.projectId === projectId)
        if (!tasks.length) return null // null = usar el % manual del store principal
        const totalWeight = tasks.reduce((s, t) => s + t.weight, 0)
        const doneWeight = tasks.filter((t) => t.status === 'done').reduce((s, t) => s + t.weight, 0)
        return totalWeight > 0 ? Math.round((doneWeight / totalWeight) * 100) : 0
      },
    }),
    {
      name: 'gibran-os-projects-v1',
      storage: createJSONStorage(() => localStorage),
      version: 2,
      migrate(persisted, fromVersion) {
        if (fromVersion < 1) {
          if (!Array.isArray(persisted.tasks)) persisted.tasks = []
          if (!Array.isArray(persisted.sessions)) persisted.sessions = []
        }
        if (fromVersion < 2) {
          // v1 → v2: add kanban fields to existing tasks
          const today = new Date().toISOString().slice(0, 10)
          persisted.tasks = (persisted.tasks || []).map((t) => ({
            ...t,
            column: t.column || (t.status === 'done' ? 'scaling' : t.status === 'in_progress' ? 'mvp' : 'backlog'),
            techTags: t.techTags || [],
            movedAt: t.movedAt || t.createdAt || today,
          }))
        }
        return persisted
      },
      partialize: (state) => ({
        tasks: state.tasks,
        sessions: state.sessions,
        // wipWarning is ephemeral — not persisted
      }),
    }
  )
)

export default useProjectStore
