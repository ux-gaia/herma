import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CircleHelp,
  ClipboardCheck,
  FileText,
  FolderOpen,
  Play,
  Table2,
  Zap
} from 'lucide-react'
import type { AutomationRunResult, IterationSheetValidation } from '../../../shared/types/automation'
import { getRequiredConstantNames } from '../../../shared/automation/required-constants'
import { useProjectStore } from '../store/useProjectStore'
import {
  AutomationResultDialog,
  type AutomationResultDialogState
} from './AutomationResultDialog'
import { Field } from './ui/Field'
import { IconButton } from './ui/IconButton'
import { IconInput } from './ui/IconInput'
import { SectionHeader } from './ui/SectionHeader'

export function AutomationPanel(): React.JSX.Element {
  const template = useProjectStore((state) => state.template)
  const sourceFiles = useProjectStore((state) => state.sourceFiles)
  const constants = useProjectStore((state) => state.constants)
  const mappings = useProjectStore((state) => state.mappings)
  const automation = useProjectStore((state) => state.automation)
  const setAutomation = useProjectStore((state) => state.setAutomation)

  const [validation, setValidation] = useState<IterationSheetValidation | null>(null)
  const [validating, setValidating] = useState(false)
  const [running, setRunning] = useState(false)
  const [resultDialog, setResultDialog] = useState<AutomationResultDialogState | null>(null)
  const [showPatternHelp, setShowPatternHelp] = useState(false)

  const requiredConstants = useMemo(
    () => getRequiredConstantNames(mappings, automation.outputNamePattern, constants),
    [mappings, automation.outputNamePattern, constants]
  )

  const buildValidationRequest = useCallback(
    () => ({
      iterationFilePath: automation.iterationFilePath ?? '',
      headerRow: automation.headerRow ?? 1,
      outputNamePattern: automation.outputNamePattern,
      template,
      sourceFiles,
      constants,
      mappings
    }),
    [automation, template, sourceFiles, constants, mappings]
  )

  const refreshValidation = useCallback(async (): Promise<void> => {
    if (!automation.iterationFilePath) {
      setValidation(null)
      return
    }

    setValidating(true)
    try {
      const result = await window.sheeter.validateIterationSheet(buildValidationRequest())
      setValidation(result)
    } catch (error) {
      setValidation({
        valid: false,
        errors: [error instanceof Error ? error.message : String(error)],
        warnings: [],
        requiredConstants,
        rows: []
      })
    } finally {
      setValidating(false)
    }
  }, [automation.iterationFilePath, buildValidationRequest, requiredConstants])

  useEffect(() => {
    void refreshValidation()
  }, [
    automation.iterationFilePath,
    automation.outputNamePattern,
    automation.headerRow,
    mappings,
    constants,
    refreshValidation
  ])

  const handleSelectIterationFile = async (): Promise<void> => {
    const filePath = await window.sheeter.selectIterationFile()
    if (filePath) {
      setAutomation({ iterationFilePath: filePath })
    }
  }

  const handleSelectOutputDirectory = async (): Promise<void> => {
    const directory = await window.sheeter.selectOutputDirectory()
    if (directory) {
      setAutomation({ outputDirectory: directory })
    }
  }

  const handleRun = async (): Promise<void> => {
    if (!automation.outputDirectory?.trim()) {
      setResultDialog({
        running: false,
        result: null,
        errors: ['Select an output directory before running the automation.']
      })
      return
    }

    if (!validation?.valid) {
      setResultDialog({
        running: false,
        result: null,
        errors: ['Fix iteration sheet validation errors before running.']
      })
      return
    }

    setRunning(true)
    setResultDialog({ running: true, result: null, errors: [] })

    try {
      const result: AutomationRunResult = await window.sheeter.runAutomation({
        ...buildValidationRequest(),
        outputDirectory: automation.outputDirectory
      })
      setResultDialog({ running: false, result, errors: [] })
    } catch (error) {
      setResultDialog({
        running: false,
        result: null,
        errors: [error instanceof Error ? error.message : String(error)]
      })
    } finally {
      setRunning(false)
    }
  }

  const canRun =
    Boolean(automation.iterationFilePath && automation.outputDirectory?.trim()) &&
    validation?.valid &&
    mappings.length > 0 &&
    !running

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <SectionHeader
          title="Batch configuration"
          icon={Zap}
          description="Run the current project once per row in the iteration spreadsheet, overriding constants for each export."
          help="Set up a batch run: select an iteration spreadsheet (one row per export), choose the output folder, and optionally define a filename pattern. Each row overrides project constants before rules are applied."
        />

        <div className="space-y-4">
          <Field
            label="Iteration spreadsheet"
            icon={Table2}
            hint="First row must contain constant names. Each following row is one iteration."
          >
            <div className="flex gap-2">
              <IconInput
                icon={Table2}
                value={automation.iterationFilePath ?? ''}
                readOnly
                placeholder="Select iteration file"
                className="min-w-0 flex-1"
              />
              <IconButton icon={FolderOpen} onClick={() => void handleSelectIterationFile()}>
                Browse…
              </IconButton>
            </div>
          </Field>

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600">
            <p className="font-medium text-slate-700">Expected format</p>
            <table className="mt-2 w-full max-w-md border-collapse text-left">
              <thead>
                <tr>
                  {requiredConstants.length > 0 ? (
                    requiredConstants.map((name) => (
                      <th key={name} className="border border-slate-200 px-2 py-1 font-medium">
                        {name}
                      </th>
                    ))
                  ) : (
                    <>
                      <th className="border border-slate-200 px-2 py-1 font-medium">ID</th>
                      <th className="border border-slate-200 px-2 py-1 font-medium">LongID</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {(requiredConstants.length > 0 ? requiredConstants : ['1', 'HO']).map((value) => (
                    <td key={value} className="border border-slate-200 px-2 py-1">
                      {requiredConstants.length > 0 ? '…' : value}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
            <p className="mt-2">
              The sheet must include values for all constants used in rules
              {automation.outputNamePattern ? ' and in the output name pattern' : ''}.
            </p>
          </div>

          <Field label="Output directory" icon={FolderOpen}>
            <div className="flex gap-2">
              <IconInput
                icon={FolderOpen}
                value={automation.outputDirectory ?? ''}
                readOnly
                placeholder="Select output directory"
                className="min-w-0 flex-1"
              />
              <IconButton icon={FolderOpen} onClick={() => void handleSelectOutputDirectory()}>
                Browse…
              </IconButton>
            </div>
          </Field>

          <Field
            label="Output name pattern (optional)"
            icon={FileText}
            hint='Use {CONSTANT_NAME} placeholders. Leave empty for 1.xlsx, 2.xlsx, …'
          >
            <IconInput
              icon={FileText}
              value={automation.outputNamePattern ?? ''}
              onChange={(event) => setAutomation({ outputNamePattern: event.target.value })}
              placeholder="hoja-{LongID}"
            />
          </Field>

          <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3 text-sm text-slate-700">
            <button
              type="button"
              onClick={() => setShowPatternHelp((current) => !current)}
              className="flex w-full items-center justify-between gap-2 text-left font-medium text-slate-800"
            >
              <span className="flex items-center gap-2">
                <CircleHelp className="h-4 w-4 shrink-0 text-blue-500" />
                How do output name patterns work?
              </span>
              <span className="text-slate-400">{showPatternHelp ? '−' : '+'}</span>
            </button>

            {showPatternHelp && (
              <div className="mt-3 space-y-3 text-xs text-slate-600">
                <p>
                  Define how each generated file will be named. Use{' '}
                  <code className="rounded bg-white px-1">{`{CONSTANT_NAME}`}</code> to insert the
                  value of that constant for the iteration. The{' '}
                  <code className="rounded bg-white px-1">.xlsx</code> extension is added
                  automatically.
                </p>
                <p>If you leave the pattern empty, files are named sequentially:</p>
                <p>
                  <code className="rounded bg-white px-1">1.xlsx</code>,{' '}
                  <code className="rounded bg-white px-1">2.xlsx</code>,{' '}
                  <code className="rounded bg-white px-1">3.xlsx</code>…
                </p>
                <table className="w-full max-w-lg border-collapse text-left">
                  <thead>
                    <tr className="text-slate-500">
                      <th className="border border-slate-200 px-2 py-1">Pattern</th>
                      <th className="border border-slate-200 px-2 py-1">Row values</th>
                      <th className="border border-slate-200 px-2 py-1">Generated file</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-slate-200 px-2 py-1">
                        <code>hoja-{'{LongID}'}</code>
                      </td>
                      <td className="border border-slate-200 px-2 py-1">LongID = HO</td>
                      <td className="border border-slate-200 px-2 py-1">
                        <code>hoja-HO.xlsx</code>
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-slate-200 px-2 py-1">
                        <code>{'{ID}'}_{'{LongID}'}</code>
                      </td>
                      <td className="border border-slate-200 px-2 py-1">ID = 42, LongID = HO</td>
                      <td className="border border-slate-200 px-2 py-1">
                        <code>42_HO.xlsx</code>
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-slate-200 px-2 py-1">
                        <em>(empty)</em>
                      </td>
                      <td className="border border-slate-200 px-2 py-1">any</td>
                      <td className="border border-slate-200 px-2 py-1">
                        <code>1.xlsx</code>, <code>2.xlsx</code>…
                      </td>
                    </tr>
                  </tbody>
                </table>
                <ul className="list-disc space-y-1 pl-4">
                  <li>
                    Placeholders must match constant names in the project (case-insensitive).
                  </li>
                  <li>
                    Every placeholder must have a column and a value in each iteration row.
                  </li>
                  <li>Invalid filename characters are replaced automatically.</li>
                  <li>Each iteration must produce a unique file name.</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <SectionHeader
          title="Validation preview"
          icon={ClipboardCheck}
          help="Check each iteration row before running. Sheeter validates required columns, non-empty values, and resolved output filenames so you can fix the spreadsheet before exporting."
          action={validating ? <span className="text-xs text-slate-400">Validating…</span> : undefined}
        />

        {!automation.iterationFilePath ? (
          <p className="text-sm text-slate-500">Select an iteration spreadsheet to validate.</p>
        ) : !validation ? (
          <p className="text-sm text-slate-500">Loading validation…</p>
        ) : (
          <>
            {validation.errors.length > 0 && (
              <ul className="mb-3 space-y-1 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {validation.errors.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            )}

            {validation.warnings.length > 0 && (
              <ul className="mb-3 space-y-1 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                {validation.warnings.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            )}

            {validation.rows.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="border-b border-slate-200 px-2 py-2">#</th>
                      {validation.requiredConstants.map((name) => (
                        <th key={name} className="border-b border-slate-200 px-2 py-2">
                          {name}
                        </th>
                      ))}
                      <th className="border-b border-slate-200 px-2 py-2">Output file</th>
                      <th className="border-b border-slate-200 px-2 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validation.rows.map((row) => (
                      <tr key={row.rowIndex} className={row.valid ? '' : 'bg-red-50/60'}>
                        <td className="border-b border-slate-100 px-2 py-2">{row.iterationNumber}</td>
                        {validation.requiredConstants.map((name) => (
                          <td key={name} className="border-b border-slate-100 px-2 py-2">
                            {row.values[name] !== undefined ? String(row.values[name]) : '—'}
                          </td>
                        ))}
                        <td className="border-b border-slate-100 px-2 py-2 font-mono text-xs">
                          {row.resolvedOutputName || '—'}
                        </td>
                        <td className="border-b border-slate-100 px-2 py-2 text-xs">
                          {row.valid ? (
                            <span className="text-emerald-700">Ready</span>
                          ) : (
                            <span className="text-red-600">{row.errors.join(' ')}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-slate-500">No iteration rows found.</p>
            )}
          </>
        )}
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <IconButton
          icon={Play}
          variant="primary"
          onClick={() => void handleRun()}
          disabled={!canRun}
        >
          {running ? 'Running…' : 'Run automation'}
        </IconButton>
        {mappings.length === 0 && (
          <p className="text-sm text-amber-700">Add at least one rule in the Configuration tab.</p>
        )}
      </div>

      <AutomationResultDialog state={resultDialog} onClose={() => setResultDialog(null)} />
    </div>
  )
}
