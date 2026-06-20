import type { LucideIcon } from 'lucide-react'

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: LucideIcon
  variant?: 'default' | 'primary' | 'ghost'
}

const variantClasses: Record<NonNullable<IconButtonProps['variant']>, string> = {
  default: 'border border-slate-200 text-slate-700 hover:bg-slate-50',
  primary: 'bg-emerald-600 text-white hover:bg-emerald-500',
  ghost: 'text-slate-500 hover:bg-slate-50'
}

export function IconButton({
  icon: Icon,
  variant = 'default',
  className = '',
  children,
  ...props
}: IconButtonProps): React.JSX.Element {
  return (
    <button
      type="button"
      {...props}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50',
        variantClasses[variant],
        className
      ].join(' ')}
    >
      {Icon && <Icon className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden="true" />}
      {children}
    </button>
  )
}
