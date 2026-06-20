const PLACEHOLDER_PATTERN = /\{([^}]+)\}/g
const INVALID_FILE_CHARS = /[<>:"/\\|?*\u0000-\u001f]/g

export function extractPatternConstantNames(pattern: string | undefined): string[] {
  if (!pattern?.trim()) return []

  const names = new Set<string>()
  for (const match of pattern.matchAll(PLACEHOLDER_PATTERN)) {
    const name = match[1]?.trim()
    if (name) names.add(name)
  }

  return [...names]
}

export function sanitizeFileNameSegment(value: string): string {
  return value.replace(INVALID_FILE_CHARS, '_').replace(/\s+/g, ' ').trim()
}

export function resolveOutputFileName(
  pattern: string | undefined,
  iterationNumber: number,
  valuesByConstantName: Record<string, string | number | boolean>
): string {
  const normalizedValues = new Map<string, string | number | boolean>()
  for (const [name, value] of Object.entries(valuesByConstantName)) {
    normalizedValues.set(name.trim().toLowerCase(), value)
  }

  let baseName: string

  if (!pattern?.trim()) {
    baseName = String(iterationNumber)
  } else {
    baseName = pattern.replace(PLACEHOLDER_PATTERN, (_, rawName: string) => {
      const key = rawName.trim().toLowerCase()
      const value = normalizedValues.get(key)
      if (value === undefined) {
        throw new Error(`Pattern references constant "${rawName.trim()}", which has no value in this row.`)
      }
      return sanitizeFileNameSegment(String(value))
    })
    baseName = sanitizeFileNameSegment(baseName)
  }

  if (!baseName) {
    throw new Error('Resolved output file name is empty.')
  }

  return baseName.toLowerCase().endsWith('.xlsx') ? baseName : `${baseName}.xlsx`
}
