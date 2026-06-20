import { basename, extname } from 'path'
import { readFileSync } from 'fs'
import * as XLSX from 'xlsx'
import type { SourceFile, SourceSheet, SpreadsheetFormat } from '../../shared/types/project'

const SUPPORTED_EXTENSIONS = new Set(['.xlsx', '.xls', '.csv'])

export function isSupportedSpreadsheet(path: string): boolean {
  return SUPPORTED_EXTENSIONS.has(extname(path).toLowerCase())
}

export function isTemplateFile(path: string): boolean {
  return extname(path).toLowerCase() === '.xlsx'
}

export function detectFormat(path: string): SpreadsheetFormat {
  const ext = extname(path).toLowerCase()
  if (ext === '.xls') return 'xls'
  if (ext === '.csv') return 'csv'
  return 'xlsx'
}

export function getSheetDimensions(sheet: XLSX.WorkSheet): { rowCount: number; columnCount: number } {
  const ref = sheet['!ref']
  if (!ref) {
    return { rowCount: 0, columnCount: 0 }
  }

  const range = XLSX.utils.decode_range(ref)
  return {
    rowCount: range.e.r - range.s.r + 1,
    columnCount: range.e.c - range.s.c + 1
  }
}

export function readWorkbook(path: string, format: SpreadsheetFormat): XLSX.WorkBook {
  if (format === 'csv') {
    const buffer = readFileSync(path)
    return XLSX.read(buffer, { type: 'buffer', raw: false, cellDates: true })
  }

  return XLSX.readFile(path, { cellDates: true })
}

export function readSourceFileMetadata(path: string, id: string): SourceFile {
  const format = detectFormat(path)
  const workbook = readWorkbook(path, format)
  const fileName = basename(path)

  let sheets: SourceSheet[]

  if (format === 'csv') {
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const { rowCount, columnCount } = getSheetDimensions(sheet)
    const sheetName = basename(fileName, extname(fileName))

    sheets = [
      {
        id: `${id}-sheet-0`,
        name: sheetName,
        rowCount,
        columnCount
      }
    ]
  } else {
    sheets = workbook.SheetNames.map((name, index) => {
      const sheet = workbook.Sheets[name]
      const { rowCount, columnCount } = getSheetDimensions(sheet)
      return {
        id: `${id}-sheet-${index}`,
        name,
        rowCount,
        columnCount
      }
    })
  }

  return {
    id,
    path,
    name: fileName,
    format,
    sheets
  }
}

export function readSheetRows(filePath: string, sheetName: string, format: SpreadsheetFormat): unknown[][] {
  const workbook = readWorkbook(filePath, format)
  const targetName = format === 'csv' ? workbook.SheetNames[0] : sheetName
  const sheet = workbook.Sheets[targetName]

  if (!sheet) {
    throw new Error(`Sheet "${sheetName}" not found in ${basename(filePath)}`)
  }

  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
    raw: true
  })

  return rows as unknown[][]
}

export function readTemplateMetadata(path: string): SourceFile {
  if (!isTemplateFile(path)) {
    throw new Error('Template files must be .xlsx workbooks.')
  }

  return readSourceFileMetadata(path, 'template')
}
