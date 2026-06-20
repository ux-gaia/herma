import { basename } from 'path'
import { detectFormat, readSheetRows, readSourceFileMetadata } from './reader'
import type { IterationSheetInput } from '../../shared/automation/validate-iterations'

export function loadIterationSheetInput(
  filePath: string,
  headerRow = 1
): IterationSheetInput {
  if (headerRow < 1) {
    throw new Error('Header row must be a positive integer.')
  }

  const format = detectFormat(filePath)
  const metadata = readSourceFileMetadata(filePath, 'iteration-sheet')
  const sheetName = metadata.sheets[0]?.name

  if (!sheetName) {
    throw new Error('The iteration file does not contain any sheets.')
  }

  const rows = readSheetRows(filePath, sheetName, format)
  if (rows.length <= headerRow) {
    throw new Error('The iteration file must contain a header row and at least one data row.')
  }

  const headerCells = rows[headerRow - 1] ?? []
  const headers = headerCells.map((cell) => (cell === null || cell === undefined ? '' : String(cell)))

  const dataRows = rows.slice(headerRow).map((cells, offset) => ({
    excelRowNumber: headerRow + offset + 1,
    cells
  }))

  return {
    headerRowNumber: headerRow,
    headers,
    dataRows
  }
}

export function getIterationFileLabel(filePath: string): string {
  return basename(filePath)
}
