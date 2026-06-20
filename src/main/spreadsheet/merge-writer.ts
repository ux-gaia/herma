import { join } from 'path'
import ExcelJS from 'exceljs'
import type { MergeSheetsRule, SourceFile } from '../../shared/types/project'
import { toExcelCellValue } from './cell-value'
import { extractMergeSheetsData } from './merge-sheets'

const INVALID_SHEET_CHARS = /[[\]:*?/\\]/g

function ensureXlsxFileName(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) {
    throw new Error('Output file name is required.')
  }
  return trimmed.toLowerCase().endsWith('.xlsx') ? trimmed : `${trimmed}.xlsx`
}

function sanitizeSheetTabName(name: string): string {
  const withoutExtension = name.replace(/\.xlsx$/i, '').trim()
  return withoutExtension.replace(INVALID_SHEET_CHARS, '_').slice(0, 31) || 'Merged'
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

export async function writeMergeSheetsOutputs(
  rules: MergeSheetsRule[],
  sourceFiles: SourceFile[]
): Promise<string[]> {
  const written: string[] = []

  for (const rule of rules) {
    const fileName = ensureXlsxFileName(rule.resultSheetName)
    const outputPath = join(rule.outputDirectory, fileName)
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet(sanitizeSheetTabName(rule.resultSheetName))
    const values = extractMergeSheetsData(rule, sourceFiles)

    pasteValues(worksheet, 1, 1, values)
    await workbook.xlsx.writeFile(outputPath)
    written.push(outputPath)
  }

  return written
}
