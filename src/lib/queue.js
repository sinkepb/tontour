// Logique métier pure (aucun accès stockage/réseau ici) — testée par
// src/lib/queue.test.js. Utilisée par demoStore.js ; sa contrepartie
// transactionnelle pour la production est supabase/schema.sql (appeler_prochain).

/** Code de ticket du jour pour un service : PREFIXE-NN, NN = position dans la séquence du jour (1-based). */
export function generateTicketCode(prefixeTicket, nombreTicketsServiceAujourdhui) {
  const seq = nombreTicketsServiceAujourdhui + 1
  return `${prefixeTicket}-${String(seq).padStart(2, '0')}`
}

/**
 * Sélectionne le prochain ticket à servir pour un agent, parmi les services
 * qu'il sert actuellement : priorité spéciale (PMR, urgence) d'abord — sans
 * attendre le poids du service — puis poids de service décroissant, puis FIFO.
 * @param {Array} ticketsEnAttente tickets avec statut 'en_attente'
 * @param {Map<string, number>} poidsParService service_id -> poids
 * @param {string[]} serviceIdsAgent services servis par l'agent
 */
export function selectNextTicket(ticketsEnAttente, poidsParService, serviceIdsAgent) {
  const eligibles = ticketsEnAttente.filter((t) => serviceIdsAgent.includes(t.service_id))
  if (eligibles.length === 0) return null

  return eligibles.sort((a, b) => {
    const prioDiff = (b.prioritaire ? 1 : 0) - (a.prioritaire ? 1 : 0)
    if (prioDiff !== 0) return prioDiff
    const poidsDiff = (poidsParService.get(b.service_id) ?? 0) - (poidsParService.get(a.service_id) ?? 0)
    if (poidsDiff !== 0) return poidsDiff
    return a.cree_le.localeCompare(b.cree_le)
  })[0]
}

/** Nombre de personnes devant ce ticket, au sein de son seul service : un ticket
 * prioritaire passe toujours devant les non-prioritaires, quelle que soit l'heure
 * d'arrivée ; à priorité égale, FIFO. */
export function computePosition(ticket, tousLesTicketsEnAttenteDuService) {
  const ticketPrio = !!ticket.prioritaire
  return tousLesTicketsEnAttenteDuService.filter((t) => {
    const tPrio = !!t.prioritaire
    if (tPrio !== ticketPrio) return tPrio
    return t.cree_le < ticket.cree_le
  }).length
}

export function computeEtaMinutes(position, tempsMoyenMin) {
  return position * tempsMoyenMin
}
