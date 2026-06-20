import type { BrowserWindow } from 'electron'
import { dialog } from 'electron'
import { mergeDirectorySpreadsheets } from './spreadsheet/directory-merge'

export async function runMergeDirectorySpreadsheets(
  mainWindow: BrowserWindow | null
): Promise<void> {
  const directoryResult = mainWindow
    ? await dialog.showOpenDialog(mainWindow, {
        title: 'Select directory with spreadsheets',
        properties: ['openDirectory']
      })
    : await dialog.showOpenDialog({
        title: 'Select directory with spreadsheets',
        properties: ['openDirectory']
      })

  if (directoryResult.canceled || !directoryResult.filePaths[0]) {
    return
  }

  const directoryPath = directoryResult.filePaths[0]

  const saveResult = mainWindow
    ? await dialog.showSaveDialog(mainWindow, {
        title: 'Save merged workbook',
        defaultPath: 'merged-directory.xlsx',
        filters: [{ name: 'Excel Workbook', extensions: ['xlsx'] }]
      })
    : await dialog.showSaveDialog({
        title: 'Save merged workbook',
        defaultPath: 'merged-directory.xlsx',
        filters: [{ name: 'Excel Workbook', extensions: ['xlsx'] }]
      })

  if (saveResult.canceled || !saveResult.filePath) {
    return
  }

  try {
    const result = await mergeDirectorySpreadsheets(directoryPath, saveResult.filePath)
    const detailLines = [
      `${result.mergedCount} file${result.mergedCount === 1 ? '' : 's'} merged into one workbook.`,
      `Saved to: ${result.outputPath}`
    ]

    if (result.skippedMultiSheet.length > 0) {
      detailLines.push(
        '',
        `Skipped (multiple sheets): ${result.skippedMultiSheet.join(', ')}`
      )
    }

    if (result.skippedUnreadable.length > 0) {
      detailLines.push('', `Skipped (unreadable): ${result.skippedUnreadable.join(', ')}`)
    }

    await (mainWindow
      ? dialog.showMessageBox(mainWindow, {
          type: 'info',
          title: 'Directory merge complete',
          message: 'Workbook created successfully.',
          detail: detailLines.join('\n')
        })
      : dialog.showMessageBox({
          type: 'info',
          title: 'Directory merge complete',
          message: 'Workbook created successfully.',
          detail: detailLines.join('\n')
        }))
  } catch (error) {
    await (mainWindow
      ? dialog.showMessageBox(mainWindow, {
          type: 'error',
          title: 'Directory merge failed',
          message: 'Could not merge directory spreadsheets.',
          detail: error instanceof Error ? error.message : String(error)
        })
      : dialog.showMessageBox({
          type: 'error',
          title: 'Directory merge failed',
          message: 'Could not merge directory spreadsheets.',
          detail: error instanceof Error ? error.message : String(error)
        }))
  }
}
