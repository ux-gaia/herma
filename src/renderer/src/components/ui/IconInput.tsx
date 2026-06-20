import type { LucideIcon } from 'lucide-react'

interface IconInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon: LucideIcon
}

export function IconInput({ icon: Icon, className = '', ...props }: IconInputProps): React.JSX.Element {
  return (
    <div className="relative min-w-0">
      <Icon
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        strokeWidth={2}
        aria-hidden="true"
      />
      <input
        {...props}
        className={[
          'w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm',
          'read-only:bg-white read-only:text-slate-700',
          className
        ].join(' ')}
      />
    </div>
  )
}
