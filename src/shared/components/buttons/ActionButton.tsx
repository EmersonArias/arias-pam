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

const raisedButtonClass =
  'border border-slate-200 bg-white text-slate-700 shadow-[0_2px_5px_rgba(15,23,42,0.10)] hover:-translate-y-1 hover:border-slate-300 hover:bg-slate-50 hover:shadow-[0_8px_16px_rgba(15,23,42,0.16)] active:translate-y-0 active:shadow-[inset_0_2px_4px_rgba(15,23,42,0.12)]'

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
        'inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-all duration-150',
        'disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0',
        raisedButtonClass,
        className,
      ].join(' ')}
    >
      {Icon && <Icon size={17} strokeWidth={2} />}
      <span>{label}</span>
    </button>
  )
}
