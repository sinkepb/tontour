import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, Field, Button } from '../../components/ui.jsx'
import QrCode from '../../components/QrCode.jsx'

export default function QrCodeTab({ orgId, org }) {
  const [copied, setCopied] = useState(false)
  const url = `${window.location.origin}/o/${orgId}`

  async function copierId() {
    try {
      await navigator.clipboard.writeText(orgId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <Card>
      <h3 style={{ marginTop: 0 }}>QR code du point de vente</h3>
      <p className="muted" style={{ fontSize: '0.85rem' }}>
        À scanner par les clients pour prendre un ticket. Chaque point de vente a son propre identifiant et son propre
        QR code — imprimez l’affiche et collez-la en boutique.
      </p>
      <div className="row" style={{ alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>
        <div style={{ padding: 14, border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)', background: 'white' }}>
          <QrCode url={url} size={180} color={org.couleur_principale} />
        </div>
        <div className="stack" style={{ flex: 1, minWidth: 220 }}>
          <Field label="Identifiant de ce point de vente">
            <div className="row" style={{ gap: 8 }}>
              <input className="input" readOnly value={orgId} style={{ fontSize: '0.75rem' }} />
              <Button sm variant="outline" onClick={copierId}>{copied ? 'Copié !' : 'Copier'}</Button>
            </div>
          </Field>
          <Field label="Lien direct">
            <input className="input" readOnly value={url} style={{ fontSize: '0.8rem' }} onFocus={(e) => e.target.select()} />
          </Field>
          <Button as={Link} to={`/o/${orgId}/qrcode`} target="_blank" block>
            Ouvrir l’affiche à imprimer →
          </Button>
        </div>
      </div>
    </Card>
  )
}
