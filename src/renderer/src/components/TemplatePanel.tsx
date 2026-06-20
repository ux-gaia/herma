import { FileSpreadsheet, LayoutTemplate } from 'lucide-react'
import { useProjectStore } from '../store/useProjectStore'
import { IconButton } from './ui/IconButton'
import { SectionHeader } from './ui/SectionHeader'

export function TemplatePanel(): React.JSX.Element {
  const template = useProjectStore((state) => state.template)
  const setTemplate = useProjectStore((state) => state.setTemplate)

  const handleSelectTemplate = async (): Promise<void> => {
    const selected = await window.herma.selectTemplate()
    if (selected) {
      setTemplate(selected)
    }
  }

  return (
    <section className="glass-panel p-4">
      <SectionHeader
        title="Template"
        icon={LayoutTemplate}
        help="Choose the destination .xlsx workbook. Copy rules write selected data into sheets of this template at the anchor cell you configure."
        action={
          <IconButton icon={FileSpreadsheet} onClick={() => void handleSelectTemplate()}>
            {template ? 'Change template' : 'Select template'}
          </IconButton>
        }
      />

      {template ? (
        <>
          <p className="text-sm font-medium text-slate-800">{template.name}</p>
          <p className="text-xs break-all text-slate-400">{template.path}</p>
        </>
      ) : (
        <p className="text-sm text-slate-500">Select an .xlsx template workbook.</p>
      )}

      {template && (
        <div className="mt-3 flex flex-wrap gap-2">
          {template.sheets.map((sheet) => (
            <span
              key={sheet.id}
              className="glass-chip px-3 py-1 text-xs"
            >
              {sheet.name}
            </span>
          ))}
        </div>
      )}
    </section>
  )
}
