import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { api } from '../lib/api.js'
import { useAuth } from '../lib/AuthContext.jsx'
import { SEGMENTS } from '../lib/plans.js'
import { PageShell, Card, Field, Button } from '../components/ui.jsx'

const STEPS = ['Organisation', 'Offre', 'Compte', 'Paiement']

/** Onboarding self-service depuis la landing page : crée l'organisation, le
 * premier poste, des services par défaut et le compte administrateur en une
 * seule fois, sans intervention manuelle. L'étape de paiement intègre Stripe
 * en mode démo (voir StripeDemoCheckout ci-dessous) — aucune transaction
 * réelle n'est traitée. */
export default function OnboardingPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { login } = useAuth()

  const [segKey, setSegKey] = useState(params.get('segment') === 'mairie' ? 'mairie' : 'telecom')
  const eligiblePlans = useMemo(() => SEGMENTS[segKey].plans.filter((p) => p.priceEur !== null), [segKey])
  const [step, setStep] = useState(1)
  const [nom, setNom] = useState('')
  const [adresse, setAdresse] = useState('')
  const [planKey, setPlanKey] = useState(params.get('plan') || eligiblePlans[0]?.key)
  const [agentNom, setAgentNom] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null) // { organisationId, needsConfirmation }

  const type = segKey === 'mairie' ? 'mairie' : 'boutique'
  const plan = eligiblePlans.find((p) => p.key === planKey) ?? eligiblePlans[0]

  function chooseSegment(key) {
    setSegKey(key)
    setPlanKey(SEGMENTS[key].plans.find((p) => p.priceEur !== null)?.key)
  }

  function next() {
    setError('')
    setStep((s) => Math.min(4, s + 1))
  }
  function back() {
    setError('')
    setStep((s) => Math.max(1, s - 1))
  }

  function goStep1() {
    if (!nom.trim()) {
      setError('Le nom de votre organisation est requis.')
      return
    }
    next()
  }

  function goStep3() {
    if (!agentNom.trim() || !email.trim()) {
      setError('Votre nom et votre email sont requis.')
      return
    }
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }
    next()
  }

  async function simulerPaiement() {
    setBusy(true)
    setError('')
    try {
      const { organisation_id } = await api.inscrireOrganisation({
        nom,
        type,
        adresse,
        agentNom,
        email,
        password,
        plan: plan.name,
        montantMensuelEur: plan.priceEur,
      })
      try {
        await login(email, password)
        navigate(`/o/${organisation_id}/backoffice`)
      } catch {
        // Compte créé côté base mais pas encore de session active (ex : confirmation
        // email requise sur le projet Supabase) — on ne bloque pas, on oriente vers
        // la connexion classique une fois l'email confirmé.
        setResult({ organisationId: organisation_id, needsConfirmation: true })
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (result?.needsConfirmation) {
    return (
      <PageShell title="Compte créé" subtitle="Dernière étape" backTo="/">
        <Card className="center">
          <div style={{ fontSize: '2.4rem', marginBottom: 8 }}>📩</div>
          <p style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 6px' }}>Votre organisation est prête !</p>
          <p className="muted" style={{ fontSize: '0.88rem' }}>
            Confirmez votre adresse email (lien envoyé à {email}), puis connectez-vous pour accéder à votre back-office.
          </p>
          <Button as={Link} to={`/o/${result.organisationId}/connexion`} block style={{ marginTop: 14 }}>
            Aller à la connexion
          </Button>
        </Card>
      </PageShell>
    )
  }

  return (
    <PageShell title="Créer votre espace TonTour" subtitle={`Étape ${step}/4 — ${STEPS[step - 1]}`} backTo="/">
      <div className="onboarding-steps">
        {STEPS.map((s, i) => (
          <div key={s} className={`onboarding-step ${i + 1 === step ? 'active' : i + 1 < step ? 'done' : ''}`}>
            <span className="onboarding-step-num">{i + 1 < step ? '✓' : i + 1}</span>
            {s}
          </div>
        ))}
      </div>

      {step === 1 && (
        <Card>
          <h3 style={{ marginTop: 0 }}>Votre organisation</h3>
          <Field label="Type d’organisation">
            <div className="row" style={{ justifyContent: 'flex-start', gap: 8 }}>
              <Button type="button" sm variant={segKey === 'telecom' ? 'primary' : 'outline'} onClick={() => chooseSegment('telecom')}>📱 Boutique télécom</Button>
              <Button type="button" sm variant={segKey === 'mairie' ? 'primary' : 'outline'} onClick={() => chooseSegment('mairie')}>🏛️ Mairie</Button>
            </div>
          </Field>
          <Field label="Nom de votre organisation">
            <input
              className="input"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder={segKey === 'telecom' ? 'Mobile Store Bastille' : 'Mairie de Villeneuve'}
              autoFocus
            />
          </Field>
          <Field label="Adresse (optionnel)">
            <input className="input" value={adresse} onChange={(e) => setAdresse(e.target.value)} />
          </Field>
          {error && <p style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>{error}</p>}
          <Button block onClick={goStep1}>Continuer</Button>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <h3 style={{ marginTop: 0 }}>Choisissez votre offre</h3>
          <p className="muted" style={{ fontSize: '0.85rem', marginTop: -8 }}>
            Les offres sur devis se discutent avec notre équipe — <a href="mailto:contact@tontour.fr">contactez-nous</a> pour celles-ci.
          </p>
          <div className="stack">
            {eligiblePlans.map((p) => (
              <Card
                key={p.key}
                className="card-clickable"
                role="button"
                tabIndex={0}
                style={{
                  marginBottom: 0,
                  borderColor: planKey === p.key ? 'var(--org-primary)' : 'var(--border)',
                  background: planKey === p.key ? 'color-mix(in srgb, var(--org-primary) 6%, white)' : 'var(--surface)',
                }}
                onClick={() => setPlanKey(p.key)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setPlanKey(p.key)
                  }
                }}
              >
                <div className="row">
                  <div>
                    <strong>{p.name}</strong>
                    <div className="muted" style={{ fontSize: '0.82rem' }}>{p.desc}</div>
                  </div>
                  <div style={{ fontWeight: 800, textAlign: 'right' }}>
                    {p.price}
                    {p.period && <div className="muted" style={{ fontSize: '0.72rem', fontWeight: 500 }}>{p.period}</div>}
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <div className="row" style={{ gap: 8, marginTop: 16 }}>
            <Button variant="outline" onClick={back}>← Retour</Button>
            <Button onClick={next} disabled={!plan}>Continuer</Button>
          </div>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <h3 style={{ marginTop: 0 }}>Votre compte administrateur</h3>
          <Field label="Votre nom">
            <input className="input" value={agentNom} onChange={(e) => setAgentNom(e.target.value)} autoFocus />
          </Field>
          <Field label="Email">
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Mot de passe (8 caractères minimum)">
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          {error && <p style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>{error}</p>}
          <div className="row" style={{ gap: 8, marginTop: 4 }}>
            <Button variant="outline" onClick={back}>← Retour</Button>
            <Button onClick={goStep3}>Continuer</Button>
          </div>
        </Card>
      )}

      {step === 4 && plan && (
        <Card>
          <h3 style={{ marginTop: 0 }}>Paiement</h3>
          <div className="row" style={{ marginBottom: 14, padding: '10px 14px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)' }}>
            <span>Offre <strong>{plan.name}</strong> — {nom || 'votre organisation'}</span>
            <strong>{plan.price}{plan.period}</strong>
          </div>
          <StripeDemoCheckout />
          {error && <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: 12 }}>{error}</p>}
          <div className="row" style={{ gap: 8, marginTop: 16 }}>
            <Button variant="outline" onClick={back} disabled={busy}>← Retour</Button>
            <Button onClick={simulerPaiement} disabled={busy}>
              {busy ? 'Création de votre espace…' : `Simuler le paiement — ${plan.price}${plan.period}`}
            </Button>
          </div>
        </Card>
      )}
    </PageShell>
  )
}

function StripeDemoCheckout() {
  return (
    <div className="stripe-demo">
      <div className="stripe-demo-badge">🔒 Paiement sécurisé · <strong>mode démo</strong></div>
      <p className="muted" style={{ fontSize: '0.8rem', margin: '6px 0 14px' }}>
        Aucun paiement réel n’est traité ici. En production, cette étape ouvrira Stripe Checkout avec vos véritables informations de carte.
      </p>
      <div className="stripe-demo-field">
        <span>Numéro de carte</span>
        <span className="stripe-demo-value">4242 4242 4242 4242</span>
      </div>
      <div className="row" style={{ gap: 10 }}>
        <div className="stripe-demo-field" style={{ flex: 1 }}>
          <span>Expiration</span>
          <span className="stripe-demo-value">12 / 34</span>
        </div>
        <div className="stripe-demo-field" style={{ flex: 1 }}>
          <span>CVC</span>
          <span className="stripe-demo-value">123</span>
        </div>
      </div>
    </div>
  )
}
