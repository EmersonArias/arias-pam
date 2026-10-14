import type { LucideIcon } from 'lucide-react'
import ActionButton, { type ActionButtonTone } from '../buttons/ActionButton'
import IconButton from '../buttons/IconButton'

const shortLabels: Record<string, string> = {
  Nuevo: 'Nuevo', Crear: 'Nuevo', Añadir: 'Nuevo', Agregar: 'Nuevo',
  Modificar: 'Editar', Editar: 'Editar', Actualizar: 'Actualizar',
  Desactivar: 'Baja', Activar: 'Activar', Eliminar: 'Baja', Borrar: 'Baja',
  Mantenimientos: 'Mantto.', Mantenimiento: 'Mantto.', PDF: 'PDF', Imprimir: 'PDF',
  Volver: 'Volver', Inicio: 'Inicio', Guardar: 'Guardar', Cancelar: 'Cancelar',
  Buscar: 'Buscar', Filtrar: 'Filtrar', Limpiar: 'Limpiar', Fotos: 'Fotos',
  Imagen: 'Fotos', Descargar: 'Descarga', Exportar: 'Exportar', Importar: 'Importar',
  Refrescar: 'Actualizar', Cerrar: 'Cerrar',
}

function shortLabel(label: string) {
  const key = label.trim()
  if (shortLabels[key]) return shortLabels[key]
  const first = key.split(/[\s(–—-]+/)[0]
  return first.length > 9 ? `${first.slice(0, 8)}…` : first
}

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
  className?: string
}

export default function GridToolbar({ actions, className = '' }: GridToolbarProps) {
  return (
    <div className={['arias-grid-toolbar flex items-start justify-end gap-1', className].filter(Boolean).join(' ')}>
      {actions.map((action) => (
        <div key={action.key} className="arias-toolbar-action flex w-9 shrink-0 flex-col items-center gap-0.5 text-center">
          {action.compact ? (
            <IconButton
              icon={action.icon}
              label={action.label}
              onClick={action.onClick}
              disabled={action.disabled}
            />
          ) : (
            <ActionButton
              icon={action.icon}
              label={action.label}
              tone={action.tone}
              onClick={action.onClick}
              disabled={action.disabled}
            />
          )}
          <span aria-hidden="true" className="w-full truncate text-[10px] font-medium leading-3 text-black">{shortLabel(action.label)}</span>
        </div>
      ))}
    </div>
  )
}
