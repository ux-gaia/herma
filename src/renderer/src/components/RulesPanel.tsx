import { useState } from 'react'
import { GripVertical, ListChecks, Pencil, Plus, Trash2 } from 'lucide-react'
import type { CopyRule } from '../../../shared/types/project'
import { isCopySelectionRule, isMergeSheetsRule } from '../../../shared/types/project'
import { useProjectStore } from '../store/useProjectStore'
import { RuleEditor } from './RuleEditor'
import { IconButton } from './ui/IconButton'
import { SectionHeader } from './ui/SectionHeader'

function describeRule(
  rule: CopyRule,
  sourceFiles: ReturnType<typeof useProjectStore.getState>['sourceFiles'],
  template: ReturnType<typeof useProjectStore.getState>['template']
): string {
  if (isMergeSheetsRule(rule)) {
    const fileName = rule.resultSheetName.toLowerCase().endsWith('.xlsx')
      ? rule.resultSheetName
      : `${rule.resultSheetName}.xlsx`
    return `All imported sheets → "${fileName}" in ${rule.outputDirectory || '?'}`
  }

  if (!isCopySelectionRule(rule)) {
    return 'Unknown rule'
  }

  const templateSheet = template?.sheets.find((sheet) => sheet.id === rule.destination.templateSheetId)
  const destination = `${templateSheet?.name ?? '?'} @ col ${rule.destination.anchorCol}, row ${rule.destination.anchorRow}`

  const sourceFile = sourceFiles.find((file) => file.id === rule.source.sourceFileId)
  const sourceSheet = sourceFile?.sheets.find((sheet) => sheet.id === rule.source.sourceSheetId)
  const origin = `${sourceFile?.name ?? '?'} / ${sourceSheet?.name ?? '?'}`

  switch (rule.source.kind) {
    case 'columns': {
      const columns = rule.source.columns
      const filterCount = columns?.filters?.length ?? 0
      const columnList =
        columns?.mode === 'header'
          ? (columns?.names ?? []).join(', ')
          : (columns?.columns ?? []).join(', ')
      const invertPrefix = columns?.invert ? 'all except ' : ''
      const filterSuffix =
        filterCount > 0
          ? ' (' + filterCount + ' filter' + (filterCount === 1 ? '' : 's') + ')'
          : ''
      return origin + ' → columns ' + invertPrefix + columnList + filterSuffix + ' → ' + destination
    }
    case 'rows':
      return (
        origin +
        ' → rows ' +
        rule.source.rows?.startRow +
        '-' +
        rule.source.rows?.endRow +
        ' → ' +
        destination
      )
    case 'block':
      return (
        origin +
        ' → block (' +
        rule.source.block?.startCol +
        ',' +
        rule.source.block?.startRow +
        ')-(' +
        rule.source.block?.endCol +
        ',' +
        rule.source.block?.endRow +
        ') → ' +
        destination
      )
    case 'sheet':
      return origin + ' → full sheet → ' + destination
    default:
      return `${origin} → ${destination}`
  }
}

function ruleDisplayLabel(rule: CopyRule): string {
  if (rule.label) return rule.label
  return isMergeSheetsRule(rule) ? 'Merge sheets rule' : 'Copy rule'
}

function DragHandle(): React.JSX.Element {
  return <GripVertical className="h-4 w-4 text-slate-400" strokeWidth={2} aria-hidden="true" />
}

export function RulesPanel(): React.JSX.Element {
  const template = useProjectStore((state) => state.template)
  const sourceFiles = useProjectStore((state) => state.sourceFiles)
  const mappings = useProjectStore((state) => state.mappings)
  const removeMapping = useProjectStore((state) => state.removeMapping)
  const reorderMapping = useProjectStore((state) => state.reorderMapping)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<CopyRule | null>(null)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)

  const openCreate = (): void => {
    setEditingRule(null)
    setEditorOpen(true)
  }

  const openEdit = (rule: CopyRule): void => {
    setEditingRule(rule)
    setEditorOpen(true)
  }

  const handleDragStart = (event: React.DragEvent<HTMLButtonElement>, ruleId: string): void => {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', ruleId)
    setDraggedId(ruleId)
  }

  const handleDragOver = (event: React.DragEvent<HTMLLIElement>, ruleId: string): void => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    if (ruleId !== draggedId) {
      setDropTargetId(ruleId)
    }
  }

  const handleDrop = (event: React.DragEvent<HTMLLIElement>, targetId: string): void => {
    event.preventDefault()
    const activeId = event.dataTransfer.getData('text/plain')
    if (!activeId || activeId === targetId) {
      setDraggedId(null)
      setDropTargetId(null)
      return
    }

    const fromIndex = mappings.findIndex((mapping) => mapping.id === activeId)
    const toIndex = mappings.findIndex((mapping) => mapping.id === targetId)
    if (fromIndex !== -1 && toIndex !== -1) {
      reorderMapping(fromIndex, toIndex)
    }

    setDraggedId(null)
    setDropTargetId(null)
  }

  const handleDragEnd = (): void => {
    setDraggedId(null)
    setDropTargetId(null)
  }

  return (
    <section className="glass-panel flex min-h-0 flex-1 flex-col p-4">
      <SectionHeader
        title="Rules"
        icon={ListChecks}
        help="Define how data moves from sources to the template, or merge all imported sheets into one output file. Drag rules to set the order they run when you export."
        action={
          <IconButton
            icon={Plus}
            size="sm"
            onClick={openCreate}
            disabled={sourceFiles.length === 0}
          >
            New rule
          </IconButton>
        }
      />

      {sourceFiles.length === 0 ? (
        <p className="text-sm text-slate-500">Import source files before creating rules.</p>
      ) : mappings.length === 0 ? (
        <p className="text-sm text-slate-500">
          Create rules to copy selections into the template or merge all imported sheets into one
          file.
        </p>
      ) : (
        <>
          <p className="mb-2 text-xs text-slate-400">
            Drag rules to reorder. They are applied top to bottom when exporting.
          </p>
          <ul className="flex flex-1 flex-col gap-2 overflow-y-auto pr-1">
            {mappings.map((rule, index) => {
              const isDragging = draggedId === rule.id
              const isDropTarget = dropTargetId === rule.id && !isDragging

              return (
                <li
                  key={rule.id}
                  onDragOver={(event) => handleDragOver(event, rule.id)}
                  onDrop={(event) => handleDrop(event, rule.id)}
                  className={[
                    'glass-inset rounded-xl px-3 py-3 text-sm text-slate-700 transition',
                    isDragging ? 'opacity-40' : '',
                    isDropTarget ? 'glass-drop-target' : ''
                  ].join(' ')}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 gap-3">
                      <div className="flex shrink-0 flex-col items-center gap-1 pt-0.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          #{index + 1}
                        </span>
                        <button
                          type="button"
                          draggable
                          onDragStart={(event) => handleDragStart(event, rule.id)}
                          onDragEnd={handleDragEnd}
                          title="Drag to reorder"
                          aria-label="Drag to reorder rule"
                          className="cursor-grab rounded p-1 hover:bg-white/50 active:cursor-grabbing"
                        >
                          <DragHandle />
                        </button>
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-slate-800">{ruleDisplayLabel(rule)}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {describeRule(rule, sourceFiles, template)}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <IconButton
                        icon={Pencil}
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(rule)}
                      >
                        Edit
                      </IconButton>
                      <IconButton
                        icon={Trash2}
                        variant="ghost"
                        size="sm"
                        className="text-slate-600 hover:border-red-200 hover:bg-red-50/90 hover:text-red-600"
                        onClick={() => removeMapping(rule.id)}
                      >
                        Remove
                      </IconButton>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      )}

      {editorOpen && (
        <RuleEditor rule={editingRule} onClose={() => setEditorOpen(false)} />
      )}
    </section>
  )
}
