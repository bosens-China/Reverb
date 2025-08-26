import { contextBridge, ipcRenderer } from 'electron'
import type { Recording, UserSettings, Course } from './index.d'

/**
 * @description 定义暴露给渲染进程的自定义 API
 */
const api = {
  // --- 文件和文件夹操作 ---
  openFileDialog: (): Promise<Recording[]> => ipcRenderer.invoke('open-file-dialog'),
  openFolderDialog: (): Promise<Recording[]> => ipcRenderer.invoke('open-folder-dialog'),
  checkFileExists: (filePath: string): Promise<boolean> =>
    ipcRenderer.invoke('check-file-exists', filePath),
  getAudioDataUrl: (filePath: string): Promise<string | null> =>
    ipcRenderer.invoke('get-audio-data-url', filePath),

  // --- 课程与录音持久化 ---
  getCourses: (): Promise<Course[]> => ipcRenderer.invoke('get-courses'),
  setCourses: (courses: Course[]): void => ipcRenderer.send('set-courses', courses),

  // --- 用户设置 ---
  getSettings: (): Promise<UserSettings | undefined> => ipcRenderer.invoke('get-settings'),
  setSettings: (settings: UserSettings): void => ipcRenderer.send('set-settings', settings),

  // --- 系统级操作 ---
  sendNotification: (message: string): void => {
    ipcRenderer.send('show-notification', message)
  },
  changeSystemVolume: (direction: 'up' | 'down'): Promise<number> =>
    ipcRenderer.invoke('change-system-volume', direction),
  enterFullscreen: (): void => {
    ipcRenderer.send('enter-fullscreen')
  },
  exitFullscreen: (): void => {
    ipcRenderer.send('exit-fullscreen')
  }
}

/**
 * @description 使用 contextBridge 将 API 安全地暴露给渲染进程
 */
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error('Context Bridge 暴露 API 失败:', error)
  }
} else {
  window.api = api
}
