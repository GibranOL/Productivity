import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

const useAIMemoryStore = create(
  persist(
    (set, get) => ({
      workPatterns: {
        mostProductiveHour: 9,
        avgBlocksPerDay: 0,
        mostExtendedSection: 'project',
        gymConsistency: 0,
        sleepConsistency: 0,
      },
      preferences: {
        communicationStyle: 'directo, sin rodeos, español casual',
        avoidTopics: [],
        motivationTriggers: ['progreso visible en proyectos', 'consistencia en hábitos'],
        burnoutSignals: [],
      },
      recentHistory: {
        weekSummaries: [],
        projectMilestones: [],
        habitStreaks: [],
      },
      userNotes: [],
      lastUpdated: null,

      saveUserNote: (note) => set((s) => ({
        userNotes: [...s.userNotes.slice(-19), note], // keep last 20
        lastUpdated: new Date().toISOString(),
      })),

      removeUserNote: (idx) => set((s) => ({
        userNotes: s.userNotes.filter((_, i) => i !== idx),
      })),

      updateWorkPatterns: (schedulerBlocks, logs) => {
        const doneBlocks = schedulerBlocks.filter((b) => b.status === 'done' && b.timerStart)

        // Most productive hour
        const hourCounts = {}
        doneBlocks.forEach((b) => {
          const h = new Date(b.timerStart).getHours()
          hourCounts[h] = (hourCounts[h] || 0) + 1
        })
        const mostProductiveHour = Object.entries(hourCounts)
          .sort((a, b) => b[1] - a[1])[0]?.[0] ?? 9

        // Gym consistency (last 30 days)
        const last30 = Object.entries(logs).slice(-30)
        const gymDays = last30.filter(([, l]) => l.gym === true).length
        const gymConsistency = last30.length ? Math.round((gymDays / last30.length) * 100) : 0

        // Sleep consistency
        const sleepDays = last30.filter(([, l]) => l.sleep === true).length
        const sleepConsistency = last30.length ? Math.round((sleepDays / last30.length) * 100) : 0

        // Most extended section
        const extendedCounts = {}
        schedulerBlocks.filter((b) => b.status === 'extended').forEach((b) => {
          extendedCounts[b.section] = (extendedCounts[b.section] || 0) + 1
        })
        const mostExtendedSection = Object.entries(extendedCounts)
          .sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'project'

        set((s) => ({
          workPatterns: {
            ...s.workPatterns,
            mostProductiveHour: parseInt(mostProductiveHour),
            gymConsistency,
            sleepConsistency,
            mostExtendedSection,
          },
          lastUpdated: new Date().toISOString(),
        }))
      },

      generateContextString: () => {
        const { workPatterns, preferences, recentHistory, userNotes } = get()
        return `
PERFIL DE GIBRAN:
- Hora más productiva: ${workPatterns.mostProductiveHour}:00
- Consistencia gym: ${workPatterns.gymConsistency}%
- Consistencia sueño: ${workPatterns.sleepConsistency}%
- Lo que lo motiva: ${preferences.motivationTriggers.join(', ')}
- Estilo: ${preferences.communicationStyle}
${recentHistory.weekSummaries.length ? `\nHISTORIAL:\n${recentHistory.weekSummaries.slice(0, 2).map((w) => `- ${w.date}: ${w.summary}`).join('\n')}` : ''}
${userNotes.length ? `\nPREFERENCIAS:\n${userNotes.map((n) => `- ${n}`).join('\n')}` : ''}`.trim()
      },
    }),
    {
      name: 'gibran-os-ai-memory-v1',
      storage: createJSONStorage(() => localStorage),
      version: 1,
    }
  )
)

export default useAIMemoryStore
