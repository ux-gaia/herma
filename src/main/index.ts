import { app, BrowserWindow, globalShortcut, nativeImage, type BrowserWindowConstructorOptions } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { resolveAppIconPath } from './icon'
import { registerIpcHandlers } from './ipc/handlers'
import { createApplicationMenu } from './menu'

const APP_NAME = 'Herma'

app.setName(APP_NAME)

let mainWindow: BrowserWindow | null = null

const CHROME_BACKGROUND = '#f4f6fb'
const appIconPath = resolveAppIconPath()
const appIcon = appIconPath ? nativeImage.createFromPath(appIconPath) : undefined

function getWindowOptions(): BrowserWindowConstructorOptions {
  const base: BrowserWindowConstructorOptions = {
    width: 1200,
    height: 760,
    minWidth: 960,
    minHeight: 600,
    show: false,
    autoHideMenuBar: false,
    title: APP_NAME,
    backgroundColor: CHROME_BACKGROUND,
    ...(appIconPath && appIcon && !appIcon.isEmpty() ? { icon: appIconPath } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true
    }
  }

  if (process.platform === 'darwin') {
    return {
      ...base,
      titleBarStyle: 'hiddenInset',
      trafficLightPosition: { x: 14, y: 14 }
    }
  }

  if (process.platform === 'win32') {
    return {
      ...base,
      titleBarOverlay: {
        color: CHROME_BACKGROUND,
        symbolColor: '#334155',
        height: 40
      }
    }
  }

  return base
}

function createWindow(): void {
  const window = new BrowserWindow(getWindowOptions())

  mainWindow = window

  window.on('ready-to-show', () => {
    window.show()
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    window.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    window.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.herma.app')

  if (process.platform === 'darwin' && appIcon && !appIcon.isEmpty()) {
    app.dock?.setIcon(appIcon)
  }

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  registerIpcHandlers()
  createWindow()
  createApplicationMenu(() => mainWindow)

  if (!globalShortcut.register('CommandOrControl+Q', () => app.quit())) {
    console.warn('Failed to register CommandOrControl+Q quit shortcut')
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
