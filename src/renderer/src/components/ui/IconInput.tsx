import type { LucideIcon } from 'lucide-react'

interface IconInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon: LucideIcon
}

export function IconInput({ icon: Icon, className = '', ...props }: IconInputProps): React.JSX.Element {
  return (
    <div className="relative min-w-0">
      <Icon
        className="input-icon pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
        strokeWidth={2}
        aria-hidden="true"
      />
      <input
        {...props}
        className={['glass-input w-full py-2 pl-9 pr-3 text-sm', className].join(' ')}
      />
    </div>
  )
}
