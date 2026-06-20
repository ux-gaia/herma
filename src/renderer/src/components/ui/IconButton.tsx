import type { LucideIcon } from 'lucide-react'

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: LucideIcon
  variant?: 'default' | 'primary' | 'ghost'
  size?: 'default' | 'sm'
}

const variantClasses: Record<NonNullable<IconButtonProps['variant']>, string> = {
  default: 'glass-button',
  primary: 'glass-button-primary',
  ghost: 'glass-button-ghost'
}

const sizeClasses: Record<NonNullable<IconButtonProps['size']>, string> = {
  default: '',
  sm: 'glass-button-sm'
}

export function IconButton({
  icon: Icon,
  variant = 'default',
  size = 'default',
  className = '',
  children,
  ...props
}: IconButtonProps): React.JSX.Element {
  const iconClass = size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'

  return (
    <button
      type="button"
      {...props}
      className={[
        'disabled:opacity-50',
        variantClasses[variant],
        sizeClasses[size],
        className
      ].join(' ')}
    >
      {Icon && <Icon className={`${iconClass} shrink-0`} strokeWidth={2} aria-hidden="true" />}
      {children}
    </button>
  )
}
