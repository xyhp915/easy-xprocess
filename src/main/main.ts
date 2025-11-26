import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import { registerIPC } from './ipc'
import { ProcessManager } from './processManager'
import { createTray } from './tray'

const isDev = process.env.VITE_DEV_SERVER_URL !== undefined
let mainWindow: BrowserWindow | null = null
let tray = null
let manager: ProcessManager
let isQuitting = false

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 960,
    minHeight: 640,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  const startUrl = isDev && process.env.VITE_DEV_SERVER_URL
    ? process.env.VITE_DEV_SERVER_URL
    : new URL('../renderer/index.html', `file://${__dirname}/`).toString()

  mainWindow.loadURL(startUrl)

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
    // if (isDev) {
    //   mainWindow?.webContents.openDevTools({ mode: 'detach' })
    // }
  })

  // 在macOS下，关闭窗口时隐藏而不是退出
  mainWindow.on('close', (event) => {
    if (process.platform === 'darwin' && !isQuitting) {
      event.preventDefault()
      mainWindow?.hide()
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(async () => {
  const userDataPath = app.getPath('userData')
  manager = new ProcessManager(userDataPath)
  await manager.loadFromDisk()
  createMainWindow()
  tray = createTray(() => mainWindow, manager)
  registerIPC(ipcMain, manager)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  isQuitting = true
})
