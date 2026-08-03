import { describe, it, expect } from 'vitest'
import { generateTicketCode, selectNextTicket, computePosition, computeEtaMinutes } from './queue.js'

describe('generateTicketCode', () => {
  it('numérote à partir de 1, format PREFIXE-NN', () => {
    expect(generateTicketCode('V', 0)).toBe('V-01')
    expect(generateTicketCode('V', 8)).toBe('V-09')
    expect(generateTicketCode('S', 99)).toBe('S-100')
  })
})

describe('selectNextTicket — critère §10 : 3 services de poids différents', () => {
  const poids = new Map([
    ['ventes', 1],
    ['sav', 3],
    ['fidelite', 2],
  ])

  it('priorise le service au poids le plus élevé même arrivé après', () => {
    const tickets = [
      { id: 't1', service_id: 'ventes', cree_le: '2026-08-02T09:00:00.000Z' },
      { id: 't2', service_id: 'sav', cree_le: '2026-08-02T09:05:00.000Z' },
      { id: 't3', service_id: 'fidelite', cree_le: '2026-08-02T09:01:00.000Z' },
    ]
    const next = selectNextTicket(tickets, poids, ['ventes', 'sav', 'fidelite'])
    expect(next.id).toBe('t2') // SAV, poids 3, malgré arrivée plus tardive
  })

  it('à poids égal, respecte le FIFO', () => {
    const tickets = [
      { id: 't1', service_id: 'sav', cree_le: '2026-08-02T09:05:00.000Z' },
      { id: 't2', service_id: 'sav', cree_le: '2026-08-02T09:01:00.000Z' },
    ]
    const next = selectNextTicket(tickets, poids, ['sav'])
    expect(next.id).toBe('t2')
  })

  it('ignore les tickets des services non servis par le poste', () => {
    const tickets = [{ id: 't1', service_id: 'sav', cree_le: '2026-08-02T09:00:00.000Z' }]
    expect(selectNextTicket(tickets, poids, ['ventes'])).toBeNull()
  })

  it('retourne null si aucun ticket en attente', () => {
    expect(selectNextTicket([], poids, ['ventes'])).toBeNull()
  })

  it('traite un service absent de la map de poids comme poids 0 (pas une exception)', () => {
    const tickets = [
      { id: 't1', service_id: 'service-non-repertorie', cree_le: '2026-08-02T09:00:00.000Z' },
      { id: 't2', service_id: 'ventes', cree_le: '2026-08-02T09:05:00.000Z' },
    ]
    const next = selectNextTicket(tickets, poids, ['service-non-repertorie', 'ventes'])
    expect(next.id).toBe('t2') // ventes (poids 1) > service inconnu (poids 0)
  })
})

describe('selectNextTicket — priorité spéciale (PMR, urgence)', () => {
  const poids = new Map([['ventes', 1], ['sav', 3]])

  it('un ticket prioritaire passe devant, même sur un service de poids plus faible et arrivé après', () => {
    const tickets = [
      { id: 't1', service_id: 'sav', cree_le: '2026-08-02T09:00:00.000Z' }, // poids 3, non prioritaire
      { id: 't2', service_id: 'ventes', cree_le: '2026-08-02T09:05:00.000Z', prioritaire: true }, // poids 1, prioritaire
    ]
    const next = selectNextTicket(tickets, poids, ['ventes', 'sav'])
    expect(next.id).toBe('t2')
  })

  it('entre deux tickets prioritaires, le poids du service départage', () => {
    const tickets = [
      { id: 't1', service_id: 'ventes', cree_le: '2026-08-02T09:00:00.000Z', prioritaire: true },
      { id: 't2', service_id: 'sav', cree_le: '2026-08-02T09:05:00.000Z', prioritaire: true },
    ]
    const next = selectNextTicket(tickets, poids, ['ventes', 'sav'])
    expect(next.id).toBe('t2') // sav, poids 3
  })
})

describe('computePosition / computeEtaMinutes', () => {
  it("ne compte que les tickets du même service (pas d'impact du poids d'un autre service)", () => {
    const ticket = { id: 't3', service_id: 'ventes', cree_le: '2026-08-02T09:10:00.000Z' }
    const ticketsDuService = [
      { id: 't1', service_id: 'ventes', cree_le: '2026-08-02T09:00:00.000Z' },
      { id: 't2', service_id: 'ventes', cree_le: '2026-08-02T09:05:00.000Z' },
      { id: 't3', service_id: 'ventes', cree_le: '2026-08-02T09:10:00.000Z' },
    ]
    expect(computePosition(ticket, ticketsDuService)).toBe(2)
    expect(computeEtaMinutes(2, 6)).toBe(12)
  })

  it('position 0 pour le premier de la file', () => {
    const ticket = { id: 't1', service_id: 'ventes', cree_le: '2026-08-02T09:00:00.000Z' }
    expect(computePosition(ticket, [ticket])).toBe(0)
  })

  it('un ticket créé exactement à la même seconde ne se compte pas lui-même comme devant lui', () => {
    const ticket = { id: 't1', service_id: 'ventes', cree_le: '2026-08-02T09:00:00.000Z' }
    const autreMemeHorodatage = { id: 't2', service_id: 'ventes', cree_le: '2026-08-02T09:00:00.000Z' }
    expect(computePosition(ticket, [ticket, autreMemeHorodatage])).toBe(0)
  })

  it('attente estimée nulle en position 0', () => {
    expect(computeEtaMinutes(0, 10)).toBe(0)
  })

  it('un ticket prioritaire créé plus tard compte quand même comme "devant" un non-prioritaire', () => {
    const nonPrioritaire = { id: 't1', service_id: 'ventes', cree_le: '2026-08-02T09:00:00.000Z' }
    const prioritaireArriveApres = { id: 't2', service_id: 'ventes', cree_le: '2026-08-02T09:05:00.000Z', prioritaire: true }
    expect(computePosition(nonPrioritaire, [nonPrioritaire, prioritaireArriveApres])).toBe(1)
    expect(computePosition(prioritaireArriveApres, [nonPrioritaire, prioritaireArriveApres])).toBe(0)
  })
})
