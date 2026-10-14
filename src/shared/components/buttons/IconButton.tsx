import type { LucideIcon } from 'lucide-react'

export type IconButtonTone =
  | 'default'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'

interface IconButtonProps {
  icon: LucideIcon
  label: string
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
  tone?: IconButtonTone
  disabled?: boolean
  title?: string
  className?: string
  size?: 'default' | 'compact'
  variant?: 'raised' | 'flat'
}

const rippleClasses: Record<IconButtonTone, string> = {
  default: 'hover:bg-slate-100 active:bg-slate-200 active:ring-4 active:ring-slate-200/70',
  primary: 'hover:bg-blue-50 active:bg-blue-100 active:ring-4 active:ring-blue-200/70',
  success: 'hover:bg-emerald-50 active:bg-emerald-100 active:ring-4 active:ring-emerald-200/70',
  warning: 'hover:bg-amber-50 active:bg-amber-100 active:ring-4 active:ring-amber-200/70',
  danger: 'hover:bg-red-50 active:bg-red-100 active:ring-4 active:ring-red-200/70',
}

export default function IconButton({
  icon: Icon,
  label,
  onClick,
  type = 'button',
  tone = 'default',
  disabled = false,
  title,
  className = '',
  size = 'default',
}: IconButtonProps) {
  const dimensions = size === 'compact' ? 'h-8 w-8' : 'h-9 w-9'

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={title ?? label}
      className={[
        'arias-icon-button inline-flex shrink-0 items-center justify-center rounded-full',
        dimensions,
        'text-slate-700 transition-[background-color,box-shadow,transform] duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1',
        'active:scale-95',
        rippleClasses[tone],
        'disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent disabled:active:scale-100 disabled:active:ring-0',
        className,
      ].join(' ')}
    >
      <Icon size={size === 'compact' ? 17 : 19} strokeWidth={2} aria-hidden="true" />
    </button>
  )
}
