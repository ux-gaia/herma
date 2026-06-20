import { AlertTriangle, CheckCircle2, Loader2, XCircle } from 'lucide-react'
import type { AutomationRunResult } from '../../../shared/types/automation'

export interface AutomationResultDialogState {
  running: boolean
  result: AutomationRunResult | null
  errors: string[]
}

interface AutomationResultDialogProps {
  state: AutomationResultDialogState | null
  onClose: () => void
}

export function countGeneratedFiles(result: AutomationRunResult): number {
  let count = 0

  for (const item of result.results) {
    if (item.error) continue
    if (item.outputPath) count += 1
    count += item.mergeOutputPaths.length
  }

  return count
}

export function AutomationResultDialog({
  state,
  onClose
}: AutomationResultDialogProps): React.JSX.Element | null {
  if (!state) return null

  const { running, result, errors } = state
  const generatedFiles = result ? countGeneratedFiles(result) : 0
  const fullSuccess = result !== null && result.failed === 0
  const partialSuccess = result !== null && result.succeeded > 0 && result.failed > 0
  const totalFailure =
    (result !== null && result.succeeded === 0 && result.failed > 0) ||
    (errors.length > 0 && !result)

  const title = running
    ? 'Running automation…'
    : fullSuccess
      ? 'Automation complete'
      : partialSuccess
        ? 'Automation completed with errors'
        : 'Automation failed'

  const failedRowErrors =
    result?.results
      .filter((item) => item.error)
      .map((item) => `Row ${item.rowIndex}: ${item.error}`) ?? []

  const StatusIcon = running
    ? Loader2
    : fullSuccess
      ? CheckCircle2
      : partialSuccess
        ? AlertTriangle
        : XCircle

  const statusIconClass = running
    ? 'text-slate-400 animate-spin'
    : fullSuccess
      ? 'text-emerald-600'
      : partialSuccess
        ? 'text-amber-600'
        : 'text-red-600'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <StatusIcon className={`h-5 w-5 shrink-0 ${statusIconClass}`} strokeWidth={2} aria-hidden="true" />
          {title}
        </h3>

        {running && (
          <p className="mt-3 text-sm text-slate-600">
            Applying the project for each iteration row…
          </p>
        )}

        {!running && result && (
          <div className="mt-4 space-y-2 text-sm">
            <p className={fullSuccess ? 'text-emerald-700' : partialSuccess ? 'text-amber-800' : 'text-red-700'}>
              {fullSuccess && (
                <>
                  Generated <strong>{generatedFiles}</strong>{' '}
                  {generatedFiles === 1 ? 'file' : 'files'} from{' '}
                  <strong>{result.succeeded}</strong>{' '}
                  {result.succeeded === 1 ? 'iteration' : 'iterations'}.
                </>
              )}
              {partialSuccess && (
                <>
                  Generated <strong>{generatedFiles}</strong>{' '}
                  {generatedFiles === 1 ? 'file' : 'files'}.{' '}
                  <strong>{result.succeeded}</strong> of <strong>{result.total}</strong>{' '}
                  {result.total === 1 ? 'iteration succeeded' : 'iterations succeeded'};{' '}
                  <strong>{result.failed}</strong> failed.
                </>
              )}
              {totalFailure && result.succeeded === 0 && (
                <>
                  No files were generated. <strong>{result.failed}</strong> of{' '}
                  <strong>{result.total}</strong>{' '}
                  {result.total === 1 ? 'iteration failed' : 'iterations failed'}.
                </>
              )}
            </p>
          </div>
        )}

        {!running && errors.length > 0 && (
          <ul className="mt-4 space-y-2">
            {errors.map((error) => (
              <li key={error} className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </li>
            ))}
          </ul>
        )}

        {!running && failedRowErrors.length > 0 && (
          <ul className="mt-4 max-h-48 space-y-2 overflow-y-auto">
            {failedRowErrors.map((error) => (
              <li key={error} className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </li>
            ))}
          </ul>
        )}

        {!running && (
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
