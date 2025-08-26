import { app, shell, BrowserWindow, ipcMain, Notification, dialog, globalShortcut } from 'electron'
import { join, extname, basename } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import loudness from 'loudness'

import Store from 'electron-store'
import fs from 'fs'

const { getVolume, setVolume } = loudness
// 初始化持久化存储
const store = new Store()

// --- “remind-app” 到 “xiaosheng” 的一次性数据迁移 ---
try {
  const currentStore = new Store() // 默认为 “xiaosheng”
  // 仅当新存储为空时才进行迁移
  if (Object.keys(currentStore.store).length === 0) {
    const oldStore = new Store({ name: 'remind-app' })
    if (fs.existsSync(oldStore.path)) {
      const oldData = oldStore.store
      if (oldData && Object.keys(oldData).length > 0) {
        currentStore.store = oldData
        console.log('成功从 \'remind-app\' 迁移数据到 \'xiaosheng\'.')
      }
    }
  }
} catch (error) {
  console.error('数据迁移失败:', error)
}
// --- 迁移结束 ---

// 主窗口实例
let mainWindow: BrowserWindow | null = null

// 防抖函数
function debounce<F extends (...args: unknown[]) => unknown>(func: F, waitFor: number) {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<F>): void => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), waitFor)
  }
}

function createWindow(): void {
  const windowSize = store.get('windowSize', { width: 1024, height: 768 }) as {
    width: number
    height: number
  }

  mainWindow = new BrowserWindow({
    width: windowSize.width,
    height: windowSize.height,
    show: false,
    autoHideMenuBar: true,
    icon: icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      contextIsolation: true
    }
  })

  const saveWindowSize = debounce(() => {
    if (mainWindow) {
      const [width, height] = mainWindow.getSize()
      store.set('windowSize', { width, height })
    }
  }, 500)

  mainWindow.on('resize', saveWindowSize)

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // --- IPC 通信 V4 (最佳实践) ---

  // 打开文件选择对话框 (返回 AudioFile[])
  ipcMain.handle('open-file-dialog', async () => {
    if (!mainWindow) return []
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Audio', extensions: ['mp3'] }]
    })
    if (canceled) return []
    return filePaths.map((path) => ({ name: basename(path), path }))
  })

  // 打开文件夹选择对话框 (返回 AudioFile[])
  ipcMain.handle('open-folder-dialog', async () => {
    if (!mainWindow) return []
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory']
    })
    if (canceled) return []
    const allFiles = fs.readdirSync(filePaths[0])
    return allFiles
      .filter((file) => extname(file).toLowerCase() === '.mp3')
      .map((file) => {
        const path = join(filePaths[0], file)
        return { name: basename(path), path }
      })
  })

  // 检查文件是否存在
  ipcMain.handle('check-file-exists', (_, filePath: string) => {
    return fs.existsSync(filePath)
  })

  // 新增：读取音频文件并返回 Data URL
  ipcMain.handle('get-audio-data-url', async (_, filePath: string) => {
    try {
      if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`)
        return null
      }
      const fileBuffer = fs.readFileSync(filePath)
      const base64Data = fileBuffer.toString('base64')
      return `data:audio/mp3;base64,${base64Data}`
    } catch (error) {
      console.error(`Failed to read audio file ${filePath}:`, error)
      return null
    }
  })

  // --- 持久化存储相关 ---
  ipcMain.handle('get-courses', () => {
    return store.get('courses', [])
  })

  ipcMain.on('set-courses', (_, courses) => {
    store.set('courses', courses)
  })

  ipcMain.handle('get-settings', () => {
    return store.get('settings', {})
  })

  ipcMain.on('set-settings', (_, settings) => {
    store.set('settings', settings)
  })

  // --- 旧版 IPC (保留) ---
  ipcMain.on('show-notification', (_, message: string) => {
    new Notification({ title: '复习提醒', body: message }).show()
  })
  ipcMain.on('enter-fullscreen', () => mainWindow?.setFullScreen(true))
  ipcMain.on('exit-fullscreen', () => mainWindow?.setFullScreen(false))
  ipcMain.handle('change-system-volume', async (_, direction: 'up' | 'down') => {
    try {
      const currentVolume = await getVolume()
      const newVolume =
        direction === 'up' ? Math.min(100, currentVolume + 3) : Math.max(0, currentVolume - 3)
      await setVolume(newVolume)
      return newVolume
    } catch (error) {
      console.error('调节系统音量失败:', error)
      return -1
    }
  })

  createWindow()

  // 注册 F12 快捷键
  globalShortcut.register('F12', () => {
    mainWindow?.webContents.toggleDevTools()
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('will-quit', () => {
  // 注销所有快捷键
  globalShortcut.unregisterAll()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
