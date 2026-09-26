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
}

export default function IconButton({
  icon: Icon,
  label,
  onClick,
  type = 'button',
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
        'inline-flex h-10 w-10 items-center justify-center rounded-full border border-blue-100',
        'bg-gradient-to-b from-blue-50 via-blue-50 to-blue-100/80 text-slate-700',
        'shadow-[0_2px_5px_rgba(37,99,235,0.12)] transition-all duration-150',
        'hover:-translate-y-1 hover:border-blue-200 hover:from-blue-50 hover:via-blue-100 hover:to-blue-200/80',
        'hover:shadow-[0_8px_16px_rgba(37,99,235,0.18)]',
        'active:translate-y-0 active:shadow-[inset_0_2px_4px_rgba(37,99,235,0.14)]',
        'disabled:cursor-not-allowed disabled:border-slate-200 disabled:from-slate-100 disabled:via-slate-100 disabled:to-slate-100 disabled:text-slate-400 disabled:hover:translate-y-0',
        className,
      ].join(' ')}
    >
      <Icon size={18} strokeWidth={2} />
    </button>
  )
}
