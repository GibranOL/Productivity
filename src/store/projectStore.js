import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

const useProjectStore = create(
  persist(
    (set, get) => ({
      tasks: [],    // ProjectTask[]
      sessions: [], // WorkSession[]

      addTask: (task) => set((s) => ({
        tasks: [...s.tasks, {
          id: crypto.randomUUID(),
          projectId: task.projectId,
          title: task.title,
          description: task.description || '',
          weight: task.weight || 5,
          status: 'todo',
          category: task.category || 'general',
          estimatedHours: task.estimatedHours || null,
          actualHours: 0,
          completedAt: null,
          createdAt: new Date().toISOString().slice(0, 10),
        }]
      })),

      updateTask: (id, patch) => set((s) => ({
        tasks: s.tasks.map((t) => t.id === id ? { ...t, ...patch } : t)
      })),

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
      version: 1,
      migrate(persisted, fromVersion) {
        if (fromVersion < 1) {
          if (!Array.isArray(persisted.tasks)) persisted.tasks = []
          if (!Array.isArray(persisted.sessions)) persisted.sessions = []
        }
        return persisted
      },
    }
  )
)

export default useProjectStore
