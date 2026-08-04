// demoStore.js lit/écrit localStorage au chargement du module (`state = load()`
// exécuté au niveau module) — Vitest tourne en environnement Node par défaut, sans
// localStorage. On fournit un mock minimal AVANT d'importer le module (import
// dynamique, plus bas) plutôt que d'ajouter jsdom/happy-dom comme dépendance rien
// que pour ce fichier.
class MemoryStorage {
  constructor() { this.store = {} }
  getItem(key) { return Object.prototype.hasOwnProperty.call(this.store, key) ? this.store[key] : null }
  setItem(key, value) { this.store[key] = String(value) }
  removeItem(key) { delete this.store[key] }
  clear() { this.store = {} }
}
globalThis.localStorage = new MemoryStorage()

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
const demo = await import('./demoStore.js')

function boutique() {
  const org = demo.listOrganisations().find((o) => o.type === 'boutique')
  const service = demo.getServices(org.id)[0]
  const vendeur = demo.listAgents(org.id).find((a) => a.role === 'vendeur')
  return { org, service, vendeur }
}

beforeEach(() => {
  demo.resetDemo()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('marquerAbsent — délai de grâce', () => {
  // Logique flaguée par l'audit comme non testée : une inversion du signe ou une
  // erreur d'unité (secondes vs ms) inverserait silencieusement toute la fonctionnalité
  // "marquer absent" (soit toujours bloquée, soit jamais).
  it('refuse de marquer absent avant l’écoulement du délai de grâce', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-01T10:00:00.000Z'))
    const { org, service, vendeur } = boutique()
    const { id: ticketId, client_token } = demo.creerTicket({ organisation_id: org.id, service_id: service.id })
    const poste = demo.connecterPosteAuto(vendeur.id)
    demo.appelerProchain(poste.id) // appele_le = 10:00:00

    expect(() => demo.marquerAbsent(poste.id)).toThrow('Délai de grâce')
    expect(demo.ticketStatus(ticketId, client_token).statut).toBe('en_cours')
  })

  it('autorise à marquer absent une fois le délai de grâce (5 min par défaut) écoulé', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-01T10:00:00.000Z'))
    const { org, service, vendeur } = boutique()
    const { id: ticketId, client_token } = demo.creerTicket({ organisation_id: org.id, service_id: service.id })
    const poste = demo.connecterPosteAuto(vendeur.id)
    demo.appelerProchain(poste.id)

    vi.setSystemTime(new Date('2024-01-01T10:05:01.000Z')) // 5min 1s plus tard
    expect(() => demo.marquerAbsent(poste.id)).not.toThrow()
    expect(demo.ticketStatus(ticketId, client_token).statut).toBe('absent')
  })
})

describe('connecterPosteAuto', () => {
  it('réutilise le poste déjà connecté au lieu d’en assigner un nouveau', () => {
    const { vendeur } = boutique()
    const premier = demo.connecterPosteAuto(vendeur.id)
    const second = demo.connecterPosteAuto(vendeur.id)
    expect(second.id).toBe(premier.id)
  })

  it('assigne le poste libre, et refuse quand plus aucun n’est libre', () => {
    const org = demo.listOrganisations().find((o) => o.type === 'mairie') // 1 seul poste ("Guichet 1")
    const [agent1, agent2] = demo.listAgents(org.id)
    expect(agent1).toBeTruthy()
    expect(agent2).toBeTruthy()

    const poste = demo.connecterPosteAuto(agent1.id)
    expect(poste.nom).toBe('Guichet 1')

    expect(() => demo.connecterPosteAuto(agent2.id)).toThrow('Aucun poste disponible')
  })

  it('deux vendeurs de la même boutique reçoivent des postes différents', () => {
    const org = demo.listOrganisations().find((o) => o.type === 'boutique')
    const [agent1, agent2] = demo.listAgents(org.id) // 2 postes ("Poste 1", "Poste 2")
    const poste1 = demo.connecterPosteAuto(agent1.id)
    const poste2 = demo.connecterPosteAuto(agent2.id)
    expect(poste1.id).not.toBe(poste2.id)
    expect([poste1.nom, poste2.nom].sort()).toEqual(['Poste 1', 'Poste 2'])
  })
})

describe('statsTendance / statsHeures — bornes de dates UTC', () => {
  // Logique flaguée par l'audit comme non testée : un bug de fuseau horaire ou de
  // borne inclusive/exclusive produit un graphique plausible mais faux, difficile à
  // repérer à l'œil (contrairement à une erreur qui crashe).
  it('classe un ticket créé à 23:59:59 UTC dans le jour courant, pas le lendemain', () => {
    vi.useFakeTimers()
    const { org, service } = boutique()
    vi.setSystemTime(new Date('2024-03-10T23:59:59.000Z'))
    demo.creerTicket({ organisation_id: org.id, service_id: service.id })

    // On avance "aujourd'hui" au lendemain avant de lire les stats : si le ticket
    // avait été mal arrondi au jour suivant au moment de sa création, ce décalage le
    // révélerait (les deux jours sont dans la fenêtre glissante de 3 jours ci-dessous).
    vi.setSystemTime(new Date('2024-03-11T12:00:00.000Z'))
    const result = demo.statsTendance(org.id, 3)
    expect(result.find((r) => r.jour === '2024-03-10').tickets_crees).toBe(1)
    expect(result.find((r) => r.jour === '2024-03-11').tickets_crees).toBe(0)
  })

  it('classe un ticket créé à 00:00:00 UTC dans le jour courant, pas la veille', () => {
    vi.useFakeTimers()
    const { org, service } = boutique()
    vi.setSystemTime(new Date('2024-03-11T00:00:00.000Z'))
    demo.creerTicket({ organisation_id: org.id, service_id: service.id })

    const result = demo.statsTendance(org.id, 3)
    expect(result.find((r) => r.jour === '2024-03-11').tickets_crees).toBe(1)
    expect(result.find((r) => r.jour === '2024-03-10').tickets_crees).toBe(0)
  })

  it('compte un ticket dans le bon créneau horaire UTC', () => {
    vi.useFakeTimers()
    const { org, service } = boutique()
    vi.setSystemTime(new Date('2024-03-10T14:30:00.000Z'))
    demo.creerTicket({ organisation_id: org.id, service_id: service.id })

    const result = demo.statsHeures(org.id, 30)
    expect(result.find((r) => r.heure === 14).nb_tickets).toBe(1)
    expect(result.find((r) => r.heure === 13).nb_tickets).toBe(0)
    expect(result.find((r) => r.heure === 15).nb_tickets).toBe(0)
  })
})
