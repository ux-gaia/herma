import { join } from 'path'
import { validateExportWorkbookConfig } from '../../shared/validation'
import type {
  AutomationRunRequest,
  AutomationRunResult,
  IterationSheetValidation,
  ValidateIterationSheetRequest
} from '../../shared/types/automation'
import type { ExportWorkbookConfig } from '../../shared/types/project'
import { applyRowConstants, validateIterationSheet } from '../../shared/automation/validate-iterations'
import { loadIterationSheetInput } from './iteration-sheet'
import { writeWorkbook } from './writer'

export function validateAutomationIterationSheet(
  request: ValidateIterationSheetRequest
): IterationSheetValidation {
  const input = loadIterationSheetInput(request.iterationFilePath, request.headerRow ?? 1)
  return validateIterationSheet(
    input,
    request.mappings,
    request.constants,
    request.outputNamePattern
  )
}

export async function runAutomationBatch(
  request: AutomationRunRequest
): Promise<AutomationRunResult> {
  const validation = validateAutomationIterationSheet(request)
  if (!validation.valid) {
    throw new Error(validation.errors.join('\n'))
  }

  const exportConfig: ExportWorkbookConfig = {
    template: request.template,
    sourceFiles: request.sourceFiles,
    constants: request.constants,
    mappings: request.mappings
  }

  const exportValidation = validateExportWorkbookConfig(exportConfig)
  if (!exportValidation.valid) {
    throw new Error(exportValidation.errors.join('\n'))
  }

  if (!request.outputDirectory.trim()) {
    throw new Error('Output directory is required.')
  }

  const results: AutomationRunResult['results'] = []

  for (const row of validation.rows) {
    if (!row.valid) {
      results.push({
        rowIndex: row.rowIndex,
        iterationNumber: row.iterationNumber,
        mergeOutputPaths: [],
        error: row.errors.join(' ')
      })
      continue
    }

    try {
      const constants = applyRowConstants(request.constants, row.values)
      const copyRules = request.mappings.filter((rule) => rule.ruleType === 'copy')
      const outputPath =
        copyRules.length > 0 ? join(request.outputDirectory, row.resolvedOutputName) : undefined
      const writeResult = await writeWorkbook(
        {
          ...exportConfig,
          constants
        },
        outputPath
      )

      results.push({
        rowIndex: row.rowIndex,
        iterationNumber: row.iterationNumber,
        outputPath:
          writeResult.templateOutputPath ??
          writeResult.mergeOutputPaths[0] ??
          outputPath,
        mergeOutputPaths: writeResult.mergeOutputPaths
      })
    } catch (error) {
      results.push({
        rowIndex: row.rowIndex,
        iterationNumber: row.iterationNumber,
        mergeOutputPaths: [],
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  const succeeded = results.filter((result) => !result.error).length

  return {
    total: results.length,
    succeeded,
    failed: results.length - succeeded,
    results
  }
}
