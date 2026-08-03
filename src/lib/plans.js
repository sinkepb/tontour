// Source unique des segments/offres, partagée entre la landing page marketing
// et l'onboarding self-service (OnboardingPage.jsx) : chaque plan porte une
// clé stable (`key`, utilisée en paramètre d'URL) et un prix numérique
// (`priceEur`, null = "sur devis" = pas de self-service, contact commercial).

export const CONTACT_EMAIL = 'contact@tontour.fr'

export const SEGMENTS = {
  telecom: {
    label: 'Boutiques télécom',
    icon: '📱',
    color: '#ea580c',
    colorSoft: '#fb923c',
    eyebrow: 'Orange · SFR · Bouygues · Free — franchisés et boutiques propres',
    headline: ['La file d’attente qui ne fait plus ', 'fuir vos clients', '.'],
    lead: 'Vos clients scannent un QR code et leur téléphone devient leur ticket de file d’attente : plus de borne, plus de papier. Ils patientent où ils veulent et sont notifiés au bon moment. Vos vendeurs voient uniquement le prochain client à servir — jamais une liste à trier.',
    problem: 'Une file visible depuis la rue, des clients qui repartent avant même d’être servis, des vendeurs qui gèrent une liste papier plutôt que leurs ventes : la file d’attente physique coûte des clients à chaque boutique, tous les jours.',
    features: [
      ['🎫', 'Le téléphone comme ticket', 'Chaque point de vente a son QR code, prêt à imprimer et à coller en vitrine : le client scanne, et son téléphone devient son ticket de file d’attente.'],
      ['⚖️', 'File pondérée par priorité', 'Le SAV urgent passe avant une simple vente : réglez le poids de chaque service, la priorité s’applique automatiquement.'],
      ['🔔', 'Notification en temps réel', 'Vibration et notification web dès que le vendeur appelle le client — en moins de 2 secondes.'],
      ['📣', 'Storie personnalisée', 'Diffusez vos offres et promotions pendant l’attente, gérées en quelques clics depuis le back-office.'],
      ['🎨', 'Image de marque de la boutique', 'Couleurs et logo appliqués automatiquement sur les 4 interfaces, sans rien configurer côté client.'],
      ['📊', 'Statistiques du jour', 'Tickets traités, temps d’attente moyen, postes connectés — en direct depuis le back-office.'],
      ['🧑‍🤝‍🧑', 'Un vendeur, plusieurs files', 'Chaque vendeur choisit dynamiquement les services qu’il sert, et peut en changer en cours de journée.'],
    ],
    plans: [
      {
        key: 'starter', name: 'Starter', price: 'Gratuit', priceEur: 0, period: '', desc: '1 poste, pour tester en boutique',
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
        key: 'pro', name: 'Pro', price: '49€', priceEur: 49, period: '/mois', desc: 'Jusqu’à 5 postes, file pondérée', highlight: true,
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
        key: 'enseigne', name: 'Enseigne', price: 'Sur devis', priceEur: null, period: '', desc: 'Plusieurs boutiques, même enseigne',
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
    lead: 'Les administrés scannent un QR code et leur téléphone devient leur ticket de file d’attente : plus de borne, plus de papier. Ils patientent assis ou en dehors de la mairie, et sont prévenus quand c’est leur tour. Vos agents gardent une vue simple, jamais une liste à gérer.',
    problem: 'Une salle d’attente bondée, des administrés debout dès l’ouverture, un agent d’accueil qui passe plus de temps à faire patienter qu’à orienter : la file physique dégrade l’expérience à chaque passage, sans que personne n’y gagne du temps.',
    features: [
      ['🎫', 'Le téléphone comme ticket', 'Affiché à l’entrée du bâtiment : l’administré scanne, et son téléphone devient son ticket de file d’attente — aucune application à installer.'],
      ['📋', 'Documents à préparer', 'Checklist affichée pendant l’attente : livret de famille, pièce d’identité, dossier de permis…'],
      ['🔔', 'Notification en temps réel', 'L’administré peut sortir de la mairie ou s’asseoir dehors : il est prévenu quand c’est son tour.'],
      ['📣', 'Messages & infos pratiques', 'Diffusez horaires, consignes ou informations utiles pendant l’attente, gérés depuis le back-office.'],
      ['🖥️', 'Écran de salle public', 'Affichage des tickets appelés en salle d’attente — utile même sans smartphone.'],
      ['⚠️', 'Alerte guichet sans agent', 'Le back-office prévient si un service reste sans agent connecté au-delà d’un délai paramétrable.'],
      ['♿', 'Accessibilité renforcée', 'Contraste élevé, compatibilité lecteurs d’écran, interface multilingue.'],
    ],
    plans: [
      {
        key: 'commune', name: 'Commune', price: 'Gratuit', priceEur: 0, period: '', desc: '1 guichet, jusqu’à 2 démarches',
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
        key: 'intercommunalite', name: 'Intercommunalité', price: '39€', priceEur: 39, period: '/mois', desc: 'Plusieurs guichets, plusieurs démarches', highlight: true,
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
        key: 'collectivite', name: 'Collectivité', price: 'Sur devis', priceEur: null, period: '', desc: 'Plusieurs sites, accompagnement dédié',
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

/** organisations.type ('boutique'|'mairie') <-> clé de segment marketing ('telecom'|'mairie'). */
export function segmentKeyForOrgType(type) {
  return type === 'mairie' ? 'mairie' : 'telecom'
}

export function findPlan(segKey, planKey) {
  const plans = SEGMENTS[segKey]?.plans ?? []
  return plans.find((p) => p.key === planKey) ?? plans[0]
}
