import { useState } from 'react'
import { api } from '../../lib/api.js'
import { Card, Field, Button } from '../../components/ui.jsx'

const LOGO_MAX_BYTES = 2 * 1024 * 1024

export default function BrandingTab({ orgId, org, onChange }) {
  const [principale, setPrincipale] = useState(org.couleur_principale)
  const [secondaire, setSecondaire] = useState(org.couleur_secondaire)
  const [logo, setLogo] = useState(org.logo_url || '')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  async function onFileChange(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError('')
    setSaved(false)
    if (!file.type.startsWith('image/')) {
      setError('Le fichier doit être une image (PNG, JPG, SVG…).')
      return
    }
    if (file.size > LOGO_MAX_BYTES) {
      setError('Image trop lourde (2 Mo maximum).')
      return
    }
    setUploading(true)
    try {
      setLogo(await api.uploadLogo(orgId, file))
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  async function save(e) {
    e.preventDefault()
    setError('')
    try {
      await api.majBranding(orgId, { couleur_principale: principale, couleur_secondaire: secondaire, logo_url: logo || null })
      setSaved(true)
      onChange()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <Card>
      <h3 style={{ marginTop: 0 }}>Identité visuelle</h3>
      <p className="muted" style={{ fontSize: '0.85rem' }}>Couleurs et logo appliqués automatiquement aux 4 interfaces (citoyen, agent, back-office, écran de salle).</p>
      <form onSubmit={save}>
        <div className="grid grid-2">
          <Field label="Couleur principale">
            <input className="input" type="color" value={principale} onChange={(e) => { setPrincipale(e.target.value); setSaved(false) }} style={{ height: 44 }} />
          </Field>
          <Field label="Couleur secondaire">
            <input className="input" type="color" value={secondaire} onChange={(e) => { setSecondaire(e.target.value); setSaved(false) }} style={{ height: 44 }} />
          </Field>
        </div>
        <Field label="Logo du magasin">
          <div className="row" style={{ justifyContent: 'flex-start', gap: 14 }}>
            <div
              style={{
                width: 60,
                height: 60,
                background: 'var(--surface-muted)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-sm)',
                flexShrink: 0,
              }}
            >
              {logo ? (
                <img src={logo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span className="muted" style={{ fontSize: '1.4rem', fontWeight: 700 }}>{org.nom.slice(0, 1)}</span>
              )}
            </div>
            <div>
              <input type="file" accept="image/*" onChange={onFileChange} disabled={uploading} />
              {logo && (
                <div>
                  <Button type="button" variant="outline" sm onClick={() => { setLogo(''); setSaved(false) }} style={{ marginTop: 6 }}>
                    Retirer le logo
                  </Button>
                </div>
              )}
              <p className="muted" style={{ fontSize: '0.75rem', margin: '6px 0 0' }}>PNG, JPG ou SVG — 2 Mo maximum.</p>
            </div>
          </div>
          {uploading && <p className="muted" style={{ fontSize: '0.8rem' }}>Envoi en cours…</p>}
        </Field>
        {error && <p role="alert" style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>{error}</p>}
        {saved && !error && <p role="status" style={{ color: 'var(--success)', fontSize: '0.85rem' }}>Identité visuelle enregistrée.</p>}
        <Button type="submit" disabled={uploading}>Enregistrer</Button>
      </form>
    </Card>
  )
}
