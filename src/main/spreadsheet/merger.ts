import type { CopySelectionRule, ExportWorkbookConfig } from '../../shared/types/project'
import { isCopySelectionRule } from '../../shared/types/project'
import { readSheetRows } from './reader'
import { toExcelCellValue } from './cell-value'
import type { ProjectConstant, SourceSelection } from '../../shared/types/project'
import {
  extractBlockSelection,
  extractColumnSelection,
  extractRowSelection,
  extractSheetSelection
} from './selection'
import ExcelJS from 'exceljs'

function extractFromSelection(
  rows: unknown[][],
  selection: SourceSelection,
  constants: ProjectConstant[],
  ruleLabel: string
): unknown[][] {
  switch (selection.kind) {
    case 'columns':
      if (!selection.columns) {
        throw new Error(`Rule "${ruleLabel}" is missing column selection.`)
      }
      return extractColumnSelection(rows, selection.columns, constants, ruleLabel)
    case 'rows':
      if (!selection.rows) {
        throw new Error(`Rule "${ruleLabel}" is missing row selection.`)
      }
      return extractRowSelection(rows, selection.rows)
    case 'block':
      if (!selection.block) {
        throw new Error(`Rule "${ruleLabel}" is missing block selection.`)
      }
      return extractBlockSelection(rows, selection.block)
    case 'sheet':
      return extractSheetSelection(rows)
    default:
      throw new Error(`Unsupported selection kind for rule "${ruleLabel}".`)
  }
}

function extractCopyRuleData(
  rule: CopySelectionRule,
  sourceFiles: ExportWorkbookConfig['sourceFiles'],
  constants: ProjectConstant[]
): unknown[][] {
  const sourceFile = sourceFiles.find((file) => file.id === rule.source.sourceFileId)
  if (!sourceFile) {
    throw new Error(`Source file not found for rule "${rule.label ?? rule.id}".`)
  }

  const sourceSheet = sourceFile.sheets.find((sheet) => sheet.id === rule.source.sourceSheetId)
  if (!sourceSheet) {
    throw new Error(`Source sheet not found for rule "${rule.label ?? rule.id}".`)
  }

  const rows = readSheetRows(sourceFile.path, sourceSheet.name, sourceFile.format)
  return extractFromSelection(rows, rule.source, constants, rule.label ?? rule.id)
}

function pasteValues(
  worksheet: ExcelJS.Worksheet,
  anchorCol: number,
  anchorRow: number,
  values: unknown[][]
): void {
  for (let rowOffset = 0; rowOffset < values.length; rowOffset += 1) {
    const rowValues = values[rowOffset] ?? []

    for (let colOffset = 0; colOffset < rowValues.length; colOffset += 1) {
      const cell = worksheet.getCell(anchorRow + rowOffset, anchorCol + colOffset)
      const coerced = toExcelCellValue(rowValues[colOffset])
      cell.value = coerced

      if (typeof coerced === 'number' && (cell.numFmt === '@' || cell.numFmt === 'Text')) {
        cell.numFmt = 'General'
      }
    }
  }
}

function resolveWorksheet(
  workbook: ExcelJS.Workbook,
  rule: CopySelectionRule,
  templateSheets: NonNullable<ExportWorkbookConfig['template']>['sheets']
): ExcelJS.Worksheet {
  const templateSheet = templateSheets.find((sheet) => sheet.id === rule.destination.templateSheetId)
  if (!templateSheet) {
    throw new Error(`Template sheet not found for rule "${rule.label ?? rule.id}".`)
  }

  const worksheet = workbook.getWorksheet(templateSheet.name)
  if (!worksheet) {
    throw new Error(`Worksheet "${templateSheet.name}" was not found in the template.`)
  }

  return worksheet
}

export async function mergeWorkbook(config: ExportWorkbookConfig): Promise<ExcelJS.Workbook> {
  if (!config.template) {
    throw new Error('A template workbook is required to apply copy rules.')
  }

  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(config.template.path)

  for (const rule of config.mappings) {
    if (!isCopySelectionRule(rule)) continue

    const worksheet = resolveWorksheet(workbook, rule, config.template.sheets)
    const values = extractCopyRuleData(rule, config.sourceFiles, config.constants)
    pasteValues(worksheet, rule.destination.anchorCol, rule.destination.anchorRow, values)
  }

  return workbook
}
