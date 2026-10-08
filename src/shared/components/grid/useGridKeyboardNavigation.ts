import { useCallback, useEffect, useMemo, useRef } from 'react'

interface UseGridKeyboardNavigationOptions {
  ids: string[]
  selectedId: string | null
  onSelectedIdChange: (id: string) => void
  onOpen?: (id: string) => void
  autoFocusFirst?: boolean
}

export function useGridKeyboardNavigation({
  ids,
  selectedId,
  onSelectedIdChange,
  onOpen,
  autoFocusFirst = true,
}: UseGridKeyboardNavigationOptions) {
  const gridRef = useRef<HTMLDivElement | null>(null)
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({})
  const hasAutoFocusedRef = useRef(false)

  const selectedIndex = useMemo(() => {
    if (!selectedId) return 0
    const index = ids.indexOf(selectedId)
    return index >= 0 ? index : 0
  }, [ids, selectedId])

  const setRowRef = useCallback(
    (id: string, row: HTMLTableRowElement | null) => {
      rowRefs.current[id] = row
    },
    [],
  )

  const scrollRowIntoView = useCallback((id: string) => {
    const row = rowRefs.current[id]
    if (!row) return

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
    if (ids.length === 0) return

    const targetId =
      selectedId && ids.includes(selectedId)
        ? selectedId
        : ids[0]

    if (targetId !== selectedId) {
      onSelectedIdChange(targetId)
      return
    }

    const frame = window.requestAnimationFrame(() => {
      scrollRowIntoView(targetId)
      if (autoFocusFirst && !hasAutoFocusedRef.current) {
        hasAutoFocusedRef.current = true
        gridRef.current?.focus({ preventScroll: true })
      }
    })

    return () => window.cancelAnimationFrame(frame)
  }, [
    autoFocusFirst,
    ids,
    onSelectedIdChange,
    scrollRowIntoView,
    selectedId,
  ])

  const handleGridKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
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
        return
      }

      if (event.key === 'Enter') {
        event.preventDefault()
        const id = ids[selectedIndex]
        if (id) onOpen?.(id)
      }
    },
    [ids, moveSelection, onOpen, selectedIndex],
  )

  function getGridProps() {
    return {
      ref: gridRef,
      tabIndex: 0,
      role: 'grid',
      'aria-activedescendant': selectedId ? `grid-row-${selectedId}` : undefined,
      onKeyDown: handleGridKeyDown,
      onFocus: () => {
        if (ids.length > 0 && !selectedId) {
          onSelectedIdChange(ids[0])
        }
      },
    }
  }

  function getRowProps(id: string) {
    return {
      ref: (row: HTMLTableRowElement | null) => setRowRef(id, row),
      id: `grid-row-${id}`,
      role: 'row',
      'aria-selected': id === selectedId,
    }
  }

  return {
    currentIndex: selectedIndex,
    moveSelection,
    getGridProps,
    getRowProps,
  }
}