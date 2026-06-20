import { readdir } from 'fs/promises'
import { basename, extname, join } from 'path'
import * as XLSX from 'xlsx'
import { detectFormat, isSupportedSpreadsheet, readWorkbook } from './reader'

const INVALID_SHEET_CHARS = /[[\]:*?/\\]/g

export interface DirectoryMergeResult {
  mergedCount: number
  skippedMultiSheet: string[]
  skippedUnreadable: string[]
  outputPath: string
}

function sanitizeSheetName(name: string): string {
  return name.replace(INVALID_SHEET_CHARS, '_').slice(0, 31) || 'Sheet'
}

function uniqueSheetName(baseName: string, used: Set<string>): string {
  const sanitized = sanitizeSheetName(baseName)
  let candidate = sanitized
  let suffix = 1

  while (used.has(candidate.toLowerCase())) {
    const prefix = sanitized.slice(0, 28)
    candidate = `${prefix}_${suffix}`
    suffix += 1
  }

  used.add(candidate.toLowerCase())
  return candidate
}

export async function listSpreadsheetFiles(directoryPath: string): Promise<string[]> {
  const entries = await readdir(directoryPath, { withFileTypes: true })

  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => join(directoryPath, entry.name))
    .filter(isSupportedSpreadsheet)
    .sort((left, right) => left.localeCompare(right))
}

export function mergeSingleSheetFiles(
  filePaths: string[],
  outputPath: string
): Omit<DirectoryMergeResult, 'outputPath'> {
  const outputWorkbook = XLSX.utils.book_new()
  const usedSheetNames = new Set<string>()
  const skippedMultiSheet: string[] = []
  const skippedUnreadable: string[] = []
  let mergedCount = 0

  for (const filePath of filePaths) {
    try {
      const format = detectFormat(filePath)
      const workbook = readWorkbook(filePath, format)

      if (workbook.SheetNames.length !== 1) {
        skippedMultiSheet.push(basename(filePath))
        continue
      }

      const sourceSheetName = workbook.SheetNames[0]!
      const worksheet = workbook.Sheets[sourceSheetName]
      if (!worksheet) {
        skippedUnreadable.push(basename(filePath))
        continue
      }

      const baseName = basename(filePath, extname(filePath))
      const targetSheetName = uniqueSheetName(baseName, usedSheetNames)
      XLSX.utils.book_append_sheet(outputWorkbook, worksheet, targetSheetName)
      mergedCount += 1
    } catch {
      skippedUnreadable.push(basename(filePath))
    }
  }

  if (mergedCount === 0) {
    throw new Error('No spreadsheets with a single sheet were found to merge.')
  }

  XLSX.writeFile(outputWorkbook, outputPath, { bookType: 'xlsx' })

  return {
    mergedCount,
    skippedMultiSheet,
    skippedUnreadable
  }
}

export async function mergeDirectorySpreadsheets(
  directoryPath: string,
  outputPath: string
): Promise<DirectoryMergeResult> {
  const filePaths = await listSpreadsheetFiles(directoryPath)

  if (filePaths.length === 0) {
    throw new Error('The selected directory does not contain any spreadsheet files.')
  }

  const result = mergeSingleSheetFiles(filePaths, outputPath)
  return { ...result, outputPath }
}
