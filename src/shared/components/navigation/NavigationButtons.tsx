import { ArrowLeft, House } from 'lucide-react'
import IconButton from '../buttons/IconButton'

interface NavigationButtonsProps {
  onBack: () => void
  onHome: () => void
  disabled?: boolean
}

export function BackButton({
  onBack,
  disabled = false,
}: Pick<NavigationButtonsProps, 'onBack' | 'disabled'>) {
  return <IconButton icon={ArrowLeft} label="Volver" title="Volver" onClick={onBack} disabled={disabled} />
}

export function HomeButton({
  onHome,
  disabled = false,
}: Pick<NavigationButtonsProps, 'onHome' | 'disabled'>) {
  return <IconButton icon={House} label="Inicio" title="Inicio" onClick={onHome} disabled={disabled} />
}

export default function NavigationButtons({
  onBack,
  onHome,
  disabled = false,
}: NavigationButtonsProps) {
  return (
    <div className="flex items-center gap-2">
      <BackButton onBack={onBack} disabled={disabled} />
      <HomeButton onHome={onHome} disabled={disabled} />
    </div>
  )
}
