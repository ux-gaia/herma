import type { MergeSheetsRule, SheetReference, SourceFile } from '../../shared/types/project'
import { readSheetRows } from './reader'

export function collectAllSourceSheets(sourceFiles: SourceFile[]): SheetReference[] {
  return sourceFiles.flatMap((file) =>
    file.sheets.map((sheet) => ({
      sourceFileId: file.id,
      sourceSheetId: sheet.id
    }))
  )
}

export function extractMergeSheetsData(
  rule: MergeSheetsRule,
  sourceFiles: SourceFile[]
): unknown[][] {
  const sources = collectAllSourceSheets(sourceFiles)
  const label = rule.label ?? rule.id

  if (sources.length < 2) {
    throw new Error(
      `Merge rule "${label}" requires at least two source sheets across imported files.`
    )
  }

  const combined: unknown[][] = []

  for (const [index, reference] of sources.entries()) {
    const sourceFile = sourceFiles.find((file) => file.id === reference.sourceFileId)
    if (!sourceFile) {
      throw new Error(`Source file not found for merge rule "${label}".`)
    }

    const sourceSheet = sourceFile.sheets.find((sheet) => sheet.id === reference.sourceSheetId)
    if (!sourceSheet) {
      throw new Error(`Source sheet not found for merge rule "${label}".`)
    }

    const rows = readSheetRows(sourceFile.path, sourceSheet.name, sourceFile.format)
    const shouldSkipHeader = index > 0 && rule.skipHeadersAfterFirst
    const slice = shouldSkipHeader ? rows.slice(rule.headerRow) : rows

    combined.push(...slice)
  }

  return combined
}
