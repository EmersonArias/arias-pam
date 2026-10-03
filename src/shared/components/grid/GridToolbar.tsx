import type { LucideIcon } from 'lucide-react'
import ActionButton, { type ActionButtonTone } from '../buttons/ActionButton'
import IconButton from '../buttons/IconButton'

export interface GridToolbarAction {
  key: string
  label: string
  icon: LucideIcon
  tone?: ActionButtonTone
  onClick: () => void
  disabled?: boolean
  compact?: boolean
}

interface GridToolbarProps {
  actions: GridToolbarAction[]
}

export default function GridToolbar({ actions }: GridToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {actions.map((action) =>
        action.compact ? (
          <IconButton
            key={action.key}
            icon={action.icon}
            label={action.label}
            onClick={action.onClick}
            disabled={action.disabled}
          />
        ) : (
          <ActionButton
            key={action.key}
            icon={action.icon}
            label={action.label}
            tone={action.tone}
            onClick={action.onClick}
            disabled={action.disabled}
          />
        ),
      )}
    </div>
  )
}
