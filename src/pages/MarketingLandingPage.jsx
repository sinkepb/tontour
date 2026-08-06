import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../components/ui.jsx'
import ProblemIllustration from '../components/ProblemIllustration.jsx'
import { SEGMENTS, CONTACT_EMAIL } from '../lib/plans.js'

const WORKFLOW = [
  ['Le téléphone devient le ticket', 'En scannant le QR code, le client choisit son service, précise un motif si besoin, et son téléphone devient son ticket de file d’attente — sans borne ni papier.'],
  ['Il patiente où il veut', 'Position et temps d’attente estimé en direct — il garde juste la page ouverte (même en arrière-plan) et vaque à ses occupations.'],
  ['Le vendeur appelle', 'Notification instantanée (vibration + web push), en moins de 2 secondes.'],
]

export default function MarketingLandingPage() {
  const [segKey, setSegKey] = useState('telecom')
  const seg = SEGMENTS[segKey]
  const style = { '--seg-color': seg.color, '--seg-color-soft': seg.colorSoft }
  const freePlan = seg.plans.find((p) => p.priceEur === 0) ?? seg.plans[0]

  return (
    <div className="site" style={style}>
      <header className="site-header">
        <div className="brand">
          <span className="brand-mark">🎫</span>
          TonTour
        </div>
        <nav className="site-nav">
          <a href="#fonctionnalites">Fonctionnalités</a>
          <a href="#workflow">Comment ça marche</a>
          <a href="#tarifs">Tarifs</a>
        </nav>
        <div className="row" style={{ marginLeft: 'auto', gap: 10 }}>
          <Button as={Link} to="/connexion" variant="outline" sm>🔐 Espace agent / admin</Button>
          <Button as="a" href={`mailto:${CONTACT_EMAIL}`} sm>Nous contacter</Button>
        </div>
      </header>

      <section className="hero">
        <div className="eyebrow">{seg.icon} {seg.eyebrow}</div>
        <h1>
          {seg.headline[0]}
          <span className="accent">{seg.headline[1]}</span>
          {seg.headline[2]}
        </h1>
        <p className="lead">{seg.lead}</p>
        <div className="hero-ctas">
          <Button as={Link} to={`/inscription?segment=${segKey}&plan=${freePlan.key}`}>🚀 Démarrer gratuitement</Button>
          <Button as="a" href={`mailto:${CONTACT_EMAIL}`} variant="outline">📩 Demander un rendez-vous</Button>
        </div>

        <div style={{ marginTop: 40 }}>
          <div className="segment-toggle">
            {Object.entries(SEGMENTS).map(([key, s]) => (
              <button key={key} className={segKey === key ? 'active' : ''} onClick={() => setSegKey(key)}>
                {s.icon} {s.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="site-section" style={{ paddingTop: 20 }}>
        <div className="site-section-inner">
          <div className="problem-block">
            <div className="problem-media">
              <ProblemIllustration />
            </div>
            <div className="problem-copy">
              <div className="kicker">Le problème</div>
              <h2 style={{ margin: '0 0 14px' }}>La file physique fait perdre du temps à tout le monde</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '1.02rem', lineHeight: 1.65, margin: 0 }}>{seg.problem}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="site-section" id="fonctionnalites">
        <div className="site-section-inner">
          <div className="section-head">
            <div className="kicker">Fonctionnalités</div>
            <h2>Pensé pour {segKey === 'telecom' ? 'le comptoir' : 'le guichet'}, pas pour un tableur</h2>
            <p>Tout ce dont {segKey === 'telecom' ? 'une boutique télécom' : 'une mairie'} a besoin pour dématérialiser sa file d’attente, sans rien changer à l’organisation existante.</p>
          </div>
          <div className="feature-grid">
            {seg.features.map(([icon, title, desc]) => (
              <div className="feature-card" key={title}>
                <span className="icon-badge" style={{ background: `color-mix(in srgb, ${seg.color} 15%, white)`, color: seg.color }}>{icon}</span>
                <h3>{title}</h3>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="site-section" id="workflow" style={{ background: 'color-mix(in srgb, var(--seg-color) 4%, var(--bg))' }}>
        <div className="site-section-inner">
          <div className="section-head">
            <div className="kicker">Comment ça marche</div>
            <h2>Trois étapes, zéro application à installer</h2>
          </div>
          <div className="workflow">
            {WORKFLOW.map(([title, desc]) => (
              <div className="workflow-step" key={title}>
                <div className="num" />
                <h3>{title}</h3>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="site-section" id="tarifs">
        <div className="site-section-inner">
          <div className="section-head">
            <div className="kicker">Tarifs</div>
            <h2>Des offres adaptées à {segKey === 'telecom' ? 'votre réseau de boutiques' : 'votre collectivité'}</h2>
            <p>Tarifs indicatifs — mise en production et facturation définies avec votre interlocuteur commercial.</p>
          </div>
          <div className="pricing-grid">
            {seg.plans.map((plan) => (
              <div className={`pricing-card ${plan.highlight ? 'highlight' : ''}`} key={plan.name}>
                {plan.highlight && <span className="plan-tag">Le plus choisi</span>}
                <h3>{plan.name}</h3>
                <div className="plan-desc">{plan.desc}</div>
                <div className="price">{plan.price}<span className="period">{plan.period}</span></div>
                <ul className="plan-features">
                  {plan.features.map(([label, included]) => (
                    <li key={label} className={included ? '' : 'soon'}>
                      <span className="check">{included ? '✓' : '⏳'}</span>
                      {label}{!included && ' (bientôt)'}
                    </li>
                  ))}
                </ul>
                {plan.priceEur !== null ? (
                  <Button as={Link} to={`/inscription?segment=${segKey}&plan=${plan.key}`} variant={plan.highlight ? 'primary' : 'outline'} block>
                    {plan.cta}
                  </Button>
                ) : (
                  <Button as="a" href={`mailto:${CONTACT_EMAIL}?subject=TonTour — ${plan.name}`} variant={plan.highlight ? 'primary' : 'outline'} block>
                    {plan.cta}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <p>
          TonTour — File d’attente dématérialisée · <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </p>
        <p style={{ marginTop: 10, display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/mentions-legales" className="link-plain">Mentions légales</Link>
          <Link to="/cgu" className="link-plain">CGU</Link>
          <Link to="/cgv" className="link-plain">CGV</Link>
          <Link to="/confidentialite" className="link-plain">Confidentialité</Link>
        </p>
        <p style={{ marginTop: 10, opacity: 0.7 }}>Projet en développement — tarifs et offres indicatifs.</p>
      </footer>
    </div>
  )
}
