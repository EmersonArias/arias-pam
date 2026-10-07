import { useMemo } from 'react'
import { qrcode } from '../../lib/qrcode-generator'

interface AssetQrCodeProps {
  value: string
  label: string
}

interface QrCodeInstance {
  addData: (data: string, mode?: string) => void
  make: () => void
  createSvgTag: (options: {
    cellSize?: number
    margin?: number
    scalable?: boolean
  }) => string
}

const createQrCode = qrcode as unknown as (
  typeNumber: number,
  errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H',
) => QrCodeInstance

export default function AssetQrCode({ value, label }: AssetQrCodeProps) {
  const svg = useMemo(() => {
    const qr = createQrCode(0, 'M')
    qr.addData(value, 'Byte')
    qr.make()

    return qr.createSvgTag({
      cellSize: 5,
      margin: 4,
      scalable: false,
    })
  }, [value])

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center">
        <div
          className="shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white p-2 [&>svg]:block [&>svg]:h-40 [&>svg]:w-40"
          aria-label={'Código QR de ' + label}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <div className="min-w-0">
          <div className="text-sm font-bold text-slate-800">Código QR</div>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Escanea el código para abrir directamente la ficha de este activo.
          </p>
          <div className="mt-2 break-all rounded-lg bg-slate-50 p-2 text-[10px] leading-4 text-slate-500">
            {value}
          </div>
        </div>
      </div>
    </div>
  )
}
