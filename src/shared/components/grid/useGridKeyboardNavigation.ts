import { useCallback, useEffect, useMemo, useRef } from 'react'

interface UseGridKeyboardNavigationOptions {
  ids: string[]
  selectedId: string
  onSelectedIdChange: (id: string) => void
  autoFocusFirst?: boolean
}

export function useGridKeyboardNavigation({
  ids,
  selectedId,
  onSelectedIdChange,
  autoFocusFirst = true,
}: UseGridKeyboardNavigationOptions) {
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({})

  const selectedIndex = useMemo(() => {
    const index = ids.indexOf(selectedId)
    return index >= 0 ? index : 0
  }, [ids, selectedId])

  const setRowRef = useCallback(
    (id: string, row: HTMLTableRowElement | null) => {
      rowRefs.current[id] = row
    },
    [],
  )

  const focusRow = useCallback((id: string) => {
    const row = rowRefs.current[id]
    if (!row) return

    row.focus({ preventScroll: true })
    row.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
    })
  }, [])

  const moveSelection = useCallback(
    (nextIndex: number) => {
      if (ids.length === 0) return

      const boundedIndex = Math.max(
        0,
        Math.min(nextIndex, ids.length - 1),
      )

      onSelectedIdChange(ids[boundedIndex])
    },
    [ids, onSelectedIdChange],
  )

  useEffect(() => {
    if (!autoFocusFirst || ids.length === 0) return

    const targetId = ids.includes(selectedId) ? selectedId : ids[0]

    if (targetId !== selectedId) {
      onSelectedIdChange(targetId)
      return
    }

    const frame = window.requestAnimationFrame(() => {
      focusRow(targetId)
    })

    return () => window.cancelAnimationFrame(frame)
  }, [
    autoFocusFirst,
    focusRow,
    ids,
    onSelectedIdChange,
    selectedId,
  ])

  function getRowProps(id: string) {
    return {
      ref: (row: HTMLTableRowElement | null) => setRowRef(id, row),
      tabIndex: id === selectedId ? 0 : -1,
      'aria-selected': id === selectedId,
      onFocus: () => {
        if (id !== selectedId) {
          onSelectedIdChange(id)
        }
      },
      onKeyDown: (event: React.KeyboardEvent<HTMLTableRowElement>) => {
        if (event.key === 'ArrowDown') {
          event.preventDefault()
          moveSelection(selectedIndex + 1)
          return
        }

        if (event.key === 'ArrowUp') {
          event.preventDefault()
          moveSelection(selectedIndex - 1)
          return
        }

        if (event.key === 'Home') {
          event.preventDefault()
          moveSelection(0)
          return
        }

        if (event.key === 'End') {
          event.preventDefault()
          moveSelection(ids.length - 1)
        }
      },
    }
  }

  return {
    currentIndex: selectedIndex,
    moveSelection,
    getRowProps,
  }
}