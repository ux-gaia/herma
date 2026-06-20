import { z } from 'zod'

export const sourceSheetSchema = z.object({
  id: z.string(),
  name: z.string(),
  rowCount: z.number().int().nonnegative(),
  columnCount: z.number().int().nonnegative()
})

export const sourceFileSchema = z.object({
  id: z.string(),
  path: z.string(),
  name: z.string(),
  format: z.enum(['xlsx', 'xls', 'csv']),
  sheets: z.array(sourceSheetSchema)
})

export const templateSheetSchema = z.object({
  id: z.string(),
  name: z.string(),
  rowCount: z.number().int().nonnegative(),
  columnCount: z.number().int().nonnegative()
})

export const projectTemplateSchema = z.object({
  path: z.string(),
  name: z.string(),
  sheets: z.array(templateSheetSchema)
})

export const columnRefSchema = z.object({
  mode: z.enum(['index', 'header']),
  index: z.number().int().positive().optional(),
  name: z.string().optional()
})

export const filterValueSchema = z.object({
  kind: z.enum(['literal', 'constant']),
  literal: z.union([z.string(), z.number(), z.boolean()]).optional(),
  constantId: z.string().optional()
})

export const columnFilterSchema = z.object({
  column: columnRefSchema,
  operator: z.literal('equals'),
  value: filterValueSchema
})

export const columnSelectionSchema = z.object({
  mode: z.enum(['index', 'header']),
  columns: z.array(z.number().int().positive()).optional(),
  names: z.array(z.string()).optional(),
  headerRow: z.number().int().positive().optional(),
  filters: z.array(columnFilterSchema).optional(),
  invert: z.boolean().optional()
})

export const rowSelectionSchema = z.object({
  startRow: z.number().int().positive(),
  endRow: z.number().int().positive()
})

export const blockSelectionSchema = z.object({
  startCol: z.number().int().positive(),
  startRow: z.number().int().positive(),
  endCol: z.number().int().positive(),
  endRow: z.number().int().positive()
})

export const sourceSelectionSchema = z.object({
  sourceFileId: z.string(),
  sourceSheetId: z.string(),
  kind: z.enum(['columns', 'rows', 'block', 'sheet']),
  columns: columnSelectionSchema.optional(),
  rows: rowSelectionSchema.optional(),
  block: blockSelectionSchema.optional()
})

export const destinationPlacementSchema = z.object({
  templateSheetId: z.string(),
  anchorCol: z.number().int().positive(),
  anchorRow: z.number().int().positive()
})

export const copySelectionRuleSchema = z.object({
  ruleType: z.literal('copy'),
  id: z.string(),
  label: z.string().optional(),
  source: sourceSelectionSchema,
  destination: destinationPlacementSchema
})

export const mergeSheetsRuleSchema = z.object({
  ruleType: z.literal('merge_sheets'),
  id: z.string(),
  label: z.string().optional(),
  resultSheetName: z.string().min(1),
  outputDirectory: z.string(),
  skipHeadersAfterFirst: z.boolean(),
  headerRow: z.number().int().positive()
})

export const copyRuleSchema = z.preprocess((value) => {
  if (!value || typeof value !== 'object') return value

  const record = value as Record<string, unknown>
  if (!('ruleType' in record) && 'source' in record) {
    return { ...record, ruleType: 'copy' }
  }

  if (record.ruleType === 'merge_sheets') {
    const { destination: _destination, sources: _sources, ...rest } = record
    return {
      skipHeadersAfterFirst: record.skipHeadersAfterFirst ?? true,
      headerRow: record.headerRow ?? 1,
      outputDirectory: record.outputDirectory ?? '',
      ...rest
    }
  }

  return value
}, z.discriminatedUnion('ruleType', [copySelectionRuleSchema, mergeSheetsRuleSchema]))

export const projectConstantSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  value: z.union([z.string(), z.number(), z.boolean()]),
  description: z.string().optional()
})

export const automationConfigSchema = z.object({
  iterationFilePath: z.string().optional(),
  outputDirectory: z.string().optional(),
  outputNamePattern: z.string().optional(),
  headerRow: z.number().int().positive().optional()
})

export const exportWorkbookConfigSchema = z.object({
  template: projectTemplateSchema.nullable(),
  sourceFiles: z.array(sourceFileSchema),
  constants: z.array(projectConstantSchema),
  mappings: z.array(copyRuleSchema).min(1)
})

export const hermaProjectFileSchema = z.object({
  version: z.literal(1),
  name: z.string().optional(),
  exportedAt: z.string(),
  template: z.object({
    path: z.string(),
    sheets: z.array(z.object({ id: z.string(), name: z.string() }))
  }),
  sourceFiles: z.array(z.object({ id: z.string(), path: z.string() })),
  constants: z.array(projectConstantSchema),
  mappings: z.array(copyRuleSchema),
  automation: automationConfigSchema.optional()
})

export const projectConfigSchema = z.object({
  name: z.string().optional(),
  template: projectTemplateSchema.nullable(),
  sourceFiles: z.array(sourceFileSchema),
  constants: z.array(projectConstantSchema),
  mappings: z.array(copyRuleSchema),
  automation: automationConfigSchema.optional()
})
