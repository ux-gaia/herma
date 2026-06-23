import type { SelectionPreview } from '../../../shared/types/project'

interface SelectionPreviewPanelProps {
  loading: boolean
  refreshing?: boolean
  preview: SelectionPreview | { error: string } | null
}

export function SelectionPreviewPanel({
  loading,
  refreshing = false,
  preview
}: SelectionPreviewPanelProps): React.JSX.Element {
  return (
    <section className="glass-info p-4">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-accent text-xs font-semibold uppercase tracking-wide">
          Selection preview
        </h4>
        {refreshing && (
          <span className="text-xs text-slate-400">Updating…</span>
        )}
      </div>
      <p className="text-accent-light mt-1 text-xs opacity-80">
        Sample of the selected cells (up to 2×2 when available).
      </p>

      {loading && <p className="mt-3 text-sm text-slate-500">Loading preview…</p>}

      {!loading && preview && 'error' in preview && (
        <p className="glass-inset mt-3 px-3 py-2 text-sm text-amber-700">{preview.error}</p>
      )}

      {!loading && preview && !('error' in preview) && (
        <div className="mt-3 space-y-3">
          <div className="glass-card inline-block overflow-hidden">
            <table className="border-collapse text-sm">
              <tbody>
                {preview.cells.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell) => (
                      <td key={`${cell.address}-${rowIndex}`} className="border border-white/45 p-0">
                        <div className="flex min-w-[120px] flex-col">
                          <div className="border-b border-white/45 bg-white/35 px-2 py-1 text-[10px] font-semibold text-slate-500">
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
