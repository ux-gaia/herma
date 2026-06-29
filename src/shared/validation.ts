import type {
  CopyRule,
  CopySelectionRule,
  ExportWorkbookConfig,
  FilterValue,
  MergeSheetsRule,
  ProjectConfig,
  ProjectConstant,
  ProjectTemplate,
  SourceSelection
} from './types/project'
import { isCopySelectionRule, isMergeSheetsRule } from './types/project'

export interface ExportValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

function constantNameExists(name: string, constants: ProjectConstant[], excludeId?: string): boolean {
  const normalized = name.trim().toLowerCase()
  return constants.some(
    (constant) => constant.id !== excludeId && constant.name.trim().toLowerCase() === normalized
  )
}

function resolveFilterValue(
  value: FilterValue,
  constants: ProjectConstant[],
  ruleLabel: string
): string | number | boolean {
  if (value.kind === 'literal') {
    if (value.literal === undefined) {
      throw new Error(`Rule "${ruleLabel}" has a filter with an empty literal value.`)
    }
    return value.literal
  }

  const constant = constants.find((item) => item.id === value.constantId)
  if (!constant) {
    throw new Error(`Rule "${ruleLabel}" references a missing constant.`)
  }

  return constant.value
}

export function validateConstants(constants: ProjectConstant[]): string[] {
  const errors: string[] = []
  const seen = new Set<string>()

  for (const constant of constants) {
    const normalized = constant.name.trim().toLowerCase()
    if (!normalized) {
      errors.push('Constants must have a name.')
      continue
    }

    if (seen.has(normalized)) {
      errors.push(`Duplicate constant name "${constant.name}".`)
    } else {
      seen.add(normalized)
    }
  }

  return errors
}

function validateSourceSelection(
  selection: SourceSelection,
  config: ExportWorkbookConfig,
  ruleLabel: string
): string[] {
  const errors: string[] = []
  const sourceFile = config.sourceFiles.find((file) => file.id === selection.sourceFileId)
  if (!sourceFile) {
    errors.push(`Rule "${ruleLabel}" references a missing source file.`)
    return errors
  }

  const sourceSheet = sourceFile.sheets.find((sheet) => sheet.id === selection.sourceSheetId)
  if (!sourceSheet) {
    errors.push(`Rule "${ruleLabel}" references a missing source sheet.`)
    return errors
  }

  if (selection.kind === 'columns') {
    const columns = selection.columns
    if (!columns) {
      errors.push(`Rule "${ruleLabel}" is missing column selection details.`)
    } else if (columns.mode === 'index' && (!columns.columns || columns.columns.length === 0)) {
      errors.push(`Rule "${ruleLabel}" must specify at least one column index.`)
    } else if (columns.mode === 'header' && (!columns.names || columns.names.length === 0)) {
      errors.push(`Rule "${ruleLabel}" must specify at least one column header.`)
    }

    if (columns?.filters?.length) {
      for (const filter of columns.filters) {
        try {
          resolveFilterValue(filter.value, config.constants, ruleLabel)
        } catch (error) {
          errors.push(error instanceof Error ? error.message : String(error))
        }
      }
    }
  }

  if (selection.kind === 'rows') {
    if (!selection.rows) {
      errors.push(`Rule "${ruleLabel}" is missing row selection details.`)
    }
  }

  if (selection.kind === 'block') {
    if (!selection.block) {
      errors.push(`Rule "${ruleLabel}" is missing block selection details.`)
    }
  }

  return errors
}

function validateMergeSheetsRule(
  rule: MergeSheetsRule,
  config: ExportWorkbookConfig,
  ruleLabel: string
): string[] {
  const errors: string[] = []

  if (!rule.resultSheetName.trim()) {
    errors.push(`Merge rule "${ruleLabel}" must specify an output file name.`)
  }

  if (!rule.outputDirectory.trim()) {
    errors.push(`Merge rule "${ruleLabel}" must specify an output directory.`)
  }

  const sheetCount = config.sourceFiles.reduce((total, file) => total + file.sheets.length, 0)
  if (sheetCount < 2) {
    errors.push(
      `Merge rule "${ruleLabel}" requires at least two source sheets across imported files.`
    )
  }

  const originColumn = rule.originColumn
  if (originColumn?.enabled) {
    if (!originColumn.header.trim()) {
      errors.push(`Merge rule "${ruleLabel}" must specify an origin column header.`)
    }

    if (originColumn.mode === 'fixed' && originColumn.fixedValue === undefined) {
      errors.push(`Merge rule "${ruleLabel}" must specify a fixed origin column value.`)
    }

    if (originColumn.mode === 'regex') {
      if (!originColumn.regex?.trim()) {
        errors.push(`Merge rule "${ruleLabel}" must specify a regex pattern for the origin column.`)
      } else {
        try {
          // eslint-disable-next-line no-new
          new RegExp(originColumn.regex)
        } catch {
          errors.push(`Merge rule "${ruleLabel}" has an invalid origin column regex.`)
        }
      }
    }
  }

  return errors
}

function validateDestination(rule: CopySelectionRule, template: ProjectTemplate): string[] {
  const errors: string[] = []
  const sheet = template.sheets.find((item) => item.id === rule.destination.templateSheetId)
  if (!sheet) {
    errors.push(`Rule "${rule.label ?? rule.id}" targets a template sheet that does not exist.`)
  }
  return errors
}

function validateRule(rule: CopyRule, config: ExportWorkbookConfig): string[] {
  const label = rule.label ?? rule.id
  const errors: string[] = []

  if (isCopySelectionRule(rule)) {
    errors.push(...validateSourceSelection(rule.source, config, label))
    if (config.template) {
      errors.push(...validateDestination(rule, config.template))
    }
  } else if (isMergeSheetsRule(rule)) {
    errors.push(...validateMergeSheetsRule(rule, config, label))
  }

  return errors
}

export function validateExportWorkbookConfig(config: ExportWorkbookConfig): ExportValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  const copyRules = config.mappings.filter(isCopySelectionRule)

  if (copyRules.length > 0 && !config.template) {
    errors.push('Select a template workbook before exporting copy rules.')
  }

  errors.push(...validateConstants(config.constants))

  if (config.mappings.length === 0) {
    errors.push('Add at least one rule before exporting.')
  }

  for (const rule of config.mappings) {
    errors.push(...validateRule(rule, config))
  }

  const constantsInUse = new Set<string>()
  for (const rule of config.mappings) {
    if (!isCopySelectionRule(rule)) continue
    for (const filter of rule.source.columns?.filters ?? []) {
      if (filter.value.kind === 'constant' && filter.value.constantId) {
        constantsInUse.add(filter.value.constantId)
      }
    }
  }

  for (const constantId of constantsInUse) {
    if (!config.constants.some((constant) => constant.id === constantId)) {
      errors.push(`A copy rule references constant id "${constantId}", which does not exist.`)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

export function validateProjectConfig(config: ProjectConfig): ExportValidationResult {
  if (!config.template) {
    return {
      valid: false,
      errors: ['Select a template workbook.'],
      warnings: []
    }
  }

  return validateExportWorkbookConfig({
    template: config.template,
    sourceFiles: config.sourceFiles,
    constants: config.constants,
    mappings: config.mappings
  })
}

export function isConstantNameAvailable(
  name: string,
  constants: ProjectConstant[],
  excludeId?: string
): boolean {
  return !constantNameExists(name, constants, excludeId)
}

export { resolveFilterValue }
