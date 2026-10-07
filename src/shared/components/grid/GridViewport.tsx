import type { ReactNode } from 'react'

interface GridViewportProps {
  children: ReactNode
  className?: string
}

export default function GridViewport({
  children,
  className = '',
}: GridViewportProps) {
  return (
    <div
      className={'min-h-[300px] max-h-[calc(100vh-360px)] overflow-x-auto overflow-y-scroll ' + className}
      style={{ scrollbarGutter: 'stable' }}
    >
      {children}
    </div>
  )
}