import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../components/ui.jsx'
import ProblemIllustration from '../components/ProblemIllustration.jsx'

const SEGMENTS = {
  telecom: {
    label: 'Boutiques télécom',
    icon: '📱',
    color: '#ea580c',
    colorSoft: '#fb923c',
    eyebrow: 'Orange · SFR · Bouygues · Free — franchisés et boutiques propres',
    headline: ['La file d’attente qui ne fait plus ', 'fuir vos clients', '.'],
    lead: 'Vos clients prennent un ticket en scannant un QR code, patientent où ils veulent, et sont notifiés au bon moment. Vos vendeurs voient uniquement le prochain client à servir — jamais une liste à trier.',
    problem: 'Une file visible depuis la rue, des clients qui repartent avant même d’être servis, des vendeurs qui gèrent une liste papier plutôt que leurs ventes : la file d’attente physique coûte des clients à chaque boutique, tous les jours.',
    features: [
      ['🎫', 'QR code par boutique', 'Chaque point de vente a son propre identifiant et son propre code, prêt à imprimer et à coller en vitrine.'],
      ['⚖️', 'File pondérée par priorité', 'Le SAV urgent passe avant une simple vente : réglez le poids de chaque service, la priorité s’applique automatiquement.'],
      ['🔔', 'Notification en temps réel', 'Vibration et notification web dès que le vendeur appelle le client — en moins de 2 secondes.'],
      ['📣', 'Storie personnalisée', 'Diffusez vos offres et promotions pendant l’attente, gérées en quelques clics depuis le back-office.'],
      ['🎨', 'Image de marque de la boutique', 'Couleurs et logo appliqués automatiquement sur les 4 interfaces, sans rien configurer côté client.'],
      ['📊', 'Statistiques du jour', 'Tickets traités, temps d’attente moyen, postes connectés — en direct depuis le back-office.'],
      ['🧑‍🤝‍🧑', 'Un vendeur, plusieurs files', 'Chaque vendeur choisit dynamiquement les services qu’il sert, et peut en changer en cours de journée.'],
    ],
    plans: [
      {
        name: 'Starter', price: 'Gratuit', period: '', desc: '1 poste, pour tester en boutique',
        features: [
          ['QR code de la boutique', true],
          ['1 poste vendeur', true],
          ['Jusqu’à 3 services', true],
          ['Storie personnalisable', true],
          ['Écran de salle', true],
        ],
        cta: 'Essayer gratuitement',
      },
      {
        name: 'Pro', price: '49€', period: '/mois', desc: 'Jusqu’à 5 postes, file pondérée', highlight: true,
        features: [
          ['Tout Starter', true],
          ['Jusqu’à 5 postes vendeur', true],
          ['File pondérée & motifs structurés', true],
          ['Back-office complet + alertes', true],
          ['Branding personnalisé', true],
          ['SMS de secours', false],
        ],
        cta: 'Choisir Pro',
      },
      {
        name: 'Enseigne', price: 'Sur devis', period: '', desc: 'Plusieurs boutiques, même enseigne',
        features: [
          ['Tout Pro', true],
          ['Postes illimités', true],
          ['Vue consolidée multi-boutiques', false],
          ['Tableau de bord ROI', false],
          ['Accompagnement dédié', true],
        ],
        cta: 'Nous contacter',
      },
    ],
  },
  mairie: {
    label: 'Mairies & services publics',
    icon: '🏛️',
    color: '#0f766e',
    colorSoft: '#5eead4',
    eyebrow: 'Mairies, CCAS, intercommunalités',
    headline: ['Moins de queue debout, ', 'plus de sérénité', ' à l’accueil.'],
    lead: 'Les administrés prennent un ticket depuis leur téléphone, patientent assis ou en dehors de la mairie, et sont prévenus quand c’est leur tour. Vos agents gardent une vue simple, jamais une liste à gérer.',
    problem: 'Une salle d’attente bondée, des administrés debout dès l’ouverture, un agent d’accueil qui passe plus de temps à faire patienter qu’à orienter : la file physique dégrade l’expérience à chaque passage, sans que personne n’y gagne du temps.',
    features: [
      ['🎫', 'QR code à l’accueil', 'Affiché à l’entrée du bâtiment — aucune application à installer pour l’administré.'],
      ['📋', 'Documents à préparer', 'Checklist affichée pendant l’attente : livret de famille, pièce d’identité, dossier de permis…'],
      ['🔔', 'Notification en temps réel', 'L’administré peut sortir de la mairie ou s’asseoir dehors : il est prévenu quand c’est son tour.'],
      ['📣', 'Messages & infos pratiques', 'Diffusez horaires, consignes ou informations utiles pendant l’attente, gérés depuis le back-office.'],
      ['🖥️', 'Écran de salle public', 'Affichage des tickets appelés en salle d’attente — utile même sans smartphone.'],
      ['⚠️', 'Alerte guichet sans agent', 'Le back-office prévient si un service reste sans agent connecté au-delà d’un délai paramétrable.'],
      ['♿', 'Accessibilité renforcée', 'Contraste élevé, compatibilité lecteurs d’écran, interface multilingue.'],
    ],
    plans: [
      {
        name: 'Commune', price: 'Gratuit', period: '', desc: '1 guichet, jusqu’à 2 démarches',
        features: [
          ['QR code de l’accueil', true],
          ['1 poste agent', true],
          ['Jusqu’à 2 services', true],
          ['Messages personnalisables', true],
          ['Écran de salle', true],
        ],
        cta: 'Essayer gratuitement',
      },
      {
        name: 'Intercommunalité', price: '39€', period: '/mois', desc: 'Plusieurs guichets, plusieurs démarches', highlight: true,
        features: [
          ['Tout Commune', true],
          ['Postes illimités', true],
          ['Alertes back-office', true],
          ['Statistiques de fréquentation', true],
          ['Image de marque personnalisée', true],
          ['Export CSV', false],
        ],
        cta: 'Choisir Intercommunalité',
      },
      {
        name: 'Collectivité', price: 'Sur devis', period: '', desc: 'Plusieurs sites, accompagnement dédié',
        features: [
          ['Tout Intercommunalité', true],
          ['Multi-sites', false],
          ['Accompagnement RGPD', true],
          ['SLA & support prioritaire', true],
        ],
        cta: 'Nous contacter',
      },
    ],
  },
}

const WORKFLOW = [
  ['Le client scanne', 'Il choisit son service, précise un motif si besoin, et reçoit un code de passage.'],
  ['Il patiente où il veut', 'Position et temps d’attente estimé en direct — il peut fermer l’onglet et vaquer à autre chose.'],
  ['Le vendeur appelle', 'Notification instantanée (vibration + web push), en moins de 2 secondes.'],
]

const CONTACT_EMAIL = 'contact@tontour.fr'

export default function MarketingLandingPage() {
  const [segKey, setSegKey] = useState('telecom')
  const seg = SEGMENTS[segKey]
  const style = { '--seg-color': seg.color, '--seg-color-soft': seg.colorSoft }

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
        <div style={{ marginLeft: 'auto' }}>
          <Button as={Link} to="/demo" sm>Voir la démo</Button>
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
          <Button as={Link} to="/demo">🎫 Voir la démo interactive</Button>
          <Button as="a" href={`mailto:${CONTACT_EMAIL}`} variant="outline">Demander une démonstration</Button>
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
                <Button as="a" href={`mailto:${CONTACT_EMAIL}?subject=TonTour — ${plan.name}`} variant={plan.highlight ? 'primary' : 'outline'} block>
                  {plan.cta}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <p>
          TonTour — File d’attente dématérialisée · <Link to="/demo">Voir la démo</Link> · <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </p>
        <p style={{ marginTop: 6, opacity: 0.7 }}>Projet en développement — tarifs et offres indicatifs.</p>
      </footer>
    </div>
  )
}
