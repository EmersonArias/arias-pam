import type { LucideIcon } from 'lucide-react'

export type ToolbarActionVariant =
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'dark'
  | 'light'

export interface ToolbarAction {
  key: string
  label: string
  icon?: LucideIcon
  variant?: ToolbarActionVariant
  onClick: () => void
  disabled?: boolean
}

interface ModuleToolbarProps {
  actions?: ToolbarAction[]
  onBack: () => void
  backLabel?: string
}

const variantClasses: Record<ToolbarActionVariant, string> = {
  primary:
    'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300',
  success:
    'bg-green-600 text-white hover:bg-green-700 disabled:bg-green-300',
  warning:
    'bg-yellow-500 text-black hover:bg-yellow-600 disabled:bg-yellow-300',
  danger:
    'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300',
  dark:
    'bg-gray-800 text-white hover:bg-gray-900 disabled:bg-gray-500',
  light:
    'bg-white text-gray-800 border border-gray-300 hover:bg-gray-100 disabled:bg-gray-100',
}

export default function ModuleToolbar({
  actions = [],
  onBack,
  backLabel = 'Volver',
}: ModuleToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {actions.map((action) => {
        const Icon = action.icon

        return (
          <button
            key={action.key}
            type="button"
            onClick={action.onClick}
            disabled={action.disabled}
            className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed ${
              variantClasses[action.variant ?? 'light']
            }`}
          >
            {Icon && <Icon className="h-4 w-4" />}
            {action.label}
          </button>
        )
      })}

      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 rounded-md bg-gray-700 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
      >
        ← {backLabel}
      </button>
    </div>
  )
}
