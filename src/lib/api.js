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

  async statsJour(organisationId) {
    if (isDemo) return demo.statsJour(organisationId)
    // En production : vue matérialisée ou requête agrégée équivalente (hors périmètre MVP, cf. README).
    const { data, error } = await supabase.rpc('stats_jour', { p_organisation_id: organisationId })
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

  async connecterPoste(posteId, agentId, serviceIds) {
    if (isDemo) return demo.connecterPoste(posteId, agentId, serviceIds)
    const { error } = await supabase.from('postes').update({ agent_id: agentId, service_ids: serviceIds, connecte: true, en_pause: false }).eq('id', posteId)
    if (error) throw new Error(error.message)
  },

  async majServicesPoste(posteId, serviceIds) {
    if (isDemo) return demo.majServicesPoste(posteId, serviceIds)
    const { error } = await supabase.from('postes').update({ service_ids: serviceIds }).eq('id', posteId)
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
