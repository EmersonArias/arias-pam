import type { LucideIcon } from 'lucide-react'

export type ActionButtonTone = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'dark'

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
  default: 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50',
  primary: 'bg-blue-600 text-white hover:bg-blue-700',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700',
  warning: 'bg-amber-500 text-white hover:bg-amber-600',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  dark: 'bg-slate-800 text-white hover:bg-slate-900',
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
        'inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold shadow-sm transition duration-150',
        'hover:-translate-y-0.5 hover:shadow-md active:translate-y-0',
        'disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0',
        toneClasses[tone],
        className,
      ].join(' ')}
    >
      {Icon && <Icon size={17} strokeWidth={2} />}
      <span>{label}</span>
    </button>
  )
}
