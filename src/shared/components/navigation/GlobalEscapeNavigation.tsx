import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function GlobalEscapeNavigation() {
  const navigate = useNavigate()

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (event.defaultPrevented) return
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return

      event.preventDefault()
      navigate(-1)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [navigate])

  return null
}
