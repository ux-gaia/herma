import { contextBridge, ipcRenderer } from 'electron'
import type {
  AutomationRunRequest,
  AutomationRunResult,
  IterationSheetValidation,
  ValidateIterationSheetRequest
} from '../shared/types/automation'
import type {
  ExportWorkbookConfig,
  ProjectConfig,
  ProjectTemplate,
  SelectionPreview,
  SelectionPreviewRequest,
  SourceFile
} from '../shared/types/project'

export interface HermaAPI {
  platform: NodeJS.Platform
  selectTemplate: () => Promise<ProjectTemplate | null>
  selectOutputDirectory: () => Promise<string | null>
  selectIterationFile: () => Promise<string | null>
  openFiles: () => Promise<SourceFile[]>
  validateIterationSheet: (request: ValidateIterationSheetRequest) => Promise<IterationSheetValidation>
  runAutomation: (request: AutomationRunRequest) => Promise<AutomationRunResult>
  previewSelection: (
    input: SelectionPreviewRequest
  ) => Promise<SelectionPreview | { error: string }>
  exportWorkbook: (config: ExportWorkbookConfig) => Promise<
    | { canceled: true }
    | {
        canceled: false
        filePath: string
        templateOutputPath?: string
        mergeOutputPaths: string[]
      }
  >
  exportProject: (config: ProjectConfig) => Promise<
    | { canceled: true }
    | { canceled: false; filePath: string; warnings: string[] }
  >
  importProject: () => Promise<
    | { canceled: true }
    | { canceled: false; config: ProjectConfig; filePath: string }
  >
  onCleanWorkspace: (callback: () => void) => () => void
}

const herma: HermaAPI = {
  platform: process.platform,
  selectTemplate: () => ipcRenderer.invoke('herma:select-template'),
  selectOutputDirectory: () => ipcRenderer.invoke('herma:select-output-directory'),
  selectIterationFile: () => ipcRenderer.invoke('herma:select-iteration-file'),
  openFiles: () => ipcRenderer.invoke('herma:open-files'),
  validateIterationSheet: (request) => ipcRenderer.invoke('herma:validate-iteration-sheet', request),
  runAutomation: (request) => ipcRenderer.invoke('herma:run-automation', request),
  previewSelection: (input) => ipcRenderer.invoke('herma:preview-selection', input),
  exportWorkbook: (config) => ipcRenderer.invoke('herma:save-workbook', config),
  exportProject: (config) => ipcRenderer.invoke('herma:export-project', config),
  importProject: () => ipcRenderer.invoke('herma:import-project'),
  onCleanWorkspace: (callback) => {
    const listener = (): void => callback()
    ipcRenderer.on('herma:clean-workspace', listener)
    return () => {
      ipcRenderer.removeListener('herma:clean-workspace', listener)
    }
  }
}

if (process.contextIsolated) {
  contextBridge.exposeInMainWorld('herma', herma)
} else {
  // @ts-ignore fallback for non-isolated contexts
  window.herma = herma
}
