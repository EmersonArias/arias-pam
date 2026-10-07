import { CornerUpLeft, House } from 'lucide-react'
import IconButton from '../buttons/IconButton'
import ActionButton from '../buttons/ActionButton'

interface NavigationButtonsProps {
  onBack: () => void
  onHome: () => void
  disabled?: boolean
}

export function BackButton({
  onBack,
  disabled = false,
}: Pick<NavigationButtonsProps, 'onBack' | 'disabled'>) {
  return (
    <ActionButton
      icon={CornerUpLeft}
      label="Volver"
      onClick={onBack}
      disabled={disabled}
    />
  )
}

export function HomeButton({
  onHome,
  disabled = false,
  className,
}: Pick<NavigationButtonsProps, 'onHome' | 'disabled'> & { className?: string }) {
  return <IconButton icon={House} label="Inicio" title="Inicio" onClick={onHome} disabled={disabled} className={className} />
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
