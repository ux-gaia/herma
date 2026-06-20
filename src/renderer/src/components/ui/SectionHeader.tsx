import type { LucideIcon } from 'lucide-react'
import { HelpTooltip } from './HelpTooltip'

interface SectionHeaderProps {
  title: string
  icon: LucideIcon
  action?: React.ReactNode
  description?: string
  help?: string
}

export function SectionHeader({
  title,
  icon: Icon,
  action,
  description,
  help
}: SectionHeaderProps): React.JSX.Element {
  return (
    <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
          <Icon className="h-4 w-4 shrink-0 text-slate-500" strokeWidth={2} aria-hidden="true" />
          {title}
          {help && <HelpTooltip text={help} />}
        </h2>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {action}
    </div>
  )
}
