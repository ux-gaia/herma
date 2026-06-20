import type { SelectionPreview } from '../../../shared/types/project'

interface SelectionPreviewPanelProps {
  loading: boolean
  preview: SelectionPreview | { error: string } | null
}

export function SelectionPreviewPanel({
  loading,
  preview
}: SelectionPreviewPanelProps): React.JSX.Element {
  return (
    <section className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-blue-700">
        Selection preview
      </h4>
      <p className="mt-1 text-xs text-blue-600/80">
        Sample of the selected cells (up to 2×2 when available).
      </p>

      {loading && <p className="mt-3 text-sm text-slate-500">Loading preview…</p>}

      {!loading && preview && 'error' in preview && (
        <p className="mt-3 rounded-lg bg-white px-3 py-2 text-sm text-amber-700">{preview.error}</p>
      )}

      {!loading && preview && !('error' in preview) && (
        <div className="mt-3 space-y-3">
          <div className="inline-block overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm">
            <table className="border-collapse text-sm">
              <tbody>
                {preview.cells.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell) => (
                      <td key={`${cell.address}-${rowIndex}`} className="border border-slate-200 p-0">
                        <div className="flex min-w-[120px] flex-col">
                          <div className="border-b border-slate-200 bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">
                            {cell.address}
                          </div>
                          <div className="max-w-[160px] truncate px-2 py-2 text-slate-800">
                            {cell.value}
                          </div>
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-slate-500">
            Top-left: column {preview.col}, row {preview.row} ({preview.address}) ·{' '}
            {preview.previewRows}×{preview.previewCols} sample
          </p>
          <p className="text-xs text-slate-400">{preview.hint}</p>
        </div>
      )}
    </section>
  )
}
