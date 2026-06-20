export type SpreadsheetFormat = 'xlsx' | 'xls' | 'csv'
export type SelectionKind = 'columns' | 'rows' | 'block' | 'sheet'
export type ColumnSelectorMode = 'index' | 'header'
export type FilterValueKind = 'literal' | 'constant'

export interface SourceSheet {
  id: string
  name: string
  rowCount: number
  columnCount: number
}

export interface SourceFile {
  id: string
  path: string
  name: string
  format: SpreadsheetFormat
  sheets: SourceSheet[]
}

export interface TemplateSheet {
  id: string
  name: string
  rowCount: number
  columnCount: number
}

export interface ProjectTemplate {
  path: string
  name: string
  sheets: TemplateSheet[]
}

export interface ColumnRef {
  mode: 'index' | 'header'
  index?: number
  name?: string
}

export interface FilterValue {
  kind: FilterValueKind
  literal?: string | number | boolean
  constantId?: string
}

export interface ColumnFilter {
  column: ColumnRef
  operator: 'equals'
  value: FilterValue
}

export interface ColumnSelection {
  mode: ColumnSelectorMode
  columns?: number[]
  names?: string[]
  headerRow?: number
  filters?: ColumnFilter[]
}

export interface RowSelection {
  startRow: number
  endRow: number
}

export interface BlockSelection {
  startCol: number
  startRow: number
  endCol: number
  endRow: number
}

export interface SourceSelection {
  sourceFileId: string
  sourceSheetId: string
  kind: SelectionKind
  columns?: ColumnSelection
  rows?: RowSelection
  block?: BlockSelection
}

export interface DestinationPlacement {
  templateSheetId: string
  anchorCol: number
  anchorRow: number
}

export interface SheetReference {
  sourceFileId: string
  sourceSheetId: string
}

export type CopyRuleType = 'copy' | 'merge_sheets'

export interface CopySelectionRule {
  id: string
  label?: string
  ruleType: 'copy'
  source: SourceSelection
  destination: DestinationPlacement
}

export interface MergeSheetsRule {
  id: string
  label?: string
  ruleType: 'merge_sheets'
  resultSheetName: string
  outputDirectory: string
  skipHeadersAfterFirst: boolean
  headerRow: number
}

export type CopyRule = CopySelectionRule | MergeSheetsRule

export function isCopySelectionRule(rule: CopyRule): rule is CopySelectionRule {
  return rule.ruleType === 'copy'
}

export function isMergeSheetsRule(rule: CopyRule): rule is MergeSheetsRule {
  return rule.ruleType === 'merge_sheets'
}

export interface SelectionPreviewCell {
  col: number
  row: number
  address: string
  value: string
}

export interface SelectionPreview {
  col: number
  row: number
  address: string
  previewRows: number
  previewCols: number
  cells: SelectionPreviewCell[][]
  hint: string
}

export interface SelectionPreviewRequest {
  filePath: string
  sheetName: string
  format: SpreadsheetFormat
  selection: SourceSelection
  constants: ProjectConstant[]
}

export interface ProjectConstant {
  id: string
  name: string
  value: string | number | boolean
  description?: string
}

export interface ProjectConfig {
  name?: string
  template: ProjectTemplate | null
  sourceFiles: SourceFile[]
  constants: ProjectConstant[]
  mappings: CopyRule[]
  automation?: import('./automation').AutomationConfig
}

export interface SheeterProjectFile {
  version: 1
  name?: string
  exportedAt: string
  template: {
    path: string
    sheets: Array<{ id: string; name: string }>
  }
  sourceFiles: Array<{ id: string; path: string }>
  constants: ProjectConstant[]
  mappings: CopyRule[]
  automation?: import('./automation').AutomationConfig
}

export interface ExportWorkbookConfig {
  template: ProjectTemplate | null
  sourceFiles: SourceFile[]
  constants: ProjectConstant[]
  mappings: CopyRule[]
}
