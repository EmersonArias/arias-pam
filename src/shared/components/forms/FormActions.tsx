import { FileText, Pencil, Save, Trash2, X } from 'lucide-react'
import ActionButton from '../buttons/ActionButton'

export type FormMode = 'create' | 'view' | 'edit'

interface FormActionsProps {
  mode: FormMode
  onSave?: () => void
  onCancel?: () => void
  onEdit?: () => void
  onDelete?: () => void
  onReport?: () => void
  saving?: boolean
  deleting?: boolean
  reportLabel?: string
}

export default function FormActions({
  mode,
  onSave,
  onCancel,
  onEdit,
  onDelete,
  onReport,
  saving = false,
  deleting = false,
  reportLabel = 'PDF',
}: FormActionsProps) {
  if (mode === 'view') {
    return (
      <div className="flex flex-wrap justify-end gap-2">
        {onEdit && <ActionButton icon={Pencil} label="Modificar" tone="warning" onClick={onEdit} />}
        {onReport && <ActionButton icon={FileText} label={reportLabel} tone="dark" onClick={onReport} />}
        {onDelete && (
          <ActionButton
            icon={Trash2}
            label="Eliminar"
            tone="danger"
            onClick={onDelete}
            disabled={deleting}
          />
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-wrap justify-end gap-2">
      {onCancel && <ActionButton icon={X} label="Cancelar" onClick={onCancel} disabled={saving} />}
      {onSave && (
        <ActionButton
          icon={Save}
          label={saving ? 'Guardando…' : mode === 'create' ? 'Guardar' : 'Guardar cambios'}
          tone="success"
          onClick={onSave}
          disabled={saving}
        />
      )}
    </div>
  )
}
