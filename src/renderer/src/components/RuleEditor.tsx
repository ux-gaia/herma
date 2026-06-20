import { useEffect, useMemo, useState } from 'react'
import {
  Columns3,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  GitMerge,
  Hash,
  LayoutTemplate,
  ListOrdered,
  LocateFixed,
  MousePointerClick,
  Rows3,
  Sheet,
  Tag
} from 'lucide-react'
import type {
  ColumnFilter,
  ColumnRef,
  CopyRule,
  CopyRuleType,
  FilterValue,
  SelectionKind,
  SelectionPreview,
  SourceSelection
} from '../../../shared/types/project'
import { isCopySelectionRule, isMergeSheetsRule } from '../../../shared/types/project'
import {
  createDefaultDestination,
  createDefaultMergeRule,
  createDefaultSourceSelection,
  useProjectStore
} from '../store/useProjectStore'
import { SelectionPreviewPanel } from './SelectionPreviewPanel'
import { Field } from './ui/Field'
import { IconButton } from './ui/IconButton'
import { IconInput } from './ui/IconInput'

interface RuleEditorProps {
  rule: CopyRule | null
  onClose: () => void
}

export function RuleEditor({ rule, onClose }: RuleEditorProps): React.JSX.Element {
  const template = useProjectStore((state) => state.template)
  const sourceFiles = useProjectStore((state) => state.sourceFiles)
  const constants = useProjectStore((state) => state.constants)
  const addMapping = useProjectStore((state) => state.addMapping)
  const updateMapping = useProjectStore((state) => state.updateMapping)

  const copyRule = rule && isCopySelectionRule(rule) ? rule : null
  const mergeRule = rule && isMergeSheetsRule(rule) ? rule : null

  const initialFileId =
    copyRule?.source.sourceFileId ?? sourceFiles[0]?.id ?? ''
  const initialSheetId =
    copyRule?.source.sourceSheetId ??
    sourceFiles.find((file) => file.id === initialFileId)?.sheets[0]?.id ??
    ''

  const defaultDestination = template
    ? createDefaultDestination(template)
    : { templateSheetId: '', anchorCol: 1, anchorRow: 1 }
  const defaultMergeRule = createDefaultMergeRule()

  const [ruleType, setRuleType] = useState<CopyRuleType>(rule?.ruleType ?? 'copy')
  const [label, setLabel] = useState(rule?.label ?? '')
  const [sourceFileId, setSourceFileId] = useState(initialFileId)
  const [sourceSheetId, setSourceSheetId] = useState(initialSheetId)
  const [kind, setKind] = useState<SelectionKind>(copyRule?.source.kind ?? 'columns')
  const [columnMode, setColumnMode] = useState<'index' | 'header'>(
    copyRule?.source.columns?.mode ?? 'index'
  )
  const [columnIndexes, setColumnIndexes] = useState(
    copyRule?.source.columns?.columns?.join(', ') ?? '1'
  )
  const [columnNames, setColumnNames] = useState(copyRule?.source.columns?.names?.join(', ') ?? '')
  const [headerRow, setHeaderRow] = useState(String(copyRule?.source.columns?.headerRow ?? 1))
  const [invertColumns, setInvertColumns] = useState(Boolean(copyRule?.source.columns?.invert))
  const [useFilters, setUseFilters] = useState(Boolean(copyRule?.source.columns?.filters?.length))
  const [filters, setFilters] = useState<ColumnFilter[]>(
    copyRule?.source.columns?.filters ?? []
  )
  const [startRow, setStartRow] = useState(String(copyRule?.source.rows?.startRow ?? 1))
  const [endRow, setEndRow] = useState(String(copyRule?.source.rows?.endRow ?? 1))
  const [startCol, setStartCol] = useState(String(copyRule?.source.block?.startCol ?? 1))
  const [blockStartRow, setBlockStartRow] = useState(String(copyRule?.source.block?.startRow ?? 1))
  const [endCol, setEndCol] = useState(String(copyRule?.source.block?.endCol ?? 1))
  const [blockEndRow, setBlockEndRow] = useState(String(copyRule?.source.block?.endRow ?? 1))
  const [resultSheetName, setResultSheetName] = useState(
    mergeRule?.resultSheetName ?? defaultMergeRule.resultSheetName
  )
  const [outputDirectory, setOutputDirectory] = useState(
    mergeRule?.outputDirectory ?? defaultMergeRule.outputDirectory
  )
  const [templateSheetId, setTemplateSheetId] = useState(
    copyRule?.destination.templateSheetId ?? defaultDestination.templateSheetId
  )
  const [anchorCol, setAnchorCol] = useState(String(copyRule?.destination.anchorCol ?? 1))
  const [anchorRow, setAnchorRow] = useState(String(copyRule?.destination.anchorRow ?? 1))
  const [error, setError] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [preview, setPreview] = useState<SelectionPreview | { error: string } | null>(null)

  const sheetsForFile = useMemo(
    () => sourceFiles.find((file) => file.id === sourceFileId)?.sheets ?? [],
    [sourceFileId, sourceFiles]
  )

  const sourceFile = useMemo(
    () => sourceFiles.find((file) => file.id === sourceFileId) ?? null,
    [sourceFileId, sourceFiles]
  )

  const sourceSheet = useMemo(
    () => sheetsForFile.find((sheet) => sheet.id === sourceSheetId) ?? null,
    [sourceSheetId, sheetsForFile]
  )

  useEffect(() => {
    if (ruleType !== 'copy' || !sourceFile || !sourceSheet) {
      setPreview(null)
      return
    }

    const timer = window.setTimeout(async () => {
      let selection: SourceSelection
      try {
        selection = buildSourceSelection(
          {
            sourceFileId,
            sourceSheetId,
            kind,
            columnMode,
            columnIndexes,
            columnNames,
            headerRow,
            invertColumns,
            useFilters,
            filters,
            startRow,
            endRow,
            startCol,
            blockStartRow,
            endCol,
            blockEndRow
          },
          { forPreview: true }
        )
      } catch {
        setPreview({ error: 'Enter valid selection values to preview the first cell.' })
        return
      }

      setPreviewLoading(true)
      try {
        const result = await window.herma.previewSelection({
          filePath: sourceFile.path,
          sheetName: sourceSheet.name,
          format: sourceFile.format,
          selection,
          constants
        })
        setPreview(result)
      } finally {
        setPreviewLoading(false)
      }
    }, 300)

    return () => window.clearTimeout(timer)
  }, [
    ruleType,
    sourceFile,
    sourceSheet,
    sourceFileId,
    sourceSheetId,
    kind,
    columnMode,
    columnIndexes,
    columnNames,
    headerRow,
    invertColumns,
    useFilters,
    filters,
    startRow,
    endRow,
    startCol,
    blockStartRow,
    endCol,
    blockEndRow,
    constants
  ])

  const handleTemplateSheetChange = (sheetId: string): void => {
    setTemplateSheetId(sheetId)
  }

  const handlePickOutputDirectory = async (): Promise<void> => {
    const directory = await window.herma.selectOutputDirectory()
    if (directory) {
      setOutputDirectory(directory)
    }
  }

  const handleSave = (): void => {
    try {
      if (ruleType === 'merge_sheets') {
        const trimmedResultName = resultSheetName.trim()
        if (!trimmedResultName) {
          throw new Error('Output file name is required.')
        }

        const trimmedDirectory = outputDirectory.trim()
        if (!trimmedDirectory) {
          throw new Error('Output directory is required.')
        }

        const payload = {
          ruleType: 'merge_sheets' as const,
          label: label.trim() || undefined,
          resultSheetName: trimmedResultName,
          outputDirectory: trimmedDirectory,
          skipHeadersAfterFirst: mergeRule?.skipHeadersAfterFirst ?? true,
          headerRow: mergeRule?.headerRow ?? 1
        }

        if (rule) {
          updateMapping(rule.id, payload)
        } else {
          addMapping(payload)
        }
      } else {
        if (!template) {
          throw new Error('Select a template workbook before creating copy rules.')
        }

        const destination = {
          templateSheetId,
          anchorCol: parsePositiveInt(anchorCol, 'Destination column'),
          anchorRow: parsePositiveInt(anchorRow, 'Destination row')
        }

        const source = buildSourceSelection({
          sourceFileId,
          sourceSheetId,
          kind,
          columnMode,
          columnIndexes,
          columnNames,
          headerRow,
          invertColumns,
          useFilters,
          filters,
          startRow,
          endRow,
          startCol,
          blockStartRow,
          endCol,
          blockEndRow
        })

        const payload = {
          ruleType: 'copy' as const,
          label: label.trim() || undefined,
          source,
          destination
        }

        if (rule) {
          updateMapping(rule.id, payload)
        } else {
          addMapping(payload)
        }
      }

      onClose()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError))
    }
  }

  const editorTitle =
    ruleType === 'merge_sheets'
      ? rule
        ? 'Edit merge sheets rule'
        : 'New merge sheets rule'
      : rule
        ? 'Edit copy rule'
        : 'New copy rule'

  const addFilter = (): void => {
    setFilters((current) => [
      ...current,
      {
        column: { mode: 'index', index: 1 },
        operator: 'equals',
        value: { kind: 'literal', literal: '' }
      }
    ])
  }

  return (
    <div className="glass-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="glass-modal max-h-[90vh] w-full max-w-2xl overflow-y-auto p-6">
        <h3 className="text-base font-semibold text-slate-900">{editorTitle}</h3>

        <div className="mt-4 space-y-4">
          <Field label="Rule type" icon={GitMerge}>
            <select
              value={ruleType}
              onChange={(event) => setRuleType(event.target.value as CopyRuleType)}
              className="glass-select w-full px-3 py-2 text-sm"
            >
              <option value="copy">Copy selection</option>
              <option value="merge_sheets">Merge sheets into one</option>
            </select>
          </Field>

          <Field label="Label" icon={Tag}>
            <IconInput
              icon={Tag}
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Optional rule name"
            />
          </Field>

          {ruleType === 'copy' && !template && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Select a template workbook to configure copy rules.
            </p>
          )}

          {ruleType === 'copy' && template && (
            <>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Source file" icon={FileSpreadsheet}>
              <select
                value={sourceFileId}
                onChange={(event) => {
                  const nextFileId = event.target.value
                  setSourceFileId(nextFileId)
                  const firstSheet = sourceFiles.find((file) => file.id === nextFileId)?.sheets[0]
                  setSourceSheetId(firstSheet?.id ?? '')
                }}
                className="glass-select w-full px-3 py-2 text-sm"
              >
                {sourceFiles.map((file) => (
                  <option key={file.id} value={file.id}>
                    {file.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Source sheet" icon={Sheet}>
              <select
                value={sourceSheetId}
                onChange={(event) => setSourceSheetId(event.target.value)}
                className="glass-select w-full px-3 py-2 text-sm"
              >
                {sheetsForFile.map((sheet) => (
                  <option key={sheet.id} value={sheet.id}>
                    {sheet.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Selection type" icon={MousePointerClick}>
            <select
              value={kind}
              onChange={(event) => setKind(event.target.value as SelectionKind)}
              className="glass-select w-full px-3 py-2 text-sm"
            >
              <option value="columns">Columns</option>
              <option value="rows">Rows</option>
              <option value="block">Cell block</option>
              <option value="sheet">Full sheet</option>
            </select>
          </Field>

          {kind === 'columns' && (
            <div className="space-y-3 glass-inset p-4">
              <Field label="Column mode" icon={Columns3}>
                <select
                  value={columnMode}
                  onChange={(event) => setColumnMode(event.target.value as 'index' | 'header')}
                  className="glass-select w-full px-3 py-2 text-sm"
                >
                  <option value="index">Column numbers</option>
                  <option value="header">Header names</option>
                </select>
              </Field>

              {columnMode === 'index' ? (
                <Field
                  label={invertColumns ? 'Columns to exclude' : 'Columns'}
                  icon={Hash}
                  hint={
                    invertColumns
                      ? 'Comma-separated indexes to skip, e.g. 1, 3'
                      : 'Comma-separated, e.g. 1, 3'
                  }
                >
                  <IconInput
                    icon={Hash}
                    value={columnIndexes}
                    onChange={(event) => setColumnIndexes(event.target.value)}
                  />
                </Field>
              ) : (
                <>
                  <Field label="Header row" icon={ListOrdered}>
                    <IconInput
                      icon={ListOrdered}
                      value={headerRow}
                      onChange={(event) => setHeaderRow(event.target.value)}
                    />
                  </Field>
                  <Field
                    label={invertColumns ? 'Header names to exclude' : 'Header names'}
                    icon={Columns3}
                    hint={
                      invertColumns
                        ? 'Comma-separated names to skip, e.g. Producto, Total'
                        : 'Comma-separated, e.g. Producto, Total'
                    }
                  >
                    <IconInput
                      icon={Columns3}
                      value={columnNames}
                      onChange={(event) => setColumnNames(event.target.value)}
                    />
                  </Field>
                </>
              )}

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={invertColumns}
                  onChange={(event) => setInvertColumns(event.target.checked)}
                />
                Invert selection (copy all columns except the pattern)
              </label>

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={useFilters}
                  onChange={(event) => setUseFilters(event.target.checked)}
                />
                Apply row filters
              </label>

              {useFilters && (
                <div className="space-y-2">
                  {filters.map((filter, index) => (
                    <FilterRow
                      key={index}
                      filter={filter}
                      constants={constants}
                      onChange={(next) =>
                        setFilters((current) =>
                          current.map((item, itemIndex) => (itemIndex === index ? next : item))
                        )
                      }
                      onRemove={() =>
                        setFilters((current) => current.filter((_, itemIndex) => itemIndex !== index))
                      }
                    />
                  ))}
                  <button
                    type="button"
                    onClick={addFilter}
                    className="glass-button glass-button-sm font-medium"
                  >
                    + Add filter
                  </button>
                </div>
              )}
            </div>
          )}

          {kind === 'rows' && (
            <div className="grid grid-cols-2 gap-3 glass-inset p-4">
              <Field label="From row" icon={Rows3}>
                <IconInput
                  icon={Rows3}
                  value={startRow}
                  onChange={(event) => setStartRow(event.target.value)}
                />
              </Field>
              <Field label="To row" icon={Rows3}>
                <IconInput
                  icon={Rows3}
                  value={endRow}
                  onChange={(event) => setEndRow(event.target.value)}
                />
              </Field>
            </div>
          )}

          {kind === 'block' && (
            <div className="grid grid-cols-2 gap-3 glass-inset p-4">
              <Field label="From column">
                <input value={startCol} onChange={(e) => setStartCol(e.target.value)} className="glass-input w-full px-3 py-2 text-sm" />
              </Field>
              <Field label="From row">
                <input value={blockStartRow} onChange={(e) => setBlockStartRow(e.target.value)} className="glass-input w-full px-3 py-2 text-sm" />
              </Field>
              <Field label="To column">
                <input value={endCol} onChange={(e) => setEndCol(e.target.value)} className="glass-input w-full px-3 py-2 text-sm" />
              </Field>
              <Field label="To row">
                <input value={blockEndRow} onChange={(e) => setBlockEndRow(e.target.value)} className="glass-input w-full px-3 py-2 text-sm" />
              </Field>
            </div>
          )}

          {(kind === 'columns' || kind === 'rows' || kind === 'block' || kind === 'sheet') && (
            <SelectionPreviewPanel loading={previewLoading} preview={preview} />
          )}

          <div className="grid grid-cols-1 gap-3 glass-accent-inset p-4 md:grid-cols-3">
            <Field label="Destination sheet" icon={LayoutTemplate}>
              <select
                value={templateSheetId}
                onChange={(event) => handleTemplateSheetChange(event.target.value)}
                className="glass-select w-full px-3 py-2 text-sm"
              >
                {template!.sheets.map((sheet) => (
                  <option key={sheet.id} value={sheet.id}>
                    {sheet.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Anchor column" icon={LocateFixed}>
              <IconInput
                icon={LocateFixed}
                value={anchorCol}
                onChange={(event) => setAnchorCol(event.target.value)}
              />
            </Field>
            <Field label="Anchor row" icon={LocateFixed}>
              <IconInput
                icon={LocateFixed}
                value={anchorRow}
                onChange={(event) => setAnchorRow(event.target.value)}
              />
            </Field>
          </div>
            </>
          )}

          {ruleType === 'merge_sheets' && (
            <div className="space-y-3 glass-inset p-4">
              <Field
                label="Output file name"
                icon={FileText}
                hint="All imported sheets will be stacked into one sheet in this file"
              >
                <IconInput
                  icon={FileText}
                  value={resultSheetName}
                  onChange={(event) => setResultSheetName(event.target.value)}
                  placeholder="merged"
                />
              </Field>

              <Field label="Output directory" icon={FolderOpen}>
                <div className="flex gap-2">
                  <IconInput
                    icon={FolderOpen}
                    value={outputDirectory}
                    readOnly
                    placeholder="Select a directory"
                    className="min-w-0 flex-1"
                  />
                  <IconButton icon={FolderOpen} onClick={() => void handlePickOutputDirectory()}>
                    Browse…
                  </IconButton>
                </div>
              </Field>

              <p className="text-xs text-slate-500">
                Uses every sheet from the imported source files, in order. Header rows are kept
                only from the first sheet.
              </p>
            </div>
          )}
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <IconButton onClick={onClose}>Cancel</IconButton>
          <IconButton variant="primary" onClick={handleSave}>
            Save rule
          </IconButton>
        </div>
      </div>
    </div>
  )
}

function FilterRow({
  filter,
  constants,
  onChange,
  onRemove
}: {
  filter: ColumnFilter
  constants: Array<{ id: string; name: string }>
  onChange: (filter: ColumnFilter) => void
  onRemove: () => void
}): React.JSX.Element {
  return (
    <div className="glass-inset grid grid-cols-1 gap-2 p-3 md:grid-cols-[1fr_1fr_1fr_auto]">
      <select
        value={filter.column.mode}
        onChange={(event) =>
          onChange({
            ...filter,
            column: {
              mode: event.target.value as ColumnRef['mode'],
              index: filter.column.index ?? 1,
              name: filter.column.name ?? ''
            }
          })
        }
        className="glass-select px-2 py-2 text-sm"
      >
        <option value="index">Column #</option>
        <option value="header">Header</option>
      </select>

      {filter.column.mode === 'index' ? (
        <input
          value={filter.column.index ?? 1}
          onChange={(event) =>
            onChange({
              ...filter,
              column: { mode: 'index', index: Number(event.target.value) || 1 }
            })
          }
          className="glass-select px-2 py-2 text-sm"
        />
      ) : (
        <input
          value={filter.column.name ?? ''}
          onChange={(event) =>
            onChange({
              ...filter,
              column: { mode: 'header', name: event.target.value }
            })
          }
          className="glass-select px-2 py-2 text-sm"
          placeholder="Header name"
        />
      )}

      <div className="flex gap-2">
        <select
          value={filter.value.kind}
          onChange={(event) =>
            onChange({
              ...filter,
              value: buildFilterValue(event.target.value as FilterValue['kind'], filter.value, constants)
            })
          }
          className="glass-select px-2 py-2 text-sm"
        >
          <option value="literal">Literal</option>
          <option value="constant">Constant</option>
        </select>

        {filter.value.kind === 'literal' ? (
          <input
            value={String(filter.value.literal ?? '')}
            onChange={(event) =>
              onChange({
                ...filter,
                value: { kind: 'literal', literal: event.target.value }
              })
            }
            className="glass-input min-w-0 flex-1 px-2 py-2 text-sm"
          />
        ) : (
          <select
            value={filter.value.constantId ?? ''}
            onChange={(event) =>
              onChange({
                ...filter,
                value: { kind: 'constant', constantId: event.target.value }
              })
            }
            className="glass-input min-w-0 flex-1 px-2 py-2 text-sm"
          >
            <option value="">Select constant</option>
            {constants.map((constant) => (
              <option key={constant.id} value={constant.id}>
                {constant.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <button
        type="button"
        onClick={onRemove}
        className="glass-button-ghost glass-button-sm text-slate-600 hover:border-red-200 hover:bg-red-50/90 hover:text-red-600"
      >
        Remove
      </button>
    </div>
  )
}

function buildFilterValue(
  kind: FilterValue['kind'],
  current: FilterValue,
  constants: Array<{ id: string; name: string }>
): FilterValue {
  if (kind === 'literal') {
    return { kind: 'literal', literal: current.literal ?? '' }
  }
  return { kind: 'constant', constantId: current.constantId ?? constants[0]?.id ?? '' }
}

function parsePositiveInt(value: string, label: string): number {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${label} must be a positive integer.`)
  }
  return parsed
}

function parseCommaSeparatedNumbers(value: string, label: string): number[] {
  const items = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

  if (items.length === 0) {
    throw new Error(`${label} must include at least one value.`)
  }

  return items.map((item) => parsePositiveInt(item, label))
}

function parseCommaSeparatedStrings(value: string, label: string): string[] {
  const items = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

  if (items.length === 0) {
    throw new Error(`${label} must include at least one value.`)
  }

  return items
}

function buildSourceSelection(
  input: {
    sourceFileId: string
    sourceSheetId: string
    kind: SelectionKind
    columnMode: 'index' | 'header'
    columnIndexes: string
    columnNames: string
    headerRow: string
    invertColumns: boolean
    useFilters: boolean
    filters: ColumnFilter[]
    startRow: string
    endRow: string
    startCol: string
    blockStartRow: string
    endCol: string
    blockEndRow: string
  },
  options?: { forPreview?: boolean }
): SourceSelection {
  if (!input.sourceFileId || !input.sourceSheetId) {
    throw new Error('Source file and sheet are required.')
  }

  const base = createDefaultSourceSelection(input.sourceFileId, input.sourceSheetId)
  base.kind = input.kind

  if (input.kind === 'columns') {
    if (!options?.forPreview && input.useFilters && input.filters.length === 0) {
      throw new Error('Add at least one filter or disable row filtering.')
    }

    const activeFilters = input.useFilters && input.filters.length > 0 ? input.filters : undefined

    base.columns = {
      mode: input.columnMode,
      headerRow: parsePositiveInt(input.headerRow, 'Header row'),
      invert: input.invertColumns || undefined,
      columns:
        input.columnMode === 'index'
          ? parseCommaSeparatedNumbers(input.columnIndexes, 'Columns')
          : undefined,
      names:
        input.columnMode === 'header'
          ? parseCommaSeparatedStrings(input.columnNames, 'Header names')
          : undefined,
      filters: activeFilters
    }
  }

  if (input.kind === 'rows') {
    base.rows = {
      startRow: parsePositiveInt(input.startRow, 'Start row'),
      endRow: parsePositiveInt(input.endRow, 'End row')
    }
  }

  if (input.kind === 'block') {
    base.block = {
      startCol: parsePositiveInt(input.startCol, 'Start column'),
      startRow: parsePositiveInt(input.blockStartRow, 'Start row'),
      endCol: parsePositiveInt(input.endCol, 'End column'),
      endRow: parsePositiveInt(input.blockEndRow, 'End row')
    }
  }

  return base
}
