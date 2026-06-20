import { FileSpreadsheet, FileUp, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { SourceFile } from '../../../shared/types/project'
import { useProjectStore } from '../store/useProjectStore'
import { SheetBrowser } from './SheetBrowser'

export function SourcePanel(): React.JSX.Element {
  const sourceFiles = useProjectStore((state) => state.sourceFiles)
  const removeSourceFile = useProjectStore((state) => state.removeSourceFile)
  const [expandedFiles, setExpandedFiles] = useState<Record<string, boolean>>({})

  const toggleFile = (fileId: string): void => {
    setExpandedFiles((current) => ({
      ...current,
      [fileId]: !(current[fileId] ?? true)
    }))
  }

  if (sourceFiles.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
        <FileUp className="mb-3 h-10 w-10 text-slate-300" strokeWidth={1.5} />
        <p className="text-sm font-medium text-slate-700">No source files yet</p>
        <p className="mt-2 max-w-xs text-sm text-slate-500">
          Import xlsx, xls, or csv files to use them in copy rules.
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto pr-1">
      {sourceFiles.map((file) => (
        <FileCard
          key={file.id}
          file={file}
          expanded={expandedFiles[file.id] ?? true}
          onToggle={() => toggleFile(file.id)}
          onRemove={() => removeSourceFile(file.id)}
        />
      ))}
    </div>
  )
}

interface FileCardProps {
  file: SourceFile
  expanded: boolean
  onToggle: () => void
  onRemove: () => void
}

function FileCard({ file, expanded, onToggle, onRemove }: FileCardProps): React.JSX.Element {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <header className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
        <button
          type="button"
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <span className="text-xs text-slate-400">{expanded ? '▼' : '▶'}</span>
          <FileSpreadsheet className="h-4 w-4 shrink-0 text-slate-400" strokeWidth={2} />
          <span className="truncate text-sm font-medium text-slate-800">{file.name}</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-500">
            {file.format}
          </span>
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-400 hover:bg-red-50 hover:text-red-600"
          aria-label={`Remove ${file.name}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Remove
        </button>
      </header>

      {expanded && <SheetBrowser file={file} />}
    </section>
  )
}
