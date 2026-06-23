import { useEffect, useState } from 'react'
import {
  FileDown,
  FileUp,
  FolderInput,
  Play,
  Settings,
  Zap
} from 'lucide-react'
import { validateExportWorkbookConfig } from '../../shared/validation'
import appIcon from './assets/app-icon.png'
import { AutomationPanel } from './components/AutomationPanel'
import { ConstantsPanel } from './components/ConstantsPanel'
import { ExportDialog } from './components/ExportDialog'
import { RulesPanel } from './components/RulesPanel'
import { SourcePanel } from './components/SourcePanel'
import { TemplatePanel } from './components/TemplatePanel'
import { IconButton } from './components/ui/IconButton'
import { SectionHeader } from './components/ui/SectionHeader'
import { useProjectStore } from './store/useProjectStore'

type AppTab = 'configuration' | 'automations'

export default function App(): React.JSX.Element {
  const loadProject = useProjectStore((state) => state.loadProject)
  const clearWorkspace = useProjectStore((state) => state.clearWorkspace)
  const addSourceFiles = useProjectStore((state) => state.addSourceFiles)
  const getProjectConfig = useProjectStore((state) => state.getProjectConfig)
  const getExportWorkbookConfig = useProjectStore((state) => state.getExportWorkbookConfig)

  const [activeTab, setActiveTab] = useState<AppTab>('configuration')
  const [importingSources, setImportingSources] = useState(false)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportErrors, setExportErrors] = useState<string[]>([])
  const [exportWarnings, setExportWarnings] = useState<string[]>([])
  const [successPath, setSuccessPath] = useState<string | null>(null)

  useEffect(() => {
    return window.herma.onCleanWorkspace(() => {
      clearWorkspace()
    })
  }, [clearWorkspace])

  const handleImportSources = async (): Promise<void> => {
    setImportingSources(true)
    try {
      const files = await window.herma.openFiles()
      if (files.length > 0) {
        addSourceFiles(files)
      }
    } finally {
      setImportingSources(false)
    }
  }

  const handleImportProject = async (): Promise<void> => {
    const result = await window.herma.importProject()
    if (result.canceled) return
    loadProject(result.config)
  }

  const handleExportProject = async (): Promise<void> => {
    const config = getProjectConfig()
    if (!config.template) {
      setExportErrors(['Select a template workbook before exporting the project configuration.'])
      setExportWarnings([])
      setSuccessPath(null)
      setExportDialogOpen(true)
      return
    }

    try {
      const result = await window.herma.exportProject(config)
      if (result.canceled) return
      if (result.warnings.length > 0) {
        setExportWarnings(result.warnings)
        setExportErrors([])
        setSuccessPath(result.filePath)
        setExportDialogOpen(true)
      }
    } catch (error) {
      setExportErrors([error instanceof Error ? error.message : String(error)])
      setExportWarnings([])
      setSuccessPath(null)
      setExportDialogOpen(true)
    }
  }

  const handleExportWorkbook = async (): Promise<void> => {
    const config = getExportWorkbookConfig()
    if (!config) {
      setExportErrors(['Add at least one rule before exporting.'])
      setExportWarnings([])
      setSuccessPath(null)
      setExportDialogOpen(true)
      return
    }

    const validation = validateExportWorkbookConfig(config)
    setExportErrors(validation.errors)
    setExportWarnings(validation.warnings)
    setSuccessPath(null)
    setExportDialogOpen(true)

    if (!validation.valid) return

    setExporting(true)
    try {
      const result = await window.herma.exportWorkbook(config)
      if (result.canceled) {
        setExportDialogOpen(false)
        return
      }
      setSuccessPath(
        result.mergeOutputPaths.length > 1
          ? result.mergeOutputPaths.join('\n')
          : result.filePath
      )
    } catch (error) {
      setExportErrors([
        error instanceof Error ? error.message : 'An unexpected error occurred during export.'
      ])
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex h-screen flex-col text-slate-900">
      <div className="glass-chrome app-chrome">
        <div className="app-chrome-titlebar" aria-hidden="true" />

        <header className="app-chrome-header flex items-center justify-between px-6 py-3">
          <div className="app-chrome-brand flex items-center gap-4">
            <img
              src={appIcon}
              alt=""
              className="app-chrome-mark"
              draggable={false}
            />
            <div>
              <h1 className="app-chrome-heading text-lg font-semibold tracking-tight text-slate-900">
                Herma
              </h1>
              <p className="text-sm text-slate-500">
                Copy spreadsheet fragments into a template workbook
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <IconButton icon={FolderInput} onClick={() => void handleImportProject()}>
              Import project
            </IconButton>
            <IconButton icon={FileDown} onClick={() => void handleExportProject()}>
              Export project
            </IconButton>
            <IconButton
              icon={FileUp}
              onClick={() => void handleImportSources()}
              disabled={importingSources}
            >
              {importingSources ? 'Importing…' : 'Import sources'}
            </IconButton>
            <IconButton icon={Play} variant="primary" onClick={() => void handleExportWorkbook()}>
              Generate
            </IconButton>
          </div>
        </header>

        <div className="px-4 pb-2.5">
          <nav className="glass-tab-group">
            <TabButton
              active={activeTab === 'configuration'}
              onClick={() => setActiveTab('configuration')}
              icon={Settings}
            >
              Configuration
            </TabButton>
            <TabButton
              active={activeTab === 'automations'}
              onClick={() => setActiveTab('automations')}
              icon={Zap}
              variant="automation"
            >
              Automations
            </TabButton>
          </nav>
        </div>
      </div>

      <main
        className={[
          'flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4',
          activeTab === 'automations' ? 'main-automation' : ''
        ].join(' ')}
      >
        {activeTab === 'configuration' ? (
          <>
            <TemplatePanel />
            <ConstantsPanel />

            <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
              <section className="glass-panel flex min-h-[320px] flex-col p-4">
                <SectionHeader
                  title="Source files"
                  icon={FileUp}
                  help="Import .xlsx, .xls, or .csv files that contain the data to copy or merge. Expand each file to browse its sheets and preview the structure before creating rules."
                />
                <SourcePanel />
              </section>

              <RulesPanel />
            </div>
          </>
        ) : (
          <AutomationPanel />
        )}
      </main>

      <ExportDialog
        open={exportDialogOpen}
        exporting={exporting}
        errors={exportErrors}
        warnings={exportWarnings}
        successPath={successPath}
        onClose={() => setExportDialogOpen(false)}
      />
    </div>
  )
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  variant = 'default',
  children
}: {
  active: boolean
  onClick: () => void
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>
  variant?: 'default' | 'automation'
  children: React.ReactNode
}): React.JSX.Element {
  const activeClass =
    variant === 'automation' && active
      ? 'glass-tab-active-automation'
      : active
        ? 'glass-tab-active'
        : ''

  return (
    <button
      type="button"
      onClick={onClick}
      className={['glass-tab text-xs font-medium transition', activeClass].join(' ')}
    >
      {Icon && <Icon className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden="true" />}
      {children}
    </button>
  )
}
