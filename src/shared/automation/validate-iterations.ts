import type { IterationRowValidation, IterationSheetValidation } from '../types/automation'
import type { CopyRule, ProjectConstant } from '../types/project'
import { isEmptyConstantValue, parseConstantValue } from './parse-value'
import { getRequiredConstantNames, normalizeConstantName } from './required-constants'
import { extractPatternConstantNames, resolveOutputFileName } from './output-name'

export interface IterationSheetInput {
  headerRowNumber: number
  headers: string[]
  dataRows: Array<{ excelRowNumber: number; cells: unknown[] }>
}

function findUnknownPatternConstants(
  outputNamePattern: string | undefined,
  constants: ProjectConstant[]
): string[] {
  const known = new Set(constants.map((constant) => normalizeConstantName(constant.name)))
  return extractPatternConstantNames(outputNamePattern).filter(
    (name) => !known.has(normalizeConstantName(name))
  )
}

function mapHeaders(headers: string[]): {
  columns: Array<{ index: number; name: string; normalized: string }>
  errors: string[]
} {
  const errors: string[] = []
  const columns: Array<{ index: number; name: string; normalized: string }> = []
  const seen = new Set<string>()

  headers.forEach((header, index) => {
    const trimmed = String(header ?? '').trim()
    if (!trimmed) {
      errors.push(`Header row contains an empty column name at position ${index + 1}.`)
      return
    }

    const normalized = normalizeConstantName(trimmed)
    if (seen.has(normalized)) {
      errors.push(`Duplicate header "${trimmed}".`)
      return
    }

    seen.add(normalized)
    columns.push({ index, name: trimmed, normalized })
  })

  return { columns, errors }
}

function buildColumnLookup(
  columns: Array<{ index: number; name: string; normalized: string }>,
  requiredNames: string[]
): { lookup: Map<string, number>; missing: string[] } {
  const byNormalized = new Map(columns.map((column) => [column.normalized, column.index]))
  const missing = requiredNames.filter((name) => !byNormalized.has(normalizeConstantName(name)))
  return { lookup: byNormalized, missing }
}

export function validateIterationSheet(
  input: IterationSheetInput,
  mappings: CopyRule[],
  constants: ProjectConstant[],
  outputNamePattern: string | undefined
): IterationSheetValidation {
  const errors: string[] = []
  const warnings: string[] = []

  const unknownPatternConstants = findUnknownPatternConstants(outputNamePattern, constants)
  if (unknownPatternConstants.length > 0) {
    errors.push(
      `Output name pattern references unknown constants: ${unknownPatternConstants.join(', ')}.`
    )
  }

  const requiredConstants = getRequiredConstantNames(mappings, outputNamePattern, constants)
  const { columns, errors: headerErrors } = mapHeaders(input.headers)
  errors.push(...headerErrors)

  if (input.dataRows.length === 0) {
    errors.push('The iteration sheet must contain at least one data row below the header.')
  }

  const { lookup, missing } = buildColumnLookup(columns, requiredConstants)
  if (missing.length > 0) {
    errors.push(`Missing columns for required constants: ${missing.join(', ')}.`)
  }

  const usedNormalized = new Set(requiredConstants.map(normalizeConstantName))
  const extraColumns = columns.filter((column) => !usedNormalized.has(column.normalized))
  if (extraColumns.length > 0) {
    warnings.push(
      `Unused columns in iteration sheet: ${extraColumns.map((column) => column.name).join(', ')}.`
    )
  }

  const rows: IterationRowValidation[] = []
  const resolvedNames = new Map<string, number[]>()

  input.dataRows.forEach((row, index) => {
    const iterationNumber = index + 1
    const rowErrors: string[] = []
    const values: Record<string, string | number | boolean> = {}

    for (const constantName of requiredConstants) {
      const columnIndex = lookup.get(normalizeConstantName(constantName))
      if (columnIndex === undefined) continue

      const rawValue = row.cells[columnIndex]
      if (isEmptyConstantValue(rawValue)) {
        rowErrors.push(`Row ${row.excelRowNumber}: missing value for constant "${constantName}".`)
        continue
      }

      values[constantName] = parseConstantValue(rawValue)
    }

    let resolvedOutputName = ''
    if (rowErrors.length === 0) {
      try {
        resolvedOutputName = resolveOutputFileName(outputNamePattern, iterationNumber, values)
        const existing = resolvedNames.get(resolvedOutputName.toLowerCase()) ?? []
        existing.push(row.excelRowNumber)
        resolvedNames.set(resolvedOutputName.toLowerCase(), existing)
      } catch (error) {
        rowErrors.push(
          error instanceof Error
            ? `Row ${row.excelRowNumber}: ${error.message}`
            : `Row ${row.excelRowNumber}: invalid output file name.`
        )
      }
    }

    rows.push({
      rowIndex: row.excelRowNumber,
      iterationNumber,
      values,
      resolvedOutputName,
      valid: rowErrors.length === 0,
      errors: rowErrors
    })
  })

  for (const [fileName, rowNumbers] of resolvedNames.entries()) {
    if (rowNumbers.length > 1) {
      errors.push(
        `Rows ${rowNumbers.join(', ')} produce the same output file name "${fileName}".`
      )
      for (const row of rows) {
        if (row.resolvedOutputName.toLowerCase() === fileName) {
          row.valid = false
          row.errors.push(`Duplicate output file name "${fileName}".`)
        }
      }
    }
  }

  const valid = errors.length === 0 && rows.length > 0 && rows.every((row) => row.valid)

  return {
    valid,
    errors,
    warnings,
    requiredConstants,
    rows
  }
}

export function applyRowConstants(
  projectConstants: ProjectConstant[],
  rowValues: Record<string, string | number | boolean>
): ProjectConstant[] {
  const valuesByNormalized = new Map<string, string | number | boolean>()
  for (const [name, value] of Object.entries(rowValues)) {
    valuesByNormalized.set(normalizeConstantName(name), value)
  }

  return projectConstants.map((constant) => {
    const override = valuesByNormalized.get(normalizeConstantName(constant.name))
    if (override === undefined) return constant
    return { ...constant, value: override }
  })
}
