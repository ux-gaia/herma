import { BrowserWindow, Menu, app, dialog, shell } from 'electron'
import { runMergeDirectorySpreadsheets } from './merge-directory'

function quitApplication(): void {
  app.quit()
}

function createQuitMenuItem(): Electron.MenuItemConstructorOptions {
  return {
    label: process.platform === 'darwin' ? 'Quit Herma' : 'Quit',
    accelerator: 'CmdOrCtrl+Q',
    click: quitApplication
  }
}

export function createApplicationMenu(getMainWindow: () => BrowserWindow | null): void {
  const isMac = process.platform === 'darwin'

  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: 'Herma',
            submenu: [
              { role: 'about' as const },
              { type: 'separator' as const },
              { role: 'services' as const },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'hideOthers' as const },
              { role: 'unhide' as const },
              { type: 'separator' as const },
              createQuitMenuItem()
            ]
          }
        ]
      : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'Clean workspace',
          accelerator: 'CmdOrCtrl+Shift+K',
          click: () => void confirmCleanWorkspace(getMainWindow())
        },
        {
          label: 'Merge directory spreadsheets…',
          click: () => void runMergeDirectorySpreadsheets(getMainWindow())
        },
        ...(isMac
          ? []
          : [{ type: 'separator' as const }, createQuitMenuItem()])
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [{ role: 'minimize' }, { role: 'zoom' }, ...(isMac ? [{ type: 'separator' as const }, { role: 'front' as const }] : [{ role: 'close' as const }])]
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'Learn more about Herma',
          click: () => {
            void shell.openExternal('https://github.com/herma/herma')
          }
        }
      ]
    }
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

async function confirmCleanWorkspace(mainWindow: BrowserWindow | null): Promise<void> {
  const options = {
    type: 'warning' as const,
    buttons: ['Cancel', 'Clean workspace'],
    defaultId: 0,
    cancelId: 0,
    title: 'Clean workspace',
    message: 'Clean workspace?',
    detail:
      'This will remove the template, source files, constants, and copy rules. This action cannot be undone.'
  }

  const result = mainWindow
    ? await dialog.showMessageBox(mainWindow, options)
    : await dialog.showMessageBox(options)

  if (result.response !== 1) {
    return
  }

  mainWindow?.webContents.send('herma:clean-workspace')
}
