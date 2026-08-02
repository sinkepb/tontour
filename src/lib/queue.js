// Logique métier pure (aucun accès stockage/réseau ici) — testée par
// src/lib/queue.test.js. Utilisée par demoStore.js ; sa contrepartie
// transactionnelle pour la production est supabase/schema.sql (appeler_prochain).

/** Code de ticket du jour pour un service : PREFIXE-NN, NN = position dans la séquence du jour (1-based). */
export function generateTicketCode(prefixeTicket, nombreTicketsServiceAujourdhui) {
  const seq = nombreTicketsServiceAujourdhui + 1
  return `${prefixeTicket}-${String(seq).padStart(2, '0')}`
}

/**
 * Sélectionne le prochain ticket à servir pour un poste, parmi les services
 * qu'il sert actuellement : poids de service décroissant, puis FIFO.
 * @param {Array} ticketsEnAttente tickets avec statut 'en_attente'
 * @param {Map<string, number>} poidsParService service_id -> poids
 * @param {string[]} serviceIdsPoste services servis par le poste
 */
export function selectNextTicket(ticketsEnAttente, poidsParService, serviceIdsPoste) {
  const eligibles = ticketsEnAttente.filter((t) => serviceIdsPoste.includes(t.service_id))
  if (eligibles.length === 0) return null

  return eligibles.sort((a, b) => {
    const poidsDiff = (poidsParService.get(b.service_id) ?? 0) - (poidsParService.get(a.service_id) ?? 0)
    if (poidsDiff !== 0) return poidsDiff
    return a.cree_le.localeCompare(b.cree_le)
  })[0]
}

/** Nombre de personnes devant ce ticket, au sein de son seul service (le poids d'un autre service n'a pas d'impact). */
export function computePosition(ticket, tousLesTicketsEnAttenteDuService) {
  return tousLesTicketsEnAttenteDuService.filter((t) => t.cree_le < ticket.cree_le).length
}

export function computeEtaMinutes(position, tempsMoyenMin) {
  return position * tempsMoyenMin
}
