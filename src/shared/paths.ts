import { dirname, join, relative, resolve } from 'path'

export function toPortablePath(filePath: string): string {
  return filePath.split('\\').join('/')
}

export function toRelativePath(baseDir: string, absolutePath: string): string {
  const rel = relative(resolve(baseDir), resolve(absolutePath))
  return toPortablePath(rel)
}

export function fromRelativePath(baseDir: string, relativePath: string): string {
  return resolve(resolve(baseDir), relativePath.split('/').join('/'))
}

export function configDirectory(configFilePath: string): string {
  return dirname(resolve(configFilePath))
}

export function joinConfigPath(configFilePath: string, relativePath: string): string {
  return fromRelativePath(configDirectory(configFilePath), relativePath)
}

export function isPathInsideBase(baseDir: string, targetPath: string): boolean {
  const base = resolve(baseDir)
  const target = resolve(targetPath)
  return target === base || target.startsWith(`${base}${base.endsWith('/') ? '' : '/'}`)
}

export function relativizeForExport(baseDir: string, absolutePath: string): {
  path: string
  outsideBase: boolean
} {
  const normalizedBase = resolve(baseDir)
  const normalizedPath = resolve(absolutePath)
  const rel = toRelativePath(normalizedBase, normalizedPath)
  const outsideBase = rel.startsWith('..')
  return { path: rel, outsideBase }
}

export function resolveProjectPath(configDir: string, storedPath: string): string {
  return fromRelativePath(configDir, storedPath)
}

export function ensureJsonExtension(filePath: string): string {
  return filePath.endsWith('.json') ? filePath : `${filePath}.json`
}

export function defaultConfigPath(configDir: string): string {
  return join(configDir, 'sheeter.config.json')
}
