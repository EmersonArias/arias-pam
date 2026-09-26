import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Camera,
  ImagePlus,
  Maximize2,
  Minimize2,
  X,
} from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import FormActions, { type FormMode } from '../../../shared/components/forms/FormActions'
import { BackButton, HomeButton } from '../../../shared/components/navigation/NavigationButtons'
import UnsavedChangesDialog from '../../../shared/components/navigation/UnsavedChangesDialog'
import { useGuardedNavigation } from '../../../shared/hooks/useGuardedNavigation'
import {
  createEmptyApparatus,
  fromDatabase,
  toDatabase,
  type ApparatusRegistry,
  type DatabaseApparatusRegistry,
} from '../lib/apparatusRegistry'

const PHOTO_BUCKET = 'apparatus-registry'
function generateId(): string {
  return (
    Date.now().toString(36) +
    Math.random().toString(36).substring(2, 10)
  )
}
async function generateNextCode(
  familyCode: string,
  subfamilyCode: string,
): Promise<string> {
  const family = familyCode.trim().toUpperCase()
  const subfamily = subfamilyCode.trim().toUpperCase()

  if (!family || !subfamily) return ''

  const prefix = `${family}-${subfamily}-`

  const { data, error } = await supabase
    .from('apparatus_registry')
    .select('code')
    .like('code', `${prefix}%`)
    .order('code', { ascending: true })

  if (error) {
    throw new Error(`No se pudo generar el código: ${error.message}`)
  }

  let maxSequence = 0

  for (const row of data ?? []) {
    const code = typeof row.code === 'string' ? row.code.toUpperCase() : ''
    if (!code.startsWith(prefix)) continue

    const suffix = code.slice(prefix.length)
    const sequence = Number.parseInt(suffix, 10)

    if (Number.isInteger(sequence) && sequence > maxSequence) {
      maxSequence = sequence
    }
  }

  return `${prefix}${String(maxSequence + 1).padStart(2, '0')}`
}

function getStoragePathFromPublicUrl(url: string): string | null {
  const marker = `/storage/v1/object/public/${PHOTO_BUCKET}/`
  const index = url.indexOf(marker)
  if (index === -1) return null

  try {
    return decodeURIComponent(url.slice(index + marker.length))
  } catch {
    return url.slice(index + marker.length)
  }
}

export default function ApparatusRegistryDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isNew = !id || id === 'new'

  const [item, setItem] = useState<ApparatusRegistry>(() => createEmptyApparatus())
  const [baseline, setBaseline] = useState<ApparatusRegistry>(() => createEmptyApparatus())
  const [mode, setMode] = useState<FormMode>(isNew ? 'create' : 'view')
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [generatingCode, setGeneratingCode] = useState(false)
  const [uploadingPhotos, setUploadingPhotos] = useState(false)
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [viewerPhoto, setViewerPhoto] = useState<string | null>(null)
  const [viewerMaximized, setViewerMaximized] = useState(false)

  const cameraInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isNew) {
      const empty = createEmptyApparatus()
      setItem(empty)
      setBaseline(empty)
      setMode('create')
      return
    }

    if (!id) return

    async function loadRecord() {
      setLoading(true)
      setErrorMessage('')

      const { data, error } = await supabase
        .from('apparatus_registry')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        setErrorMessage(`Error cargando registro: ${error.message}`)
        setLoading(false)
        return
      }

      const loaded = fromDatabase(data as DatabaseApparatusRegistry)
      setItem(loaded)
      setBaseline(loaded)
      setMode('view')
      setLoading(false)
    }

    void loadRecord()
  }, [id, isNew])

  function updateField<K extends keyof ApparatusRegistry>(
    field: K,
    value: ApparatusRegistry[K],
  ) {
    setItem((current) => ({ ...current, [field]: value }))
    setMessage('')
    setErrorMessage('')
  }

  async function updateClassification(
    field: 'familyCode' | 'subfamilyCode',
    value: string,
  ) {
    const normalizedValue = value.toUpperCase()

    const nextFamily =
      field === 'familyCode' ? normalizedValue : item.familyCode
    const nextSubfamily =
      field === 'subfamilyCode' ? normalizedValue : item.subfamilyCode

    setItem((current) => ({
      ...current,
      [field]: normalizedValue,
    }))
    setMessage('')
    setErrorMessage('')

    if (!isNew) return

    if (!nextFamily.trim() || !nextSubfamily.trim()) {
      setItem((current) => ({ ...current, code: '' }))
      return
    }

    setGeneratingCode(true)

    try {
      const code = await generateNextCode(nextFamily, nextSubfamily)
      setItem((current) => ({
        ...current,
        code,
      }))
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'No se pudo generar el código.',
      )
    } finally {
      setGeneratingCode(false)
    }
  }

  async function saveRecord(navigateAfterCreate = true): Promise<boolean> {
    if (mode === 'view') return true

    if (!item.code.trim() || !item.name.trim()) {
      setErrorMessage('Código y denominación son obligatorios.')
      return false
    }

    setSaving(true)
    setMessage('')
    setErrorMessage('')

    try {
      const payload = toDatabase(item)

      if (isNew) {
        const { data, error } = await supabase
          .from('apparatus_registry')
          .insert(payload)
          .select('*')
          .single()

        if (error) {
          setErrorMessage(`Error guardando registro: ${error.message}`)
          return false
        }

        const saved = fromDatabase(data as DatabaseApparatusRegistry)
        setItem(saved)
        setBaseline(saved)
        setMode('view')
        setMessage('Registro guardado correctamente.')

        if (navigateAfterCreate) {
          navigate(`/apparatusregistry/${saved.id}`, { replace: true })
        }

        return true
      }

      const { data, error } = await supabase
        .from('apparatus_registry')
        .update(payload)
        .eq('id', item.id)
        .select('*')
        .single()

      if (error) {
        setErrorMessage(`Error actualizando registro: ${error.message}`)
        return false
      }

      const saved = fromDatabase(data as DatabaseApparatusRegistry)
      setItem(saved)
      setBaseline(saved)
      setMode('view')
      setMessage('Registro actualizado correctamente.')
      return true
    } finally {
      setSaving(false)
    }
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await saveRecord()
  }

  const onSaveAvailable = mode === 'view' ? undefined : saveAndNavigate

  const isDirty =
    mode !== 'view' && JSON.stringify(item) !== JSON.stringify(baseline)

  const {
    requestNavigation,
    cancelNavigation,
    discardNavigation,
    saveAndNavigate,
    dialogOpen,
    saving: navigatingAndSaving,
  } = useGuardedNavigation({
    dirty: isDirty,
    onNavigate: navigate,
    onSave: () => saveRecord(false),
  })

  async function handlePhotoFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''

    if (!files.length) return

    if (!item.id) {
      setErrorMessage('Guarda el registro antes de añadir fotografías.')
      return
    }

    setUploadingPhotos(true)
    setMessage('')
    setErrorMessage('')

    try {
      const uploadedUrls: string[] = []

      for (const file of files) {
        if (!file.type.startsWith('image/')) continue

        const extension =
  file.name.split('.').pop()?.toLowerCase() || 'jpg'

const path = `${item.id}/${generateId()}.${extension}`

        const { error: uploadError } = await supabase.storage
          .from(PHOTO_BUCKET)
          .upload(path, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type,
          })

        if (uploadError) {
          throw new Error(uploadError.message)
        }

        const { data: publicUrlData } = supabase.storage
          .from(PHOTO_BUCKET)
          .getPublicUrl(path)

        uploadedUrls.push(publicUrlData.publicUrl)
      }

      if (!uploadedUrls.length) {
        setErrorMessage('No se seleccionaron imágenes válidas.')
        return
      }

      const newPhotos = [...item.photos, ...uploadedUrls]

      const { data, error } = await supabase
        .from('apparatus_registry')
        .update({ photos: newPhotos })
        .eq('id', item.id)
        .select('*')
        .single()

      if (error) {
        throw new Error(error.message)
      }

      setItem(fromDatabase(data as DatabaseApparatusRegistry))
      setMessage(
        `${uploadedUrls.length === 1 ? 'Fotografía añadida.' : `${uploadedUrls.length} fotografías añadidas.`}`,
      )
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `Error subiendo fotografías: ${error.message}`
          : 'Error subiendo fotografías.',
      )
    } finally {
      setUploadingPhotos(false)
    }
  }

  async function handleDeletePhoto(url: string) {
    if (!item.id || mode === 'view') return

    const confirmed = window.confirm('¿Eliminar esta fotografía?')
    if (!confirmed) return

    setUploadingPhotos(true)
    setMessage('')
    setErrorMessage('')

    try {
      const path = getStoragePathFromPublicUrl(url)

      if (path) {
        const { error: storageError } = await supabase.storage
          .from(PHOTO_BUCKET)
          .remove([path])

        if (storageError) {
          throw new Error(storageError.message)
        }
      }

      const newPhotos = item.photos.filter((photo) => photo !== url)

      const { data, error } = await supabase
        .from('apparatus_registry')
        .update({ photos: newPhotos })
        .eq('id', item.id)
        .select('*')
        .single()

      if (error) {
        throw new Error(error.message)
      }

      setItem(fromDatabase(data as DatabaseApparatusRegistry))
      setMessage('Fotografía eliminada.')
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `Error eliminando fotografía: ${error.message}`
          : 'Error eliminando fotografía.',
      )
    } finally {
      setUploadingPhotos(false)
    }
  }

  async function handleDelete() {
    if (isNew || !item.id || mode !== 'view') return

    const confirmed = window.confirm(
      `¿Eliminar el registro ${item.code}? Esta acción no se puede deshacer.`,
    )

    if (!confirmed) return

    const { error } = await supabase
      .from('apparatus_registry')
      .delete()
      .eq('id', item.id)

    if (error) {
      setErrorMessage(`Error eliminando registro: ${error.message}`)
      return
    }

    navigate('/apparatusregistry')
  }

  function openReport() {
    if (!item.id) {
      setErrorMessage('El registro todavía no está guardado.')
      return
    }

    const params = new URLSearchParams({
      scope: 'SELECTED',
      selectedId: item.id,
    })

    navigate(`/apparatusregistry/report?${params.toString()}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 p-5">
        <div className="mx-auto max-w-5xl rounded-2xl bg-white p-6 shadow-lg">
          Cargando registro…
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 p-3 sm:p-5">
      <div className="mx-auto max-w-5xl">
        <div className="mb-4 rounded-2xl bg-white p-3 shadow-lg sm:p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="Arias Suite"
                className="h-11 w-auto object-contain sm:h-13"
              />
              <div>
                <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                  Relación de Aparatos
                </h1>
                <p className="text-sm text-slate-500">
                  {isNew ? 'Nuevo registro' : item.code}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <BackButton onBack={() => requestNavigation('/apparatusregistry')} disabled={saving || generatingCode || uploadingPhotos} />
              <HomeButton onHome={() => requestNavigation('/')} disabled={saving || generatingCode || uploadingPhotos} />
              <FormActions
                mode={mode}
                onSave={() => void saveRecord()}
                onCancel={() => requestNavigation('/apparatusregistry')}
                onEdit={() => setMode('edit')}
                onDelete={() => void handleDelete()}
                onReport={openReport}
                saving={saving || generatingCode || uploadingPhotos}
              />
            </div>
          </div>
        </div>

        {(message || errorMessage) && (
          <div
            className={`mb-4 rounded-xl border p-3 text-sm shadow-sm ${
              errorMessage
                ? 'border-red-200 bg-red-50 text-red-700'
                : 'border-green-200 bg-green-50 text-green-700'
            }`}
          >
            {errorMessage || message}
          </div>
        )}

        <form
          id="apparatus-detail-form"
          onSubmit={handleSave}
          className="rounded-2xl bg-white p-4 shadow-lg sm:p-6"
        >
          <h2 className="mb-4 text-lg font-bold text-slate-900">
            Identificación
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-700">
                Código
              </span>
              <input
                value={item.code}
                readOnly
                className="w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 font-semibold uppercase text-slate-700 outline-none"
                placeholder={generatingCode ? 'Generando…' : 'Automático'}
                required
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-700">
                Denominación
              </span>
              <input
                value={item.name}
                onChange={(event) => updateField('name', event.target.value)}
                disabled={mode === 'view'}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
                required
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-700">
                Planta
              </span>
              <input
                value={item.plant}
                onChange={(event) => updateField('plant', event.target.value)}
                disabled={mode === 'view'}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-700">
                Ubicación
              </span>
              <input
                value={item.location}
                onChange={(event) => updateField('location', event.target.value)}
                disabled={mode === 'view'}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="mb-1 block text-sm font-semibold text-slate-700">
                Mantenimiento
              </span>
              <input
                value={item.maintenance}
                onChange={(event) =>
                  updateField('maintenance', event.target.value)
                }
                disabled={mode === 'view'}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
              />
            </label>
          </div>

          <hr className="my-6" />

          <h2 className="mb-4 text-lg font-bold text-slate-900">
            Clasificación
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-700">
                Familia
              </span>
              <input
                value={item.familyCode}
                onChange={(event) =>
                  void updateClassification('familyCode', event.target.value)
                }
                disabled={mode === 'view'}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 font-semibold uppercase outline-none focus:border-blue-500"
                placeholder="Ej. ACC"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-700">
                Subfamilia
              </span>
              <input
                value={item.subfamilyCode}
                onChange={(event) =>
                  void updateClassification(
                    'subfamilyCode',
                    event.target.value,
                  )
                }
                disabled={mode === 'view'}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 font-semibold uppercase outline-none focus:border-blue-500"
                placeholder="Ej. AUT"
              />
            </label>
          </div>

          <hr className="my-6" />

          <h2 className="mb-4 text-lg font-bold text-slate-900">
            Fotografías
          </h2>

          <div className="flex flex-wrap gap-2">
            <label
              className={`relative inline-flex items-center gap-2 overflow-hidden rounded-lg bg-slate-700 px-3 py-2 font-semibold text-white shadow transition ${
                !item.id || uploadingPhotos
                  ? 'cursor-not-allowed opacity-40'
                  : 'cursor-pointer hover:bg-slate-800'
              }`}
            >
              <Camera size={17} />
              Hacer foto
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                disabled={!item.id || mode === 'view' || uploadingPhotos}
                onChange={handlePhotoFiles}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
              />
            </label>

            <label
              className={`relative inline-flex items-center gap-2 overflow-hidden rounded-lg bg-blue-700 px-3 py-2 font-semibold text-white shadow transition ${
                !item.id || uploadingPhotos
                  ? 'cursor-not-allowed opacity-40'
                  : 'cursor-pointer hover:bg-blue-800'
              }`}
            >
              <ImagePlus size={17} />
              Seleccionar imagen
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                disabled={!item.id || uploadingPhotos}
                onChange={handlePhotoFiles}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
              />
            </label>
          </div>

          {!item.id && (
            <p className="mt-2 text-xs text-slate-500">
              Guarda el registro para poder añadir fotografías.
            </p>
          )}

          {item.photos.length === 0 ? (
            <div className="mt-4 rounded-xl border-2 border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
              Sin fotografías
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {item.photos.map((photo) => (
                <div
                  key={photo}
                  className="group relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setViewerPhoto(photo)
                      setViewerMaximized(false)
                    }}
                    className="block w-full cursor-zoom-in"
                    title="Ver fotografía en grande"
                  >
                    <img
                      src={photo}
                      alt={`Fotografía ${item.code}`}
                      className="aspect-square w-full object-cover transition group-hover:scale-[1.02]"
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDeletePhoto(photo)}
                    disabled={mode === 'view' || uploadingPhotos}
                    aria-label="Eliminar fotografía"
                    title="Eliminar fotografía"
                    className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-red-600 shadow hover:bg-white disabled:opacity-50"
                  >
                    <X size={17} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <hr className="my-6" />

          <label className="inline-flex items-center gap-3 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={item.active}
              onChange={(event) => updateField('active', event.target.checked)}
              disabled={mode === 'view'}
              className="h-5 w-5 rounded border-slate-300"
            />
            Registro activo
          </label>
        </form>

        <div className="mt-4 text-right text-xs text-slate-400">
          Arias_PAM / Emerson Arias
        </div>

        <UnsavedChangesDialog
          open={dialogOpen}
          onCancel={cancelNavigation}
          onDiscard={discardNavigation}
          onSaveAndContinue={onSaveAvailable}
          saving={navigatingAndSaving}
        />
        {viewerPhoto && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Visor de fotografía"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setViewerPhoto(null)
                setViewerMaximized(false)
              }
            }}
          >
            <div
              className={`relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl transition-all ${
                viewerMaximized
                  ? 'h-full w-full'
                  : 'max-h-[88vh] w-full max-w-4xl'
              }`}
            >
              <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">
                    {item.code}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {item.name}
                  </p>
                </div>

                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => setViewerMaximized((current) => !current)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700 shadow-sm hover:bg-slate-200"
                    title={viewerMaximized ? 'Restaurar tamaño' : 'Maximizar'}
                    aria-label={viewerMaximized ? 'Restaurar tamaño' : 'Maximizar'}
                  >
                    {viewerMaximized ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setViewerPhoto(null)
                      setViewerMaximized(false)
                    }}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700 shadow-sm hover:bg-slate-200"
                    title="Cerrar"
                    aria-label="Cerrar"
                  >
                    <X size={19} />
                  </button>
                </div>
              </div>

              <div className="flex min-h-0 flex-1 items-center justify-center bg-slate-900 p-3 sm:p-5">
                <img
                  src={viewerPhoto}
                  alt={`Fotografía ampliada ${item.code}`}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
