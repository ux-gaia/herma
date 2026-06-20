import { basename, extname } from 'path'
import { readFileSync } from 'fs'
import * as XLSX from 'xlsx'
import type {
  BlockSelection,
  ColumnFilter,
  ColumnRef,
  ColumnSelection,
  ProjectConstant,
  RowSelection,
  SourceFile,
  SourceSelection,
  SourceSheet,
  SpreadsheetFormat
} from '../../shared/types/project'
import { resolveFilterValue } from '../../shared/validation'

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

export function readTemplateMetadata(path: string): Omit<SourceFile, 'format'> & { format: 'xlsx' } {
  const file = readSourceFileMetadata(path, 'template')
  if (file.format !== 'xlsx') {
    throw new Error('Template files must be .xlsx workbooks.')
  }

  return {
    ...file,
    format: 'xlsx'
  }
}

export function readSheetRows(
  filePath: string,
  sheetName: string,
  format: SpreadsheetFormat
): unknown[][] {
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

function normalizeRange(start: number, end: number): [number, number] {
  return start <= end ? [start, end] : [end, start]
}

function getCellValue(rows: unknown[][], row1Based: number, col1Based: number): unknown {
  return rows[row1Based - 1]?.[col1Based - 1] ?? ''
}

function valuesEqual(left: unknown, right: string | number | boolean): boolean {
  if (typeof right === 'number') {
    const parsed = Number(left)
    return !Number.isNaN(parsed) && parsed === right
  }

  if (typeof right === 'boolean') {
    return String(left).trim().toLowerCase() === String(right).toLowerCase()
  }

  return String(left).trim().toLowerCase() === String(right).trim().toLowerCase()
}

export function resolveColumnRef(
  rows: unknown[][],
  ref: ColumnRef,
  headerRow = 1,
  context = 'column'
): number {
  if (ref.mode === 'index') {
    if (!ref.index || ref.index < 1) {
      throw new Error(`${context} index must be a positive number.`)
    }
    return ref.index
  }

  if (!ref.name?.trim()) {
    throw new Error(`${context} header name is required.`)
  }

  const header = rows[headerRow - 1]
  if (!header) {
    throw new Error(`Header row ${headerRow} was not found.`)
  }

  const matches: number[] = []
  header.forEach((cell, index) => {
    if (String(cell).trim().toLowerCase() === ref.name!.trim().toLowerCase()) {
      matches.push(index + 1)
    }
  })

  if (matches.length === 0) {
    throw new Error(`Column header "${ref.name}" was not found.`)
  }

  if (matches.length > 1) {
    throw new Error(`Column header "${ref.name}" is duplicated. Use column indexes instead.`)
  }

  return matches[0]!
}

function rowMatchesFilters(
  rows: unknown[][],
  rowIndex1Based: number,
  filters: ColumnFilter[],
  constants: ProjectConstant[],
  headerRow: number,
  ruleLabel: string
): boolean {
  for (const filter of filters) {
    const columnIndex = resolveColumnRef(rows, filter.column, headerRow, 'Filter column')
    const expected = resolveFilterValue(filter.value, constants, ruleLabel)
    const actual = getCellValue(rows, rowIndex1Based, columnIndex)
    if (!valuesEqual(actual, expected)) {
      return false
    }
  }

  return true
}

function getSheetColumnCount(rows: unknown[][]): number {
  let max = 0
  for (const row of rows) {
    max = Math.max(max, row.length)
  }
  return max
}

function resolveMatchedHeaderIndexes(
  rows: unknown[][],
  names: string[],
  headerRow: number
): number[] {
  const header = rows[headerRow - 1]
  if (!header) {
    throw new Error(`Header row ${headerRow} was not found.`)
  }

  const matched = new Set<number>()

  for (const name of names) {
    const trimmed = name.trim()
    if (!trimmed) {
      continue
    }

    const indexes: number[] = []
    header.forEach((cell, index) => {
      if (String(cell).trim().toLowerCase() === trimmed.toLowerCase()) {
        indexes.push(index + 1)
      }
    })

    if (indexes.length === 0) {
      throw new Error(`Column header "${name}" was not found.`)
    }

    for (const index of indexes) {
      matched.add(index)
    }
  }

  return [...matched].sort((left, right) => left - right)
}

function invertColumnIndexes(
  rows: unknown[][],
  excludedIndexes: number[],
  ruleLabel: string
): number[] {
  const excluded = new Set(excludedIndexes)
  const count = getSheetColumnCount(rows)

  if (count === 0) {
    throw new Error(`Rule "${ruleLabel}" cannot invert column selection on an empty sheet.`)
  }

  const included = Array.from({ length: count }, (_, index) => index + 1).filter(
    (columnIndex) => !excluded.has(columnIndex)
  )

  if (included.length === 0) {
    throw new Error(`Rule "${ruleLabel}" would copy no columns after inverting the selection.`)
  }

  return included
}

function resolveColumnIndexes(
  rows: unknown[][],
  selection: ColumnSelection,
  ruleLabel: string
): number[] {
  const headerRow = selection.headerRow ?? 1

  if (selection.mode === 'index') {
    if (!selection.columns?.length) {
      throw new Error(`Rule "${ruleLabel}" must specify at least one column index.`)
    }

    if (selection.invert) {
      return invertColumnIndexes(rows, selection.columns, ruleLabel)
    }

    return selection.columns
  }

  if (!selection.names?.length) {
    throw new Error(`Rule "${ruleLabel}" must specify at least one column header.`)
  }

  if (selection.invert) {
    const excluded = resolveMatchedHeaderIndexes(rows, selection.names, headerRow)
    return invertColumnIndexes(rows, excluded, ruleLabel)
  }

  return selection.names.map((name) =>
    resolveColumnRef(rows, { mode: 'header', name }, headerRow, 'Column')
  )
}

function extractRowValues(rows: unknown[][], rowIndex1Based: number, columnIndexes: number[]): unknown[] {
  return columnIndexes.map((columnIndex) => getCellValue(rows, rowIndex1Based, columnIndex))
}

export function extractColumnSelection(
  rows: unknown[][],
  selection: ColumnSelection,
  constants: ProjectConstant[],
  ruleLabel: string
): unknown[][] {
  const headerRow = selection.headerRow ?? 1
  const columnIndexes = resolveColumnIndexes(rows, selection, ruleLabel)
  const filters = selection.filters ?? []
  const result: unknown[][] = []

  if (rows.length === 0) {
    return result
  }

  const hasFilters = filters.length > 0

  if (hasFilters && headerRow <= rows.length) {
    result.push(extractRowValues(rows, headerRow, columnIndexes))
  }

  const startRow = hasFilters ? headerRow + 1 : 1

  for (let rowIndex = startRow; rowIndex <= rows.length; rowIndex += 1) {
    if (hasFilters && !rowMatchesFilters(rows, rowIndex, filters, constants, headerRow, ruleLabel)) {
      continue
    }

    result.push(extractRowValues(rows, rowIndex, columnIndexes))
  }

  return result
}

export function extractRowSelection(rows: unknown[][], selection: RowSelection): unknown[][] {
  const [startRow, endRow] = normalizeRange(selection.startRow, selection.endRow)
  const result: unknown[][] = []

  for (let rowIndex = startRow; rowIndex <= endRow; rowIndex += 1) {
    const row = rows[rowIndex - 1]
    if (!row) continue
    result.push([...row])
  }

  return result
}

export function extractBlockSelection(rows: unknown[][], selection: BlockSelection): unknown[][] {
  const [startCol, endCol] = normalizeRange(selection.startCol, selection.endCol)
  const [startRow, endRow] = normalizeRange(selection.startRow, selection.endRow)
  const result: unknown[][] = []

  for (let rowIndex = startRow; rowIndex <= endRow; rowIndex += 1) {
    const values: unknown[] = []
    for (let colIndex = startCol; colIndex <= endCol; colIndex += 1) {
      values.push(getCellValue(rows, rowIndex, colIndex))
    }
    result.push(values)
  }

  return result
}

export function extractSheetSelection(rows: unknown[][]): unknown[][] {
  return rows.map((row) => [...row])
}

export interface LocatedCell {
  col: number
  row: number
  value: unknown
}

export function extractSelectionWithLocations(
  rows: unknown[][],
  selection: SourceSelection,
  constants: ProjectConstant[],
  ruleLabel: string
): LocatedCell[][] {
  switch (selection.kind) {
    case 'columns': {
      if (!selection.columns) {
        throw new Error(`Rule "${ruleLabel}" is missing column selection.`)
      }
      return extractColumnSelectionWithLocations(rows, selection.columns, constants, ruleLabel)
    }
    case 'rows': {
      if (!selection.rows) {
        throw new Error(`Rule "${ruleLabel}" is missing row selection.`)
      }
      return extractRowSelectionWithLocations(rows, selection.rows)
    }
    case 'block': {
      if (!selection.block) {
        throw new Error(`Rule "${ruleLabel}" is missing block selection.`)
      }
      return extractBlockSelectionWithLocations(rows, selection.block)
    }
    case 'sheet':
      return extractSheetSelectionWithLocations(rows)
    default:
      throw new Error(`Unsupported selection kind for rule "${ruleLabel}".`)
  }
}

function extractColumnSelectionWithLocations(
  rows: unknown[][],
  selection: ColumnSelection,
  constants: ProjectConstant[],
  ruleLabel: string
): LocatedCell[][] {
  const headerRow = selection.headerRow ?? 1
  const columnIndexes = resolveColumnIndexes(rows, selection, ruleLabel)
  const filters = selection.filters ?? []
  const result: LocatedCell[][] = []

  if (rows.length === 0) {
    return result
  }

  const hasFilters = filters.length > 0

  if (hasFilters && headerRow <= rows.length) {
    result.push(
      columnIndexes.map((col) => ({
        col,
        row: headerRow,
        value: getCellValue(rows, headerRow, col)
      }))
    )
  }

  const startRow = hasFilters ? headerRow + 1 : 1

  for (let rowIndex = startRow; rowIndex <= rows.length; rowIndex += 1) {
    if (hasFilters && !rowMatchesFilters(rows, rowIndex, filters, constants, headerRow, ruleLabel)) {
      continue
    }

    result.push(
      columnIndexes.map((col) => ({
        col,
        row: rowIndex,
        value: getCellValue(rows, rowIndex, col)
      }))
    )
  }

  return result
}

function extractRowSelectionWithLocations(rows: unknown[][], selection: RowSelection): LocatedCell[][] {
  const [startRow, endRow] = normalizeRange(selection.startRow, selection.endRow)
  const result: LocatedCell[][] = []

  for (let rowIndex = startRow; rowIndex <= endRow; rowIndex += 1) {
    const row = rows[rowIndex - 1]
    if (!row) continue

    result.push(
      row.map((value, index) => ({
        col: index + 1,
        row: rowIndex,
        value
      }))
    )
  }

  return result
}

function extractBlockSelectionWithLocations(
  rows: unknown[][],
  selection: BlockSelection
): LocatedCell[][] {
  const [startCol, endCol] = normalizeRange(selection.startCol, selection.endCol)
  const [startRow, endRow] = normalizeRange(selection.startRow, selection.endRow)
  const result: LocatedCell[][] = []

  for (let rowIndex = startRow; rowIndex <= endRow; rowIndex += 1) {
    const locatedRow: LocatedCell[] = []
    for (let colIndex = startCol; colIndex <= endCol; colIndex += 1) {
      locatedRow.push({
        col: colIndex,
        row: rowIndex,
        value: getCellValue(rows, rowIndex, colIndex)
      })
    }
    result.push(locatedRow)
  }

  return result
}

function extractSheetSelectionWithLocations(rows: unknown[][]): LocatedCell[][] {
  return rows.map((row, rowIndex) =>
    row.map((value, colIndex) => ({
      col: colIndex + 1,
      row: rowIndex + 1,
      value
    }))
  )
}
