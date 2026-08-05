// Test de charge du parcours client anonyme (le plus exposé : n'importe qui peut
// l'atteindre en scannant un QR code, sans authentification). Simule des clients qui
// créent un ticket puis suivent leur position en direct (le polling 4s réel de
// ClientPage.jsx), sur le modèle des critères d'acceptation §10 du README.
//
// ⚠️ N'EXÉCUTEZ JAMAIS CE SCRIPT CONTRE VOTRE PROJET SUPABASE DE PRODUCTION SANS
// UNE ORGANISATION JETABLE DÉDIÉE : chaque itération insère un vrai ticket en base
// (créer_ticket) et consomme le plafond anti-spam de 500 tickets/jour/service. Créez
// une organisation de test (back-office → inscription) et utilisez SON id/service_id,
// jamais ceux d'une boutique réelle.
//
// Utilisation :
//   1. npm install -g k6   (ou voir https://k6.io/docs/get-started/installation/)
//   2. Renseigner les variables ci-dessous (SUPABASE_URL, SUPABASE_ANON_KEY,
//      ORG_ID, SERVICE_ID) via -e ou en les modifiant directement.
//   3. k6 run loadtest/k6-ticket-flow.js
//        -e SUPABASE_URL=https://xxxx.supabase.co \
//        -e SUPABASE_ANON_KEY=eyJ... \
//        -e ORG_ID=00000000-0000-0000-0000-000000000000 \
//        -e SERVICE_ID=00000000-0000-0000-0000-000000000000

import http from 'k6/http'
import { check, sleep } from 'k6'

const SUPABASE_URL = __ENV.SUPABASE_URL
const SUPABASE_ANON_KEY = __ENV.SUPABASE_ANON_KEY
const ORG_ID = __ENV.ORG_ID
const SERVICE_ID = __ENV.SERVICE_ID
// Combien de fois chaque client relit son statut avant de repartir (imite le
// polling 4s de ClientPage.jsx pendant une attente courte, sans faire durer le
// test artificiellement).
const POLLS_PAR_CLIENT = Number(__ENV.POLLS_PAR_CLIENT || 3)

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !ORG_ID || !SERVICE_ID) {
  throw new Error(
    'Variables manquantes : SUPABASE_URL, SUPABASE_ANON_KEY, ORG_ID, SERVICE_ID sont requises (voir commentaire en tête de fichier).'
  )
}

// Profil de charge par défaut : montée progressive jusqu'à plusieurs dizaines de
// clients simultanés (calibrer VUS/durée selon ce qu'on veut vraiment vérifier).
export const options = {
  scenarios: {
    creation_tickets: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 10 },
        { duration: '1m', target: 40 },
        { duration: '30s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<800'],
  },
}

const headers = {
  'Content-Type': 'application/json',
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
}

function rpc(name, payload) {
  return http.post(`${SUPABASE_URL}/rest/v1/rpc/${name}`, JSON.stringify(payload), { headers })
}

export default function () {
  const creerRes = rpc('creer_ticket', {
    p_organisation_id: ORG_ID,
    p_service_id: SERVICE_ID,
    p_canal: 'mobile',
  })

  const created = check(creerRes, {
    'creer_ticket: 200': (r) => r.status === 200,
  })
  if (!created) {
    sleep(1)
    return
  }

  const ticket = Array.isArray(creerRes.json()) ? creerRes.json()[0] : creerRes.json()
  if (!ticket?.id || !ticket?.client_token) {
    sleep(1)
    return
  }

  for (let i = 0; i < POLLS_PAR_CLIENT; i++) {
    sleep(4) // même cadence que le polling réel de ClientPage.jsx
    const statusRes = rpc('ticket_status', { p_ticket_id: ticket.id, p_client_token: ticket.client_token })
    check(statusRes, { 'ticket_status: 200': (r) => r.status === 200 })
  }
}
