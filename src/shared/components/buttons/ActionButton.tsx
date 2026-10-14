import type { LucideIcon } from 'lucide-react'

export type ActionButtonTone =
  | 'default'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'dark'

interface ActionButtonProps {
  icon?: LucideIcon
  label: string
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
  tone?: ActionButtonTone
  disabled?: boolean
  className?: string
}

const toneClasses: Record<ActionButtonTone, string> = {
  default: 'border-slate-200 bg-slate-100 text-slate-800 hover:bg-slate-200 active:bg-slate-300',
  primary: 'border-blue-700 bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800',
  success: 'border-emerald-700 bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800',
  warning: 'border-amber-300 bg-amber-100 text-amber-950 hover:bg-amber-200 active:bg-amber-300',
  danger: 'border-red-700 bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
  dark: 'border-slate-700 bg-slate-800 text-white hover:bg-slate-900 active:bg-black',
}

export default function ActionButton({
  icon: Icon,
  label,
  onClick,
  type = 'button',
  tone = 'default',
  disabled = false,
  className = '',
}: ActionButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={[
        'arias-action-button inline-flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold',
        'shadow-sm transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
        'active:scale-[0.98]',
        'disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none disabled:active:scale-100',
        toneClasses[tone],
        className,
      ].join(' ')}
    >
      {Icon && <Icon size={18} strokeWidth={2} aria-hidden="true" />}
      <span className="truncate">{label}</span>
    </button>
  )
}
