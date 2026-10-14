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

const toneClasses: Record<IconButtonTone, string> = {
  default: 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 active:bg-slate-300',
  primary: 'border-blue-700 bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800',
  success: 'border-emerald-700 bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800',
  warning: 'border-amber-300 bg-amber-100 text-amber-950 hover:bg-amber-200 active:bg-amber-300',
  danger: 'border-red-700 bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
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
  variant = 'raised',
}: IconButtonProps) {
  const dimensions = size === 'compact' ? 'h-9 w-9' : 'h-11 w-11'
  const visualStyle = variant === 'flat'
    ? 'rounded-xl border border-transparent bg-transparent text-slate-600 hover:bg-slate-100 active:bg-slate-200'
    : `rounded-xl border shadow-sm ${toneClasses[tone]}`

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={title ?? label}
      className={[
        'arias-icon-button inline-flex shrink-0 items-center justify-center',
        dimensions,
        visualStyle,
        'transition-colors duration-150 active:scale-[0.97]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none disabled:active:scale-100',
        className,
      ].join(' ')}
    >
      <Icon size={size === 'compact' ? 17 : 19} strokeWidth={2} aria-hidden="true" />
    </button>
  )
}
