import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// ─── 5-Day Hypertrophy Split ──────────────────────────────────────────────────
// Lun=1, Mar=2, Mié=3, Jue=4(rest), Vie=5, Sáb=6, Dom=0(rest)
export const GYM_DAYS = [1, 2, 3, 5, 6]

export const SPLIT_SCHEDULE = {
  1: { id: 'chest_tri',   label: 'Pecho / Triceps',      icon: '🏋️', muscles: ['Pecho', 'Triceps'] },
  2: { id: 'back_bi',     label: 'Espalda / Biceps',     icon: '💪', muscles: ['Espalda', 'Biceps'] },
  3: { id: 'shoulders',   label: 'Hombros / Traps',      icon: '🔱', muscles: ['Hombros', 'Traps'] },
  5: { id: 'legs',        label: 'Pierna',                icon: '🦵', muscles: ['Cuadriceps', 'Hamstrings', 'Glutes'] },
  6: { id: 'arms_core',   label: 'Brazos / Core',        icon: '⚡', muscles: ['Biceps', 'Triceps', 'Core'] },
}

// Default exercise library per split
export const DEFAULT_EXERCISES = {
  chest_tri: [
    { name: 'Bench Press',         sets: 4, targetReps: '8-10',  muscleGroup: 'Pecho' },
    { name: 'Incline DB Press',    sets: 3, targetReps: '10-12', muscleGroup: 'Pecho' },
    { name: 'Cable Fly',           sets: 3, targetReps: '12-15', muscleGroup: 'Pecho' },
    { name: 'Tricep Pushdown',     sets: 3, targetReps: '10-12', muscleGroup: 'Triceps' },
    { name: 'Overhead Extension',  sets: 3, targetReps: '10-12', muscleGroup: 'Triceps' },
  ],
  back_bi: [
    { name: 'Deadlift',           sets: 4, targetReps: '5-6',   muscleGroup: 'Espalda' },
    { name: 'Barbell Row',        sets: 4, targetReps: '8-10',  muscleGroup: 'Espalda' },
    { name: 'Lat Pulldown',       sets: 3, targetReps: '10-12', muscleGroup: 'Espalda' },
    { name: 'Barbell Curl',       sets: 3, targetReps: '10-12', muscleGroup: 'Biceps' },
    { name: 'Hammer Curl',        sets: 3, targetReps: '10-12', muscleGroup: 'Biceps' },
  ],
  shoulders: [
    { name: 'OHP (Overhead Press)', sets: 4, targetReps: '6-8',  muscleGroup: 'Hombros' },
    { name: 'Lateral Raise',       sets: 4, targetReps: '12-15', muscleGroup: 'Hombros' },
    { name: 'Face Pull',           sets: 3, targetReps: '12-15', muscleGroup: 'Hombros' },
    { name: 'Shrugs',              sets: 3, targetReps: '10-12', muscleGroup: 'Traps' },
    { name: 'Rear Delt Fly',       sets: 3, targetReps: '12-15', muscleGroup: 'Hombros' },
  ],
  legs: [
    { name: 'Squat',              sets: 4, targetReps: '6-8',   muscleGroup: 'Cuadriceps' },
    { name: 'Romanian Deadlift',  sets: 3, targetReps: '8-10',  muscleGroup: 'Hamstrings' },
    { name: 'Leg Press',          sets: 3, targetReps: '10-12', muscleGroup: 'Cuadriceps' },
    { name: 'Leg Curl',           sets: 3, targetReps: '10-12', muscleGroup: 'Hamstrings' },
    { name: 'Calf Raise',         sets: 4, targetReps: '12-15', muscleGroup: 'Pantorrillas' },
  ],
  arms_core: [
    { name: 'EZ Curl',            sets: 3, targetReps: '10-12', muscleGroup: 'Biceps' },
    { name: 'Skull Crushers',     sets: 3, targetReps: '10-12', muscleGroup: 'Triceps' },
    { name: 'Cable Curl',         sets: 3, targetReps: '12-15', muscleGroup: 'Biceps' },
    { name: 'Dips',               sets: 3, targetReps: '8-12',  muscleGroup: 'Triceps' },
    { name: 'Hanging Leg Raise',  sets: 3, targetReps: '12-15', muscleGroup: 'Core' },
    { name: 'Plank',              sets: 3, targetReps: '45-60s', muscleGroup: 'Core' },
  ],
}

const useGymStore = create(
  persist(
    (set, get) => ({
      // ─── Workout Logs ─────────────────────────────────────────────
      // Keyed by date 'YYYY-MM-DD'
      workoutLogs: {},

      // Custom exercise overrides per split (user can modify)
      customExercises: {}, // { [splitId]: Exercise[] }

      // ─── Actions ──────────────────────────────────────────────────
      getExercisesForSplit: (splitId) => {
        return get().customExercises[splitId] || DEFAULT_EXERCISES[splitId] || []
      },

      getTodaySplit: () => {
        const dow = new Date().getDay() // 0=Dom
        return SPLIT_SCHEDULE[dow] || null
      },

      isGymDay: () => {
        const dow = new Date().getDay()
        return GYM_DAYS.includes(dow)
      },

      // Get or create today's workout log
      getTodayLog: () => {
        const date = new Date().toISOString().slice(0, 10)
        const log = get().workoutLogs[date]
        if (log) return log
        return null
      },

      // Start a workout session
      startWorkout: (splitId) => {
        const date = new Date().toISOString().slice(0, 10)
        const exercises = get().getExercisesForSplit(splitId)
        set((s) => ({
          workoutLogs: {
            ...s.workoutLogs,
            [date]: {
              splitId,
              date,
              startedAt: new Date().toISOString(),
              completedAt: null,
              exercises: exercises.map((ex) => ({
                name: ex.name,
                muscleGroup: ex.muscleGroup,
                targetSets: ex.sets,
                targetReps: ex.targetReps,
                sets: [], // { weight, reps, rpe }[]
              })),
              notes: '',
            },
          },
        }))
      },

      // Log a set for an exercise
      logSet: (date, exerciseIdx, setData) => {
        set((s) => {
          const log = s.workoutLogs[date]
          if (!log) return s
          const exercises = [...log.exercises]
          const ex = { ...exercises[exerciseIdx] }
          ex.sets = [...ex.sets, {
            weight: setData.weight || 0,
            reps: setData.reps || 0,
            rpe: setData.rpe || null,
          }]
          exercises[exerciseIdx] = ex
          return {
            workoutLogs: {
              ...s.workoutLogs,
              [date]: { ...log, exercises },
            },
          }
        })
      },

      // Remove last set
      removeLastSet: (date, exerciseIdx) => {
        set((s) => {
          const log = s.workoutLogs[date]
          if (!log) return s
          const exercises = [...log.exercises]
          const ex = { ...exercises[exerciseIdx] }
          ex.sets = ex.sets.slice(0, -1)
          exercises[exerciseIdx] = ex
          return {
            workoutLogs: {
              ...s.workoutLogs,
              [date]: { ...log, exercises },
            },
          }
        })
      },

      // Complete workout
      completeWorkout: (date) => {
        set((s) => {
          const log = s.workoutLogs[date]
          if (!log) return s
          return {
            workoutLogs: {
              ...s.workoutLogs,
              [date]: { ...log, completedAt: new Date().toISOString() },
            },
          }
        })
      },

      // Update workout notes
      updateWorkoutNotes: (date, notes) => {
        set((s) => {
          const log = s.workoutLogs[date]
          if (!log) return s
          return {
            workoutLogs: {
              ...s.workoutLogs,
              [date]: { ...log, notes },
            },
          }
        })
      },

      // ─── Volume Tracking ──────────────────────────────────────────
      // Total volume = sum of (weight × reps) for all sets
      getWorkoutVolume: (date) => {
        const log = get().workoutLogs[date]
        if (!log) return 0
        return log.exercises.reduce((total, ex) =>
          total + ex.sets.reduce((sum, s) => sum + (s.weight * s.reps), 0)
        , 0)
      },

      getWeeklyVolume: () => {
        const logs = get().workoutLogs
        const now = new Date()
        let total = 0
        for (let i = 0; i < 7; i++) {
          const d = new Date(now)
          d.setDate(d.getDate() - i)
          const key = d.toISOString().slice(0, 10)
          if (logs[key]) {
            total += logs[key].exercises.reduce((t, ex) =>
              t + ex.sets.reduce((s, set) => s + (set.weight * set.reps), 0)
            , 0)
          }
        }
        return total
      },

      // Get last 4 weeks of volume for trend
      getVolumeTrend: () => {
        const logs = get().workoutLogs
        const weeks = []
        const now = new Date()
        for (let w = 0; w < 4; w++) {
          let weekVol = 0
          for (let d = 0; d < 7; d++) {
            const date = new Date(now)
            date.setDate(date.getDate() - (w * 7 + d))
            const key = date.toISOString().slice(0, 10)
            if (logs[key]) {
              weekVol += logs[key].exercises.reduce((t, ex) =>
                t + ex.sets.reduce((s, set) => s + (set.weight * set.reps), 0)
              , 0)
            }
          }
          weeks.unshift(weekVol)
        }
        return weeks // [4 weeks ago, 3 weeks, 2 weeks, this week]
      },

      // ─── Missed Gym Detection ─────────────────────────────────────
      getGymStreak: () => {
        const logs = get().workoutLogs
        let streak = 0
        const now = new Date()
        for (let i = 0; i < 30; i++) {
          const d = new Date(now)
          d.setDate(d.getDate() - i)
          const dow = d.getDay()
          if (!GYM_DAYS.includes(dow)) continue
          const key = d.toISOString().slice(0, 10)
          if (logs[key]?.completedAt) streak++
          else break
        }
        return streak
      },

      didMissGymToday: () => {
        const dow = new Date().getDay()
        if (!GYM_DAYS.includes(dow)) return false
        const hour = new Date().getHours()
        if (hour < 16) return false // gym window hasn't passed yet
        const date = new Date().toISOString().slice(0, 10)
        return !get().workoutLogs[date]
      },
    }),
    {
      name: 'gibran-os-gym-v1',
      storage: createJSONStorage(() => localStorage),
      version: 1,
      migrate(persisted, fromVersion) {
        if (fromVersion < 1) {
          if (!persisted.workoutLogs) persisted.workoutLogs = {}
          if (!persisted.customExercises) persisted.customExercises = {}
        }
        return persisted
      },
    }
  )
)

export default useGymStore
