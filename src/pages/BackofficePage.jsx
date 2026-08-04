import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api } from '../lib/api.js'
import { useAuth } from '../lib/AuthContext.jsx'
import { PageShell, Button, Avatar, LoadingScreen } from '../components/ui.jsx'
import StatsTab from './backoffice/StatsTab.jsx'
import RatingsTab from './backoffice/RatingsTab.jsx'
import SearchTab from './backoffice/SearchTab.jsx'
import ServicesTab from './backoffice/ServicesTab.jsx'
import PostesAgentsTab from './backoffice/PostesAgentsTab.jsx'
import PromotionsTab from './backoffice/PromotionsTab.jsx'
import BrandingTab from './backoffice/BrandingTab.jsx'
import QrCodeTab from './backoffice/QrCodeTab.jsx'
import WidgetTab from './backoffice/WidgetTab.jsx'

const TABS = [
  ['Statistiques', '📊'],
  ['Avis clients', '⭐'],
  ['Recherche', '🔍'],
  ['Services', '🛎️'],
  ['Postes & agents', '🖥️'],
  ['Storie', '📣'],
  ['Image de marque', '🎨'],
  ['QR Code', '📱'],
  ['Widget', '🧩'],
]

export default function BackofficePage() {
  const { orgId } = useParams()
  const { agent, logout } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState(TABS[0][0])
  const [org, setOrg] = useState(null)
  const [services, setServices] = useState([])
  const [postes, setPostes] = useState([])
  const [agents, setAgents] = useState([])
  const [stats, setStats] = useState(null)
  const [alertes, setAlertes] = useState([])
  const [promotions, setPromotions] = useState([])
  const [notesServices, setNotesServices] = useState([])
  const [notesVendeurs, setNotesVendeurs] = useState([])
  const [avisRecents, setAvisRecents] = useState([])
  const [tendance, setTendance] = useState([])
  const [heures, setHeures] = useState([])
  const [loadError, setLoadError] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const [o, s, p, ag, st, al, pr, ns, nv, avis, tend, heu] = await Promise.all([
        api.getOrganisationAuth(orgId),
        api.getServices(orgId),
        api.listPostes(orgId),
        api.listAgents(orgId),
        api.statsJour(orgId),
        api.servicesEnAlerte(orgId),
        api.listPromotions(orgId, { onlyActive: false }),
        api.notesMoyennes(orgId),
        api.notesMoyennesVendeur(orgId),
        api.listAvisRecents(orgId),
        api.statsTendance(orgId, 14),
        api.statsHeures(orgId, 30),
      ])
      setOrg(o)
      setServices(s)
      setPostes(p)
      setAgents(ag)
      setStats(st)
      setAlertes(al)
      setPromotions(pr)
      setNotesServices(ns)
      setNotesVendeurs(nv)
      setAvisRecents(avis)
      setTendance(tend)
      setHeures(heu)
      setLoadError(false)
    } catch {
      // Sans ce catch, un échec (réseau, RLS mal configurée...) laissait `org` à
      // null pour toujours et donc <LoadingScreen/> affiché indéfiniment, sans
      // message ni moyen de réessayer.
      setLoadError(true)
    }
  }, [orgId])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    const unsubscribe = api.subscribeToOrg(orgId, refresh)
    return unsubscribe
  }, [orgId, refresh])

  async function seDeconnecter() {
    await logout()
    navigate(`/o/${orgId}/connexion`)
  }

  if (loadError) {
    return (
      <div className="loading-screen">
        <div className="center" style={{ maxWidth: 320, padding: 24 }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>⚠️</div>
          <p style={{ fontWeight: 700, margin: '0 0 6px' }}>Impossible de charger le back-office</p>
          <p className="muted" style={{ fontSize: '0.85rem', marginBottom: 16 }}>Vérifiez votre connexion internet et réessayez.</p>
          <Button onClick={refresh}>Réessayer</Button>
        </div>
      </div>
    )
  }

  if (!org) return <LoadingScreen />

  return (
    <PageShell organisation={org} title={`${org.nom} — Back-office`} subtitle={`Connecté·e en tant que ${agent.nom}`} wide>
      <div className="row" style={{ marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
        <div className="tab-bar" role="tablist">
          {TABS.map(([t, icon]) => (
            <Button key={t} sm variant={tab === t ? 'primary' : 'outline'} onClick={() => setTab(t)} role="tab" aria-selected={tab === t}>
              <span>{icon}</span> {t}
            </Button>
          ))}
        </div>
        <div className="row" style={{ gap: 10, width: 'auto' }}>
          {agent.enseigne_id && (
            <Button as={Link} to="/enseigne" sm variant="outline">🏬 Vue enseigne</Button>
          )}
          <Avatar label={agent.nom} />
          <Button sm variant="danger" onClick={seDeconnecter}>Déconnexion</Button>
        </div>
      </div>

      {alertes.length > 0 && (
        <div className="alert-box">
          ⚠️ {alertes.length} service(s) sans poste connecté depuis plus du délai configuré :{' '}
          {alertes.map((a) => `${a.service_nom} (${a.tickets_en_attente} en attente, ${a.plus_ancien_min} min)`).join(' · ')}
        </div>
      )}

      {tab === 'Statistiques' && stats && <StatsTab stats={stats} tendance={tendance} heures={heures} />}
      {tab === 'Avis clients' && <RatingsTab notesServices={notesServices} notesVendeurs={notesVendeurs} avisRecents={avisRecents} services={services} />}
      {tab === 'Recherche' && <SearchTab orgId={orgId} services={services} agents={agents} />}
      {tab === 'Services' && <ServicesTab orgId={orgId} services={services} onChange={refresh} />}
      {tab === 'Postes & agents' && <PostesAgentsTab postes={postes} agents={agents} services={services} onChange={refresh} />}
      {tab === 'Storie' && <PromotionsTab orgId={orgId} promotions={promotions} onChange={refresh} />}
      {tab === 'Image de marque' && <BrandingTab orgId={orgId} org={org} onChange={refresh} />}
      {tab === 'QR Code' && <QrCodeTab orgId={orgId} org={org} />}
      {tab === 'Widget' && <WidgetTab orgId={orgId} org={org} />}
    </PageShell>
  )
}
