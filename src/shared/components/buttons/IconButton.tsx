import type { LucideIcon } from 'lucide-react'

export type IconButtonTone = 'default' | 'primary' | 'success' | 'warning' | 'danger'

interface IconButtonProps {
  icon: LucideIcon
  label: string
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
  tone?: IconButtonTone
  disabled?: boolean
  title?: string
  className?: string
}

const toneClasses: Record<IconButtonTone, string> = {
  default: 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50',
  primary: 'bg-blue-600 text-white hover:bg-blue-700',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700',
  warning: 'bg-amber-500 text-white hover:bg-amber-600',
  danger: 'bg-red-600 text-white hover:bg-red-700',
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
}: IconButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={title ?? label}
      className={[
        'inline-flex h-10 w-10 items-center justify-center rounded-full shadow-sm transition duration-150',
        'hover:-translate-y-0.5 hover:shadow-md active:translate-y-0',
        'disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0',
        toneClasses[tone],
        className,
      ].join(' ')}
    >
      <Icon size={18} strokeWidth={2} />
    </button>
  )
}
