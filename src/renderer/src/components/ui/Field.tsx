import type { LucideIcon } from 'lucide-react'

interface FieldProps {
  label: string
  hint?: string
  icon?: LucideIcon
  children: React.ReactNode
}

export function Field({ label, hint, icon: Icon, children }: FieldProps): React.JSX.Element {
  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
        {Icon && <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400" strokeWidth={2} aria-hidden="true" />}
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  )
}
