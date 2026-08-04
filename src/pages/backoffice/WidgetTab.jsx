import { useState } from 'react'
import { Card, Field, Button } from '../../components/ui.jsx'

export default function WidgetTab({ orgId, org }) {
  const [copied, setCopied] = useState(false)
  const url = `${window.location.origin}/widget/${orgId}`
  const snippet = `<iframe src="${url}" title="Prendre un ticket — ${org.nom}" style="width:100%;max-width:420px;height:720px;border:0;"></iframe>`

  async function copier() {
    try {
      await navigator.clipboard.writeText(snippet)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <Card>
      <h3 style={{ marginTop: 0 }}>Widget embarquable</h3>
      <p className="muted" style={{ fontSize: '0.85rem' }}>
        Intégrez la prise de ticket directement sur votre propre site web, dans un cadre (<code>&lt;iframe&gt;</code>).
        Ce lien est le seul autorisé à être affiché en cadre — le reste de l’application le refuse par sécurité.
      </p>
      <Field label="Code à coller sur votre site">
        <textarea className="input" readOnly rows={3} value={snippet} style={{ fontFamily: 'monospace', fontSize: '0.8rem' }} onFocus={(e) => e.target.select()} />
      </Field>
      <Button variant="outline" onClick={copier}>{copied ? 'Copié !' : '📋 Copier le code'}</Button>
    </Card>
  )
}
