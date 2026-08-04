import { useEffect, useState } from 'react'

/** Génère un QR code (PNG en data URL) pour une URL donnée. Aucun appel réseau — tout est local (paquet `qrcode`). */
export default function QrCode({ url, size = 260, color = '#000000' }) {
  const [dataUrl, setDataUrl] = useState(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!url) return
    setDataUrl(null)
    setError(false)
    import('qrcode')
      .then((mod) => {
        const QR = mod.default || mod
        return QR.toDataURL(url, {
          errorCorrectionLevel: 'M',
          margin: 2,
          width: size,
          color: { dark: color, light: '#ffffff' },
        })
      })
      .then(setDataUrl)
      .catch(() => setError(true))
  }, [url, size, color])

  if (error) {
    return (
      <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--danger-bg)', color: 'var(--danger-ink)', fontSize: 13, textAlign: 'center', padding: 12 }}>
        Erreur de génération du QR code
      </div>
    )
  }

  if (!dataUrl) {
    return <div style={{ width: size, height: size, background: 'var(--surface-muted)' }} />
  }

  return <img src={dataUrl} width={size} height={size} alt="QR code" style={{ display: 'block' }} />
}
