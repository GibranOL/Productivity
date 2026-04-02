import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { getDayKey } from '../utils/date'

const GYM_DAYS = [1, 2, 3, 5, 6] // Lun/Mar/Mié/Vie/Sáb (0=Dom)

export function defaultDayLog() {
  return {
    sleep: null,
    gym: null,
    meditation: null,
    meals: null,
    energy: 7,
    focusBlocks: [
      { done: false, project: '', score: null, notes: '' },
      { done: false, project: '', score: null, notes: '' },
      { done: false, project: '', score: null, notes: '' },
    ],
    checkinDone: false,
    screensOff: null,
    tonightMode: null,
  }
}

const useStore = create(
  persist(
    (set, get) => ({
      // ─── PERSISTENT STATE ───────────────────────────────────────
      user: {
        onboarded: false,
        gymDays: 5,
        sleepConfirm: 0,
        social: [],
        startEnergy: 7,
        notificationsEnabled: false,
        notificationPermission: null, // null | 'granted' | 'denied'
      },

      // streak tracking: { date: 'YYYY-MM-DD', count: number }
      streak: { date: '', count: 0 },

      // project time log: { [projectKey]: totalMinutes }
      projectTime: { truenorth: 0, jobsearch: 0, tarot: 0 },

      projects: {
        truenorth: {
          pct: 0,
          hoursTotal: 0,
          deadline: '',
          blocker: '',
          lastNote: '',
          sessions: [],
        },
        jobsearch: {
          appsWeek: 0,
          appsTarget: 10,
          interviews: 0,
          pipeline: '',
          lastNote: '',
          applications: [],
        },
        tarot: {
          pct: 0,
          hoursTotal: 0,
          mvpDate: '',
          lastNote: '',
          features: [],
          sessions: [],
        },
      },

      logs: {}, // keyed 'YYYY-MM-DD'

      // ─── NON-PERSISTENT UI STATE ─────────────────────────────────
      activeTab: 'today',
      modal: null, // 'checkin' | 'addJob' | 'addFeature' | null

      // ─── USER ACTIONS ────────────────────────────────────────────
      setUser: (patch) =>
        set((s) => ({
          user: {
            ...s.user,
            ...patch,
            // clamp gymDays 0-7
            ...(patch.gymDays !== undefined
              ? { gymDays: Math.max(0, Math.min(7, patch.gymDays)) }
              : {}),
          },
        })),

      // ─── PROJECT ACTIONS ─────────────────────────────────────────
      setProject: (key, patch) =>
        set((s) => ({
          projects: {
            ...s.projects,
            [key]: {
              ...s.projects[key],
              ...patch,
              // clamp pct 0-100
              ...(patch.pct !== undefined
                ? { pct: Math.max(0, Math.min(100, patch.pct)) }
                : {}),
            },
          },
        })),

      addJobApp: (app) =>
        set((s) => {
          const newApp = {
            id: Date.now().toString(),
            empresa: app.empresa,
            rol: app.rol || '',
            url: app.url || '',
            status: app.status || 'aplicado',
            date: getDayKey(),
          }
          return {
            projects: {
              ...s.projects,
              jobsearch: {
                ...s.projects.jobsearch,
                appsWeek: s.projects.jobsearch.appsWeek + 1,
                applications: [newApp, ...s.projects.jobsearch.applications],
              },
            },
          }
        }),

      updateJobApp: (id, patch) =>
        set((s) => ({
          projects: {
            ...s.projects,
            jobsearch: {
              ...s.projects.jobsearch,
              applications: s.projects.jobsearch.applications.map((a) =>
                a.id === id ? { ...a, ...patch } : a
              ),
            },
          },
        })),

      addTarotFeature: (feat) =>
        set((s) => {
          const newFeat = {
            id: Date.now().toString(),
            name: feat.name,
            notes: feat.notes || '',
            priority: feat.priority || 'med',
            done: false,
          }
          const features = [newFeat, ...s.projects.tarot.features]
          const pct = features.length
            ? Math.round((features.filter((f) => f.done).length / features.length) * 100)
            : 0
          return {
            projects: {
              ...s.projects,
              tarot: { ...s.projects.tarot, features, pct },
            },
          }
        }),

      toggleTarotFeature: (id) =>
        set((s) => {
          const features = s.projects.tarot.features.map((f) =>
            f.id === id ? { ...f, done: !f.done } : f
          )
          const pct = features.length
            ? Math.round((features.filter((f) => f.done).length / features.length) * 100)
            : 0
          return {
            projects: {
              ...s.projects,
              tarot: { ...s.projects.tarot, features, pct },
            },
          }
        }),

      // ─── LOG ACTIONS ─────────────────────────────────────────────
      getTodayLog: () => {
        const key = getDayKey()
        return get().logs[key] || defaultDayLog()
      },

      patchTodayLog: (patch) =>
        set((s) => {
          const key = getDayKey()
          return {
            logs: {
              ...s.logs,
              [key]: { ...(s.logs[key] || defaultDayLog()), ...patch },
            },
          }
        }),

      patchFocusBlock: (idx, patch) =>
        set((s) => {
          const key = getDayKey()
          const log = s.logs[key] || defaultDayLog()
          const focusBlocks = log.focusBlocks.map((b, i) =>
            i === idx ? { ...b, ...patch } : b
          )
          return {
            logs: {
              ...s.logs,
              [key]: { ...log, focusBlocks },
            },
          }
        }),

      setHabit: (habit, val) =>
        set((s) => {
          const key = getDayKey()
          const log = s.logs[key] || defaultDayLog()
          return {
            logs: {
              ...s.logs,
              [key]: { ...log, [habit]: val },
            },
          }
        }),

      setEnergy: (val) =>
        set((s) => {
          const key = getDayKey()
          const log = s.logs[key] || defaultDayLog()
          return {
            logs: {
              ...s.logs,
              [key]: { ...log, energy: Math.max(1, Math.min(10, val)) },
            },
          }
        }),

      // ─── WEEK STATS ──────────────────────────────────────────────
      getWeekStats: () => {
        const logs = get().logs
        const today = new Date()
        const dow = today.getDay() // 0=Dom
        // Get Mon–today of current week
        const days = []
        for (let i = 1; i <= 7; i++) {
          const d = new Date(today)
          const diff = i - (dow === 0 ? 7 : dow) // offset from Monday
          d.setDate(today.getDate() + diff)
          const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
          days.push({ key: k, date: d, dow: d.getDay(), log: logs[k] || null })
        }
        const loggedDays = days.map((d) => d.log).filter(Boolean)
        const sleep      = loggedDays.filter((l) => l.sleep === true).length
        const gym        = loggedDays.filter((l) => l.gym === true).length
        const meditation = loggedDays.filter((l) => l.meditation === true).length
        const workHours  = loggedDays.reduce((acc, l) => {
          return acc + (l.focusBlocks || []).filter((b) => b.done).length * 1.5
        }, 0)
        return { days, sleep, gym, meditation, workHours, logs }
      },

      isGymDay: () => {
        const dow = new Date().getDay()
        return GYM_DAYS.includes(dow)
      },

      // ─── PROJECT TIME TRACKING ───────────────────────────────────
      logProjectTime: (projectKey, minutes) =>
        set((s) => ({
          projectTime: {
            ...s.projectTime,
            [projectKey]: (s.projectTime[projectKey] || 0) + minutes,
          },
        })),

      // ─── STREAK TRACKING ─────────────────────────────────────────
      updateStreak: (date, habitsDone) => {
        const state = get()
        const prev  = state.streak
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        const yKey = getDayKey(yesterday)
        const newCount = (prev.date === yKey || prev.date === date)
          ? (habitsDone ? prev.count + 1 : 0)
          : (habitsDone ? 1 : 0)
        set({ streak: { date, count: newCount } })
      },

      getStreak: () => get().streak.count,

      // ─── NOTIFICATION PERMISSION ─────────────────────────────────
      setNotificationPermission: (status) =>
        set((s) => ({ user: { ...s.user, notificationPermission: status } })),

      // ─── UI ACTIONS ──────────────────────────────────────────────
      setTab:      (tab)  => set({ activeTab: tab }),
      openModal:   (name) => set({ modal: name }),
      closeModal:  ()     => set({ modal: null }),
    }),

    {
      name: 'gibran-os-v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user:        state.user,
        projects:    state.projects,
        logs:        state.logs,
        streak:      state.streak,
        projectTime: state.projectTime,
      }),
    }
  )
)

export { GYM_DAYS }
export default useStore
