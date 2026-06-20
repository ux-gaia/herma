import { dialog, ipcMain } from 'electron'
import { randomUUID } from 'crypto'
import { exportWorkbookConfigSchema } from '../../shared/schemas'
import type { AutomationRunRequest, ValidateIterationSheetRequest } from '../../shared/types/automation'
import type { ExportWorkbookConfig, ProjectConfig, SelectionPreviewRequest, SourceFile } from '../../shared/types/project'
import {
  createTemplateFromPath,
  loadProjectConfigFile,
  writeProjectConfigFile
} from '../project-io'
import { runAutomationBatch, validateAutomationIterationSheet } from '../spreadsheet/automation-runner'
import { previewSelectionFirstCellSafe } from '../spreadsheet/preview'
import { isSupportedSpreadsheet, isTemplateFile, readSourceFileMetadata } from '../spreadsheet/reader'
import { writeWorkbook } from '../spreadsheet/writer'

export function registerIpcHandlers(): void {
  ipcMain.handle('herma:select-template', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Select template workbook',
      properties: ['openFile'],
      filters: [{ name: 'Excel Template', extensions: ['xlsx'] }]
    })

    if (result.canceled || !result.filePaths[0]) {
      return null
    }

    const path = result.filePaths[0]
    if (!isTemplateFile(path)) {
      throw new Error('Template files must use the .xlsx format.')
    }

    return createTemplateFromPath(path)
  })

  ipcMain.handle('herma:open-files', async (): Promise<SourceFile[]> => {
    const result = await dialog.showOpenDialog({
      title: 'Import spreadsheets',
      properties: ['openFile', 'multiSelections'],
      filters: [
        {
          name: 'Spreadsheets',
          extensions: ['xlsx', 'xls', 'csv']
        }
      ]
    })

    if (result.canceled || result.filePaths.length === 0) {
      return []
    }

    const files: SourceFile[] = []

    for (const filePath of result.filePaths) {
      if (!isSupportedSpreadsheet(filePath)) continue

      try {
        files.push(readSourceFileMetadata(filePath, randomUUID()))
      } catch (error) {
        console.error(`Failed to read ${filePath}`, error)
      }
    }

    return files
  })

  ipcMain.handle('herma:select-output-directory', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Select output directory',
      properties: ['openDirectory', 'createDirectory']
    })

    if (result.canceled || !result.filePaths[0]) {
      return null
    }

    return result.filePaths[0]
  })

  ipcMain.handle('herma:select-iteration-file', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Select iteration spreadsheet',
      properties: ['openFile'],
      filters: [
        {
          name: 'Spreadsheets',
          extensions: ['xlsx', 'xls', 'csv']
        }
      ]
    })

    if (result.canceled || !result.filePaths[0]) {
      return null
    }

    const filePath = result.filePaths[0]
    if (!isSupportedSpreadsheet(filePath)) {
      throw new Error('Iteration files must be .xlsx, .xls, or .csv.')
    }

    return filePath
  })

  ipcMain.handle('herma:validate-iteration-sheet', (_event, request: ValidateIterationSheetRequest) => {
    return validateAutomationIterationSheet(request)
  })

  ipcMain.handle('herma:run-automation', async (_event, request: AutomationRunRequest) => {
    return runAutomationBatch(request)
  })

  ipcMain.handle('herma:save-workbook', async (_event, config: ExportWorkbookConfig) => {
    const parsed = exportWorkbookConfigSchema.parse(config) as ExportWorkbookConfig
    const copyRules = parsed.mappings.filter((rule) => rule.ruleType === 'copy')

    let outputPath: string | undefined

    if (copyRules.length > 0) {
      const result = await dialog.showSaveDialog({
        title: 'Export workbook',
        defaultPath: 'consolidated.xlsx',
        filters: [{ name: 'Excel Workbook', extensions: ['xlsx'] }]
      })

      if (result.canceled || !result.filePath) {
        return { canceled: true as const }
      }

      outputPath = result.filePath
    }

    const writeResult = await writeWorkbook(parsed, outputPath)
    const filePath = writeResult.templateOutputPath ?? writeResult.mergeOutputPaths[0]

    if (!filePath) {
      throw new Error('No output files were generated.')
    }

    return {
      canceled: false as const,
      filePath,
      mergeOutputPaths: writeResult.mergeOutputPaths,
      templateOutputPath: writeResult.templateOutputPath
    }
  })

  ipcMain.handle('herma:export-project', async (_event, config: ProjectConfig) => {
    const result = await dialog.showSaveDialog({
      title: 'Export project configuration',
      defaultPath: 'herma.config.json',
      filters: [{ name: 'Herma Project', extensions: ['json'] }]
    })

    if (result.canceled || !result.filePath) {
      return { canceled: true as const }
    }

    const warnings = writeProjectConfigFile(config, result.filePath)
    return { canceled: false as const, filePath: result.filePath, warnings }
  })

  ipcMain.handle('herma:import-project', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Import project configuration',
      properties: ['openFile'],
      filters: [{ name: 'Herma Project', extensions: ['json'] }]
    })

    if (result.canceled || !result.filePaths[0]) {
      return { canceled: true as const }
    }

    const config = loadProjectConfigFile(result.filePaths[0])
    return { canceled: false as const, config, filePath: result.filePaths[0] }
  })

  ipcMain.handle('herma:preview-selection', (_event, input: SelectionPreviewRequest) => {
    return previewSelectionFirstCellSafe(input)
  })
}
