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

export default function IconButton({
  icon: Icon,
  label,
  onClick,
  type = 'button',
  disabled = false,
  title,
  className = '',
  size = 'default',
  variant = 'raised',
}: IconButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={title ?? label}
      className={[
        `arias-icon-button inline-flex shrink-0 items-center justify-center ${variant === 'flat' ? 'rounded-lg border border-transparent bg-transparent text-slate-600 shadow-none hover:bg-blue-50 hover:text-blue-700 active:bg-blue-100 active:text-blue-800 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300' : 'rounded-full border border-blue-100'} ${size === 'compact' ? 'h-8 w-8' : 'h-11 w-11'}`,
        variant === 'flat' ? 'bg-transparent' : 'bg-gradient-to-b from-blue-50 via-blue-50 to-blue-100/80 text-slate-700',
        variant === 'flat' ? 'shadow-none transition-colors duration-150' : 'shadow-[0_2px_5px_rgba(37,99,235,0.12)] transition-all duration-150',
        variant === 'flat' ? '' : 'hover:-translate-y-1 hover:border-blue-200 hover:from-blue-50 hover:via-blue-100 hover:to-blue-200/80',
        variant === 'flat' ? '' : 'hover:shadow-[0_8px_16px_rgba(37,99,235,0.18)]',
        variant === 'flat' ? '' : 'active:translate-y-0 active:shadow-[inset_0_2px_4px_rgba(37,99,235,0.14)]',
        variant === 'flat' ? 'disabled:cursor-not-allowed disabled:text-slate-300' : 'disabled:cursor-not-allowed disabled:border-slate-200 disabled:from-slate-100 disabled:via-slate-100 disabled:to-slate-100 disabled:text-slate-400 disabled:hover:translate-y-0',
        className,
      ].join(' ')}
    >
      <Icon size={size === 'compact' ? 15 : 18} strokeWidth={2} />
    </button>
  )
}
