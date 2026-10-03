import { useState } from 'react'
import { useBeforeUnloadGuard } from './useBeforeUnloadGuard'

interface UseGuardedNavigationOptions {
  dirty: boolean
  onNavigate: (path: string) => void
  onSave?: () => Promise<boolean> | boolean
}

export function useGuardedNavigation({
  dirty,
  onNavigate,
  onSave,
}: UseGuardedNavigationOptions) {
  const [pendingPath, setPendingPath] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  useBeforeUnloadGuard(dirty)

  function requestNavigation(path: string) {
    if (!dirty) {
      onNavigate(path)
      return
    }

    setPendingPath(path)
    setDialogOpen(true)
  }

  function cancelNavigation() {
    setDialogOpen(false)
    setPendingPath(null)
  }

  function discardNavigation() {
    const path = pendingPath
    setDialogOpen(false)
    setPendingPath(null)
    if (path) onNavigate(path)
  }

  async function saveAndNavigate() {
    if (!pendingPath || !onSave) return

    setSaving(true)
    try {
      const saved = await onSave()
      if (!saved) return

      const path = pendingPath
      setDialogOpen(false)
      setPendingPath(null)
      onNavigate(path)
    } finally {
      setSaving(false)
    }
  }

  return {
    requestNavigation,
    cancelNavigation,
    discardNavigation,
    saveAndNavigate,
    dialogOpen,
    saving,
  }
}
