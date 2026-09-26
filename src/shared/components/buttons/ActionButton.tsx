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

const raisedBlueGradient =
  'border border-blue-100 bg-gradient-to-b from-blue-50 via-blue-50 to-blue-100/80 text-slate-700 shadow-[0_2px_5px_rgba(37,99,235,0.12)]'

export default function ActionButton({
  icon: Icon,
  label,
  onClick,
  type = 'button',
  disabled = false,
  className = '',
}: ActionButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold',
        'transition-all duration-150',
        'hover:-translate-y-1 hover:border-blue-200 hover:from-blue-50 hover:via-blue-100 hover:to-blue-200/80 hover:shadow-[0_8px_16px_rgba(37,99,235,0.18)]',
        'active:translate-y-0 active:shadow-[inset_0_2px_4px_rgba(37,99,235,0.14)]',
        'disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:from-slate-100 disabled:via-slate-100 disabled:to-slate-100 disabled:text-slate-400 disabled:opacity-100 disabled:hover:translate-y-0 disabled:hover:shadow-[0_2px_5px_rgba(15,23,42,0.06)]',
        raisedBlueGradient,
        className,
      ].join(' ')}
    >
      {Icon && <Icon size={17} strokeWidth={2} />}
      <span>{label}</span>
    </button>
  )
}
