import { mkdirSync } from 'fs'
import { dirname } from 'path'
import type { ExportWorkbookConfig } from '../../shared/types/project'
import { isCopySelectionRule, isMergeSheetsRule } from '../../shared/types/project'
import { mergeWorkbook } from './merger'
import { writeMergeSheetsOutputs } from './merge-writer'

export interface WriteWorkbookResult {
  templateOutputPath?: string
  mergeOutputPaths: string[]
}

export async function writeWorkbook(
  config: ExportWorkbookConfig,
  outputPath?: string
): Promise<WriteWorkbookResult> {
  const copyRules = config.mappings.filter(isCopySelectionRule)
  const mergeRules = config.mappings.filter(isMergeSheetsRule)
  const mergeOutputPaths: string[] = []

  let templateOutputPath: string | undefined

  if (copyRules.length > 0) {
    if (!outputPath) {
      throw new Error('An output path is required when exporting copy rules.')
    }

    const workbook = await mergeWorkbook(config)
    mkdirSync(dirname(outputPath), { recursive: true })
    await workbook.xlsx.writeFile(outputPath)
    templateOutputPath = outputPath
  }

  if (mergeRules.length > 0) {
    for (const rule of mergeRules) {
      mkdirSync(rule.outputDirectory, { recursive: true })
    }
    mergeOutputPaths.push(...(await writeMergeSheetsOutputs(mergeRules, config.sourceFiles)))
  }

  return { templateOutputPath, mergeOutputPaths }
}
