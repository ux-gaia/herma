import type {
  MergeOriginColumn,
  MergeSheetsRule,
  SourceFile,
  SourceSheet
} from '../../shared/types/project'
import { readSheetRows } from './reader'

interface SourceSheetEntry {
  sourceFile: SourceFile
  sourceSheet: SourceSheet
}

export interface MergedTabData {
  tabName: string
  rows: unknown[][]
}

export function collectAllSourceSheetEntries(sourceFiles: SourceFile[]): SourceSheetEntry[] {
  return sourceFiles.flatMap((sourceFile) =>
    sourceFile.sheets.map((sourceSheet) => ({
      sourceFile,
      sourceSheet
    }))
  )
}

export function resolveMergeOriginValue(fileName: string, column: MergeOriginColumn): string {
  switch (column.mode) {
    case 'fixed':
      return column.fixedValue ?? ''
    case 'filename':
      return fileName
    case 'regex': {
      const pattern = column.regex?.trim()
      if (!pattern) {
        return fileName
      }

      try {
        const match = fileName.match(new RegExp(pattern))
        if (!match) {
          return fileName
        }

        return match[1] ?? match[0]
      } catch {
        return fileName
      }
    }
    default:
      return fileName
  }
}

function prependOriginColumn(
  rows: unknown[][],
  header: string,
  originValue: string,
  isFirstSourceInGroup: boolean
): unknown[][] {
  if (rows.length === 0) {
    return []
  }

  return rows.map((row, rowIndex) => {
    const firstCell = isFirstSourceInGroup && rowIndex === 0 ? header : originValue
    return [firstCell, ...row]
  })
}

export function extractMergeSheetsByTabName(
  rule: MergeSheetsRule,
  sourceFiles: SourceFile[]
): MergedTabData[] {
  const entries = collectAllSourceSheetEntries(sourceFiles)
  const label = rule.label ?? rule.id

  if (entries.length < 2) {
    throw new Error(
      `Merge rule "${label}" requires at least two source sheets across imported files.`
    )
  }

  const groups = new Map<string, SourceSheetEntry[]>()
  const tabOrder: string[] = []

  for (const entry of entries) {
    const tabName = entry.sourceSheet.name
    const existing = groups.get(tabName)

    if (existing) {
      existing.push(entry)
    } else {
      groups.set(tabName, [entry])
      tabOrder.push(tabName)
    }
  }

  return tabOrder.map((tabName) => {
    const sources = groups.get(tabName) ?? []
    const combined: unknown[][] = []

    for (const [index, { sourceFile, sourceSheet }] of sources.entries()) {
      const rows = readSheetRows(sourceFile.path, sourceSheet.name, sourceFile.format)
      const shouldSkipHeader = index > 0 && rule.skipHeadersAfterFirst
      const slice = shouldSkipHeader ? rows.slice(rule.headerRow) : rows

      if (rule.originColumn?.enabled) {
        const originValue = resolveMergeOriginValue(sourceFile.name, rule.originColumn)
        combined.push(
          ...prependOriginColumn(slice, rule.originColumn.header, originValue, index === 0)
        )
      } else {
        combined.push(...slice)
      }
    }

    return { tabName, rows: combined }
  })
}
