// Couche d'abstraction unique utilisée par les pages : bascule automatiquement
// entre le vrai backend Supabase (RPC + Realtime définis dans
// supabase/schema.sql) et le moteur de démonstration 100% local (demoStore.js),
// selon que VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY sont renseignées.
import { supabase, isDemo } from './supabase.js'
import * as demo from './demoStore.js'

const SESSION_KEY = 'tontour_demo_session'

function unwrapRpc(promise) {
  return promise.then(({ data, error }) => {
    if (error) throw new Error(error.message)
    return Array.isArray(data) ? data[0] : data
  })
}

export const api = {
  isDemo,

  async getOrganisation(organisationId) {
    if (isDemo) return demo.getOrganisation(organisationId)
    // Colonnes limitées à celles réellement affichées (et accordées à anon en RLS,
    // voir supabase/schema.sql) — un `select('*')` échoue pour les visiteurs anonymes
    // car certaines colonnes (adresse, alerte_delai_min, cree_le) ne leur sont pas accordées.
    const { data, error } = await supabase
      .from('organisations')
      .select('id, nom, type, couleur_principale, couleur_secondaire, logo_url')
      .eq('id', organisationId)
      .single()
    if (error) throw new Error(error.message)
    return data
  },

  /** Variante authentifiée (agent/admin) : toutes les colonnes, accordées en RLS à
   * `authenticated` sans restriction — contrairement à getOrganisation() ci-dessus,
   * volontairement limité pour le cas anonyme. */
  async getOrganisationAuth(organisationId) {
    if (isDemo) return demo.getOrganisation(organisationId)
    const { data, error } = await supabase.from('organisations').select('*').eq('id', organisationId).single()
    if (error) throw new Error(error.message)
    return data
  },

  async getServices(organisationId) {
    if (isDemo) return demo.getServices(organisationId)
    const { data, error } = await supabase.from('services').select('*').eq('organisation_id', organisationId).eq('actif', true)
    if (error) throw new Error(error.message)
    return data
  },

  async listPromotions(organisationId, opts) {
    if (isDemo) return demo.listPromotions(organisationId, opts)
    let query = supabase.from('promotions').select('*').eq('organisation_id', organisationId).order('ordre')
    if (!opts || opts.onlyActive !== false) query = query.eq('actif', true)
    const { data, error } = await query
    if (error) throw new Error(error.message)
    return data
  },

  async upsertPromotion(promotion) {
    if (isDemo) return demo.upsertPromotion(promotion)
    const { error } = await supabase.from('promotions').upsert(promotion)
    if (error) throw new Error(error.message)
  },

  async supprimerPromotion(promotionId) {
    if (isDemo) return demo.supprimerPromotion(promotionId)
    const { error } = await supabase.from('promotions').delete().eq('id', promotionId)
    if (error) throw new Error(error.message)
  },

  async creerTicket(params) {
    if (isDemo) return demo.creerTicket(params)
    return unwrapRpc(
      supabase.rpc('creer_ticket', {
        p_organisation_id: params.organisation_id,
        p_service_id: params.service_id,
        p_motif: params.motif ?? null,
        p_telephone: params.telephone ?? null,
        p_canal: params.canal ?? 'mobile',
        p_prioritaire: params.prioritaire ?? false,
      })
    )
  },

  async ticketStatus(ticketId, clientToken) {
    if (isDemo) return demo.ticketStatus(ticketId, clientToken)
    return unwrapRpc(supabase.rpc('ticket_status', { p_ticket_id: ticketId, p_client_token: clientToken }))
  },

  async annulerTicket(ticketId, clientToken) {
    if (isDemo) return demo.annulerTicket(ticketId, clientToken)
    const { error } = await supabase.rpc('annuler_ticket', { p_ticket_id: ticketId, p_client_token: clientToken })
    if (error) throw new Error(error.message)
  },

  async noterTicket(ticketId, clientToken, note, commentaire) {
    if (isDemo) return demo.noterTicket(ticketId, clientToken, note, commentaire)
    const { error } = await supabase.rpc('noter_ticket', { p_ticket_id: ticketId, p_client_token: clientToken, p_note: note, p_commentaire: commentaire ?? null })
    if (error) throw new Error(error.message)
  },

  async apercuProchain(posteId) {
    if (isDemo) return demo.apercuProchain(posteId)
    return unwrapRpc(supabase.rpc('apercu_prochain', { p_poste_id: posteId })).catch(() => null)
  },

  async appelerProchain(posteId) {
    if (isDemo) return demo.appelerProchain(posteId)
    return unwrapRpc(supabase.rpc('appeler_prochain', { p_poste_id: posteId }))
  },

  async terminerTraitement(posteId) {
    if (isDemo) return demo.terminerTraitement(posteId)
    const { error } = await supabase.rpc('terminer_traitement', { p_poste_id: posteId })
    if (error) throw new Error(error.message)
  },

  async rappelerClient(posteId) {
    if (isDemo) return demo.rappelerClient(posteId)
    const { error } = await supabase.rpc('rappeler_client', { p_poste_id: posteId })
    if (error) throw new Error(error.message)
  },

  async marquerAbsent(posteId) {
    if (isDemo) return demo.marquerAbsent(posteId)
    const { error } = await supabase.rpc('marquer_absent', { p_poste_id: posteId })
    if (error) throw new Error(error.message)
  },

  async salleAffichage(organisationId) {
    if (isDemo) return demo.salleAffichage(organisationId)
    return unwrapRpc(supabase.rpc('salle_affichage', { p_organisation_id: organisationId }))
  },

  async servicesEnAlerte(organisationId) {
    if (isDemo) return demo.servicesEnAlerte(organisationId)
    const { data, error } = await supabase.rpc('services_en_alerte', { p_organisation_id: organisationId })
    if (error) throw new Error(error.message)
    return data
  },

  async notesMoyennes(organisationId) {
    if (isDemo) return demo.notesMoyennes(organisationId)
    const { data, error } = await supabase.rpc('notes_moyennes', { p_organisation_id: organisationId })
    if (error) throw new Error(error.message)
    return data
  },

  async notesMoyennesVendeur(organisationId) {
    if (isDemo) return demo.notesMoyennesVendeur(organisationId)
    const { data, error } = await supabase.rpc('notes_moyennes_vendeur', { p_organisation_id: organisationId })
    if (error) throw new Error(error.message)
    return data
  },

  async listAvisRecents(organisationId, limit = 20) {
    if (isDemo) return demo.listAvisRecents(organisationId, limit)
    const { data, error } = await supabase
      .from('tickets')
      .select('id, code, service_id, note, commentaire, termine_le')
      .eq('organisation_id', organisationId)
      .not('commentaire', 'is', null)
      .order('termine_le', { ascending: false })
      .limit(limit)
    if (error) throw new Error(error.message)
    return data
  },

  /** Inscription self-service (onboarding depuis la landing page). En mode Supabase :
   * crée d'abord le compte auth (signUp), puis provisionne organisation/agent/postes/
   * services/abonnement via la RPC SECURITY DEFINER inscrire_organisation — voir le
   * commentaire sur cette fonction dans schema.sql pour pourquoi p_agent_id est passé
   * explicitement plutôt que de compter sur auth.uid() (session pas toujours active
   * immédiatement si la confirmation email est activée sur le projet). */
  async inscrireOrganisation({ nom, type, adresse, agentNom, email, password, plan, montantMensuelEur }) {
    if (isDemo) return demo.inscrireOrganisation({ nom, type, adresse, agentNom, email, password, plan, montantMensuelEur })

    let agentId
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password })
    if (signUpError) {
      // Cas le plus probable : une tentative d'inscription précédente a créé le compte
      // Auth (signUp a réussi) mais s'est interrompue avant d'appeler
      // inscrire_organisation (réseau coupé, onglet fermé...) — le compte existe mais
      // n'a pas encore d'organisation. Plutôt qu'un échec sans recours ("email déjà
      // utilisé"), on retente une connexion avec les identifiants tout juste saisis
      // pour reprendre là où ça s'est arrêté, au lieu de laisser un compte orphelin.
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError || !signInData.user) throw new Error(signUpError.message)
      agentId = signInData.user.id
    } else {
      agentId = signUpData.user?.id
    }
    if (!agentId) throw new Error('Impossible de créer le compte')

    const { data, error } = await supabase.rpc('inscrire_organisation', {
      p_agent_id: agentId,
      p_nom: nom,
      p_type: type,
      p_adresse: adresse || null,
      p_email: email,
      p_agent_nom: agentNom,
      p_plan: plan,
      p_montant_mensuel_eur: montantMensuelEur ?? 0,
    })
    if (error) {
      // Même logique de reprise : l'organisation a peut-être déjà été créée par une
      // tentative précédente dont la réponse n'est jamais arrivée jusqu'ici (RPC
      // réussie côté serveur, connexion coupée juste après) — on la retrouve plutôt
      // que d'échouer une deuxième fois sur le même compte.
      if (error.message.includes('déjà rattaché')) {
        const { data: existing } = await supabase.from('agents').select('organisation_id').eq('id', agentId).single()
        if (existing?.organisation_id) return { organisation_id: existing.organisation_id }
      }
      throw new Error(error.message)
    }
    const row = Array.isArray(data) ? data[0] : data
    return { organisation_id: row.organisation_id }
  },

  async statsJour(organisationId) {
    if (isDemo) return demo.statsJour(organisationId)
    return unwrapRpc(supabase.rpc('stats_jour', { p_organisation_id: organisationId }))
  },

  async statsTendance(organisationId, jours = 14) {
    if (isDemo) return demo.statsTendance(organisationId, jours)
    const { data, error } = await supabase.rpc('stats_tendance', { p_organisation_id: organisationId, p_jours: jours })
    if (error) throw new Error(error.message)
    return data
  },

  async statsHeures(organisationId, jours = 30) {
    if (isDemo) return demo.statsHeures(organisationId, jours)
    const { data, error } = await supabase.rpc('stats_heures', { p_organisation_id: organisationId, p_jours: jours })
    if (error) throw new Error(error.message)
    return data
  },

  /** Vue consolidée multi-boutiques : n'affiche des données que pour les organisations
   * de la même enseigne que l'agent connecté (vérifié côté serveur, voir schema.sql). */
  async statsEnseigne(enseigneId) {
    if (isDemo) return demo.statsEnseigne(enseigneId)
    const { data, error } = await supabase.rpc('stats_enseigne', { p_enseigne_id: enseigneId })
    if (error) throw new Error(error.message)
    return data
  },

  async getTicket(ticketId) {
    if (isDemo) return demo.getTicket(ticketId)
    const { data, error } = await supabase.from('tickets').select('*').eq('id', ticketId).single()
    if (error) throw new Error(error.message)
    return data
  },

  async listPostes(organisationId) {
    if (isDemo) return demo.listPostes(organisationId)
    const { data, error } = await supabase.from('postes').select('*').eq('organisation_id', organisationId)
    if (error) throw new Error(error.message)
    return data
  },

  async listAgents(organisationId) {
    if (isDemo) return demo.listAgents(organisationId)
    const { data, error } = await supabase.from('agents').select('*').eq('organisation_id', organisationId)
    if (error) throw new Error(error.message)
    return data
  },

  /** Le vendeur ne choisit plus ni poste ni services : le premier poste libre lui est
   * assigné automatiquement, avec les services que l'admin lui a attribués (voir
   * majServicesAgent). `agentId` n'est utilisé qu'en mode démo — en mode Supabase, la
   * RPC identifie l'agent via auth.uid(), pas besoin de le lui repasser. */
  async connecterPosteAuto(agentId) {
    if (isDemo) return demo.connecterPosteAuto(agentId)
    return unwrapRpc(supabase.rpc('connecter_poste_auto'))
  },

  /** Services qu'un agent est habilité à servir — attribués par l'admin (back-office
   * → Postes & agents), pas choisis par le vendeur lui-même. */
  async majServicesAgent(agentId, serviceIds) {
    if (isDemo) return demo.majServicesAgent(agentId, serviceIds)
    const { error } = await supabase.from('agents').update({ service_ids: serviceIds }).eq('id', agentId)
    if (error) throw new Error(error.message)
  },

  async togglePause(posteId, current) {
    if (isDemo) return demo.togglePause(posteId)
    const { error } = await supabase.from('postes').update({ en_pause: !current }).eq('id', posteId)
    if (error) throw new Error(error.message)
    return !current
  },

  async deconnecterPoste(posteId) {
    if (isDemo) return demo.deconnecterPoste(posteId)
    const { error } = await supabase.from('postes').update({ connecte: false, en_pause: false, agent_id: null, service_ids: [] }).eq('id', posteId)
    if (error) throw new Error(error.message)
  },

  /** Déconnexion forcée par l'admin (back-office) : contrairement à deconnecterPoste
   * (le vendeur se déconnecte lui-même), remet aussi le ticket en cours en file
   * d'attente s'il y en a un, au lieu de le laisser orphelin sur un poste libéré. */
  async deconnecterPosteAdmin(posteId) {
    if (isDemo) return demo.deconnecterPosteAdmin(posteId)
    const { error } = await supabase.rpc('deconnecter_poste_admin', { p_poste_id: posteId })
    if (error) throw new Error(error.message)
  },

  async upsertService(service) {
    if (isDemo) return demo.upsertService(service)
    const { error } = await supabase.from('services').upsert(service)
    if (error) throw new Error(error.message)
  },

  async supprimerService(serviceId) {
    if (isDemo) return demo.supprimerService(serviceId)
    const { error } = await supabase.from('services').update({ actif: false }).eq('id', serviceId)
    if (error) throw new Error(error.message)
  },

  /** Upload direct du logo (fichier image) et retourne l'URL à enregistrer via majBranding. */
  async uploadLogo(organisationId, file) {
    if (isDemo) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = () => reject(new Error('Impossible de lire le fichier'))
        reader.readAsDataURL(file)
      })
    }
    const ext = file.name.split('.').pop()
    const path = `${organisationId}/logo-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('logos').upload(path, file, { upsert: true, cacheControl: '3600' })
    if (error) throw new Error(error.message)
    const { data } = supabase.storage.from('logos').getPublicUrl(path)
    return data.publicUrl
  },

  async majBranding(organisationId, branding) {
    if (isDemo) return demo.majBranding(organisationId, branding)
    const { error } = await supabase.from('organisations').update(branding).eq('id', organisationId)
    if (error) throw new Error(error.message)
  },

  async getTicketsOrganisation(organisationId) {
    if (isDemo) return demo.getTicketsOrganisation(organisationId)
    const { data, error } = await supabase.from('tickets').select('*').eq('organisation_id', organisationId)
    if (error) throw new Error(error.message)
    return data
  },

  /** Recherche/historique (back-office) : code (préfixe), téléphone (contient), plage de
   * dates sur cree_le. Tous les filtres sont optionnels et combinables ; limité à 500
   * résultats (plus large que listAvisRecents — c'est un outil de support, pas un flux). */
  async rechercherTickets(organisationId, { code, telephone, dateDebut, dateFin } = {}) {
    if (isDemo) return demo.rechercherTickets(organisationId, { code, telephone, dateDebut, dateFin })
    let query = supabase.from('tickets').select('*').eq('organisation_id', organisationId)
    if (code) query = query.ilike('code', `%${code}%`)
    if (telephone) query = query.ilike('telephone', `%${telephone}%`)
    if (dateDebut) query = query.gte('cree_le', new Date(dateDebut).toISOString())
    if (dateFin) query = query.lt('cree_le', new Date(new Date(dateFin).getTime() + 86400000).toISOString())
    const { data, error } = await query.order('cree_le', { ascending: false }).limit(500)
    if (error) throw new Error(error.message)
    return data
  },

  /** S'abonne aux évènements temps réel d'une organisation. Retourne une fonction de désabonnement. */
  subscribeToOrg(organisationId, callback) {
    if (isDemo) return demo.subscribe(callback)
    const channel = supabase
      .channel(`org-${organisationId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets', filter: `organisation_id=eq.${organisationId}` }, callback)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'postes', filter: `organisation_id=eq.${organisationId}` }, callback)
      .subscribe()
    return () => supabase.removeChannel(channel)
  },

  // ─── Authentification agent / back-office ────────────────────────────
  async login(email, password) {
    if (isDemo) {
      const agent = demo.getAgentByCredentials(email, password)
      if (!agent) throw new Error('Identifiants invalides')
      localStorage.setItem(SESSION_KEY, agent.id)
      return agent
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message)
    const { data: agent, error: agentError } = await supabase.from('agents').select('*').eq('id', data.user.id).single()
    if (agentError) throw new Error(agentError.message)
    return agent
  },

  async logout() {
    if (isDemo) {
      localStorage.removeItem(SESSION_KEY)
      return
    }
    await supabase.auth.signOut()
  },

  async getSession() {
    if (isDemo) {
      const id = localStorage.getItem(SESSION_KEY)
      return id ? demo.getAgent(id) : null
    }
    const { data } = await supabase.auth.getSession()
    if (!data.session) return null
    const { data: agent } = await supabase.from('agents').select('*').eq('id', data.session.user.id).single()
    return agent ?? null
  },
}
