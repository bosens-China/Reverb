export type PhaseType = '学习' | '休息' | '结束'

// 定义单个阶段的配置
export interface PhaseSetting {
  id: string
  name: string
  type: PhaseType
  duration: number // s
}

// 定义用户设置
export interface UserSettings {
  phases: PhaseSetting[]
  paginationState?: Record<string, { currentPage: number; pageSize: number }>
  isSidebarCollapsed?: boolean
}

// 定义单次学习记录
export interface LearningSession {
  date: string // 格式: 'YYYY-MM-DD'
  duration: number // 本次学习时长 (s)
}

// 定义录音文件
export interface Recording {
  path: string // 使用路径作为唯一ID
  name: string
  sessions: LearningSession[]
  lastLearnedDate?: string // ISO 8601 格式的日期字符串
}

// 定义课程
export interface Course {
  id: string
  name: string
  recordings: Recording[]
}

declare global {
  // 扩展全局 Window 接口
  interface Window {
    // 自定义暴露的 API
    api: {
      // --- 文件和文件夹操作 ---
      openFileDialog: () => Promise<Recording[]>
      openFolderDialog: () => Promise<Recording[]>
      checkFileExists: (filePath: string) => Promise<boolean>
      getAudioDataUrl: (filePath: string) => Promise<string | null>

      // --- 课程与录音持久化 ---
      getCourses: () => Promise<Course[]>
      setCourses: (courses: Course[]) => void

      // --- 用户设置 ---
      getSettings: () => Promise<UserSettings | undefined>
      setSettings: (settings: UserSettings) => void

      // --- 系统级操作 ---
      sendNotification: (message: string) => void
      changeSystemVolume: (direction: 'up' | 'down') => Promise<number>
      enterFullscreen: () => void
      exitFullscreen: () => void
    }
  }
}