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
        'inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white',
        'text-slate-700 shadow-[0_2px_5px_rgba(15,23,42,0.10)] transition-all duration-150',
        'hover:-translate-y-1 hover:border-slate-300 hover:bg-slate-50 hover:shadow-[0_8px_16px_rgba(15,23,42,0.16)]',
        'active:translate-y-0 active:shadow-[inset_0_2px_4px_rgba(15,23,42,0.12)]',
        'disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0',
        className,
      ].join(' ')}
    >
      <Icon size={18} strokeWidth={2} />
    </button>
  )
}
