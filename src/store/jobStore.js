import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// ─── Pipeline Status Flow ─────────────────────────────────────────────────────
export const JOB_STATUSES = [
  'wishlist',
  'applied',
  'screening',
  'technical',
  'final_interview',
  'offer',
  'rejected',
  'ghosted',
]

export const JOB_STATUS_CONFIG = {
  wishlist:        { label: 'Wishlist',        icon: '⭐', color: 'var(--text-dim)',  colorName: 'text-dim' },
  applied:         { label: 'Applied',         icon: '📨', color: 'var(--teal)',      colorName: 'teal' },
  screening:       { label: 'Screening',       icon: '📞', color: 'var(--yellow)',    colorName: 'yellow' },
  technical:       { label: 'Technical',       icon: '💻', color: 'var(--orange)',    colorName: 'orange' },
  final_interview: { label: 'Final Interview', icon: '🎯', color: 'var(--purple)',    colorName: 'purple' },
  offer:           { label: 'Offer',           icon: '🎉', color: 'var(--green)',     colorName: 'green' },
  rejected:        { label: 'Rejected',        icon: '❌', color: 'var(--red)',       colorName: 'red' },
  ghosted:         { label: 'Ghosted',         icon: '👻', color: 'var(--text-dim)',  colorName: 'text-dim' },
}

// Active pipeline statuses (not terminal)
export const ACTIVE_STATUSES = ['wishlist', 'applied', 'screening', 'technical', 'final_interview', 'offer']
export const TERMINAL_STATUSES = ['rejected', 'ghosted']

const STALE_DAYS = 10

const useJobStore = create(
  persist(
    (set, get) => ({
      jobs: [], // JobApplication[]

      // ─── CRUD ──────────────────────────────────────────────────────
      addJob: (job) => {
        const now = new Date().toISOString()
        const today = now.slice(0, 10)
        set((s) => ({
          jobs: [{
            id: crypto.randomUUID(),
            company: job.company,
            role: job.role || '',
            url: job.url || '',
            salary: job.salary || '',
            location: job.location || 'Vancouver, BC',
            jdText: job.jdText || '',
            notes: job.notes || '',
            status: job.status || 'wishlist',
            matchScore: job.matchScore ?? null, // 0-100 or null
            matchAnalysis: job.matchAnalysis || '',
            // Timeline: timestamp per status change
            statusHistory: [{ status: job.status || 'wishlist', date: today }],
            createdAt: today,
            updatedAt: today,
          }, ...s.jobs],
        }))
      },

      updateJob: (id, patch) => set((s) => ({
        jobs: s.jobs.map((j) => j.id === id
          ? { ...j, ...patch, updatedAt: new Date().toISOString().slice(0, 10) }
          : j
        ),
      })),

      deleteJob: (id) => set((s) => ({
        jobs: s.jobs.filter((j) => j.id !== id),
      })),

      // Move job to a new pipeline status
      moveJob: (id, toStatus) => {
        const today = new Date().toISOString().slice(0, 10)
        set((s) => ({
          jobs: s.jobs.map((j) => {
            if (j.id !== id || j.status === toStatus) return j
            return {
              ...j,
              status: toStatus,
              updatedAt: today,
              statusHistory: [...(j.statusHistory || []), { status: toStatus, date: today }],
            }
          }),
        }))
      },

      // ─── Selectors ────────────────────────────────────────────────
      getJobsByStatus: (status) => get().jobs.filter((j) => j.status === status),

      getActiveJobs: () => get().jobs.filter((j) => ACTIVE_STATUSES.includes(j.status)),

      getPipelineCounts: () => {
        const jobs = get().jobs
        const counts = {}
        for (const s of JOB_STATUSES) {
          counts[s] = jobs.filter((j) => j.status === s).length
        }
        counts.total = jobs.length
        counts.active = jobs.filter((j) => ACTIVE_STATUSES.includes(j.status)).length
        return counts
      },

      // Days since last status change
      getDaysInStatus: (job) => {
        if (!job.statusHistory?.length) {
          // Fallback to updatedAt or createdAt
          const ref = job.updatedAt || job.createdAt
          if (!ref) return 0
          return Math.floor((Date.now() - new Date(ref).getTime()) / (1000 * 60 * 60 * 24))
        }
        const last = job.statusHistory[job.statusHistory.length - 1]
        return Math.floor((Date.now() - new Date(last.date).getTime()) / (1000 * 60 * 60 * 24))
      },

      isStale: (job) => {
        if (job.status !== 'applied') return false
        return get().getDaysInStatus(job) >= STALE_DAYS
      },

      // Average days per stage for completed pipeline
      getAverageStageDurations: () => {
        const jobs = get().jobs.filter((j) => j.statusHistory?.length > 1)
        const durations = {}
        for (const job of jobs) {
          const history = job.statusHistory
          for (let i = 1; i < history.length; i++) {
            const from = history[i - 1]
            const to = history[i]
            const days = Math.floor(
              (new Date(to.date).getTime() - new Date(from.date).getTime()) / (1000 * 60 * 60 * 24)
            )
            const key = from.status
            if (!durations[key]) durations[key] = []
            durations[key].push(days)
          }
        }
        const averages = {}
        for (const [status, arr] of Object.entries(durations)) {
          averages[status] = Math.round(arr.reduce((a, b) => a + b, 0) / arr.length)
        }
        return averages
      },

      // Conversion rate between stages
      getConversionRates: () => {
        const counts = get().getPipelineCounts()
        const rates = {}
        const flow = ACTIVE_STATUSES
        for (let i = 1; i < flow.length; i++) {
          const prev = counts[flow[i - 1]]
          const curr = counts[flow[i]]
          rates[flow[i]] = prev > 0 ? Math.round((curr / prev) * 100) : 0
        }
        return rates
      },

      // Weekly applied count
      getWeeklyAppliedCount: () => {
        const now = new Date()
        const weekAgo = new Date(now)
        weekAgo.setDate(weekAgo.getDate() - 7)
        const weekKey = weekAgo.toISOString().slice(0, 10)
        return get().jobs.filter((j) => {
          const appliedEntry = j.statusHistory?.find((h) => h.status === 'applied')
          return appliedEntry && appliedEntry.date >= weekKey
        }).length
      },
    }),
    {
      name: 'gibran-os-jobs-v1',
      storage: createJSONStorage(() => localStorage),
      version: 1,
      migrate(persisted, fromVersion) {
        if (fromVersion < 1) {
          if (!Array.isArray(persisted.jobs)) persisted.jobs = []
        }
        return persisted
      },
    }
  )
)

export default useJobStore
