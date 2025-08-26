import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import dayjs from 'dayjs'
import type {
  Course,
  Recording,
  UserSettings,
  PhaseSetting,
  LearningSession
} from '../../../preload/index.d'

// --- 默认专注流程 ---
export const DEFAULT_PHASES: PhaseSetting[] = [
  { id: uuidv4(), name: '默听', type: '学习', duration: 10 * 60 },
  { id: uuidv4(), name: '朗读', type: '学习', duration: 15 * 60 },
  { id: uuidv4(), name: '休息', type: '休息', duration: 5 * 60 },
  { id: uuidv4(), name: '复习', type: '学习', duration: 10 * 60 }
]

interface AppState {
  courses: Course[]
  learningRecording: Recording | null
  phases: PhaseSetting[]
  paginationState: Record<string, { currentPage: number; pageSize: number }>
  isSidebarCollapsed: boolean
  currentPhaseIndex: number
  timeLeft: number
  isTimerRunning: boolean
  actions: AppActions
}

interface AppActions {
  // 课程管理
  loadCourses: () => Promise<void>
  addCourse: (name: string) => void
  updateCourseName: (courseId: string, newName: string) => void
  deleteCourse: (courseId: string) => void

  // 录音管理
  addRecordingsToCourse: (
    courseId: string,
    recordings: Recording[]
  ) => Promise<{ addedCount: number; skippedCount: number }>
  deleteRecording: (courseId: string, recordingPath: string) => void
  updateRecordingLearningRecord: (
    recordingPath: string,
    duration: number,
    sessionStartTime: number
  ) => void
  setLearningRecording: (recording: Recording | null) => void
  setRecordingLastLearnedDate: (recordingPath: string) => void

  // 设置
  loadSettings: () => Promise<void>
  setPhases: (phases: PhaseSetting[]) => void
  setCoursePagination: (courseId: string, currentPage: number, pageSize: number) => void
  setSidebarCollapsed: (isCollapsed: boolean) => void

  // 专注模式控制
  startFocus: () => void
  pauseTimer: () => void
  tick: () => void
  nextPhase: () => void
  prevPhase: () => void
  setTime: (time: number) => void
  resetFocus: () => void
}

export const useStore = create<AppState>((set, get) => ({
  courses: [],
  learningRecording: null,
  phases: DEFAULT_PHASES,
  paginationState: {},
  isSidebarCollapsed: false,
  currentPhaseIndex: 0,
  timeLeft: DEFAULT_PHASES[0]?.duration ?? 0,
  isTimerRunning: false,

  actions: {
    // --- 课程管理 ---
    loadCourses: async () => {
      const courses = await window.api.getCourses()
      set({ courses })
    },
    addCourse: (name) => {
      const newCourse: Course = { id: uuidv4(), name, recordings: [] }
      const updatedCourses = [...get().courses, newCourse]
      set({ courses: updatedCourses })
      window.api.setCourses(updatedCourses)
    },
    updateCourseName: (courseId, newName) => {
      const updatedCourses = get().courses.map((c) =>
        c.id === courseId ? { ...c, name: newName } : c
      )
      set({ courses: updatedCourses })
      window.api.setCourses(updatedCourses)
    },
    deleteCourse: (courseId) => {
      const { courses, paginationState, phases, isSidebarCollapsed } = get()
      const updatedCourses = courses.filter((c) => c.id !== courseId)
      const updatedPaginationState = { ...paginationState }
      delete updatedPaginationState[courseId]

      set({ courses: updatedCourses, paginationState: updatedPaginationState })
      window.api.setCourses(updatedCourses)
      window.api.setSettings({ phases, paginationState: updatedPaginationState, isSidebarCollapsed })
    },

    // --- 录音管理 ---
    addRecordingsToCourse: async (courseId, recordings) => {
      const { courses } = get()
      let addedCount = 0
      let skippedCount = 0

      const updatedCourses = courses.map((course) => {
        if (course.id === courseId) {
          const existingPaths = new Set(course.recordings.map((r) => r.path))
          const newRecordings = recordings
            .filter((r) => {
              if (existingPaths.has(r.path)) {
                skippedCount++
                return false
              }
              return true
            })
            .map((r) => ({ ...r, sessions: [] as LearningSession[] })) // 初始化 sessions 数组

          addedCount = newRecordings.length
          return { ...course, recordings: [...course.recordings, ...newRecordings] }
        }
        return course
      })

      set({ courses: updatedCourses })
      window.api.setCourses(updatedCourses)
      return { addedCount, skippedCount }
    },
    deleteRecording: (courseId, recordingPath) => {
      const updatedCourses = get().courses.map((course) => {
        if (course.id === courseId) {
          return {
            ...course,
            recordings: course.recordings.filter((r) => r.path !== recordingPath)
          }
        }
        return course
      })
      set({ courses: updatedCourses })
      window.api.setCourses(updatedCourses)
    },
    updateRecordingLearningRecord: (recordingPath, duration, sessionStartTime) => {
      const today = dayjs(sessionStartTime).format('YYYY-MM-DD')

      const updatedCourses = get().courses.map((course) => {
        if (!course.recordings) return course // 安全检查

        return {
          ...course,
          recordings: course.recordings.map((r) => {
            if (r.path !== recordingPath) return r

            const currentSessions = r.sessions || []
            const newSession: LearningSession = { date: today, duration }
            const existingSessionIndex = currentSessions.findIndex((s) => s.date === today)
            const updatedSessions: LearningSession[] = [...currentSessions]

            if (existingSessionIndex > -1) {
              const existingSession = updatedSessions[existingSessionIndex]
              updatedSessions[existingSessionIndex] = {
                ...existingSession,
                duration: (existingSession.duration || 0) + duration
              }
            } else {
              updatedSessions.push(newSession)
            }

            return { ...r, sessions: updatedSessions }
          })
        }
      })
      set({ courses: updatedCourses })
      window.api.setCourses(updatedCourses)
    },
    setLearningRecording: (recording) => set({ learningRecording: recording }),
    setRecordingLastLearnedDate: (recordingPath) => {
      const now = dayjs().toISOString()
      const updatedCourses = get().courses.map((course) => ({
        ...course,
        recordings: course.recordings.map((r) =>
          r.path === recordingPath ? { ...r, lastLearnedDate: now } : r
        )
      }))
      set({ courses: updatedCourses })
      window.api.setCourses(updatedCourses)
    },

    // --- 设置 ---
    loadSettings: async () => {
      const settings = await window.api.getSettings()
      set({
        phases: settings?.phases && settings.phases.length > 0 ? settings.phases : DEFAULT_PHASES,
        paginationState: settings?.paginationState ?? {},
        isSidebarCollapsed: settings?.isSidebarCollapsed ?? false
      })
    },
    setPhases: (phases) => {
      const { paginationState, isSidebarCollapsed } = get()
      set({ phases })
      window.api.setSettings({ phases, paginationState, isSidebarCollapsed } as UserSettings)
    },
    setCoursePagination: (courseId, currentPage, pageSize) => {
      const { phases, paginationState, isSidebarCollapsed } = get()
      const updatedPaginationState = {
        ...paginationState,
        [courseId]: { currentPage, pageSize }
      }
      set({ paginationState: updatedPaginationState })
      window.api.setSettings({ phases, paginationState: updatedPaginationState, isSidebarCollapsed })
    },
    setSidebarCollapsed: (isCollapsed) => {
      const { phases, paginationState } = get()
      set({ isSidebarCollapsed: isCollapsed })
      window.api.setSettings({ phases, paginationState, isSidebarCollapsed: isCollapsed })
    },

    // --- 专注模式控制 ---
    startFocus: () => {
      const { phases } = get()
      if (phases.length > 0) {
        set({
          isTimerRunning: true,
          currentPhaseIndex: 0,
          timeLeft: phases[0].duration
        })
      }
    },
    pauseTimer: () => set({ isTimerRunning: false }),
    tick: () => {
      const { timeLeft, actions } = get()
      if (timeLeft > 1) {
        set((state) => ({ timeLeft: state.timeLeft - 1 }))
      } else {
        actions.nextPhase()
      }
    },
    nextPhase: () => {
      set((state) => {
        const nextIndex = (state.currentPhaseIndex + 1) % state.phases.length
        return {
          currentPhaseIndex: nextIndex,
          timeLeft: state.phases[nextIndex].duration
        }
      })
    },
    prevPhase: () => {
      set((state) => {
        const prevIndex =
          (state.currentPhaseIndex - 1 + state.phases.length) % state.phases.length
        return {
          currentPhaseIndex: prevIndex,
          timeLeft: state.phases[prevIndex].duration
        }
      })
    },
    setTime: (time) => {
      const { phases, currentPhaseIndex } = get()
      const maxDuration = phases[currentPhaseIndex].duration
      set({ timeLeft: Math.max(0, Math.min(time, maxDuration)) })
    },
    resetFocus: () => {
      const { phases } = get()
      set({
        currentPhaseIndex: 0,
        timeLeft: phases.length > 0 ? phases[0].duration : 0,
        isTimerRunning: false
      })
    }
  }
}))
