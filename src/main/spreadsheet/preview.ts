import type {
  SelectionKind,
  SelectionPreview,
  SelectionPreviewCell,
  SelectionPreviewRequest,
  SourceSelection
} from '../../shared/types/project'
import { readSheetRows } from './reader'
import { extractSelectionWithLocations } from './selection'

export type { SelectionPreview }

function columnToLetters(col: number): string {
  let value = col
  let letters = ''

  while (value > 0) {
    value -= 1
    letters = String.fromCharCode(65 + (value % 26)) + letters
    value = Math.floor(value / 26)
  }

  return letters || 'A'
}

function formatAddress(col: number, row: number): string {
  return `${columnToLetters(col)}${row}`
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '(empty)'
  }
  if (value instanceof Date) {
    return value.toISOString()
  }
  return String(value)
}

function resolveHint(selection: SourceSelection): string {
  switch (selection.kind) {
    case 'columns': {
      const hasFilters = Boolean(selection.columns?.filters?.length)
      return hasFilters
        ? 'Sample from the selected columns (header row shown when filters are active).'
        : 'Sample from the top-left of the selected columns.'
    }
    case 'rows':
      return 'Sample from the first columns of the selected rows.'
    case 'block':
      return 'Sample from the top-left corner of the selected block.'
    case 'sheet':
      return 'Sample from the top-left of the sheet.'
    default:
      return 'Selection sample.'
  }
}

export function previewSelectionFirstCell(input: SelectionPreviewRequest): SelectionPreview {
  const rows = readSheetRows(input.filePath, input.sheetName, input.format)
  const located = extractSelectionWithLocations(
    rows,
    input.selection,
    input.constants,
    'preview'
  )

  if (located.length === 0) {
    throw new Error('The current selection does not include any cells.')
  }

  const maxCols = Math.max(...located.map((row) => row.length))
  if (maxCols === 0) {
    throw new Error('The current selection does not include any cells.')
  }

  const previewRows = Math.min(2, located.length)
  const previewCols = Math.min(2, maxCols)

  const cells: SelectionPreviewCell[][] = located.slice(0, previewRows).map((row) =>
    row.slice(0, previewCols).map((cell) => ({
      col: cell.col,
      row: cell.row,
      address: formatAddress(cell.col, cell.row),
      value: formatCellValue(cell.value)
    }))
  )

  const topLeft = cells[0]![0]!

  return {
    col: topLeft.col,
    row: topLeft.row,
    address: topLeft.address,
    previewRows,
    previewCols,
    cells,
    hint:
      previewRows >= 2 && previewCols >= 2
        ? `${resolveHint(input.selection)} Showing a 2×2 sample.`
        : `${resolveHint(input.selection)} Showing ${previewRows}×${previewCols} sample.`
  }
}

export function previewSelectionFirstCellSafe(
  input: SelectionPreviewRequest
): SelectionPreview | { error: string } {
  try {
    return previewSelectionFirstCell(input)
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Unable to preview selection.'
    }
  }
}

export function kindSupportsPreview(kind: SelectionKind): boolean {
  return kind === 'columns' || kind === 'rows' || kind === 'block' || kind === 'sheet'
}
