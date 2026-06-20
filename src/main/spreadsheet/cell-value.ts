import type { CellValue } from 'exceljs'

export function parseLocaleNumber(input: string): number | null {
  let normalized = input.trim().replace(/[\s\u00A0]/g, '')
  if (!normalized) {
    return null
  }

  normalized = normalized.replace(/[€$£¥%]/g, '')

  const hasComma = normalized.includes(',')
  const hasDot = normalized.includes('.')

  if (hasComma && hasDot) {
    const lastComma = normalized.lastIndexOf(',')
    const lastDot = normalized.lastIndexOf('.')
    if (lastComma > lastDot) {
      normalized = normalized.replace(/\./g, '').replace(',', '.')
    } else {
      normalized = normalized.replace(/,/g, '')
    }
  } else if (hasComma) {
    normalized = normalized.replace(',', '.')
  }

  if (!/^-?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(normalized)) {
    return null
  }

  if (/^0\d+$/.test(normalized)) {
    return null
  }

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

export function toExcelCellValue(value: unknown): CellValue {
  if (value === null || value === undefined || value === '') {
    return null
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : String(value)
  }

  if (typeof value === 'boolean') {
    return value
  }

  if (value instanceof Date) {
    return value
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed === '') {
      return null
    }

    const numeric = parseLocaleNumber(trimmed)
    if (numeric !== null) {
      return numeric
    }

    const lower = trimmed.toLowerCase()
    if (lower === 'true') return true
    if (lower === 'false') return false

    return value
  }

  return String(value)
}
