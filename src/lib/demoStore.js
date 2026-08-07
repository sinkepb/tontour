// Moteur "mode démo" : simule le backend Supabase (tables + RPC) entièrement
// en local, persisté en localStorage et synchronisé entre onglets via
// BroadcastChannel. Permet de tester les 4 interfaces (citoyen, agent,
// back-office, écran de salle) dans plusieurs onglets du navigateur, sans
// aucun backend — utile pour la recette locale avant de brancher Supabase.
//
// L'API exposée (creerTicket, appelerProchain, ticketStatus, ...) reproduit
// volontairement la signature des fonctions RPC de supabase/schema.sql, afin
// que src/lib/api.js puisse basculer de l'une à l'autre de façon transparente.

import { generateTicketCode, selectNextTicket, computePosition, computeEtaMinutes } from './queue.js'

const STORAGE_KEY = 'tontour_demo_v1'
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('tontour_demo') : null
const listeners = new Set()

const uid = () => crypto.randomUUID()
const todayKey = (iso) => iso.slice(0, 10)

const ORG_BOUTIQUE = '00000000-0000-0000-0000-000000000001'
const ORG_MAIRIE = '00000000-0000-0000-0000-000000000002'

function defaultPromotions() {
  return [
    { id: uid(), organisation_id: ORG_BOUTIQUE, type: 'message', titre: '📶 Offre du mois', texte: 'Forfait 100 Go à 9,99€/mois pour toute souscription en boutique aujourd’hui.', options: [], actif: true, ordre: 1 },
    { id: uid(), organisation_id: ORG_BOUTIQUE, type: 'message', titre: '🔧 Le saviez-vous ?', texte: 'Un diagnostic batterie est offert pour tout SAV smartphone, sans rendez-vous.', options: [], actif: true, ordre: 2 },
    {
      id: uid(), organisation_id: ORG_BOUTIQUE, type: 'quiz', titre: '🎮 Quiz éclair',
      texte: 'Quel geste économise le plus de batterie au quotidien ?',
      options: [
        { texte: 'Fermer les applications en arrière-plan', correcte: false },
        { texte: 'Baisser la luminosité de l’écran', correcte: true },
        { texte: 'Activer le mode avion', correcte: false },
      ],
      actif: true, ordre: 3,
    },
    { id: uid(), organisation_id: ORG_BOUTIQUE, type: 'message', titre: '🎁 Parrainage', texte: 'Parrainez un proche : 20€ offerts sur votre prochaine facture.', options: [], actif: true, ordre: 4 },
    { id: uid(), organisation_id: ORG_MAIRIE, type: 'message', titre: 'ℹ️ Information', texte: 'Pensez à vous munir d’une pièce d’identité valide pour toute démarche.', options: [], actif: true, ordre: 1 },
    {
      id: uid(), organisation_id: ORG_MAIRIE, type: 'quiz', titre: '🎮 Quiz éclair',
      texte: 'Lequel de ces documents n’est PAS nécessaire pour une carte d’identité ?',
      options: [
        { texte: 'Une photo d’identité récente', correcte: false },
        { texte: 'Un justificatif de domicile', correcte: false },
        { texte: 'Un relevé bancaire', correcte: true },
      ],
      actif: true, ordre: 2,
    },
    { id: uid(), organisation_id: ORG_MAIRIE, type: 'message', titre: '🕑 Horaires d’été', texte: 'L’accueil ferme à 16h30 le vendredi durant l’été.', options: [], actif: true, ordre: 3 },
    { id: uid(), organisation_id: ORG_MAIRIE, type: 'message', titre: '💻 Démarche en ligne', texte: 'Certaines démarches sont réalisables directement sur service-public.fr.', options: [], actif: true, ordre: 4 },
  ]
}

function seed() {
  const now = new Date().toISOString()
  const services = [
    { id: uid(), organisation_id: ORG_BOUTIQUE, prefixe_ticket: 'V', nom: 'Ventes', temps_moyen_min: 6, poids: 1, actif: true, documents_requis: ["Pièce d'identité"], motifs_predefinis: ['Nouveau forfait', 'Changement de forfait', 'Nouvel appareil'] },
    { id: uid(), organisation_id: ORG_BOUTIQUE, prefixe_ticket: 'S', nom: 'SAV', temps_moyen_min: 10, poids: 3, actif: true, documents_requis: ["Facture ou preuve d'achat", "Pièce d'identité"], motifs_predefinis: ['Écran cassé', 'Batterie', 'Panne réseau', 'Autre panne'] },
    { id: uid(), organisation_id: ORG_BOUTIQUE, prefixe_ticket: 'F', nom: 'Fidélité / Résiliation', temps_moyen_min: 8, poids: 2, actif: true, documents_requis: ["Pièce d'identité"], motifs_predefinis: ['Résiliation', 'Portabilité', 'Réclamation'] },
    { id: uid(), organisation_id: ORG_MAIRIE, prefixe_ticket: 'E', nom: 'État civil', temps_moyen_min: 12, poids: 1, actif: true, documents_requis: ['Livret de famille', "Pièce d'identité"], motifs_predefinis: [] },
    { id: uid(), organisation_id: ORG_MAIRIE, prefixe_ticket: 'U', nom: 'Urbanisme', temps_moyen_min: 15, poids: 1, actif: true, documents_requis: ['Dossier de permis'], motifs_predefinis: [] },
  ]

  const servicesBoutiqueIds = services.filter((s) => s.organisation_id === ORG_BOUTIQUE).map((s) => s.id)
  const servicesMairieIds = services.filter((s) => s.organisation_id === ORG_MAIRIE).map((s) => s.id)

  // service_ids : attribués par l'admin (back-office → Agents), pas choisis par le
  // vendeur lui-même — préremplis ici pour que la démo soit utilisable immédiatement,
  // sans étape de configuration manuelle. connecte/en_pause/ticket_en_cours_id : état de
  // connexion en direct, plus de notion de poste séparée (boutiques mobiles).
  const agents = [
    { id: uid(), organisation_id: ORG_BOUTIQUE, nom: 'Camille Martin', email: 'vendeur@boutique.demo', password: 'demo123', role: 'vendeur', service_ids: servicesBoutiqueIds, connecte: false, en_pause: false, ticket_en_cours_id: null },
    { id: uid(), organisation_id: ORG_BOUTIQUE, nom: 'Sacha Dupont', email: 'admin@boutique.demo', password: 'admin123', role: 'admin', service_ids: [], connecte: false, en_pause: false, ticket_en_cours_id: null },
    { id: uid(), organisation_id: ORG_MAIRIE, nom: 'Alex Petit', email: 'agent@mairie.demo', password: 'demo123', role: 'vendeur', service_ids: servicesMairieIds, connecte: false, en_pause: false, ticket_en_cours_id: null },
    { id: uid(), organisation_id: ORG_MAIRIE, nom: 'Morgan Roy', email: 'admin@mairie.demo', password: 'admin123', role: 'admin', service_ids: [], connecte: false, en_pause: false, ticket_en_cours_id: null },
  ]

  return {
    organisations: [
      { id: ORG_BOUTIQUE, nom: 'Mobile Store Bastille', type: 'boutique', couleur_principale: '#ea580c', couleur_secondaire: '#fb923c', logo_url: null, adresse: '12 rue de la Roquette, 75011 Paris', alerte_delai_min: 15, delai_absence_min: 5, enseigne_id: null, cree_le: now },
      { id: ORG_MAIRIE, nom: 'Mairie de Villeneuve', type: 'mairie', couleur_principale: '#0f766e', couleur_secondaire: '#5eead4', logo_url: null, adresse: '1 place de la Mairie, 33140 Villeneuve', alerte_delai_min: 15, delai_absence_min: 5, enseigne_id: null, cree_le: now },
    ],
    services,
    promotions: defaultPromotions(),
    agents,
    tickets: [],
    abonnements: [],
    enseignes: [],
  }
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (!parsed.promotions) parsed.promotions = defaultPromotions() // migration : anciennes sessions sans storie personnalisable
      if (!parsed.abonnements) parsed.abonnements = [] // migration : anciennes sessions sans onboarding self-service
      if (!parsed.enseignes) parsed.enseignes = [] // migration : anciennes sessions sans gestion des enseignes
      // migration : anciennes sessions avec le modèle poste (avant fusion sur agents) —
      // reprend l'état de connexion du poste de chaque agent puis abandonne postes,
      // comme la migration SQL équivalente côté Postgres (supabase/schema.sql).
      if (parsed.postes) {
        parsed.agents?.forEach((a) => {
          const poste = parsed.postes.find((p) => p.agent_id === a.id)
          if (a.connecte === undefined) a.connecte = poste?.connecte ?? false
          if (a.en_pause === undefined) a.en_pause = poste?.en_pause ?? false
          if (a.ticket_en_cours_id === undefined) a.ticket_en_cours_id = poste?.ticket_en_cours_id ?? null
          if (!a.service_ids) a.service_ids = poste?.service_ids ?? []
        })
        parsed.tickets?.forEach((t) => { delete t.poste_id })
        delete parsed.postes
      }
      parsed.agents?.forEach((a) => {
        if (a.connecte === undefined) a.connecte = false
        if (a.en_pause === undefined) a.en_pause = false
        if (a.ticket_en_cours_id === undefined) a.ticket_en_cours_id = null
        if (!a.service_ids) a.service_ids = []
        delete a.statut // colonne abandonnée, jamais lue
      })
      return parsed
    }
  } catch { /* localStorage indisponible ou JSON corrompu -> reseed */ }
  const initial = seed()
  localStorage.setItem(STORAGE_KEY, JSON.stringify(initial))
  return initial
}

let state = load()

function persist(broadcast = true) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  listeners.forEach((fn) => fn())
  if (broadcast && channel) channel.postMessage('changed')
}

if (channel) {
  channel.onmessage = () => {
    state = load()
    listeners.forEach((fn) => fn())
  }
}

export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function resetDemo() {
  state = seed()
  persist()
}

// ─── Lectures ──────────────────────────────────────────────────────────

export function getOrganisation(organisationId) {
  return state.organisations.find((o) => o.id === organisationId) || null
}

export function listOrganisations() {
  return state.organisations
}

export function listEnseignes() {
  return state.enseignes.slice().sort((a, b) => a.nom.localeCompare(b.nom))
}

export function getServices(organisationId, { onlyActive = true } = {}) {
  return state.services.filter((s) => s.organisation_id === organisationId && (!onlyActive || s.actif))
}

export function listPromotions(organisationId, { onlyActive = true } = {}) {
  return state.promotions
    .filter((p) => p.organisation_id === organisationId && (!onlyActive || p.actif))
    .sort((a, b) => a.ordre - b.ordre)
}

export function getAgentByCredentials(email, password) {
  return state.agents.find((a) => a.email === email && a.password === password) || null
}

export function getAgent(agentId) {
  return state.agents.find((a) => a.id === agentId) || null
}

export function listAgents(organisationId) {
  return state.agents.filter((a) => a.organisation_id === organisationId)
}

export function ticketStatus(ticketId, clientToken) {
  const ticket = state.tickets.find((t) => t.id === ticketId && t.client_token === clientToken)
  if (!ticket) throw new Error('Ticket introuvable')
  const service = state.services.find((s) => s.id === ticket.service_id)
  const enAttenteDuService = state.tickets.filter((t) => t.service_id === ticket.service_id && t.statut === 'en_attente')
  const position = computePosition(ticket, enAttenteDuService)
  const agent = state.agents.find((a) => a.id === ticket.agent_id)
  return {
    id: ticket.id,
    code: ticket.code,
    client_token: ticket.client_token,
    statut: ticket.statut,
    position,
    attente_estimee_min: computeEtaMinutes(position, service?.temps_moyen_min ?? 5),
    // Prénom seul : boutiques mobiles, pas de guichet fixe à désigner (miroir de
    // agent_nom dans ticket_status/creer_ticket côté schema.sql).
    agent_nom: agent ? agent.nom.split(' ')[0] : null,
    service_nom: service?.nom ?? null,
    documents_requis: service?.documents_requis ?? [],
    note: ticket.note ?? null,
    appele_le: ticket.appele_le ?? null,
    prioritaire: !!ticket.prioritaire,
  }
}

export function noterTicket(ticketId, clientToken, note, commentaire) {
  const ticket = state.tickets.find((t) => t.id === ticketId && t.client_token === clientToken)
  if (!ticket || ticket.statut !== 'termine') throw new Error('Ticket introuvable ou pas encore terminé')
  if (note < 1 || note > 5) throw new Error('Note invalide (1 à 5)')
  if (commentaire && commentaire.length > 1000) throw new Error('Commentaire trop long (1000 caractères maximum)')
  ticket.note = note
  ticket.commentaire = commentaire?.trim() || null
  persist()
}

export function salleAffichage(organisationId) {
  const appeles = state.tickets
    .filter((t) => t.organisation_id === organisationId && t.statut === 'en_cours')
    .sort((a, b) => (b.appele_le || '').localeCompare(a.appele_le || ''))
    .map((t) => ({ code: t.code, agent: state.agents.find((a) => a.id === t.agent_id)?.nom.split(' ')[0] ?? '' }))

  const prochains = state.tickets
    .filter((t) => t.organisation_id === organisationId && t.statut === 'en_attente')
    .sort((a, b) => a.cree_le.localeCompare(b.cree_le))
    .slice(0, 10)
    .map((t) => ({ code: t.code }))

  return { appeles, prochains }
}

export function statsJour(organisationId) {
  const today = todayKey(new Date().toISOString())
  const ticketsJour = state.tickets.filter((t) => t.organisation_id === organisationId && todayKey(t.cree_le) === today)
  const termines = ticketsJour.filter((t) => t.statut === 'termine')
  const attentes = termines
    .filter((t) => t.appele_le)
    .map((t) => (new Date(t.appele_le) - new Date(t.cree_le)) / 60000)
  const attenteMoy = attentes.length ? attentes.reduce((a, b) => a + b, 0) / attentes.length : 0
  return {
    tickets_traites: termines.length,
    tickets_total: ticketsJour.length,
    attente_moyenne_min: Math.round(attenteMoy * 10) / 10,
    agents_connectes: state.agents.filter((a) => a.organisation_id === organisationId && a.connecte).length,
  }
}

function todayUtcMidnight() {
  return new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`)
}

export function statsTendance(organisationId, jours = 14) {
  const today = todayUtcMidnight()
  const result = []
  for (let i = jours - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400000)
    const next = new Date(d.getTime() + 86400000)
    const dIso = d.toISOString()
    const nextIso = next.toISOString()
    const crees = state.tickets.filter((t) => t.organisation_id === organisationId && t.cree_le >= dIso && t.cree_le < nextIso).length
    const traites = state.tickets.filter(
      (t) => t.organisation_id === organisationId && t.statut === 'termine' && t.termine_le && t.termine_le >= dIso && t.termine_le < nextIso
    ).length
    result.push({ jour: dIso.slice(0, 10), tickets_crees: crees, tickets_traites: traites })
  }
  return result
}

export function statsHeures(organisationId, jours = 30) {
  const seuil = new Date(todayUtcMidnight().getTime() - (jours - 1) * 86400000).toISOString()
  const counts = Array(24).fill(0)
  state.tickets
    .filter((t) => t.organisation_id === organisationId && t.cree_le >= seuil)
    .forEach((t) => { counts[new Date(t.cree_le).getUTCHours()]++ })
  return counts.map((nb, heure) => ({ heure, nb_tickets: nb }))
}

export function statsEnseigne(enseigneId) {
  const today = todayUtcMidnight()
  const tomorrow = new Date(today.getTime() + 86400000).toISOString()
  const todayIso = today.toISOString()
  return state.organisations
    .filter((o) => o.enseigne_id === enseigneId)
    .map((o) => {
      const ticketsJour = state.tickets.filter((t) => t.organisation_id === o.id && t.cree_le >= todayIso && t.cree_le < tomorrow)
      const termines = ticketsJour.filter((t) => t.statut === 'termine')
      const attentes = termines.filter((t) => t.appele_le).map((t) => (new Date(t.appele_le) - new Date(t.cree_le)) / 60000)
      const attenteMoy = attentes.length ? attentes.reduce((a, b) => a + b, 0) / attentes.length : 0
      return {
        organisation_id: o.id,
        organisation_nom: o.nom,
        tickets_traites: termines.length,
        tickets_total: ticketsJour.length,
        attente_moyenne_min: Math.round(attenteMoy * 10) / 10,
        agents_connectes: state.agents.filter((a) => a.organisation_id === o.id && a.connecte).length,
      }
    })
    .sort((a, b) => a.organisation_nom.localeCompare(b.organisation_nom))
}

export function servicesEnAlerte(organisationId) {
  const org = getOrganisation(organisationId)
  const delai = org?.alerte_delai_min ?? 15
  const now = Date.now()
  return getServices(organisationId)
    .map((s) => {
      const attente = state.tickets.filter((t) => t.service_id === s.id && t.statut === 'en_attente')
      if (attente.length === 0) return null
      const agentActif = state.agents.some(
        (a) => a.organisation_id === organisationId && a.connecte && !a.en_pause && a.service_ids.includes(s.id)
      )
      if (agentActif) return null
      const plusAncien = Math.min(...attente.map((t) => new Date(t.cree_le).getTime()))
      const ancienneteMin = (now - plusAncien) / 60000
      if (ancienneteMin < delai) return null
      return { service_id: s.id, service_nom: s.nom, tickets_en_attente: attente.length, plus_ancien_min: Math.round(ancienneteMin) }
    })
    .filter(Boolean)
}

// ─── Écritures ─────────────────────────────────────────────────────────

export function creerTicket({ organisation_id, service_id, motif, telephone, canal = 'mobile', prioritaire = false }) {
  // Relecture fraîche avant de calculer la séquence du jour : même rationale que
  // appelerProchain/activerAgent, pour limiter (sans l'éliminer complètement — le
  // mode démo est mono-utilisateur) le risque de deux onglets calculant le même numéro de
  // ticket. Voir creer_ticket()/generer_code_ticket() en prod pour la garantie réelle
  // (verrou consultatif transactionnel).
  state = load()
  const service = state.services.find((s) => s.id === service_id && s.organisation_id === organisation_id && s.actif)
  if (!service) throw new Error('Service invalide ou inactif')

  const cree_le = new Date().toISOString()
  const ticketsServiceAujourdhui = state.tickets.filter((t) => t.service_id === service_id && todayKey(t.cree_le) === todayKey(cree_le)).length
  // Garde-fou anti-spam basique, miroir du plafond appliqué côté RPC creer_ticket() en
  // production (schema.sql) — évite que le mode démo divergent masque une régression de
  // cette protection si elle est un jour retirée par erreur d'un seul côté.
  if (ticketsServiceAujourdhui >= 500) throw new Error('Trop de tickets créés aujourd’hui pour ce service, réessayez plus tard')
  const ticket = {
    id: uid(),
    organisation_id,
    service_id,
    code: generateTicketCode(service.prefixe_ticket, ticketsServiceAujourdhui),
    statut: 'en_attente',
    canal,
    motif: motif || null,
    telephone: telephone || null,
    prioritaire: !!prioritaire,
    commentaire: null,
    client_token: uid(),
    agent_id: null,
    cree_le,
    appele_le: null,
    termine_le: null,
    note: null,
  }
  state.tickets.push(ticket)
  persist()
  return ticketStatus(ticket.id, ticket.client_token)
}

export function annulerTicket(ticketId, clientToken) {
  const ticket = state.tickets.find((t) => t.id === ticketId && t.client_token === clientToken)
  if (!ticket || ticket.statut !== 'en_attente') throw new Error('Ticket introuvable ou déjà pris en charge')
  ticket.statut = 'annule'
  persist()
}

// Verrou optimiste : on relit l'état juste avant d'écrire pour limiter les
// courses entre onglets (le mode démo est mono-utilisateur ; la vraie garantie
// transactionnelle est assurée côté Postgres par appeler_prochain() en prod).
export function appelerProchain(agentId) {
  state = load()
  const agent = state.agents.find((a) => a.id === agentId)
  if (!agent) throw new Error('Agent introuvable')
  if (agent.ticket_en_cours_id) throw new Error('Un ticket est déjà en cours')

  const servicesParPoids = new Map(state.services.map((s) => [s.id, s.poids]))
  const ticketsEnAttente = state.tickets.filter((t) => t.organisation_id === agent.organisation_id && t.statut === 'en_attente')
  const candidat = selectNextTicket(ticketsEnAttente, servicesParPoids, agent.service_ids)

  if (!candidat) throw new Error('Aucun ticket en attente pour vos services')

  candidat.statut = 'en_cours'
  candidat.agent_id = agentId
  candidat.appele_le = new Date().toISOString()
  agent.ticket_en_cours_id = candidat.id
  persist()
  return candidat
}

export function apercuProchain(agentId) {
  const agent = state.agents.find((a) => a.id === agentId)
  if (!agent || agent.ticket_en_cours_id) return null
  const servicesParPoids = new Map(state.services.map((s) => [s.id, s.poids]))
  const ticketsEnAttente = state.tickets.filter((t) => t.organisation_id === agent.organisation_id && t.statut === 'en_attente')
  return selectNextTicket(ticketsEnAttente, servicesParPoids, agent.service_ids)
}

export function terminerTraitement(agentId) {
  const agent = state.agents.find((a) => a.id === agentId)
  if (!agent || !agent.ticket_en_cours_id) throw new Error('Aucun ticket en cours')
  const ticket = state.tickets.find((t) => t.id === agent.ticket_en_cours_id)
  ticket.statut = 'termine'
  ticket.termine_le = new Date().toISOString()
  agent.ticket_en_cours_id = null
  persist()
}

/** Relance la notification sans réassigner le ticket : la sonnette reste active
 * après le premier appel pour rappeler un client qui n'a pas répondu. */
export function rappelerClient(agentId) {
  const agent = state.agents.find((a) => a.id === agentId)
  if (!agent || !agent.ticket_en_cours_id) throw new Error('Aucun ticket en cours')
  const ticket = state.tickets.find((t) => t.id === agent.ticket_en_cours_id)
  ticket.appele_le = new Date().toISOString()
  persist()
}

/** Statut 'absent' (distinct de 'termine') : le client n'était pas là au-delà du
 * délai de grâce de l'organisation. Vérifié côté serveur, pas seulement dans l'UI. */
export function marquerAbsent(agentId) {
  const agent = state.agents.find((a) => a.id === agentId)
  if (!agent || !agent.ticket_en_cours_id) throw new Error('Aucun ticket en cours')
  const ticket = state.tickets.find((t) => t.id === agent.ticket_en_cours_id)
  const org = state.organisations.find((o) => o.id === agent.organisation_id)
  const delaiMs = (org?.delai_absence_min ?? 5) * 60000
  if (!ticket.appele_le || Date.now() - new Date(ticket.appele_le).getTime() < delaiMs) {
    throw new Error('Délai de grâce non écoulé avant de marquer ce client absent')
  }
  ticket.statut = 'absent'
  ticket.termine_le = new Date().toISOString()
  agent.ticket_en_cours_id = null
  persist()
}

/** Simple bascule d'état, miroir de activer_agent() (schema.sql) : plus de pool de
 * postes à s'attribuer, l'agent est son unique unité de travail. */
export function activerAgent(agentId) {
  const agent = state.agents.find((a) => a.id === agentId)
  if (!agent) throw new Error('Agent introuvable')
  agent.connecte = true
  agent.en_pause = false
  persist()
  return agent
}

export function majServicesAgent(agentId, serviceIds) {
  const agent = state.agents.find((a) => a.id === agentId)
  if (!agent) throw new Error('Agent introuvable')
  agent.service_ids = serviceIds
  persist()
}

export function basculerPause(agentId) {
  const agent = state.agents.find((a) => a.id === agentId)
  if (!agent) throw new Error('Agent introuvable')
  agent.en_pause = !agent.en_pause
  persist()
  return agent.en_pause
}

/** Contrairement à l'ancien modèle poste (interchangeable), un agent est une identité
 * fixe : se déconnecter avec un ticket en cours le remet en file d'attente plutôt que
 * de bloquer définitivement la prochaine connexion de cet agent sur "ticket déjà en
 * cours" — miroir de deconnecter_agent() (schema.sql). */
export function deconnecterAgent(agentId) {
  const agent = state.agents.find((a) => a.id === agentId)
  if (!agent) throw new Error('Agent introuvable')
  if (agent.ticket_en_cours_id) {
    const ticket = state.tickets.find((t) => t.id === agent.ticket_en_cours_id)
    if (ticket) {
      ticket.statut = 'en_attente'
      ticket.agent_id = null
      ticket.appele_le = null
    }
  }
  agent.connecte = false
  agent.en_pause = false
  agent.ticket_en_cours_id = null
  persist()
}

/** Déconnexion forcée par l'admin (back-office) : même effet que deconnecterAgent —
 * fonction séparée pour miroir explicite avec deconnecter_agent_admin() (schema.sql). */
export function deconnecterAgentAdmin(agentId) {
  deconnecterAgent(agentId)
}

export function upsertService(service) {
  if (service.id) {
    const idx = state.services.findIndex((s) => s.id === service.id)
    state.services[idx] = { ...state.services[idx], ...service }
  } else {
    state.services.push({ id: uid(), actif: true, documents_requis: [], motifs_predefinis: [], poids: 1, temps_moyen_min: 5, ...service })
  }
  persist()
}

export function supprimerService(serviceId) {
  const service = state.services.find((s) => s.id === serviceId)
  service.actif = false
  persist()
}

export function upsertPromotion(promotion) {
  if (promotion.id) {
    const idx = state.promotions.findIndex((p) => p.id === promotion.id)
    state.promotions[idx] = { ...state.promotions[idx], ...promotion }
  } else {
    const ordreMax = Math.max(0, ...state.promotions.filter((p) => p.organisation_id === promotion.organisation_id).map((p) => p.ordre))
    state.promotions.push({ id: uid(), actif: true, ordre: ordreMax + 1, ...promotion })
  }
  persist()
}

export function supprimerPromotion(promotionId) {
  state.promotions = state.promotions.filter((p) => p.id !== promotionId)
  persist()
}

export function majBranding(organisationId, { couleur_principale, couleur_secondaire, logo_url }) {
  const org = state.organisations.find((o) => o.id === organisationId)
  Object.assign(org, { couleur_principale, couleur_secondaire, logo_url })
  persist()
}

/** Auto-service, comme inscrireOrganisation : une enseigne vide (sans organisation
 * rattachée) ne donne accès à rien, le risque est dans le rattachement lui-même
 * (majEnseigneOrganisation ci-dessous, borné à sa propre organisation). */
export function creerEnseigne(nom) {
  const propre = (nom || '').trim()
  if (!propre) throw new Error('Le nom de l’enseigne est requis')
  const enseigne = { id: uid(), nom: propre, cree_le: new Date().toISOString() }
  state.enseignes.push(enseigne)
  persist()
  return enseigne
}

/** Rattache (ou détache si enseigneId est null) l'organisation à une enseigne.
 * Toujours la PROPRE organisation de l'appelant côté RPC réelle (agent_organisation_id()
 * dans schema.sql) — ici en démo il n'y a qu'un seul back-office ouvert à la fois donc
 * pas de vérification supplémentaire nécessaire. */
export function majEnseigneOrganisation(organisationId, enseigneId) {
  const org = state.organisations.find((o) => o.id === organisationId)
  if (!org) throw new Error('Organisation introuvable')
  if (enseigneId && !state.enseignes.some((e) => e.id === enseigneId)) throw new Error('Enseigne introuvable')
  org.enseigne_id = enseigneId
  // Quitter l'enseigne retire aussi l'accès à la vue enseigne de tous les agents de
  // l'organisation, pour ne pas laisser un accès orphelin à une enseigne quittée.
  if (!enseigneId) {
    state.agents.filter((a) => a.organisation_id === organisationId).forEach((a) => { a.enseigne_id = null })
  }
  persist()
}

/** Accorde/retire à un agent l'accès à la vue enseigne en lecture seule (agents.enseigne_id). */
export function majAccesEnseigneAgent(agentId, enseigneId) {
  const agent = state.agents.find((a) => a.id === agentId)
  if (!agent) throw new Error('Agent introuvable')
  agent.enseigne_id = enseigneId
  persist()
}

export function getTicket(ticketId) {
  return state.tickets.find((t) => t.id === ticketId) || null
}

export function getTicketsOrganisation(organisationId) {
  return state.tickets.filter((t) => t.organisation_id === organisationId)
}

export function rechercherTickets(organisationId, { code, telephone, dateDebut, dateFin } = {}) {
  const debut = dateDebut ? new Date(dateDebut).getTime() : null
  const fin = dateFin ? new Date(dateFin).getTime() + 86400000 : null
  return state.tickets
    .filter((t) => t.organisation_id === organisationId)
    .filter((t) => !code || t.code.toLowerCase().includes(code.toLowerCase()))
    .filter((t) => !telephone || (t.telephone || '').includes(telephone))
    .filter((t) => !debut || new Date(t.cree_le).getTime() >= debut)
    .filter((t) => !fin || new Date(t.cree_le).getTime() < fin)
    .sort((a, b) => b.cree_le.localeCompare(a.cree_le))
    .slice(0, 500)
}

function averageNote(notes) {
  if (notes.length === 0) return null
  return Math.round((notes.reduce((a, b) => a + b, 0) / notes.length) * 100) / 100
}

export function notesMoyennes(organisationId) {
  return getServices(organisationId, { onlyActive: false })
    .map((s) => {
      const notes = state.tickets.filter((t) => t.service_id === s.id && t.note != null).map((t) => t.note)
      return { service_id: s.id, service_nom: s.nom, note_moyenne: averageNote(notes), nb_avis: notes.length }
    })
    .sort((a, b) => a.service_nom.localeCompare(b.service_nom))
}

export function notesMoyennesVendeur(organisationId) {
  return listAgents(organisationId)
    .map((a) => {
      const notes = state.tickets.filter((t) => t.agent_id === a.id && t.note != null).map((t) => t.note)
      return { agent_id: a.id, agent_nom: a.nom, note_moyenne: averageNote(notes), nb_avis: notes.length }
    })
    .sort((a, b) => a.agent_nom.localeCompare(b.agent_nom))
}

export function listAvisRecents(organisationId, limit = 20) {
  return state.tickets
    .filter((t) => t.organisation_id === organisationId && t.commentaire)
    .sort((a, b) => (b.termine_le || '').localeCompare(a.termine_le || ''))
    .slice(0, limit)
    .map((t) => ({ id: t.id, code: t.code, service_id: t.service_id, note: t.note, commentaire: t.commentaire, termine_le: t.termine_le }))
}

/** Inscription self-service (onboarding) : crée organisation + agent admin +
 * services par défaut + abonnement (démo Stripe pour l'instant), miroir de la
 * RPC inscrire_organisation() de schema.sql. */
export function inscrireOrganisation({ nom, type, adresse, agentNom, email, password, plan, montantMensuelEur }) {
  // Miroir des mêmes garde-fous que inscrire_organisation() côté SQL (schema.sql) :
  // sans eux, l'UI les valide déjà côté client, mais un appel direct (ou une
  // régression future de cette validation côté formulaire) créerait une
  // organisation invalide en mode démo sans que rien ne le détecte.
  if (!['mairie', 'boutique'].includes(type)) {
    throw new Error('Type d’organisation invalide')
  }
  if (!nom?.trim()) {
    throw new Error('Le nom de l’organisation est requis')
  }
  if (state.agents.some((a) => a.email === email)) {
    throw new Error('Un compte existe déjà avec cet email')
  }
  const organisationId = uid()
  const now = new Date().toISOString()

  state.organisations.push({
    id: organisationId,
    nom,
    type,
    couleur_principale: type === 'boutique' ? '#4f46e5' : '#0f766e',
    couleur_secondaire: type === 'boutique' ? '#818cf8' : '#5eead4',
    logo_url: null,
    adresse: adresse || null,
    alerte_delai_min: 15,
    cree_le: now,
  })

  state.agents.push({ id: uid(), organisation_id: organisationId, nom: agentNom, email, password, role: 'admin', service_ids: [], connecte: false, en_pause: false, ticket_en_cours_id: null })

  const defaultServices = type === 'boutique'
    ? [{ prefixe_ticket: 'V', nom: 'Ventes', temps_moyen_min: 6, poids: 1 }, { prefixe_ticket: 'S', nom: 'SAV', temps_moyen_min: 10, poids: 2 }]
    : [{ prefixe_ticket: 'A', nom: 'Accueil', temps_moyen_min: 8, poids: 1 }]
  defaultServices.forEach((s) => {
    state.services.push({ id: uid(), organisation_id: organisationId, actif: true, documents_requis: [], motifs_predefinis: [], ...s })
  })

  state.abonnements.push({
    id: uid(),
    organisation_id: organisationId,
    plan,
    montant_mensuel_eur: montantMensuelEur ?? 0,
    statut: 'demo',
    stripe_customer_id: `cus_demo_${organisationId.slice(0, 8)}`,
    stripe_subscription_id: null,
    cree_le: now,
  })

  persist()
  return { organisation_id: organisationId }
}
