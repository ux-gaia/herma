import { existsSync } from 'fs'
import { join } from 'path'

export function resolveAppIconPath(): string | undefined {
  const candidates = [
    join(__dirname, '../../build/icon.png'),
    join(process.resourcesPath, 'icon.png')
  ]

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate
    }
  }

  return undefined
}
