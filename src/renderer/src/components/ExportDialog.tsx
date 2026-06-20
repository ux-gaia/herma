import { AlertTriangle, CheckCircle2, Loader2, XCircle } from 'lucide-react'

interface ExportDialogProps {
  open: boolean
  exporting: boolean
  errors: string[]
  warnings: string[]
  successPath: string | null
  onClose: () => void
}

export function ExportDialog({
  open,
  exporting,
  errors,
  warnings,
  successPath,
  onClose
}: ExportDialogProps): React.JSX.Element | null {
  if (!open) return null

  const StatusIcon = exporting ? Loader2 : successPath ? CheckCircle2 : XCircle
  const statusIconClass = exporting
    ? 'text-slate-400 animate-spin'
    : successPath
      ? 'text-blue-600'
      : 'text-red-600'

  return (
    <div className="glass-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="glass-modal w-full max-w-md p-6">
        <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900">
          <StatusIcon className={`h-5 w-5 shrink-0 ${statusIconClass}`} strokeWidth={2} aria-hidden="true" />
          {exporting ? 'Exporting workbook…' : successPath ? 'Export complete' : 'Export failed'}
        </h3>

        {exporting && (
          <p className="mt-3 text-sm text-slate-600">Reading source sheets and writing the file.</p>
        )}

        {errors.length > 0 && (
          <ul className="mt-4 space-y-2">
            {errors.map((error) => (
              <li key={error} className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </li>
            ))}
          </ul>
        )}

        {warnings.length > 0 && (
          <ul className="mt-4 space-y-2">
            {warnings.map((warning) => (
              <li
                key={warning}
                className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} aria-hidden="true" />
                {warning}
              </li>
            ))}
          </ul>
        )}

        {successPath && (
          <p className="mt-4 break-all text-sm text-blue-700">Saved to {successPath}</p>
        )}

        {!exporting && (
          <div className="mt-6 flex justify-end">
            <button type="button" onClick={onClose} className="glass-button-primary">
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
