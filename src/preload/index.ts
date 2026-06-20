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

export interface SheeterAPI {
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

const sheeter: SheeterAPI = {
  selectTemplate: () => ipcRenderer.invoke('sheeter:select-template'),
  selectOutputDirectory: () => ipcRenderer.invoke('sheeter:select-output-directory'),
  selectIterationFile: () => ipcRenderer.invoke('sheeter:select-iteration-file'),
  openFiles: () => ipcRenderer.invoke('sheeter:open-files'),
  validateIterationSheet: (request) => ipcRenderer.invoke('sheeter:validate-iteration-sheet', request),
  runAutomation: (request) => ipcRenderer.invoke('sheeter:run-automation', request),
  previewSelection: (input) => ipcRenderer.invoke('sheeter:preview-selection', input),
  exportWorkbook: (config) => ipcRenderer.invoke('sheeter:save-workbook', config),
  exportProject: (config) => ipcRenderer.invoke('sheeter:export-project', config),
  importProject: () => ipcRenderer.invoke('sheeter:import-project'),
  onCleanWorkspace: (callback) => {
    const listener = (): void => callback()
    ipcRenderer.on('sheeter:clean-workspace', listener)
    return () => {
      ipcRenderer.removeListener('sheeter:clean-workspace', listener)
    }
  }
}

if (process.contextIsolated) {
  contextBridge.exposeInMainWorld('sheeter', sheeter)
} else {
  // @ts-ignore fallback for non-isolated contexts
  window.sheeter = sheeter
}
