export function parseConstantValue(raw: unknown): string | number | boolean {
  if (typeof raw === 'boolean') return raw
  if (typeof raw === 'number') return raw
  if (raw === null || raw === undefined) return ''

  const trimmed = String(raw).trim()
  if (trimmed.toLowerCase() === 'true') return true
  if (trimmed.toLowerCase() === 'false') return false
  if (trimmed !== '' && !Number.isNaN(Number(trimmed))) return Number(trimmed)
  return String(raw)
}

export function isEmptyConstantValue(value: unknown): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim() === ''
  return false
}
