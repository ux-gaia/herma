export interface AutomationConfig {
  iterationFilePath?: string
  outputDirectory?: string
  outputNamePattern?: string
  headerRow?: number
}

export interface IterationRowValidation {
  rowIndex: number
  iterationNumber: number
  values: Record<string, string | number | boolean>
  resolvedOutputName: string
  valid: boolean
  errors: string[]
}

export interface IterationSheetValidation {
  valid: boolean
  errors: string[]
  warnings: string[]
  requiredConstants: string[]
  rows: IterationRowValidation[]
}

export interface ValidateIterationSheetRequest {
  iterationFilePath: string
  headerRow?: number
  outputNamePattern?: string
  template: import('./project').ProjectTemplate | null
  sourceFiles: import('./project').SourceFile[]
  constants: import('./project').ProjectConstant[]
  mappings: import('./project').CopyRule[]
}

export interface AutomationRunRequest extends ValidateIterationSheetRequest {
  outputDirectory: string
}

export interface AutomationIterationResult {
  rowIndex: number
  iterationNumber: number
  outputPath?: string
  mergeOutputPaths: string[]
  error?: string
}

export interface AutomationRunResult {
  total: number
  succeeded: number
  failed: number
  results: AutomationIterationResult[]
}
