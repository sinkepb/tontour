import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api.js'
import { useAuth } from '../lib/AuthContext.jsx'
import { isDemo } from '../lib/supabase.js'
import { PageShell, Card, Field, Button, IconBadge } from '../components/ui.jsx'

const DEMO_ACCOUNTS = {
  boutique: [
    ['Vendeur / Agent', 'vendeur@boutique.demo', 'demo123'],
    ['Back-office (admin)', 'admin@boutique.demo', 'admin123'],
  ],
  mairie: [
    ['Agent', 'agent@mairie.demo', 'demo123'],
    ['Back-office (admin)', 'admin@mairie.demo', 'admin123'],
  ],
}

export default function LoginPage() {
  const { orgId } = useParams()
  const navigate = useNavigate()
  const { login } = useAuth()
  const [org, setOrg] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api.getOrganisation(orgId).then(setOrg)
  }, [orgId])

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const agent = await login(email, password)
      if (agent.organisation_id !== orgId) {
        throw new Error('Ce compte appartient à une autre organisation')
      }
      navigate(agent.role === 'admin' ? `/o/${orgId}/backoffice` : `/o/${orgId}/agent`)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const comptes = DEMO_ACCOUNTS[org?.type] || DEMO_ACCOUNTS.boutique

  return (
    <PageShell organisation={org} title="Connexion" subtitle={org?.nom} backTo={isDemo ? '/demo' : '/'}>
      <Card>
        <div className="row" style={{ justifyContent: 'flex-start', gap: 12, marginBottom: 18 }}>
          <IconBadge icon="🔐" />
          <div>
            <strong>Espace agent &amp; back-office</strong>
            <div className="muted" style={{ fontSize: '0.82rem' }}>Réservé au personnel de {org?.nom || 'l’organisation'}</div>
          </div>
        </div>
        <form onSubmit={onSubmit}>
          <Field label="Email">
            <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
          </Field>
          <Field label="Mot de passe">
            <input className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          {error && <p style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>{error}</p>}
          <Button type="submit" block disabled={busy}>
            {busy ? 'Connexion…' : 'Se connecter'}
          </Button>
        </form>
      </Card>

      {isDemo && (
        <Card>
          <strong style={{ fontSize: '0.85rem' }}>Comptes de démonstration</strong>
          <p className="muted" style={{ fontSize: '0.78rem', margin: '2px 0 12px' }}>Cliquez une ligne pour pré-remplir le formulaire.</p>
          <div className="stack" style={{ gap: 6 }}>
            {comptes.map(([role, mail, pass]) => (
              <button
                key={mail}
                type="button"
                onClick={() => { setEmail(mail); setPassword(pass) }}
                className="row list-row"
                style={{
                  width: '100%', textAlign: 'left', background: 'transparent', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)', padding: '10px 14px', cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{role}</span>
                <span className="muted" style={{ fontSize: '0.78rem' }}>{mail} · {pass}</span>
              </button>
            ))}
          </div>
        </Card>
      )}
    </PageShell>
  )
}
