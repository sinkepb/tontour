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

  const agents = [
    { id: uid(), organisation_id: ORG_BOUTIQUE, nom: 'Camille Martin', email: 'vendeur@boutique.demo', password: 'demo123', role: 'vendeur', statut: 'deconnecte' },
    { id: uid(), organisation_id: ORG_BOUTIQUE, nom: 'Sacha Dupont', email: 'admin@boutique.demo', password: 'admin123', role: 'admin', statut: 'deconnecte' },
    { id: uid(), organisation_id: ORG_MAIRIE, nom: 'Alex Petit', email: 'agent@mairie.demo', password: 'demo123', role: 'vendeur', statut: 'deconnecte' },
    { id: uid(), organisation_id: ORG_MAIRIE, nom: 'Morgan Roy', email: 'admin@mairie.demo', password: 'admin123', role: 'admin', statut: 'deconnecte' },
  ]

  const postes = [
    { id: uid(), organisation_id: ORG_BOUTIQUE, nom: 'Poste 1', agent_id: null, service_ids: [], ticket_en_cours_id: null, connecte: false, en_pause: false },
    { id: uid(), organisation_id: ORG_BOUTIQUE, nom: 'Poste 2', agent_id: null, service_ids: [], ticket_en_cours_id: null, connecte: false, en_pause: false },
    { id: uid(), organisation_id: ORG_MAIRIE, nom: 'Guichet 1', agent_id: null, service_ids: [], ticket_en_cours_id: null, connecte: false, en_pause: false },
  ]

  return {
    organisations: [
      { id: ORG_BOUTIQUE, nom: 'Mobile Store Bastille', type: 'boutique', couleur_principale: '#ea580c', couleur_secondaire: '#fb923c', logo_url: null, adresse: '12 rue de la Roquette, 75011 Paris', alerte_delai_min: 15, cree_le: now },
      { id: ORG_MAIRIE, nom: 'Mairie de Villeneuve', type: 'mairie', couleur_principale: '#0f766e', couleur_secondaire: '#5eead4', logo_url: null, adresse: '1 place de la Mairie, 33140 Villeneuve', alerte_delai_min: 15, cree_le: now },
    ],
    services,
    promotions: defaultPromotions(),
    agents,
    postes,
    tickets: [],
  }
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (!parsed.promotions) parsed.promotions = defaultPromotions() // migration : anciennes sessions sans storie personnalisable
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

export function listPostes(organisationId) {
  return state.postes.filter((p) => p.organisation_id === organisationId)
}

export function ticketStatus(ticketId, clientToken) {
  const ticket = state.tickets.find((t) => t.id === ticketId && t.client_token === clientToken)
  if (!ticket) throw new Error('Ticket introuvable')
  const service = state.services.find((s) => s.id === ticket.service_id)
  const enAttenteDuService = state.tickets.filter((t) => t.service_id === ticket.service_id && t.statut === 'en_attente')
  const position = computePosition(ticket, enAttenteDuService)
  const poste = state.postes.find((p) => p.id === ticket.poste_id)
  return {
    id: ticket.id,
    code: ticket.code,
    client_token: ticket.client_token,
    statut: ticket.statut,
    position,
    attente_estimee_min: computeEtaMinutes(position, service?.temps_moyen_min ?? 5),
    poste_nom: poste?.nom ?? null,
    service_nom: service?.nom ?? null,
    documents_requis: service?.documents_requis ?? [],
    note: ticket.note ?? null,
    appele_le: ticket.appele_le ?? null,
  }
}

export function noterTicket(ticketId, clientToken, note) {
  const ticket = state.tickets.find((t) => t.id === ticketId && t.client_token === clientToken)
  if (!ticket || ticket.statut !== 'termine') throw new Error('Ticket introuvable ou pas encore terminé')
  if (note < 1 || note > 5) throw new Error('Note invalide (1 à 5)')
  ticket.note = note
  persist()
}

export function salleAffichage(organisationId) {
  const appeles = state.tickets
    .filter((t) => t.organisation_id === organisationId && t.statut === 'en_cours')
    .sort((a, b) => (b.appele_le || '').localeCompare(a.appele_le || ''))
    .map((t) => ({ code: t.code, poste: state.postes.find((p) => p.id === t.poste_id)?.nom ?? '' }))

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
    postes_connectes: state.postes.filter((p) => p.organisation_id === organisationId && p.connecte).length,
  }
}

export function servicesEnAlerte(organisationId) {
  const org = getOrganisation(organisationId)
  const delai = org?.alerte_delai_min ?? 15
  const now = Date.now()
  return getServices(organisationId)
    .map((s) => {
      const attente = state.tickets.filter((t) => t.service_id === s.id && t.statut === 'en_attente')
      if (attente.length === 0) return null
      const posteActif = state.postes.some(
        (p) => p.organisation_id === organisationId && p.connecte && !p.en_pause && p.service_ids.includes(s.id)
      )
      if (posteActif) return null
      const plusAncien = Math.min(...attente.map((t) => new Date(t.cree_le).getTime()))
      const ancienneteMin = (now - plusAncien) / 60000
      if (ancienneteMin < delai) return null
      return { service_id: s.id, service_nom: s.nom, tickets_en_attente: attente.length, plus_ancien_min: Math.round(ancienneteMin) }
    })
    .filter(Boolean)
}

// ─── Écritures ─────────────────────────────────────────────────────────

export function creerTicket({ organisation_id, service_id, motif, telephone, canal = 'mobile' }) {
  const service = state.services.find((s) => s.id === service_id && s.organisation_id === organisation_id && s.actif)
  if (!service) throw new Error('Service invalide ou inactif')

  const cree_le = new Date().toISOString()
  const ticketsServiceAujourdhui = state.tickets.filter((t) => t.service_id === service_id && todayKey(t.cree_le) === todayKey(cree_le)).length
  const ticket = {
    id: uid(),
    organisation_id,
    service_id,
    code: generateTicketCode(service.prefixe_ticket, ticketsServiceAujourdhui),
    statut: 'en_attente',
    canal,
    motif: motif || null,
    telephone: telephone || null,
    client_token: uid(),
    poste_id: null,
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
export function appelerProchain(posteId) {
  state = load()
  const poste = state.postes.find((p) => p.id === posteId)
  if (!poste) throw new Error('Poste introuvable')
  if (poste.ticket_en_cours_id) throw new Error('Un ticket est déjà en cours sur ce poste')

  const servicesParPoids = new Map(state.services.map((s) => [s.id, s.poids]))
  const ticketsEnAttente = state.tickets.filter((t) => t.organisation_id === poste.organisation_id && t.statut === 'en_attente')
  const candidat = selectNextTicket(ticketsEnAttente, servicesParPoids, poste.service_ids)

  if (!candidat) throw new Error('Aucun ticket en attente pour les services de ce poste')

  candidat.statut = 'en_cours'
  candidat.poste_id = posteId
  candidat.appele_le = new Date().toISOString()
  poste.ticket_en_cours_id = candidat.id
  persist()
  return candidat
}

export function apercuProchain(posteId) {
  const poste = state.postes.find((p) => p.id === posteId)
  if (!poste || poste.ticket_en_cours_id) return null
  const servicesParPoids = new Map(state.services.map((s) => [s.id, s.poids]))
  const ticketsEnAttente = state.tickets.filter((t) => t.organisation_id === poste.organisation_id && t.statut === 'en_attente')
  return selectNextTicket(ticketsEnAttente, servicesParPoids, poste.service_ids)
}

export function terminerTraitement(posteId) {
  const poste = state.postes.find((p) => p.id === posteId)
  if (!poste || !poste.ticket_en_cours_id) throw new Error('Aucun ticket en cours sur ce poste')
  const ticket = state.tickets.find((t) => t.id === poste.ticket_en_cours_id)
  ticket.statut = 'termine'
  ticket.termine_le = new Date().toISOString()
  poste.ticket_en_cours_id = null
  persist()
}

/** Relance la notification sans réassigner le ticket : la sonnette reste active
 * après le premier appel pour rappeler un client qui n'a pas répondu. */
export function rappelerClient(posteId) {
  const poste = state.postes.find((p) => p.id === posteId)
  if (!poste || !poste.ticket_en_cours_id) throw new Error('Aucun ticket en cours sur ce poste')
  const ticket = state.tickets.find((t) => t.id === poste.ticket_en_cours_id)
  ticket.appele_le = new Date().toISOString()
  persist()
}

export function connecterPoste(posteId, agentId, serviceIds) {
  const poste = state.postes.find((p) => p.id === posteId)
  if (!poste) throw new Error('Poste introuvable')
  poste.agent_id = agentId
  poste.service_ids = serviceIds
  poste.connecte = true
  poste.en_pause = false
  persist()
}

export function majServicesPoste(posteId, serviceIds) {
  const poste = state.postes.find((p) => p.id === posteId)
  poste.service_ids = serviceIds
  persist()
}

export function togglePause(posteId) {
  const poste = state.postes.find((p) => p.id === posteId)
  poste.en_pause = !poste.en_pause
  persist()
  return poste.en_pause
}

export function deconnecterPoste(posteId) {
  const poste = state.postes.find((p) => p.id === posteId)
  poste.connecte = false
  poste.en_pause = false
  poste.agent_id = null
  poste.service_ids = []
  persist()
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

export function getTicket(ticketId) {
  return state.tickets.find((t) => t.id === ticketId) || null
}

export function getTicketsOrganisation(organisationId) {
  return state.tickets.filter((t) => t.organisation_id === organisationId)
}
