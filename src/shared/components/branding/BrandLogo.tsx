interface BrandLogoProps {
  alt?: string
  className?: string
  onActivate: () => void
  label?: string
}

export default function BrandLogo({
  alt = 'Arias Suite',
  className = 'h-11 w-auto object-contain',
  onActivate,
  label = 'Ir a la pantalla principal',
}: BrandLogoProps) {
  return (
    <button
      type="button"
      onClick={onActivate}
      aria-label={label}
      title={label}
      className="shrink-0 rounded-lg outline-none transition-transform duration-150 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-slate-400 active:translate-y-0"
    >
      <img src="/logo.png" alt={alt} className={className} />
    </button>
  )
}
