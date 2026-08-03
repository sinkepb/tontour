import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext.jsx'
import { isDemo } from '../lib/supabase.js'
import { PageShell, Card, Field, Button, IconBadge } from '../components/ui.jsx'

const DEMO_ACCOUNTS = [
  ['Vendeur / Agent — Mobile Store Bastille', 'vendeur@boutique.demo', 'demo123'],
  ['Back-office (admin) — Mobile Store Bastille', 'admin@boutique.demo', 'admin123'],
  ['Agent — Mairie de Villeneuve', 'agent@mairie.demo', 'demo123'],
  ['Back-office (admin) — Mairie de Villeneuve', 'admin@mairie.demo', 'admin123'],
]

/** Point d'entrée unique pour le personnel (agents/vendeurs et admins), quelle que soit
 * leur organisation : après authentification, on lit le rôle et l'organisation directement
 * sur le profil agent renvoyé, et on redirige automatiquement vers la bonne interface —
 * l'utilisateur n'a jamais besoin de connaître l'URL de son organisation à l'avance. */
export default function StaffLoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const agent = await login(email, password)
      navigate(agent.role === 'admin' ? `/o/${agent.organisation_id}/backoffice` : `/o/${agent.organisation_id}/agent`)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <PageShell title="Connexion" subtitle="Espace agent & back-office" backTo="/">
      <Card>
        <div className="row" style={{ justifyContent: 'flex-start', gap: 12, marginBottom: 18 }}>
          <IconBadge icon="🔐" />
          <div>
            <strong>Espace agent &amp; back-office</strong>
            <div className="muted" style={{ fontSize: '0.82rem' }}>Réservé au personnel — vous serez redirigé vers votre organisation automatiquement.</div>
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
            {DEMO_ACCOUNTS.map(([role, mail, pass]) => (
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

      <p className="muted" style={{ textAlign: 'center', fontSize: '0.8rem', marginTop: 4 }}>
        Vous êtes un client à la recherche de votre ticket ?{' '}
        <Link to="/" className="link-plain" style={{ fontWeight: 600 }}>Retour à l’accueil</Link>
      </p>
    </PageShell>
  )
}
