import { existsSync, readFileSync, writeFileSync } from 'fs'
import { basename, resolve } from 'path'
import { randomUUID } from 'crypto'
import { sheeterProjectFileSchema } from '../shared/schemas'
import { configDirectory, relativizeForExport, toPortablePath } from '../shared/paths'
import type { ProjectConfig, ProjectTemplate, SheeterProjectFile, SourceFile } from '../shared/types/project'
import { readSourceFileMetadata, readTemplateMetadata } from './spreadsheet/reader'

function buildTemplateFromPath(path: string, sheetIds?: Array<{ id: string; name: string }>): ProjectTemplate {
  const metadata = readTemplateMetadata(path)
  const idByName = new Map((sheetIds ?? []).map((sheet) => [sheet.name, sheet.id]))

  return {
    path,
    name: metadata.name,
    sheets: metadata.sheets.map((sheet) => ({
      id: idByName.get(sheet.name) ?? randomUUID(),
      name: sheet.name,
      rowCount: sheet.rowCount,
      columnCount: sheet.columnCount
    }))
  }
}

function buildSourceFromPath(path: string, id: string): SourceFile {
  return readSourceFileMetadata(path, id)
}

function resolvePathFromConfig(baseDir: string, storedPath: string): string {
  const absolute = resolve(baseDir, storedPath.split('/').join('/'))
  if (!existsSync(absolute)) {
    throw new Error(`Referenced file not found: ${basename(storedPath)} (${absolute})`)
  }
  return absolute
}

export function serializeProjectConfig(
  config: ProjectConfig,
  configFilePath: string
): { file: SheeterProjectFile; warnings: string[] } {
  if (!config.template) {
    throw new Error('A template must be selected before exporting the project configuration.')
  }

  const warnings: string[] = []
  const baseDir = configDirectory(configFilePath)

  const templateRel = relativizeForExport(baseDir, config.template.path)
  if (templateRel.outsideBase) {
    warnings.push(
      `Template "${config.template.name}" is outside the configuration directory and will be stored as "${templateRel.path}".`
    )
  }

  const sourceFiles = config.sourceFiles.map((file) => {
    const rel = relativizeForExport(baseDir, file.path)
    if (rel.outsideBase) {
      warnings.push(
        `Source file "${file.name}" is outside the configuration directory and will be stored as "${rel.path}".`
      )
    }

    return {
      id: file.id,
      path: toPortablePath(rel.path)
    }
  })

  const file = {
    version: 1 as const,
    name: config.name,
    exportedAt: new Date().toISOString(),
    template: {
      path: toPortablePath(templateRel.path),
      sheets: config.template.sheets.map((sheet) => ({ id: sheet.id, name: sheet.name }))
    },
    sourceFiles,
    constants: config.constants,
    mappings: config.mappings,
    automation: config.automation
  }

  return {
    file: sheeterProjectFileSchema.parse(file),
    warnings
  }
}

export function writeProjectConfigFile(config: ProjectConfig, configFilePath: string): string[] {
  const { file, warnings } = serializeProjectConfig(config, configFilePath)
  writeFileSync(configFilePath, `${JSON.stringify(file, null, 2)}\n`, 'utf8')
  return warnings
}

export function loadProjectConfigFile(configFilePath: string): ProjectConfig {
  const raw = readFileSync(configFilePath, 'utf8')
  const parsed = sheeterProjectFileSchema.parse(JSON.parse(raw))
  const baseDir = configDirectory(configFilePath)

  const templatePath = resolvePathFromConfig(baseDir, parsed.template.path)
  const template = buildTemplateFromPath(templatePath, parsed.template.sheets)

  const sourceFiles = parsed.sourceFiles.map((file) => {
    const absolutePath = resolvePathFromConfig(baseDir, file.path)
    return buildSourceFromPath(absolutePath, file.id)
  })

  return {
    name: parsed.name,
    template,
    sourceFiles,
    constants: parsed.constants,
    mappings: parsed.mappings,
    automation: parsed.automation
  }
}

export function createTemplateFromPath(path: string): ProjectTemplate {
  return buildTemplateFromPath(path)
}

export function refreshProjectMetadata(config: ProjectConfig): ProjectConfig {
  return {
    ...config,
    template: config.template
      ? buildTemplateFromPath(
          config.template.path,
          config.template.sheets.map((sheet) => ({ id: sheet.id, name: sheet.name }))
        )
      : null,
    sourceFiles: config.sourceFiles.map((file) => buildSourceFromPath(file.path, file.id))
  }
}
