import type { SourceFile } from '../../../shared/types/project'

interface SheetBrowserProps {
  file: SourceFile
}

export function SheetBrowser({ file }: SheetBrowserProps): React.JSX.Element {
  return (
    <ul className="divide-y divide-slate-100">
      {file.sheets.map((sheet) => (
        <li key={sheet.id} className="px-3 py-2">
          <p className="truncate text-sm text-slate-700">{sheet.name}</p>
          <p className="text-xs text-slate-400">
            {sheet.rowCount} rows × {sheet.columnCount} cols
          </p>
        </li>
      ))}
    </ul>
  )
}
